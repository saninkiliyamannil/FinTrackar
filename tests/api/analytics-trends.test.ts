import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { trendsAnalyticsHandler } from "../../pages/api/analytics/trends";

describe("/api/analytics/trends", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 405 for non-GET methods", async () => {
    const { req, res } = createMocks({ method: "POST" });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };
    await trendsAnalyticsHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(405);
  });

  it("returns daily trend points and summary", async () => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
    const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 10));

    prismaMock.transaction.findMany.mockResolvedValueOnce([
      { date: today, type: "INCOME", amount: "200" },
      { date: today, type: "EXPENSE", amount: "80" },
      { date: yesterday, type: "EXPENSE", amount: "20" },
    ]);

    const { req, res } = createMocks({
      method: "GET",
      query: { period: "daily", range: "2" },
    });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };

    await trendsAnalyticsHandler(req as any, res as unknown as NextApiResponse);
    const body = res._getJSONData();
    expect(res._getStatusCode()).toBe(200);
    expect(body.code).toBe("OK");
    expect(body.data.period).toBe("daily");
    expect(body.data.points).toHaveLength(2);
    expect(body.data.summary.totalIncome).toBe(200);
    expect(body.data.summary.totalExpense).toBe(100);
    expect(body.data.summary.totalSavings).toBe(100);
  });
});
