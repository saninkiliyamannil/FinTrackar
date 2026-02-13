import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { validateNeonSessionMock, prismaMock } = vi.hoisted(() => ({
  validateNeonSessionMock: vi.fn(),
  prismaMock: {
    user: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/neon", () => ({
  validateNeonSession: validateNeonSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("Default export auth wrapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("transactions/[id] default export returns 401 when auth fails", async () => {
    validateNeonSessionMock.mockRejectedValueOnce(new Error("Unauthorized"));
    const module = await import("../../pages/api/transactions/[id]");
    const route = module.default;

    const { req, res } = createMocks({
      method: "GET",
      query: { id: "tx-1" },
    });

    await route(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      code: "ERROR",
    });
  });

  it("analytics/monthly default export returns 401 when auth fails", async () => {
    validateNeonSessionMock.mockRejectedValueOnce(new Error("Unauthorized"));
    const module = await import("../../pages/api/analytics/monthly");
    const route = module.default;

    const { req, res } = createMocks({ method: "GET" });

    await route(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      code: "ERROR",
    });
  });

  it("analytics/monthly default export passes to handler after auth", async () => {
    validateNeonSessionMock.mockResolvedValueOnce({
      neonAuthId: "neon-user-1",
      email: "u@example.com",
      displayName: "User One",
    });
    prismaMock.user.upsert.mockResolvedValueOnce({
      id: "db-user-1",
      neonAuthId: "neon-user-1",
    });

    const module = await import("../../pages/api/analytics/monthly");
    const route = module.default;
    const { req, res } = createMocks({ method: "POST" });

    await route(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "METHOD_NOT_ALLOWED", message: "Method POST not allowed" },
      code: "ERROR",
    });
  });
});
