import type { NextApiResponse } from "next";
import { SharedSplitMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const participantSchema = z.object({
  participantName: z.string().trim().min(1).max(120),
  shareAmount: z.coerce.number().positive().optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  isSettled: z.boolean().optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(180),
  totalAmount: z.coerce.number().positive(),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(600).optional(),
  splitMethod: z.nativeEnum(SharedSplitMethod).optional(),
  participants: z.array(participantSchema).min(1).max(30),
});

function parsePagination(req: AuthenticatedRequest) {
  const page = Math.max(DEFAULT_PAGE, Number(req.query.page || DEFAULT_PAGE));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || DEFAULT_PAGE_SIZE)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeParticipants(
  splitMethod: SharedSplitMethod,
  totalAmount: number,
  participants: Array<z.infer<typeof participantSchema>>
) {
  if (splitMethod === SharedSplitMethod.EQUAL) {
    const count = participants.length;
    const base = round2(totalAmount / count);
    let remaining = round2(totalAmount - base * count);
    return participants.map((participant, idx) => {
      const extra = idx === count - 1 ? remaining : 0;
      return {
        participantName: participant.participantName.trim(),
        shareAmount: round2(base + extra),
        paidAmount: round2(participant.paidAmount ?? 0),
        isSettled: Boolean(participant.isSettled),
      };
    });
  }

  const resolved = participants.map((participant) => ({
    participantName: participant.participantName.trim(),
    shareAmount: round2(participant.shareAmount ?? 0),
    paidAmount: round2(participant.paidAmount ?? 0),
    isSettled: Boolean(participant.isSettled),
  }));

  if (resolved.some((participant) => participant.shareAmount <= 0)) {
    throw new Error("Each participant must have a positive shareAmount for CUSTOM split");
  }
  const shareTotal = round2(resolved.reduce((sum, participant) => sum + participant.shareAmount, 0));
  if (Math.abs(shareTotal - round2(totalAmount)) > 0.01) {
    throw new Error("Sum of participant shares must match totalAmount");
  }
  return resolved;
}

export async function sharedExpensesHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.auth.userId;

  try {
    if (req.method === "GET") {
      const { page, pageSize, skip } = parsePagination(req);
      const where = { userId };

      const [total, items] = await Promise.all([
        prisma.sharedExpense.count({ where }),
        prisma.sharedExpense.findMany({
          where,
          include: {
            participants: {
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { date: "desc" },
          skip,
          take: pageSize,
        }),
      ]);

      const normalized = items.map((expense) => ({
        ...expense,
        totalAmount: Number(expense.totalAmount),
        participants: expense.participants.map((participant) => ({
          ...participant,
          shareAmount: Number(participant.shareAmount),
          paidAmount: Number(participant.paidAmount),
        })),
      }));

      const summary = normalized.reduce(
        (acc, expense) => {
          acc.totalAmount += expense.totalAmount;
          acc.totalParticipants += expense.participants.length;
          acc.settledParticipants += expense.participants.filter((participant) => participant.isSettled).length;
          return acc;
        },
        { totalAmount: 0, totalParticipants: 0, settledParticipants: 0 }
      );

      return sendOk(res, { page, pageSize, total, items: normalized, summary });
    }

    if (req.method === "POST") {
      const limit = checkRateLimit({
        key: `shared-expense:create:${userId}`,
        limit: 40,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = createSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const splitMethod = parsed.data.splitMethod ?? SharedSplitMethod.EQUAL;
      let normalizedParticipants: ReturnType<typeof normalizeParticipants>;
      try {
        normalizedParticipants = normalizeParticipants(splitMethod, parsed.data.totalAmount, parsed.data.participants);
      } catch (error) {
        return sendError(res, 400, (error as Error).message, "VALIDATION_ERROR");
      }

      const created = await prisma.sharedExpense.create({
        data: {
          title: parsed.data.title,
          totalAmount: parsed.data.totalAmount,
          date: parsed.data.date ?? new Date(),
          note: parsed.data.note ?? null,
          splitMethod,
          userId,
          participants: {
            create: normalizedParticipants,
          },
        },
        include: {
          participants: { orderBy: { createdAt: "asc" } },
        },
      });

      return sendOk(
        res,
        {
          ...created,
          totalAmount: Number(created.totalAmount),
          participants: created.participants.map((participant) => ({
            ...participant,
            shareAmount: Number(participant.shareAmount),
            paidAmount: Number(participant.paidAmount),
          })),
        },
        201
      );
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Shared expenses API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(sharedExpensesHandler);
