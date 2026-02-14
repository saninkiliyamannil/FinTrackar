import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    sharedGroupMember: {
      findFirst: vi.fn(),
    },
    sharedSettlement: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { sharedSettlementByIdHandler } from "../../pages/api/shared-settlements/[id]";

describe("/api/shared-settlements/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH updates status and sets settledAt for SETTLED", async () => {
    prismaMock.sharedSettlement.findUnique.mockResolvedValueOnce({
      id: "s1",
      groupId: "g1",
      amount: 25,
      status: "PROPOSED",
    });
    prismaMock.sharedGroupMember.findFirst.mockResolvedValueOnce({ id: "m-owner", role: "OWNER" });
    prismaMock.sharedSettlement.update.mockResolvedValueOnce({
      id: "s1",
      amount: 25,
      status: "SETTLED",
      note: null,
    });

    const { req, res } = createMocks({
      method: "PATCH",
      query: { id: "s1" },
      body: { status: "SETTLED" },
    });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedSettlementByIdHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.sharedSettlement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: expect.objectContaining({
          status: "SETTLED",
          settledAt: expect.any(Date),
        }),
      })
    );
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({ code: "OK", data: { id: "s1", status: "SETTLED" } });
  });

  it("PATCH rejects invalid status payload", async () => {
    prismaMock.sharedSettlement.findUnique.mockResolvedValueOnce({
      id: "s1",
      groupId: "g1",
      amount: 25,
      status: "PROPOSED",
    });
    prismaMock.sharedGroupMember.findFirst.mockResolvedValueOnce({ id: "m-owner", role: "OWNER" });

    const { req, res } = createMocks({
      method: "PATCH",
      query: { id: "s1" },
      body: { status: "INVALID_STATE" },
    });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedSettlementByIdHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.sharedSettlement.update).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toMatchObject({
      code: "ERROR",
      error: { code: "VALIDATION_ERROR", message: "Invalid payload" },
    });
  });
});

