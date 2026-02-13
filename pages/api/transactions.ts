import type { NextApiResponse } from "next";
import { Prisma, TransactionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  type AuthenticatedRequest,
  withAuth,
} from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function normalizeTransactionType(raw: unknown): TransactionType | null {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  return upper === "INCOME" || upper === "EXPENSE" ? upper : null;
}

function parseAmount(raw: unknown): number | null {
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function parseDate(raw: unknown): Date | null {
  if (!raw) return new Date();
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

function signedAmountDelta(type: "INCOME" | "EXPENSE", amount: number) {
  return type === TransactionType.INCOME ? amount : -amount;
}

function parsePagination(req: AuthenticatedRequest) {
  const page = Math.max(DEFAULT_PAGE, Number(req.query.page || DEFAULT_PAGE));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(req.query.pageSize || DEFAULT_PAGE_SIZE))
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const { userId } = req.auth;
  const { page, pageSize, skip } = parsePagination(req);

  const where: Prisma.TransactionWhereInput = { userId };

  const queryType = normalizeTransactionType(req.query.type);
  if (queryType) where.type = queryType;

  if (typeof req.query.categoryId === "string" && req.query.categoryId) {
    where.categoryId = req.query.categoryId;
  }

  if (req.query.from || req.query.to) {
    const from = req.query.from ? parseDate(req.query.from) : null;
    const to = req.query.to ? parseDate(req.query.to) : null;

    if ((req.query.from && !from) || (req.query.to && !to)) {
      return sendError(res, 400, "Invalid date filter", "VALIDATION_ERROR");
    }

    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        bankAccount: true,
        category: true,
        tags: { include: { tag: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return sendOk(res, { page, pageSize, total, items });
}

const createTransactionSchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  bankAccountId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  note: z.string().trim().max(500).optional(),
  date: z.coerce.date().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
});

async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  const limit = checkRateLimit({
    key: `tx:create:${req.auth.userId}`,
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const { userId } = req.auth;
  const parsed = createTransactionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid payload",
      "VALIDATION_ERROR",
      parsed.error.flatten()
    );
  }
  const { amount, type, bankAccountId, categoryId, note, date, tagIds } = parsed.data;

  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, userId },
    select: { id: true },
  });
  if (!account) {
    return sendError(res, 400, "Invalid bankAccountId", "VALIDATION_ERROR");
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });
    if (!category) {
      return sendError(res, 400, "Invalid categoryId", "VALIDATION_ERROR");
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        amount,
        type,
        note: note ?? null,
        date: date ?? new Date(),
        userId,
        bankAccountId,
        ...(typeof categoryId === "string" ? { categoryId } : {}),
        tags:
          Array.isArray(tagIds) && tagIds.length > 0
            ? {
                create: tagIds.map((tagId: string) => ({
                  tag: { connect: { id: tagId } },
                })),
              }
            : undefined,
      },
      include: {
        bankAccount: true,
        category: true,
        tags: { include: { tag: true } },
      },
    });

    await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        balance: { increment: signedAmountDelta(type, amount) },
      },
    });

    return created;
  });

  return sendOk(res, transaction, 201);
}

export async function transactionsHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") return handleGet(req, res);
    if (req.method === "POST") return handlePost(req, res);

    res.setHeader("Allow", ["GET", "POST"]);
    return sendError(
      res,
      405,
      `Method ${req.method} not allowed`,
      "METHOD_NOT_ALLOWED"
    );
  } catch (error) {
    console.error("Transactions API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(transactionsHandler);


