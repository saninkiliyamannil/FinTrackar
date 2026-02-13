import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    sharedExpense: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    sharedExpenseParticipant: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { sharedExpenseByIdHandler } from "../../pages/api/shared-expenses/[id]";

describe("/api/shared-expenses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: any) =>
      cb({
        sharedExpense: prismaMock.sharedExpense,
        sharedExpenseParticipant: prismaMock.sharedExpenseParticipant,
      })
    );
  });

  it("GET returns not found for unknown shared expense", async () => {
    prismaMock.sharedExpense.findFirst.mockResolvedValueOnce(null);
    const { req, res } = createMocks({ method: "GET", query: { id: "missing" } });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedExpenseByIdHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toMatchObject({ code: "ERROR", error: { code: "NOT_FOUND" } });
  });

  it("DELETE removes owned shared expense", async () => {
    prismaMock.sharedExpense.findFirst.mockResolvedValueOnce({ id: "se-1", userId: "u1", participants: [] });
    prismaMock.sharedExpense.delete.mockResolvedValueOnce({ id: "se-1" });

    const { req, res } = createMocks({ method: "DELETE", query: { id: "se-1" } });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedExpenseByIdHandler(req as any, res as unknown as NextApiResponse);
    expect(prismaMock.sharedExpense.delete).toHaveBeenCalledWith({ where: { id: "se-1" } });
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({ code: "OK", data: { ok: true } });
  });
});
