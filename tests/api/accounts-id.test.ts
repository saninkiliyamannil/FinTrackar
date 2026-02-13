import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    bankAccount: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transaction: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { accountByIdHandler } from "../../pages/api/accounts/[id]";

describe("/api/accounts/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH updates owned account", async () => {
    prismaMock.bankAccount.findFirst.mockResolvedValueOnce({ id: "a1" });
    prismaMock.bankAccount.update.mockResolvedValueOnce({ id: "a1", name: "Updated" });
    const { req, res } = createMocks({
      method: "PATCH",
      query: { id: "a1" },
      body: { name: "Updated", type: "BANK" },
    });
    (req as any).auth = { userId: "u1", neonAuthId: "n1" };
    await accountByIdHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({ code: "OK", data: { id: "a1" } });
  });

  it("DELETE returns conflict when account in use", async () => {
    prismaMock.bankAccount.findFirst.mockResolvedValueOnce({ id: "a1" });
    prismaMock.transaction.count.mockResolvedValueOnce(3);
    const { req, res } = createMocks({
      method: "DELETE",
      query: { id: "a1" },
    });
    (req as any).auth = { userId: "u1", neonAuthId: "n1" };
    await accountByIdHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(409);
    expect(res._getJSONData()).toMatchObject({
      code: "ERROR",
      error: { code: "ACCOUNT_IN_USE" },
    });
  });
});
