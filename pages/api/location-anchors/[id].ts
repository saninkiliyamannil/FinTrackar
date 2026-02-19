import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const updateAnchorSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  locationKey: z.string().trim().min(1).max(160).optional(),
  hourStart: z.coerce.number().int().min(0).max(23).optional(),
  hourEnd: z.coerce.number().int().min(0).max(23).optional(),
  isActive: z.boolean().optional(),
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();
  if (!id) return sendError(res, 400, "Invalid anchor id", "VALIDATION_ERROR");

  const userId = req.auth.userId;

  try {
    const anchor = await prisma.locationAnchor.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!anchor) return sendError(res, 404, "Anchor not found", "NOT_FOUND");

    if (req.method === "PATCH") {
      const limit = checkRateLimit({
        key: `location-anchor:update:${userId}`,
        limit: 40,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) return sendError(res, 429, "Too many requests", "RATE_LIMITED");

      const parsed = updateAnchorSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }
      if (Object.keys(parsed.data).length === 0) {
        return sendError(res, 400, "No fields provided", "VALIDATION_ERROR");
      }

      const updated = await prisma.locationAnchor.update({
        where: { id },
        data: parsed.data,
      });
      return sendOk(res, updated);
    }

    if (req.method === "DELETE") {
      const limit = checkRateLimit({
        key: `location-anchor:delete:${userId}`,
        limit: 20,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) return sendError(res, 429, "Too many requests", "RATE_LIMITED");

      await prisma.locationAnchor.delete({ where: { id } });
      return sendOk(res, { ok: true });
    }

    if (req.method === "GET") {
      const item = await prisma.locationAnchor.findFirst({
        where: { id, userId },
      });
      return sendOk(res, item);
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Location anchor by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(handler);

