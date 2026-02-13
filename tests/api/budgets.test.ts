import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    budget: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    transaction: {
      groupBy: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { budgetsHandler } from "../../pages/api/budgets";

describe("/api/budgets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns budgets with summary", async () => {
    prismaMock.budget.findMany.mockResolvedValueOnce([
      {
        id: "b1",
        amount: 500,
        month: 2,
        year: 2026,
        categoryId: "c1",
        category: { id: "c1", name: "Food", color: "#16a34a", type: "EXPENSE" },
      },
    ]);
    prismaMock.transaction.groupBy.mockResolvedValueOnce([{ categoryId: "c1", _sum: { amount: 125 } }]);

    const { req, res } = createMocks({ method: "GET", query: { month: "2", year: "2026" } });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await budgetsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: {
        month: 2,
        year: 2026,
        summary: { totalBudget: 500, totalSpent: 125 },
      },
    });
  });

  it("POST creates budget", async () => {
    prismaMock.category.findFirst.mockResolvedValueOnce({ id: "c1" });
    prismaMock.budget.create.mockResolvedValueOnce({
      id: "b1",
      amount: 500,
      month: 2,
      year: 2026,
      categoryId: "c1",
      category: { id: "c1", name: "Food", color: "#16a34a", type: "EXPENSE" },
    });

    const { req, res } = createMocks({
      method: "POST",
      body: { amount: 500, categoryId: "c1", month: 2, year: 2026 },
    });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await budgetsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(201);
    expect(res._getJSONData()).toMatchObject({ code: "OK", data: { id: "b1", amount: 500 } });
  });
});
