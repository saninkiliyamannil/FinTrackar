import type { NextApiResponse } from "next";
import { SharedSplitMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

function parseId(req: AuthenticatedRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

const participantSchema = z.object({
  participantName: z.string().trim().min(1).max(120),
  shareAmount: z.coerce.number().positive().optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  isSettled: z.boolean().optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  totalAmount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(600).nullable().optional(),
  splitMethod: z.nativeEnum(SharedSplitMethod).optional(),
  participants: z.array(participantSchema).min(1).max(30).optional(),
});

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
    const remainder = round2(totalAmount - base * count);
    return participants.map((participant, idx) => ({
      participantName: participant.participantName.trim(),
      shareAmount: idx === count - 1 ? round2(base + remainder) : base,
      paidAmount: round2(participant.paidAmount ?? 0),
      isSettled: Boolean(participant.isSettled),
    }));
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

async function findOwnedExpense(id: string, userId: string) {
  return prisma.sharedExpense.findFirst({
    where: { id, userId },
    include: { participants: true },
  });
}

export async function sharedExpenseByIdHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const id = parseId(req);
  if (!id) {
    return sendError(res, 400, "Invalid shared expense id", "VALIDATION_ERROR");
  }

  try {
    const existing = await findOwnedExpense(id, req.auth.userId);
    if (!existing) {
      return sendError(res, 404, "Shared expense not found", "NOT_FOUND");
    }

    if (req.method === "GET") {
      return sendOk(res, {
        ...existing,
        totalAmount: Number(existing.totalAmount),
        participants: existing.participants.map((participant) => ({
          ...participant,
          shareAmount: Number(participant.shareAmount),
          paidAmount: Number(participant.paidAmount),
        })),
      });
    }

    if (req.method === "PATCH") {
      const limit = checkRateLimit({
        key: `shared-expense:update:${req.auth.userId}`,
        limit: 90,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = updateSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }
      if (Object.keys(parsed.data).length === 0) {
        return sendError(res, 400, "No fields provided", "VALIDATION_ERROR");
      }

      const nextTotalAmount = parsed.data.totalAmount ?? Number(existing.totalAmount);
      const nextSplitMethod = parsed.data.splitMethod ?? existing.splitMethod;
      let normalizedParticipants = existing.participants.map((participant) => ({
        participantName: participant.participantName,
        shareAmount: Number(participant.shareAmount),
        paidAmount: Number(participant.paidAmount),
        isSettled: participant.isSettled,
      }));

      if (parsed.data.participants) {
        try {
          normalizedParticipants = normalizeParticipants(nextSplitMethod, nextTotalAmount, parsed.data.participants);
        } catch (error) {
          return sendError(res, 400, (error as Error).message, "VALIDATION_ERROR");
        }
      } else if (parsed.data.totalAmount !== undefined || parsed.data.splitMethod !== undefined) {
        try {
          normalizedParticipants = normalizeParticipants(nextSplitMethod, nextTotalAmount, normalizedParticipants);
        } catch (error) {
          return sendError(res, 400, (error as Error).message, "VALIDATION_ERROR");
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const base = await tx.sharedExpense.update({
          where: { id },
          data: {
            ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
            ...(parsed.data.totalAmount !== undefined ? { totalAmount: parsed.data.totalAmount } : {}),
            ...(parsed.data.date !== undefined ? { date: parsed.data.date } : {}),
            ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
            ...(parsed.data.splitMethod !== undefined ? { splitMethod: parsed.data.splitMethod } : {}),
          },
        });

        await tx.sharedExpenseParticipant.deleteMany({ where: { sharedExpenseId: id } });
        await tx.sharedExpenseParticipant.createMany({
          data: normalizedParticipants.map((participant) => ({
            sharedExpenseId: id,
            participantName: participant.participantName,
            shareAmount: participant.shareAmount,
            paidAmount: participant.paidAmount,
            isSettled: participant.isSettled,
          })),
        });

        const withParticipants = await tx.sharedExpense.findUnique({
          where: { id: base.id },
          include: { participants: { orderBy: { createdAt: "asc" } } },
        });
        return withParticipants!;
      });

      return sendOk(res, {
        ...updated,
        totalAmount: Number(updated.totalAmount),
        participants: updated.participants.map((participant) => ({
          ...participant,
          shareAmount: Number(participant.shareAmount),
          paidAmount: Number(participant.paidAmount),
        })),
      });
    }

    if (req.method === "DELETE") {
      const limit = checkRateLimit({
        key: `shared-expense:delete:${req.auth.userId}`,
        limit: 50,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }
      await prisma.sharedExpense.delete({ where: { id } });
      return sendOk(res, { ok: true });
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Shared expense by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(sharedExpenseByIdHandler);
