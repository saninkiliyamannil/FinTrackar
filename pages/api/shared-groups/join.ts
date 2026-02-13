import type { NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const joinSchema = z.object({
  inviteCode: z.string().trim().min(4).max(24),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export async function joinSharedGroupHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const limit = checkRateLimit({
    key: `shared-group:join:${req.auth.userId}`,
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const parsed = joinSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  try {
    const inviteCode = parsed.data.inviteCode.toUpperCase();
    const group = await prisma.sharedGroup.findUnique({
      where: { inviteCode },
      select: { id: true, name: true, isPersonal: true },
    });
    if (!group) {
      return sendError(res, 404, "Invalid invite code", "NOT_FOUND");
    }
    if (group.isPersonal) {
      return sendError(res, 400, "Cannot join personal group", "VALIDATION_ERROR");
    }

    const membership = await prisma.sharedGroupMember.create({
      data: {
        groupId: group.id,
        userId: req.auth.userId,
        displayName: parsed.data.displayName ?? req.auth.email,
        role: "MEMBER",
      },
      select: {
        id: true,
        groupId: true,
        userId: true,
        displayName: true,
        role: true,
      },
    });
    return sendOk(res, membership, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return sendError(res, 409, "You are already a member of this group", "CONFLICT");
    }
    console.error("Join shared group API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(joinSharedGroupHandler);
