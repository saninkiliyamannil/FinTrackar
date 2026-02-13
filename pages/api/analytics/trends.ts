import type { NextApiResponse } from "next";
import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";

const periodSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

const querySchema = z.object({
  period: periodSchema.optional(),
  range: z.coerce.number().int().min(1).max(366).optional(),
});

type TrendPeriod = z.infer<typeof periodSchema>;

function toUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function toUtcYear(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function startOfUtcWeek(date: Date) {
  const day = date.getUTCDay();
  const shift = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - shift));
}

function addPeriod(date: Date, period: TrendPeriod, step: number) {
  if (period === "daily") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + step));
  if (period === "weekly") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + step * 7));
  if (period === "monthly") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + step, 1));
  return new Date(Date.UTC(date.getUTCFullYear() + step, 0, 1));
}

function normalizeRange(period: TrendPeriod, rawRange?: number) {
  const defaults: Record<TrendPeriod, number> = {
    daily: 14,
    weekly: 12,
    monthly: 12,
    yearly: 5,
  };
  const maxes: Record<TrendPeriod, number> = {
    daily: 90,
    weekly: 52,
    monthly: 36,
    yearly: 12,
  };
  const value = rawRange ?? defaults[period];
  return Math.min(maxes[period], Math.max(1, value));
}

function currentBucketStart(now: Date, period: TrendPeriod) {
  if (period === "daily") return toUtcDay(now);
  if (period === "weekly") return startOfUtcWeek(now);
  if (period === "monthly") return toUtcMonth(now);
  return toUtcYear(now);
}

function bucketKey(start: Date, period: TrendPeriod) {
  if (period === "daily") return start.toISOString().slice(0, 10);
  if (period === "weekly") return start.toISOString().slice(0, 10);
  if (period === "monthly") return start.toISOString().slice(0, 7);
  return String(start.getUTCFullYear());
}

function bucketLabel(start: Date, period: TrendPeriod) {
  if (period === "daily") {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  if (period === "weekly") {
    const end = addPeriod(start, "daily", 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}-${end.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
  }
  if (period === "monthly") {
    return start.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return String(start.getUTCFullYear());
}

function dateToBucketStart(date: Date, period: TrendPeriod) {
  if (period === "daily") return toUtcDay(date);
  if (period === "weekly") return startOfUtcWeek(date);
  if (period === "monthly") return toUtcMonth(date);
  return toUtcYear(date);
}

export async function trendsAnalyticsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 400, "Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten());
    }

    const period = parsed.data.period ?? "monthly";
    const range = normalizeRange(period, parsed.data.range);

    const now = new Date();
    const endBucketStart = currentBucketStart(now, period);
    const fromBucketStart = addPeriod(endBucketStart, period, -(range - 1));
    const untilExclusive = addPeriod(endBucketStart, period, 1);

    const rows = await prisma.transaction.findMany({
      where: {
        userId: req.auth.userId,
        date: {
          gte: fromBucketStart,
          lt: untilExclusive,
        },
      },
      select: {
        date: true,
        type: true,
        amount: true,
      },
    });

    const agg = new Map<string, { income: number; expense: number }>();
    for (const row of rows) {
      const start = dateToBucketStart(row.date, period);
      const key = bucketKey(start, period);
      const current = agg.get(key) ?? { income: 0, expense: 0 };
      const amount = Number(row.amount);
      if (row.type === TransactionType.INCOME) current.income += amount;
      else current.expense += amount;
      agg.set(key, current);
    }

    const points = Array.from({ length: range }).map((_, idx) => {
      const start = addPeriod(fromBucketStart, period, idx);
      const key = bucketKey(start, period);
      const found = agg.get(key) ?? { income: 0, expense: 0 };
      return {
        key,
        label: bucketLabel(start, period),
        start: start.toISOString(),
        income: found.income,
        expense: found.expense,
        savings: found.income - found.expense,
      };
    });

    const summary = points.reduce(
      (acc, point) => {
        acc.totalIncome += point.income;
        acc.totalExpense += point.expense;
        acc.totalSavings += point.savings;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, totalSavings: 0 }
    );

    const avgDivisor = Math.max(points.length, 1);
    return sendOk(res, {
      period,
      range,
      from: fromBucketStart.toISOString(),
      to: untilExclusive.toISOString(),
      points,
      summary: {
        ...summary,
        averageIncome: summary.totalIncome / avgDivisor,
        averageExpense: summary.totalExpense / avgDivisor,
      },
    });
  } catch (error) {
    console.error("Trends analytics API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(trendsAnalyticsHandler);
