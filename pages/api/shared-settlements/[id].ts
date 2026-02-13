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

const updateSchema = z.object({
  status: z.nativeEnum(SharedSettlementStatus).optional(),
  note: z.string().trim().max(600).nullable().optional(),
});

export async function sharedSettlementByIdHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const id = parseId(req);
  if (!id) return sendError(res, 400, "Invalid settlement id", "VALIDATION_ERROR");

  try {
    const existing = await prisma.sharedSettlement.findUnique({
      where: { id },
      select: { id: true, groupId: true, amount: true, status: true },
    });
    if (!existing) {
      return sendError(res, 404, "Settlement not found", "NOT_FOUND");
    }

    const membership = await isGroupMember(existing.groupId, req.auth.userId);
    if (!membership) {
      return sendError(res, 404, "Settlement not found", "NOT_FOUND");
    }

    if (req.method === "PATCH") {
      const limit = checkRateLimit({
        key: `shared-settlement:update:${req.auth.userId}`,
        limit: 100,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) return sendError(res, 429, "Too many requests", "RATE_LIMITED");

      const parsed = updateSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }
      if (Object.keys(parsed.data).length === 0) {
        return sendError(res, 400, "No fields provided", "VALIDATION_ERROR");
      }

      const nextStatus = parsed.data.status ?? existing.status;
      const updated = await prisma.sharedSettlement.update({
        where: { id },
        data: {
          ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
          settledAt: nextStatus === SharedSettlementStatus.SETTLED ? new Date() : null,
        },
      });
      return sendOk(res, { ...updated, amount: Number(updated.amount) });
    }

    if (req.method === "DELETE") {
      const limit = checkRateLimit({
        key: `shared-settlement:delete:${req.auth.userId}`,
        limit: 60,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      await prisma.sharedSettlement.delete({ where: { id } });
      return sendOk(res, { ok: true });
    }

    if (req.method === "GET") {
      const settlement = await prisma.sharedSettlement.findUnique({
        where: { id },
        include: {
          fromMember: { select: { id: true, displayName: true } },
          toMember: { select: { id: true, displayName: true } },
        },
      });
      return sendOk(res, settlement ? { ...settlement, amount: Number(settlement.amount) } : null);
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Shared settlement by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(sharedSettlementByIdHandler);
