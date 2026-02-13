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

import { monthlyAnalyticsHandler } from "../../pages/api/analytics/monthly";

describe("/api/analytics/monthly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 405 for non-GET methods", async () => {
    const { req, res } = createMocks({ method: "POST" });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };

    await monthlyAnalyticsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "METHOD_NOT_ALLOWED", message: "Method POST not allowed" },
      code: "ERROR",
    });
  });

  it("returns normalized monthly series and summary", async () => {
    prismaMock.transaction.findMany.mockResolvedValueOnce([
      { date: new Date("2026-01-04T00:00:00.000Z"), type: "INCOME", amount: "200" },
      { date: new Date("2026-01-06T00:00:00.000Z"), type: "EXPENSE", amount: "50" },
      { date: new Date("2026-02-10T00:00:00.000Z"), type: "INCOME", amount: "100" },
      { date: new Date("2026-02-11T00:00:00.000Z"), type: "EXPENSE", amount: "125" },
    ]);

    const { req, res } = createMocks({
      method: "GET",
      query: { months: "2" },
    });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };

    await monthlyAnalyticsHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);

    const body = res._getJSONData();
    expect(body.code).toBe("OK");
    expect(body.data.months).toBe(2);
    expect(body.data.series).toHaveLength(2);
    expect(body.data.summary).toMatchObject({
      totalIncome: 300,
      totalExpense: 175,
      net: 125,
    });
  });

  it("clamps months query to max range", async () => {
    prismaMock.transaction.findMany.mockResolvedValueOnce([]);
    const { req, res } = createMocks({
      method: "GET",
      query: { months: "999" },
    });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };

    await monthlyAnalyticsHandler(req as any, res as unknown as NextApiResponse);

    const body = res._getJSONData();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
