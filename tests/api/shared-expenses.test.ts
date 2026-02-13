import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    sharedExpense: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { sharedExpensesHandler } from "../../pages/api/shared-expenses";

describe("/api/shared-expenses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns paginated shared expenses", async () => {
    prismaMock.sharedExpense.count.mockResolvedValueOnce(1);
    prismaMock.sharedExpense.findMany.mockResolvedValueOnce([
      {
        id: "se-1",
        title: "Apartment Groceries",
        totalAmount: 120,
        participants: [
          { id: "p1", participantName: "Alice", shareAmount: 60, paidAmount: 60, isSettled: true },
          { id: "p2", participantName: "Bob", shareAmount: 60, paidAmount: 0, isSettled: false },
        ],
      },
    ]);

    const { req, res } = createMocks({ method: "GET" });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedExpensesHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      code: "OK",
      data: {
        total: 1,
        summary: { totalAmount: 120, totalParticipants: 2, settledParticipants: 1 },
      },
    });
  });

  it("POST creates shared expense with equal split", async () => {
    prismaMock.sharedExpense.create.mockResolvedValueOnce({
      id: "se-1",
      title: "Dinner",
      totalAmount: 90,
      participants: [
        { id: "p1", participantName: "A", shareAmount: 45, paidAmount: 0, isSettled: false },
        { id: "p2", participantName: "B", shareAmount: 45, paidAmount: 0, isSettled: false },
      ],
    });

    const { req, res } = createMocks({
      method: "POST",
      body: {
        title: "Dinner",
        totalAmount: 90,
        participants: [{ participantName: "A" }, { participantName: "B" }],
      },
    });
    (req as any).auth = { userId: "u1", email: "u@example.com" };

    await sharedExpensesHandler(req as any, res as unknown as NextApiResponse);

    expect(prismaMock.sharedExpense.create).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(201);
    expect(res._getJSONData()).toMatchObject({ code: "OK", data: { id: "se-1", totalAmount: 90 } });
  });
});
