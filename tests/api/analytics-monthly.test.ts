import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
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
    (req as any).auth = { userId: "u-1", neonAuthId: "n-1" };

    await monthlyAnalyticsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "METHOD_NOT_ALLOWED", message: "Method POST not allowed" },
      code: "ERROR",
    });
  });

  it("returns normalized monthly series and summary", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      { month: new Date("2026-01-01T00:00:00.000Z"), income: "200", expense: "50" },
      { month: new Date("2026-02-01T00:00:00.000Z"), income: "100", expense: "125" },
    ]);

    const { req, res } = createMocks({
      method: "GET",
      query: { months: "2" },
    });
    (req as any).auth = { userId: "u-1", neonAuthId: "n-1" };

    await monthlyAnalyticsHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
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
    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    const { req, res } = createMocks({
      method: "GET",
      query: { months: "999" },
    });
    (req as any).auth = { userId: "u-1", neonAuthId: "n-1" };

    await monthlyAnalyticsHandler(req as any, res as unknown as NextApiResponse);

    const body = res._getJSONData();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
