import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional().nullable(),
  image: z.string().trim().url().max(500).optional().nullable(),
});

async function profileHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.auth.userId;

  try {
    if (req.method === "GET") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          image: true,
          createdAt: true,
        },
      });

      if (!user) {
        return sendError(res, 404, "User not found", "NOT_FOUND");
      }

      return sendOk(res, { user });
    }

    if (req.method === "PATCH") {
      const limit = checkRateLimit({
        key: `profile:update:${userId}`,
        limit: 30,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = updateProfileSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const displayName =
        parsed.data.displayName === undefined ? undefined : parsed.data.displayName ? parsed.data.displayName : null;
      const image = parsed.data.image === undefined ? undefined : parsed.data.image ? parsed.data.image : null;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(displayName !== undefined ? { displayName } : {}),
          ...(image !== undefined ? { image } : {}),
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          image: true,
          createdAt: true,
        },
      });

      return sendOk(res, { user });
    }

    res.setHeader("Allow", ["GET", "PATCH"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Profile API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(profileHandler);

