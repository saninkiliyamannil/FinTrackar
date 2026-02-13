import type { NextApiResponse } from "next";
import { SharedSettlementStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isGroupMember } from "@/lib/shared-groups";

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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

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

      const netByName = new Map<string, number>();
      for (const expense of expenses) {
        for (const participant of expense.participants) {
          const current = netByName.get(participant.participantName) ?? 0;
          netByName.set(
            participant.participantName,
            round2(current + Number(participant.paidAmount) - Number(participant.shareAmount))
          );
        }
      }

      const creditors: Array<{ name: string; amount: number }> = [];
      const debtors: Array<{ name: string; amount: number }> = [];
      for (const [name, net] of netByName.entries()) {
        if (net > 0.01) creditors.push({ name, amount: net });
        if (net < -0.01) debtors.push({ name, amount: Math.abs(net) });
      }

      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      const memberByName = new Map(members.map((member) => [member.displayName, member]));
      const suggestions: Array<{
        fromMemberId: string;
        toMemberId: string;
        fromDisplayName: string;
        toDisplayName: string;
        amount: number;
      }> = [];

      let d = 0;
      let c = 0;
      while (d < debtors.length && c < creditors.length) {
        const debtor = debtors[d];
        const creditor = creditors[c];
        const amount = round2(Math.min(debtor.amount, creditor.amount));
        if (amount <= 0) break;

        const fromMember = memberByName.get(debtor.name);
        const toMember = memberByName.get(creditor.name);
        if (fromMember && toMember && fromMember.id !== toMember.id) {
          suggestions.push({
            fromMemberId: fromMember.id,
            toMemberId: toMember.id,
            fromDisplayName: fromMember.displayName,
            toDisplayName: toMember.displayName,
            amount,
          });
        }

        debtor.amount = round2(debtor.amount - amount);
        creditor.amount = round2(creditor.amount - amount);
        if (debtor.amount <= 0.01) d += 1;
        if (creditor.amount <= 0.01) c += 1;
      }

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
