import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

vi.mock("@/lib/api/with-auth", () => ({
  withAuth: (handler: any) => {
    return async (req: any, res: any) => {
      req.auth = { userId: "user-1", email: "u@example.com" };
      return handler(req, res);
    };
  },
}));

describe("/api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns authenticated user envelope for valid session", async () => {
    const module = await import("../../pages/api/auth/session");
    const route = module.default;
    const { req, res } = createMocks({ method: "GET" });

    await route(req as any, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      data: { user: { id: "user-1", email: "u@example.com" } },
      error: null,
      code: "OK",
    });
  });

  it("returns 405 envelope for unsupported method", async () => {
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
