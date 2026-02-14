import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    sharedGroupMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    sharedExpense: {
      findMany: vi.fn(),
    },
    sharedSettlement: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { settleAllSharedGroupHandler } from "../../pages/api/shared-groups/[id]/settlements/settle-all";

describe("/api/shared-groups/[id]/settlements/settle-all", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST creates settled records from suggestions", async () => {
    prismaMock.sharedGroupMember.findFirst.mockResolvedValueOnce({ id: "m-owner", role: "OWNER" });
    prismaMock.sharedGroupMember.findMany.mockResolvedValueOnce([
      { id: "m1", displayName: "Alice" },
      { id: "m2", displayName: "Bob" },
    ]);
    prismaMock.sharedExpense.findMany.mockResolvedValueOnce([
      {
        participants: [
          { participantName: "Alice", shareAmount: 50, paidAmount: 100 },
          { participantName: "Bob", shareAmount: 50, paidAmount: 0 },
        ],
      },
    ]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn({
        sharedSettlement: {
          create: vi.fn().mockResolvedValue({
            id: "s1",
            groupId: "g1",
            fromMemberId: "m2",
            toMemberId: "m1",
            amount: 50,
            status: "SETTLED",
            fromMember: { id: "m2", displayName: "Bob" },
            toMember: { id: "m1", displayName: "Alice" },
          }),
        },
      })
    );

    const { req, res } = createMocks({ method: "POST", query: { id: "g1" } });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await settleAllSharedGroupHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: {
        created: 1,
        settlements: [{ id: "s1", amount: 50, status: "SETTLED" }],
      },
    });
  });

  it("POST returns created=0 when no suggestions exist", async () => {
    prismaMock.sharedGroupMember.findFirst.mockResolvedValueOnce({ id: "m-owner", role: "OWNER" });
    prismaMock.sharedGroupMember.findMany.mockResolvedValueOnce([
      { id: "m1", displayName: "Alice" },
      { id: "m2", displayName: "Bob" },
    ]);
    prismaMock.sharedExpense.findMany.mockResolvedValueOnce([
      {
        participants: [
          { participantName: "Alice", shareAmount: 50, paidAmount: 50 },
          { participantName: "Bob", shareAmount: 50, paidAmount: 50 },
        ],
      },
    ]);

    const { req, res } = createMocks({ method: "POST", query: { id: "g1" } });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await settleAllSharedGroupHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: { created: 0, settlements: [] },
    });
  });
});

