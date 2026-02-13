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

describe("/api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns authenticated user envelope for valid session", async () => {
    validateNeonSessionMock.mockResolvedValueOnce({ neonAuthId: "neon-1" });
    prismaMock.user.upsert.mockResolvedValueOnce({ id: "user-1", neonAuthId: "neon-1" });
    const module = await import("../../pages/api/auth/session");
    const route = module.default;
    const { req, res } = createMocks({ method: "GET" });

    await route(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      data: { user: { id: "user-1", neonAuthId: "neon-1" } },
      error: null,
      code: "OK",
    });
  });

  it("returns 405 envelope for unsupported method", async () => {
    validateNeonSessionMock.mockResolvedValueOnce({ neonAuthId: "neon-1" });
    prismaMock.user.upsert.mockResolvedValueOnce({ id: "user-1", neonAuthId: "neon-1" });
    const module = await import("../../pages/api/auth/session");
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
