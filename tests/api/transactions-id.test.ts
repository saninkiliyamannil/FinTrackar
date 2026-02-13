import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    transaction: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bankAccount: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { transactionByIdHandler } from "../../pages/api/transactions/[id]";

describe("/api/transactions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: any) =>
      cb({
        transaction: prismaMock.transaction,
        bankAccount: prismaMock.bankAccount,
      })
    );
  });

  it("GET returns 404 when record is not found", async () => {
    prismaMock.transaction.findFirst.mockResolvedValueOnce(null);
    const { req, res } = createMocks({
      method: "GET",
      query: { id: "tx-404" },
    });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };

    await transactionByIdHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "NOT_FOUND", message: "Transaction not found" },
      code: "ERROR",
    });
  });

  it("PATCH updates transaction with valid payload", async () => {
    prismaMock.transaction.findFirst.mockResolvedValueOnce({
      id: "tx-1",
      bankAccountId: "acc-1",
      amount: 50,
      type: "EXPENSE",
    });
    prismaMock.bankAccount.findFirst.mockResolvedValueOnce({ id: "acc-1" });
    prismaMock.category.findFirst.mockResolvedValueOnce({ id: "cat-1" });
    prismaMock.bankAccount.update.mockResolvedValueOnce({ id: "acc-1", balance: 0 });
    prismaMock.transaction.update.mockResolvedValueOnce({ id: "tx-1", note: "Updated" });

    const { req, res } = createMocks({
      method: "PATCH",
      query: { id: "tx-1" },
      body: {
        amount: 50,
        type: "EXPENSE",
        bankAccountId: "acc-1",
        categoryId: "cat-1",
        note: "Updated",
      },
    });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };

    await transactionByIdHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.transaction.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.bankAccount.update).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      data: { id: "tx-1", note: "Updated" },
      error: null,
      code: "OK",
    });
  });

  it("PATCH rejects invalid type", async () => {
    prismaMock.transaction.findFirst.mockResolvedValueOnce({
      id: "tx-1",
      bankAccountId: "acc-1",
      amount: 50,
      type: "EXPENSE",
    });
    const { req, res } = createMocks({
      method: "PATCH",
      query: { id: "tx-1" },
      body: { type: "INVALID_TYPE" },
    });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };

    await transactionByIdHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toMatchObject({
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid payload",
      },
      code: "ERROR",
    });
  });

  it("DELETE removes transaction", async () => {
    prismaMock.transaction.findFirst.mockResolvedValueOnce({
      id: "tx-1",
      bankAccountId: "acc-1",
      amount: 50,
      type: "EXPENSE",
    });
    prismaMock.bankAccount.update.mockResolvedValueOnce({ id: "acc-1", balance: 100 });
    prismaMock.transaction.delete.mockResolvedValueOnce({ id: "tx-1" });
    const { req, res } = createMocks({
      method: "DELETE",
      query: { id: "tx-1" },
    });
    (req as any).auth = { userId: "u-1", email: "u@example.com" };

    await transactionByIdHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.transaction.delete).toHaveBeenCalledWith({
      where: { id: "tx-1" },
    });
    expect(prismaMock.bankAccount.update).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      data: { ok: true },
      error: null,
      code: "OK",
    });
  });
});
