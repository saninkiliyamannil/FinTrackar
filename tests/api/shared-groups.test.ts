import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    sharedGroup: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { sharedGroupsHandler } from "../../pages/api/shared-groups";

describe("/api/shared-groups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET lists groups for member", async () => {
    prismaMock.sharedGroup.findMany.mockResolvedValueOnce([{ id: "g1", name: "Roommates", members: [] }]);
    const { req, res } = createMocks({ method: "GET" });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedGroupsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({ code: "OK", data: [{ id: "g1" }] });
  });

  it("POST creates group", async () => {
    prismaMock.sharedGroup.findUnique.mockResolvedValueOnce(null);
    prismaMock.sharedGroup.create.mockResolvedValueOnce({
      id: "g1",
      name: "Roommates",
      inviteCode: "ABC123",
      members: [{ id: "m1", userId: "u1", displayName: "Owner", role: "OWNER" }],
    });
    const { req, res } = createMocks({ method: "POST", body: { name: "Roommates" } });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedGroupsHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(201);
    expect(res._getJSONData()).toMatchObject({ code: "OK", data: { id: "g1", inviteCode: "ABC123" } });
  });
});
