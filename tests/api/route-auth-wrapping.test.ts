import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

const { getSessionFromRequestMock, prismaMock } = vi.hoisted(() => ({
  getSessionFromRequestMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: getSessionFromRequestMock,
  clearSessionCookie: vi.fn(),
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
    getSessionFromRequestMock.mockResolvedValueOnce(null);
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
    getSessionFromRequestMock.mockResolvedValueOnce(null);
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
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: "db-user-1",
      email: "u@example.com",
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "db-user-1",
      email: "u@example.com",
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
