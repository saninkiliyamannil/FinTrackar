import type { NextApiResponse } from "next";
import { SharedSettlementStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isGroupMember } from "@/lib/shared-groups";
import { buildSettlementSuggestions } from "@/lib/settlement-engine";

function parseId(req: AuthenticatedRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

const createSettlementSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(600).optional(),
  status: z.nativeEnum(SharedSettlementStatus).optional(),
});

export async function sharedGroupSettlementsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const groupId = parseId(req);
  if (!groupId) {
    return sendError(res, 400, "Invalid shared group id", "VALIDATION_ERROR");
  }

  const membership = await isGroupMember(groupId, req.auth.userId);
  if (!membership) {
    return sendError(res, 404, "Shared group not found", "NOT_FOUND");
  }

  try {
    if (req.method === "GET") {
      const [members, expenses, settlements] = await Promise.all([
        prisma.sharedGroupMember.findMany({
          where: { groupId },
          select: { id: true, displayName: true, role: true },
        }),
        prisma.sharedExpense.findMany({
          where: { groupId },
          include: {
            participants: {
              select: {
                participantName: true,
                shareAmount: true,
                paidAmount: true,
              },
            },
          },
        }),
        prisma.sharedSettlement.findMany({
          where: { groupId },
          include: {
            fromMember: { select: { id: true, displayName: true } },
            toMember: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const suggestions = buildSettlementSuggestions(
        members.map((member) => ({ id: member.id, displayName: member.displayName })),
        expenses.map((expense) => ({
          participants: expense.participants.map((participant) => ({
            participantName: participant.participantName,
            shareAmount: Number(participant.shareAmount),
            paidAmount: Number(participant.paidAmount),
          })),
        }))
      );

      return sendOk(res, {
        suggestions,
        settlements: settlements.map((settlement) => ({
          ...settlement,
          amount: Number(settlement.amount),
        })),
      });
    }

    if (req.method === "POST") {
      const limit = checkRateLimit({
        key: `shared-settlement:create:${req.auth.userId}`,
        limit: 80,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = createSettlementSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const [fromMember, toMember] = await Promise.all([
        prisma.sharedGroupMember.findFirst({
          where: { id: parsed.data.fromMemberId, groupId },
          select: { id: true },
        }),
        prisma.sharedGroupMember.findFirst({
          where: { id: parsed.data.toMemberId, groupId },
          select: { id: true },
        }),
      ]);
      if (!fromMember || !toMember) {
        return sendError(res, 400, "Members must belong to this group", "VALIDATION_ERROR");
      }

      const created = await prisma.sharedSettlement.create({
        data: {
          groupId,
          fromMemberId: parsed.data.fromMemberId,
          toMemberId: parsed.data.toMemberId,
          amount: parsed.data.amount,
          note: parsed.data.note ?? null,
          status: parsed.data.status ?? SharedSettlementStatus.PROPOSED,
          settledAt: parsed.data.status === SharedSettlementStatus.SETTLED ? new Date() : null,
          createdById: req.auth.userId,
        },
        include: {
          fromMember: { select: { id: true, displayName: true } },
          toMember: { select: { id: true, displayName: true } },
        },
      });
      return sendOk(res, { ...created, amount: Number(created.amount) }, 201);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Shared group settlements API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(sharedGroupSettlementsHandler);
