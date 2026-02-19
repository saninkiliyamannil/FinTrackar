import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const createAnchorSchema = z.object({
  label: z.string().trim().min(1).max(120),
  locationKey: z.string().trim().min(1).max(160),
  hourStart: z.coerce.number().int().min(0).max(23),
  hourEnd: z.coerce.number().int().min(0).max(23),
  isActive: z.boolean().optional(),
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.auth.userId;

  try {
    if (req.method === "GET") {
      const anchors = await prisma.locationAnchor.findMany({
        where: { userId },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      });
      return sendOk(res, anchors);
    }

    if (req.method === "POST") {
      const limit = checkRateLimit({
        key: `location-anchor:create:${userId}`,
        limit: 20,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) return sendError(res, 429, "Too many requests", "RATE_LIMITED");

      const parsed = createAnchorSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const anchor = await prisma.locationAnchor.create({
        data: {
          userId,
          label: parsed.data.label,
          locationKey: parsed.data.locationKey,
          hourStart: parsed.data.hourStart,
          hourEnd: parsed.data.hourEnd,
          isActive: parsed.data.isActive ?? true,
        },
      });

      return sendOk(res, anchor, 201);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Location anchors API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(handler);

