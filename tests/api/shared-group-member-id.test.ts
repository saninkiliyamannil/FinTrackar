import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    sharedGroupMember: {
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { sharedGroupMemberByIdHandler } from "../../pages/api/shared-groups/[id]/members/[memberId]";

describe("/api/shared-groups/[id]/members/[memberId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH allows owner to change another member role", async () => {
    prismaMock.sharedGroupMember.findFirst
      .mockResolvedValueOnce({ id: "m-owner", role: "OWNER", userId: "u-owner" })
      .mockResolvedValueOnce({ id: "m-member", role: "MEMBER", userId: "u-member" });
    prismaMock.sharedGroupMember.update.mockResolvedValueOnce({
      id: "m-member",
      displayName: "Bob",
      role: "OWNER",
    });

    const { req, res } = createMocks({
      method: "PATCH",
      query: { id: "g1", memberId: "m-member" },
      body: { role: "OWNER" },
    });
    (req as any).auth = { userId: "u-owner", email: "owner@example.com" };

    await sharedGroupMemberByIdHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.sharedGroupMember.update).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: { id: "m-member", role: "OWNER" },
    });
  });

  it("DELETE rejects removing the last owner", async () => {
    prismaMock.sharedGroupMember.findFirst
      .mockResolvedValueOnce({ id: "m-owner", role: "OWNER", userId: "u-owner" })
      .mockResolvedValueOnce({ id: "m-owner", role: "OWNER", userId: "u-owner" });
    prismaMock.sharedGroupMember.count.mockResolvedValueOnce(1);

    const { req, res } = createMocks({
      method: "DELETE",
      query: { id: "g1", memberId: "m-owner" },
    });
    (req as any).auth = { userId: "u-owner", email: "owner@example.com" };

    await sharedGroupMemberByIdHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.sharedGroupMember.delete).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toMatchObject({
      code: "ERROR",
      error: { code: "VALIDATION_ERROR", message: "Cannot remove the last owner" },
    });
  });
});

