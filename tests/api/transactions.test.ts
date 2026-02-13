import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    transaction: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    bankAccount: {
      findFirst: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { transactionsHandler } from "../../pages/api/transactions";

describe("/api/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns paginated transactions for authenticated user", async () => {
    prismaMock.transaction.count.mockResolvedValueOnce(1);
    prismaMock.transaction.findMany.mockResolvedValueOnce([
      { id: "tx-1", amount: 100, type: "INCOME" },
    ]);

    const { req, res } = createMocks({
      method: "GET",
      query: { page: "1", pageSize: "20", type: "income" },
    });

    (req as any).auth = { userId: "user-1", neonAuthId: "neon-1" };

    await transactionsHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.transaction.count).toHaveBeenCalledWith({
      where: { userId: "user-1", type: "INCOME" },
    });
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: {
        page: 1,
        pageSize: 20,
        total: 1,
      },
    });
  });

  it("POST returns 400 for invalid payload", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: { amount: -10, type: "INCOME", bankAccountId: "acc-1" },
    });

    (req as any).auth = { userId: "user-1", neonAuthId: "neon-1" };

    await transactionsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toMatchObject({
      code: "ERROR",
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("POST creates transaction for valid payload", async () => {
    prismaMock.bankAccount.findFirst.mockResolvedValueOnce({ id: "acc-1" });
    prismaMock.category.findFirst.mockResolvedValueOnce({ id: "cat-1" });
    prismaMock.transaction.create.mockResolvedValueOnce({ id: "tx-1" });

    const { req, res } = createMocks({
      method: "POST",
      body: {
        amount: 99.5,
        type: "EXPENSE",
        bankAccountId: "acc-1",
        categoryId: "cat-1",
        note: "Lunch",
      },
    });

    (req as any).auth = { userId: "user-1", neonAuthId: "neon-1" };

    await transactionsHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(201);
    expect(res._getJSONData()).toEqual({
      data: { id: "tx-1" },
      error: null,
      code: "OK",
    });
  });

  it("POST returns 400 when bank account is not owned by user", async () => {
    prismaMock.bankAccount.findFirst.mockResolvedValueOnce(null);

    const { req, res } = createMocks({
      method: "POST",
      body: {
        amount: 10,
        type: "EXPENSE",
        bankAccountId: "acc-missing",
      },
    });

    (req as any).auth = { userId: "user-1", neonAuthId: "neon-1" };

    await transactionsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "VALIDATION_ERROR", message: "Invalid bankAccountId" },
      code: "ERROR",
    });
  });
});
