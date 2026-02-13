import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    goal: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { goalsHandler } from "../../pages/api/goals";

describe("/api/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns goals", async () => {
    prismaMock.goal.findMany.mockResolvedValueOnce([
      {
        id: "g1",
        name: "Emergency Fund",
        targetAmount: 1000,
        currentAmount: 400,
        targetDate: null,
        note: null,
        status: "ACTIVE",
      },
    ]);

    const { req, res } = createMocks({ method: "GET" });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await goalsHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: { summary: { totalTarget: 1000, totalCurrent: 400, total: 1 } },
    });
  });

  it("POST creates a goal", async () => {
    prismaMock.goal.create.mockResolvedValueOnce({
      id: "g1",
      name: "Emergency Fund",
      targetAmount: 1000,
      currentAmount: 200,
      targetDate: null,
      note: null,
      status: "ACTIVE",
    });

    const { req, res } = createMocks({
      method: "POST",
      body: { name: "Emergency Fund", targetAmount: 1000, currentAmount: 200 },
    });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await goalsHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(201);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: { id: "g1", targetAmount: 1000, currentAmount: 200 },
    });
  });
});
