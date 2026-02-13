import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";
import { resetRateLimitBuckets } from "@/lib/api/rate-limit";

const { prismaMock, setSessionCookieMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
  setSessionCookieMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/session", () => ({
  setSessionCookie: setSessionCookieMock,
}));

describe("auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
  });

  it("rate limits signup attempts by email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" });
    const module = await import("../../pages/api/auth/signup");
    const route = module.default;

    let statusCode = 0;
    for (let i = 0; i < 6; i += 1) {
      const { req, res } = createMocks({
        method: "POST",
        headers: { "x-forwarded-for": "1.2.3.4" },
        body: { email: "already@example.com", password: "Password123" },
      });

      await route(req as any, res as unknown as NextApiResponse);
      statusCode = res._getStatusCode();
    }

    expect(statusCode).toBe(429);
  });

  it("rate limits login attempts by email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const module = await import("../../pages/api/auth/login");
    const route = module.default;

    let statusCode = 0;
    for (let i = 0; i < 13; i += 1) {
      const { req, res } = createMocks({
        method: "POST",
        headers: { "x-forwarded-for": "5.6.7.8" },
        body: { email: "missing@example.com", password: "Password123" },
      });

      await route(req as any, res as unknown as NextApiResponse);
      statusCode = res._getStatusCode();
    }

    expect(statusCode).toBe(429);
  });
});
