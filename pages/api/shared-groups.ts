import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { generateUniqueInviteCode } from "@/lib/shared-groups";

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export async function sharedGroupsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.auth.userId;

  try {
    if (req.method === "GET") {
      const groups = await prisma.sharedGroup.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        include: {
          members: {
            select: {
              id: true,
              userId: true,
              displayName: true,
              role: true,
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
        orderBy: { updatedAt: "desc" },
      });
      return sendOk(res, groups);
    }

    if (req.method === "POST") {
      const limit = checkRateLimit({
        key: `shared-group:create:${userId}`,
        limit: 20,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = createGroupSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const inviteCode = await generateUniqueInviteCode();
      const created = await prisma.sharedGroup.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          inviteCode,
          createdById: userId,
          members: {
            create: {
              userId,
              displayName: parsed.data.displayName ?? "Owner",
              role: "OWNER",
            },
          },
        },
        include: {
          members: {
            select: {
              id: true,
              userId: true,
              displayName: true,
              role: true,
            },
          },
        },
      });
      return sendOk(res, created, 201);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Shared groups API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(sharedGroupsHandler);
