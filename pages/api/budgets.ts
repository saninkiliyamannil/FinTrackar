import type { NextApiResponse } from "next";
import { Prisma, TransactionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const createBudgetSchema = z.object({
  amount: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

function resolveMonthYear(rawMonth?: number, rawYear?: number) {
  const now = new Date();
  return {
    month: rawMonth ?? now.getUTCMonth() + 1,
    year: rawYear ?? now.getUTCFullYear(),
  };
}

function monthRangeUtc(month: number, year: number) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  };
}

export async function budgetsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.auth.userId;

  try {
    if (req.method === "GET") {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        return sendError(res, 400, "Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const { month, year } = resolveMonthYear(parsed.data.month, parsed.data.year);
      const range = monthRangeUtc(month, year);

      const [budgets, spentRows] = await Promise.all([
        prisma.budget.findMany({
          where: { userId, month, year },
          include: {
            category: {
              select: { id: true, name: true, color: true, type: true },
            },
          },
          orderBy: [{ createdAt: "desc" }],
        }),
        prisma.transaction.groupBy({
          by: ["categoryId"],
          where: {
            userId,
            type: TransactionType.EXPENSE,
            categoryId: { not: null },
            date: { gte: range.from, lt: range.to },
          },
          _sum: { amount: true },
        }),
      ]);

      const spentByCategory = new Map<string, number>();
      for (const row of spentRows) {
        if (!row.categoryId) continue;
        spentByCategory.set(row.categoryId, Number(row._sum.amount ?? 0));
      }

      const items = budgets.map((budget) => {
        const planned = Number(budget.amount);
        const spent = spentByCategory.get(budget.categoryId) ?? 0;
        const remaining = planned - spent;
        return {
          ...budget,
          amount: planned,
          spent,
          remaining,
          usageRatio: planned > 0 ? Number((spent / planned).toFixed(4)) : 0,
        };
      });

      const summary = items.reduce(
        (acc, item) => {
          acc.totalBudget += item.amount;
          acc.totalSpent += item.spent;
          acc.totalRemaining += item.remaining;
          return acc;
        },
        { totalBudget: 0, totalSpent: 0, totalRemaining: 0 }
      );

      return sendOk(res, { month, year, items, summary });
    }

    if (req.method === "POST") {
      const limit = checkRateLimit({
        key: `budget:create:${userId}`,
        limit: 30,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = createBudgetSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const { month, year } = resolveMonthYear(parsed.data.month, parsed.data.year);
      const category = await prisma.category.findFirst({
        where: {
          id: parsed.data.categoryId,
          userId,
          type: "EXPENSE",
        },
        select: { id: true },
      });
      if (!category) {
        return sendError(res, 400, "Invalid categoryId (must be an EXPENSE category)", "VALIDATION_ERROR");
      }

      try {
        const created = await prisma.budget.create({
          data: {
            amount: parsed.data.amount,
            categoryId: parsed.data.categoryId,
            month,
            year,
            userId,
          },
          include: {
            category: {
              select: { id: true, name: true, color: true, type: true },
            },
          },
        });
        return sendOk(res, { ...created, amount: Number(created.amount) }, 201);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return sendError(
            res,
            409,
            "Budget already exists for this category in the selected month/year",
            "CONFLICT"
          );
        }
        throw error;
      }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Budgets API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(budgetsHandler);
