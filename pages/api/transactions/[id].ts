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

function parseId(req: AuthenticatedRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

function signedAmountDelta(type: "INCOME" | "EXPENSE", amount: number) {
  return type === "INCOME" ? amount : -amount;
}

async function findOwnedTransaction(id: string, userId: string) {
  return prisma.transaction.findFirst({
    where: { id, userId },
    select: {
      id: true,
      bankAccountId: true,
      amount: true,
      type: true,
    },
  });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const id = parseId(req);
  if (!id) return sendError(res, 400, "Invalid transaction id", "VALIDATION_ERROR");

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: req.auth.userId },
    include: {
      bankAccount: true,
      category: true,
      tags: { include: { tag: true } },
    },
  });

  if (!tx) return sendError(res, 404, "Transaction not found", "NOT_FOUND");
  return sendOk(res, tx);
}

const updateTransactionSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  bankAccountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  date: z.coerce.date().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
});

async function handlePatch(req: AuthenticatedRequest, res: NextApiResponse) {
  const limit = checkRateLimit({
    key: `tx:update:${req.auth.userId}`,
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const id = parseId(req);
  if (!id) return sendError(res, 400, "Invalid transaction id", "VALIDATION_ERROR");

  const existing = await findOwnedTransaction(id, req.auth.userId);
  if (!existing) return sendError(res, 404, "Transaction not found", "NOT_FOUND");

  const parsed = updateTransactionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid payload",
      "VALIDATION_ERROR",
      parsed.error.flatten()
    );
  }

  const {
    amount,
    type,
    bankAccountId,
    categoryId,
    note,
    date,
    tagIds,
  } = parsed.data;

  if (bankAccountId !== undefined) {
    const account = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, userId: req.auth.userId },
      select: { id: true },
    });
    if (!account) return sendError(res, 400, "Invalid bankAccountId", "VALIDATION_ERROR");
  }

  if (categoryId !== undefined) {
    if (typeof categoryId === "string") {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: req.auth.userId },
        select: { id: true },
      });
      if (!category) return sendError(res, 400, "Invalid categoryId", "VALIDATION_ERROR");
    }
  }

  const data: Prisma.TransactionUpdateInput = {
    ...(amount !== undefined ? { amount } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(typeof note === "string" ? { note } : {}),
    ...(note === null ? { note: null } : {}),
    ...(date !== undefined ? { date } : {}),
    ...(typeof bankAccountId === "string"
      ? { bankAccount: { connect: { id: bankAccountId } } }
      : {}),
    ...(categoryId === null ? { category: { disconnect: true } } : {}),
    ...(typeof categoryId === "string"
      ? { category: { connect: { id: categoryId } } }
      : {}),
  };

  if (Array.isArray(tagIds)) {
    data.tags = {
      deleteMany: {},
      create: tagIds.map((tagId: string) => ({
        tag: { connect: { id: tagId } },
      })),
    };
  }

  const nextType = type ?? existing.type;
  const nextAmount = amount ?? Number(existing.amount);
  const nextAccountId = bankAccountId ?? existing.bankAccountId ?? null;

  if (!nextAccountId) {
    return sendError(res, 400, "Transaction must have a bankAccountId", "VALIDATION_ERROR");
  }

  const tx = await prisma.$transaction(async (prismaTx) => {
    const updated = await prismaTx.transaction.update({
      where: { id },
      data,
      include: {
        bankAccount: true,
        category: true,
        tags: { include: { tag: true } },
      },
    });

    const oldDelta = signedAmountDelta(existing.type, Number(existing.amount));
    const newDelta = signedAmountDelta(nextType, nextAmount);

    if (existing.bankAccountId === nextAccountId) {
      await prismaTx.bankAccount.update({
        where: { id: nextAccountId },
        data: {
          balance: { increment: newDelta - oldDelta },
        },
      });
    } else {
      if (existing.bankAccountId) {
        await prismaTx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: {
            balance: { increment: -oldDelta },
          },
        });
      }
      await prismaTx.bankAccount.update({
        where: { id: nextAccountId },
        data: {
          balance: { increment: newDelta },
        },
      });
    }

    return updated;
  });

  return sendOk(res, tx);
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse) {
  const limit = checkRateLimit({
    key: `tx:delete:${req.auth.userId}`,
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const id = parseId(req);
  if (!id) return sendError(res, 400, "Invalid transaction id", "VALIDATION_ERROR");

  const existing = await findOwnedTransaction(id, req.auth.userId);
  if (!existing) return sendError(res, 404, "Transaction not found", "NOT_FOUND");
  await prisma.$transaction(async (prismaTx) => {
    await prismaTx.transaction.delete({ where: { id } });

    if (existing.bankAccountId) {
      const delta = signedAmountDelta(existing.type, Number(existing.amount));
      await prismaTx.bankAccount.update({
        where: { id: existing.bankAccountId },
        data: {
          balance: { increment: -delta },
        },
      });
    }
  });
  return sendOk(res, { ok: true });
}

export async function transactionByIdHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") return handleGet(req, res);
    if (req.method === "PATCH") return handlePatch(req, res);
    if (req.method === "DELETE") return handleDelete(req, res);

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return sendError(
      res,
      405,
      `Method ${req.method} not allowed`,
      "METHOD_NOT_ALLOWED"
    );
  } catch (error) {
    console.error("Transaction by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(transactionByIdHandler);

