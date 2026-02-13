import type { NextApiResponse } from "next";
import { GoalStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

function parseId(req: AuthenticatedRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  targetAmount: z.coerce.number().positive().optional(),
  currentAmount: z.coerce.number().min(0).optional(),
  targetDate: z.coerce.date().nullable().optional(),
  note: z.string().trim().max(600).nullable().optional(),
  status: z.nativeEnum(GoalStatus).optional(),
});

function resolveStatus(
  targetAmount: number,
  currentAmount: number,
  explicitStatus?: GoalStatus
) {
  if (explicitStatus === GoalStatus.ARCHIVED) return GoalStatus.ARCHIVED;
  if (currentAmount >= targetAmount) return GoalStatus.COMPLETED;
  return explicitStatus ?? GoalStatus.ACTIVE;
}

export async function goalByIdHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const id = parseId(req);
  if (!id) {
    return sendError(res, 400, "Invalid goal id", "VALIDATION_ERROR");
  }

  try {
    const existing = await prisma.goal.findFirst({
      where: { id, userId: req.auth.userId },
    });
    if (!existing) {
      return sendError(res, 404, "Goal not found", "NOT_FOUND");
    }

    if (req.method === "GET") {
      return sendOk(res, {
        ...existing,
        targetAmount: Number(existing.targetAmount),
        currentAmount: Number(existing.currentAmount),
      });
    }

    if (req.method === "PATCH") {
      const limit = checkRateLimit({
        key: `goal:update:${req.auth.userId}`,
        limit: 90,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = updateGoalSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }
      if (Object.keys(parsed.data).length === 0) {
        return sendError(res, 400, "No fields provided", "VALIDATION_ERROR");
      }

      const targetAmount = parsed.data.targetAmount ?? Number(existing.targetAmount);
      const currentAmount = parsed.data.currentAmount ?? Number(existing.currentAmount);
      const resolvedStatus = resolveStatus(targetAmount, currentAmount, parsed.data.status);

      const updated = await prisma.goal.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.targetAmount !== undefined ? { targetAmount: parsed.data.targetAmount } : {}),
          ...(parsed.data.currentAmount !== undefined ? { currentAmount: parsed.data.currentAmount } : {}),
          ...(parsed.data.targetDate !== undefined ? { targetDate: parsed.data.targetDate } : {}),
          ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
          status: resolvedStatus,
        },
      });
      return sendOk(res, {
        ...updated,
        targetAmount: Number(updated.targetAmount),
        currentAmount: Number(updated.currentAmount),
      });
    }

    if (req.method === "DELETE") {
      const limit = checkRateLimit({
        key: `goal:delete:${req.auth.userId}`,
        limit: 45,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }
      await prisma.goal.delete({ where: { id } });
      return sendOk(res, { ok: true });
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Goal by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(goalByIdHandler);
