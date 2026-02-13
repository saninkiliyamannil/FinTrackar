import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { transactionExportCsvHandler } from "../../pages/api/transactions/export.csv";

describe("/api/transactions/export.csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 405 for non-GET", async () => {
    const { req, res } = createMocks({ method: "POST" });
    (req as any).auth = { userId: "u-1", neonAuthId: "n-1" };

    await transactionExportCsvHandler(req as any, res as unknown as NextApiResponse);
    expect(res._getStatusCode()).toBe(405);
  });

  it("returns CSV with headers and rows", async () => {
    prismaMock.transaction.findMany.mockResolvedValueOnce([
      {
        id: "t1",
        date: new Date("2026-02-01T00:00:00.000Z"),
        type: "EXPENSE",
        amount: { toString: () => "42.50" },
        note: "Coffee",
        category: { name: "Food" },
        bankAccount: { name: "Main" },
      },
    ]);

    const { req, res } = createMocks({ method: "GET", query: {} });
    (req as any).auth = { userId: "u-1", neonAuthId: "n-1" };

    await transactionExportCsvHandler(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()["content-type"]).toContain("text/csv");
    const body = res._getData();
    expect(body).toContain("id,date,type,amount,note,category,bankAccount");
    expect(body).toContain("t1,2026-02-01T00:00:00.000Z,EXPENSE,42.50,Coffee,Food,Main");
  });
});
