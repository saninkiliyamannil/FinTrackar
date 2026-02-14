import type { NextApiResponse } from "next";
import { SharedSettlementStatus } from "@prisma/client";
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

export async function settleAllSharedGroupHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const groupId = parseId(req);
  if (!groupId) {
    return sendError(res, 400, "Invalid shared group id", "VALIDATION_ERROR");
  }

  const membership = await isGroupMember(groupId, req.auth.userId);
  if (!membership) {
    return sendError(res, 404, "Shared group not found", "NOT_FOUND");
  }

  const limit = checkRateLimit({
    key: `shared-settlement:settle-all:${req.auth.userId}`,
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  try {
    const [members, expenses] = await Promise.all([
      prisma.sharedGroupMember.findMany({
        where: { groupId },
        select: { id: true, displayName: true },
      }),
      prisma.sharedExpense.findMany({
        where: { groupId },
        select: {
          participants: {
            select: {
              participantName: true,
              shareAmount: true,
              paidAmount: true,
            },
          },
        },
      }),
    ]);

    const suggestions = buildSettlementSuggestions(
      members,
      expenses.map((expense) => ({
        participants: expense.participants.map((participant) => ({
          participantName: participant.participantName,
          shareAmount: Number(participant.shareAmount),
          paidAmount: Number(participant.paidAmount),
        })),
      }))
    );

    if (suggestions.length === 0) {
      return sendOk(res, { created: 0, settlements: [] });
    }

    const created = await prisma.$transaction(async (tx) => {
      const createdSettlements = [];
      for (const suggestion of suggestions) {
        const settlement = await tx.sharedSettlement.create({
          data: {
            groupId,
            fromMemberId: suggestion.fromMemberId,
            toMemberId: suggestion.toMemberId,
            amount: suggestion.amount,
            status: SharedSettlementStatus.SETTLED,
            settledAt: new Date(),
            createdById: req.auth.userId,
            note: "Auto-settled from settle-all",
          },
          include: {
            fromMember: { select: { id: true, displayName: true } },
            toMember: { select: { id: true, displayName: true } },
          },
        });
        createdSettlements.push(settlement);
      }
      return createdSettlements;
    });

    return sendOk(res, {
      created: created.length,
      settlements: created.map((item) => ({ ...item, amount: Number(item.amount) })),
    });
  } catch (error) {
    console.error("Settle all shared group API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(settleAllSharedGroupHandler);
