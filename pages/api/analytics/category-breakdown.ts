import type { NextApiResponse } from "next";
import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";

const querySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
});

function toMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function shiftMonth(date: Date, delta: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

export async function categoryBreakdownHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid query parameters",
        "VALIDATION_ERROR",
        parsed.error.flatten()
      );
    }

    const months = parsed.data.months ?? 6;
    const txType = parsed.data.type ?? TransactionType.EXPENSE;
    const now = new Date();
    const fromMonth = shiftMonth(toMonthStart(now), -(months - 1));
    const toMonth = shiftMonth(toMonthStart(now), 1);

    const rows = await prisma.transaction.findMany({
      where: {
        userId: req.auth.userId,
        type: txType,
        date: {
          gte: fromMonth,
          lt: toMonth,
        },
      },
      select: {
        amount: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const agg = new Map<string, { categoryId: string | null; categoryName: string; amount: number }>();

    for (const row of rows) {
      const categoryId = row.categoryId ?? null;
      const categoryName = row.category?.name || "Uncategorized";
      const key = `${categoryId || "none"}::${categoryName}`;
      const current = agg.get(key) || {
        categoryId,
        categoryName,
        amount: 0,
      };
      current.amount += Number(row.amount);
      agg.set(key, current);
    }

    const sorted = Array.from(agg.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12);

    const total = sorted.reduce((sum, row) => sum + row.amount, 0);
    const items = sorted.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      amount: row.amount,
      share: total > 0 ? Number((row.amount / total).toFixed(4)) : 0,
    }));

    return sendOk(res, {
      months,
      type: txType,
      total,
      items,
    });
  } catch (error) {
    console.error("Category breakdown API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(categoryBreakdownHandler);
