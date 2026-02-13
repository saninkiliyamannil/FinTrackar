import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    category: {
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

import { categoryByIdHandler } from "../../pages/api/categories/[id]";

describe("/api/categories/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH updates owned category", async () => {
    prismaMock.category.findFirst.mockResolvedValueOnce({ id: "c1" });
    prismaMock.category.update.mockResolvedValueOnce({ id: "c1", name: "Updated" });
    const { req, res } = createMocks({
      method: "PATCH",
      query: { id: "c1" },
      body: { name: "Updated", type: "EXPENSE" },
    });
    (req as any).auth = { userId: "u1", neonAuthId: "n1" };
    await categoryByIdHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({ code: "OK", data: { id: "c1" } });
  });

  it("DELETE returns conflict when category in use", async () => {
    prismaMock.category.findFirst.mockResolvedValueOnce({ id: "c1" });
    prismaMock.transaction.count.mockResolvedValueOnce(2);
    const { req, res } = createMocks({
      method: "DELETE",
      query: { id: "c1" },
    });
    (req as any).auth = { userId: "u1", neonAuthId: "n1" };
    await categoryByIdHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(409);
    expect(res._getJSONData()).toMatchObject({
      code: "ERROR",
      error: { code: "CATEGORY_IN_USE" },
    });
  });
});
