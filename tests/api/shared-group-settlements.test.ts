import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";
import { SharedSettlementStatus } from "@prisma/client";

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
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { sharedGroupSettlementsHandler } from "../../pages/api/shared-groups/[id]/settlements";

describe("/api/shared-groups/[id]/settlements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns computed settlement suggestions", async () => {
    prismaMock.sharedGroupMember.findFirst.mockResolvedValueOnce({ id: "m-owner", role: "OWNER" });
    prismaMock.sharedGroupMember.findMany.mockResolvedValueOnce([
      { id: "m1", displayName: "Alice", role: "OWNER" },
      { id: "m2", displayName: "Bob", role: "MEMBER" },
    ]);
    prismaMock.sharedExpense.findMany.mockResolvedValueOnce([
      {
        id: "e1",
        participants: [
          { participantName: "Alice", shareAmount: 50, paidAmount: 100 },
          { participantName: "Bob", shareAmount: 50, paidAmount: 0 },
        ],
      },
    ]);
    prismaMock.sharedSettlement.findMany.mockResolvedValueOnce([]);

    const { req, res } = createMocks({ method: "GET", query: { id: "g1" } });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedGroupSettlementsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: {
        suggestions: [
          {
            fromMemberId: "m2",
            toMemberId: "m1",
            amount: 50,
          },
        ],
      },
    });
  });

  it("POST creates a settlement for valid members", async () => {
    prismaMock.sharedGroupMember.findFirst
      .mockResolvedValueOnce({ id: "m-owner", role: "OWNER" })
      .mockResolvedValueOnce({ id: "m1" })
      .mockResolvedValueOnce({ id: "m2" });
    prismaMock.sharedSettlement.create.mockResolvedValueOnce({
      id: "s1",
      groupId: "g1",
      fromMemberId: "m1",
      toMemberId: "m2",
      amount: 35,
      note: "Lunch split",
      status: SharedSettlementStatus.PROPOSED,
      fromMember: { id: "m1", displayName: "Alice" },
      toMember: { id: "m2", displayName: "Bob" },
    });

    const { req, res } = createMocks({
      method: "POST",
      query: { id: "g1" },
      body: {
        fromMemberId: "m1",
        toMemberId: "m2",
        amount: 35,
        note: "Lunch split",
      },
    });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedGroupSettlementsHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.sharedSettlement.create).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(201);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: {
        id: "s1",
        amount: 35,
        status: "PROPOSED",
        fromMember: { id: "m1", displayName: "Alice" },
        toMember: { id: "m2", displayName: "Bob" },
      },
    });
  });
});
