import type { NextApiResponse } from "next";
import { GoalStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).optional(),
  targetDate: z.coerce.date().optional(),
  note: z.string().trim().max(600).optional(),
  status: z.nativeEnum(GoalStatus).optional(),
});

function goalStatusForAmounts(
  targetAmount: number,
  currentAmount: number,
  fallbackStatus: GoalStatus = GoalStatus.ACTIVE
) {
  if (currentAmount >= targetAmount) return GoalStatus.COMPLETED;
  return fallbackStatus;
}

export async function goalsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.auth.userId;

  try {
    if (req.method === "GET") {
      const goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: [{ status: "asc" }, { targetDate: "asc" }, { createdAt: "desc" }],
      });

      const items = goals.map((goal) => ({
        ...goal,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount),
        progressRatio:
          Number(goal.targetAmount) > 0
            ? Number((Number(goal.currentAmount) / Number(goal.targetAmount)).toFixed(4))
            : 0,
      }));

      const summary = items.reduce(
        (acc, goal) => {
          acc.totalTarget += goal.targetAmount;
          acc.totalCurrent += goal.currentAmount;
          if (goal.status === GoalStatus.COMPLETED) acc.completed += 1;
          return acc;
        },
        { totalTarget: 0, totalCurrent: 0, completed: 0, total: items.length }
      );

      return sendOk(res, { items, summary });
    }

    if (req.method === "POST") {
      const limit = checkRateLimit({
        key: `goal:create:${userId}`,
        limit: 30,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = createGoalSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const currentAmount = parsed.data.currentAmount ?? 0;
      const resolvedStatus = goalStatusForAmounts(
        parsed.data.targetAmount,
        currentAmount,
        parsed.data.status ?? GoalStatus.ACTIVE
      );

      const goal = await prisma.goal.create({
        data: {
          name: parsed.data.name,
          targetAmount: parsed.data.targetAmount,
          currentAmount,
          targetDate: parsed.data.targetDate ?? null,
          note: parsed.data.note ?? null,
          status: resolvedStatus,
          userId,
        },
      });

      return sendOk(
        res,
        {
          ...goal,
          targetAmount: Number(goal.targetAmount),
          currentAmount: Number(goal.currentAmount),
        },
        201
      );
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Goals API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(goalsHandler);
