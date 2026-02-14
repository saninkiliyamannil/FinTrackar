import type { NextApiResponse } from "next";
import { SharedGroupRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isGroupMember } from "@/lib/shared-groups";

function parseGroupId(req: AuthenticatedRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

function parseMemberId(req: AuthenticatedRequest): string | null {
  const memberId = req.query.memberId;
  return typeof memberId === "string" && memberId ? memberId : null;
}

const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  role: z.nativeEnum(SharedGroupRole).optional(),
});

export async function sharedGroupMemberByIdHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const groupId = parseGroupId(req);
  const memberId = parseMemberId(req);
  if (!groupId || !memberId) {
    return sendError(res, 400, "Invalid group/member id", "VALIDATION_ERROR");
  }

  try {
    const currentMembership = await isGroupMember(groupId, req.auth.userId);
    if (!currentMembership) {
      return sendError(res, 404, "Shared group not found", "NOT_FOUND");
    }

    const targetMember = await prisma.sharedGroupMember.findFirst({
      where: { id: memberId, groupId },
    });
    if (!targetMember) {
      return sendError(res, 404, "Member not found", "NOT_FOUND");
    }

    if (req.method === "PATCH") {
      if (currentMembership.role !== "OWNER" && targetMember.userId !== req.auth.userId) {
        return sendError(res, 403, "Only owners can edit other members", "FORBIDDEN");
      }
      const parsed = updateSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }
      if (Object.keys(parsed.data).length === 0) {
        return sendError(res, 400, "No fields provided", "VALIDATION_ERROR");
      }
      if (parsed.data.role && currentMembership.role !== "OWNER") {
        return sendError(res, 403, "Only owners can change roles", "FORBIDDEN");
      }

      const updated = await prisma.sharedGroupMember.update({
        where: { id: memberId },
        data: {
          ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
          ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        },
      });
      return sendOk(res, updated);
    }

    if (req.method === "DELETE") {
      if (currentMembership.role !== "OWNER" && targetMember.userId !== req.auth.userId) {
        return sendError(res, 403, "Only owners can remove other members", "FORBIDDEN");
      }
      const limit = checkRateLimit({
        key: `shared-group-member:delete:${req.auth.userId}`,
        limit: 40,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      if (targetMember.role === "OWNER") {
        const ownerCount = await prisma.sharedGroupMember.count({
          where: { groupId, role: "OWNER" },
        });
        if (ownerCount <= 1) {
          return sendError(res, 400, "Cannot remove the last owner", "VALIDATION_ERROR");
        }
      }

      await prisma.sharedGroupMember.delete({ where: { id: memberId } });
      return sendOk(res, { ok: true });
    }

    if (req.method === "GET") {
      return sendOk(res, targetMember);
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Shared group member by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(sharedGroupMemberByIdHandler);
