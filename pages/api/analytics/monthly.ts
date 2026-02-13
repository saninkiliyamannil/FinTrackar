import type { NextApiResponse } from "next";
import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";

const DEFAULT_MONTHS = 6;
const MAX_MONTHS = 24;

function toMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function shiftMonth(date: Date, delta: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function fmtMonth(date: Date) {
  return date.toISOString().slice(0, 7);
}

function parseMonths(raw: unknown) {
  const parsed = Number(raw || DEFAULT_MONTHS);
  if (!Number.isFinite(parsed)) return DEFAULT_MONTHS;
  return Math.max(1, Math.min(MAX_MONTHS, Math.floor(parsed)));
}

const monthlyQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(MAX_MONTHS).optional(),
});

export async function monthlyAnalyticsHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  try {
    const parsed = monthlyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid query parameters",
        "VALIDATION_ERROR",
        parsed.error.flatten()
      );
    }

    const months = parseMonths(parsed.data.months);
    const now = new Date();
    const currentMonth = toMonthStart(now);
    const fromMonth = shiftMonth(currentMonth, -(months - 1));
    const toMonth = shiftMonth(currentMonth, 1);

    const rows = await prisma.transaction.findMany({
      where: {
        userId: req.auth.userId,
        date: {
          gte: fromMonth,
          lt: toMonth,
        },
      },
      select: {
        date: true,
        type: true,
        amount: true,
      },
    });

    const monthAgg = new Map<string, { income: number; expense: number }>();
    for (const row of rows) {
      const key = fmtMonth(toMonthStart(row.date));
      const current = monthAgg.get(key) || { income: 0, expense: 0 };
      const amount = Number(row.amount);
      if (row.type === TransactionType.INCOME) {
        current.income += amount;
      } else {
        current.expense += amount;
      }
      monthAgg.set(key, current);
    }

    const series = Array.from({ length: months }).map((_, idx) => {
      const monthDate = shiftMonth(fromMonth, idx);
      const key = fmtMonth(monthDate);
      const found = monthAgg.get(key) || { income: 0, expense: 0 };
      return {
        month: key,
        income: found.income,
        expense: found.expense,
        net: found.income - found.expense,
      };
    });

    const summary = series.reduce(
      (acc, item) => {
        acc.totalIncome += item.income;
        acc.totalExpense += item.expense;
        acc.net += item.net;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, net: 0 }
    );

    return sendOk(res, { months, from: fmtMonth(fromMonth), series, summary });
  } catch (error) {
    console.error("Monthly analytics API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(monthlyAnalyticsHandler);
