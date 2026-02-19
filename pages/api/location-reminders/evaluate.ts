import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";

const evaluateSchema = z.object({
  locationKey: z.string().trim().min(1).max(160),
  atHour: z.coerce.number().int().min(0).max(23).optional(),
});

function isWithinWindow(start: number, end: number, hour: number) {
  if (start <= end) return hour >= start && hour <= end;
  return hour >= start || hour <= end;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const parsed = evaluateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  const userId = req.auth.userId;
  const now = new Date();
  const atHour = parsed.data.atHour ?? now.getHours();

  try {
    const anchors = await prisma.locationAnchor.findMany({
      where: {
        userId,
        isActive: true,
        locationKey: parsed.data.locationKey,
      },
      orderBy: { createdAt: "desc" },
    });

    const match = anchors.find((anchor) => isWithinWindow(anchor.hourStart, anchor.hourEnd, atHour));
    if (!match) {
      return sendOk(res, { shouldRemind: false, reason: "NO_MATCHING_ANCHOR" });
    }

    const lastReminder = await prisma.locationReminderLog.findFirst({
      where: { userId, anchorId: match.id },
      orderBy: { remindedAt: "desc" },
    });
    if (lastReminder) {
      const elapsedMs = now.getTime() - new Date(lastReminder.remindedAt).getTime();
      if (elapsedMs < 12 * 60 * 60 * 1000) {
        return sendOk(res, { shouldRemind: false, reason: "ALREADY_REMINDED_RECENTLY" });
      }
    }

    const message = `You are at ${match.label} around your usual time. Did you pay by cash? Add it to FinTrack.`;
    const reminder = await prisma.locationReminderLog.create({
      data: {
        userId,
        anchorId: match.id,
        message,
      },
    });

    return sendOk(res, {
      shouldRemind: true,
      reminder: {
        id: reminder.id,
        message: reminder.message,
        remindedAt: reminder.remindedAt,
        anchorLabel: match.label,
      },
    });
  } catch (error) {
    console.error("Location reminder evaluate API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(handler);

