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

import { categoryBreakdownHandler } from "../../pages/api/analytics/category-breakdown";

describe("/api/analytics/category-breakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns method not allowed for POST", async () => {
    const { req, res } = createMocks({ method: "POST" });
    (req as any).auth = { userId: "u-1", neonAuthId: "n-1" };

    await categoryBreakdownHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "METHOD_NOT_ALLOWED", message: "Method POST not allowed" },
      code: "ERROR",
    });
  });

  it("returns normalized category items", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      { categoryId: "c-1", categoryName: "Food", amount: "250.5" },
      { categoryId: null, categoryName: null, amount: "49.5" },
    ]);

    const { req, res } = createMocks({
      method: "GET",
      query: { months: "3", type: "EXPENSE" },
    });
    (req as any).auth = { userId: "u-1", neonAuthId: "n-1" };

    await categoryBreakdownHandler(req as any, res as unknown as NextApiResponse);
    const body = res._getJSONData();

    expect(res._getStatusCode()).toBe(200);
    expect(body.code).toBe("OK");
    expect(body.data.total).toBe(300);
    expect(body.data.items[0]).toMatchObject({
      categoryName: "Food",
      amount: 250.5,
    });
    expect(body.data.items[1]).toMatchObject({
      categoryName: "Uncategorized",
      amount: 49.5,
    });
  });
});
