import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { generateUniqueInviteCode, isGroupMember } from "@/lib/shared-groups";

function parseId(req: AuthenticatedRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  regenerateInviteCode: z.boolean().optional(),
});

export async function sharedGroupByIdHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const id = parseId(req);
  if (!id) {
    return sendError(res, 400, "Invalid shared group id", "VALIDATION_ERROR");
  }

  const membership = await isGroupMember(id, req.auth.userId);
  if (!membership) {
    return sendError(res, 404, "Shared group not found", "NOT_FOUND");
  }

  try {
    if (req.method === "GET") {
      const group = await prisma.sharedGroup.findUnique({
        where: { id },
        include: {
          members: {
            select: {
              id: true,
              userId: true,
              displayName: true,
              role: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              expenses: true,
              settlements: true,
            },
          },
        },
      });
      return sendOk(res, group);
    }

    if (req.method === "PATCH") {
      if (membership.role !== "OWNER") {
        return sendError(res, 403, "Only group owners can update this group", "FORBIDDEN");
      }

      const limit = checkRateLimit({
        key: `shared-group:update:${req.auth.userId}`,
        limit: 60,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = updateGroupSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }
      if (Object.keys(parsed.data).length === 0) {
        return sendError(res, 400, "No fields provided", "VALIDATION_ERROR");
      }

      const inviteCode = parsed.data.regenerateInviteCode ? await generateUniqueInviteCode() : undefined;
      const updated = await prisma.sharedGroup.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
          ...(inviteCode ? { inviteCode } : {}),
        },
      });
      return sendOk(res, updated);
    }

    if (req.method === "DELETE") {
      if (membership.role !== "OWNER") {
        return sendError(res, 403, "Only group owners can delete this group", "FORBIDDEN");
      }
      const limit = checkRateLimit({
        key: `shared-group:delete:${req.auth.userId}`,
        limit: 20,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }
      await prisma.sharedGroup.delete({ where: { id } });
      return sendOk(res, { ok: true });
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Shared group by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(sharedGroupByIdHandler);
