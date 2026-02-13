import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { withAuth } from "@/lib/api/with-auth";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const getSessionFromRequestMock = vi.mocked(getSessionFromRequest);
const findUniqueMock = vi.mocked(prisma.user.findUnique);

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 401 when session parsing fails", async () => {
    getSessionFromRequestMock.mockResolvedValueOnce(null);

    const handler = withAuth(async () => {});
    const { req, res } = createMocks({ method: "GET" });

    await handler(req, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      code: "ERROR",
    });
  });

  it("injects req.auth and continues when session is valid", async () => {
    getSessionFromRequestMock.mockResolvedValueOnce({
      userId: "db-user-1",
      email: "u@example.com",
    });
    findUniqueMock.mockResolvedValueOnce({ id: "db-user-1", email: "u@example.com" } as any);

    const handler = withAuth(async (req, res) => {
      expect(req.auth.userId).toBe("db-user-1");
      expect(req.auth.email).toBe("u@example.com");
      res.status(200).json({ ok: true });
    });

    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res as unknown as NextApiResponse);

    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ ok: true });
  });
});
