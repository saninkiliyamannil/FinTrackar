import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiResponse } from "next";

vi.mock("@/lib/auth/neon", () => ({
  validateNeonSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
  },
}));

import { withNeonAuth } from "@/lib/api/with-neon-auth";
import { validateNeonSession } from "@/lib/auth/neon";
import { prisma } from "@/lib/prisma";

const validateNeonSessionMock = vi.mocked(validateNeonSession);
const upsertMock = vi.mocked(prisma.user.upsert);

describe("withNeonAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 401 when token validation fails", async () => {
    validateNeonSessionMock.mockRejectedValueOnce(new Error("Unauthorized"));

    const handler = withNeonAuth(async () => {});
    const { req, res } = createMocks({ method: "GET" });

    await handler(req, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({
      data: null,
      error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      code: "ERROR",
    });
  });

  it("injects req.auth and continues when token is valid", async () => {
    validateNeonSessionMock.mockResolvedValueOnce({
      neonAuthId: "neon-user-1",
      email: "u@example.com",
      displayName: "User One",
    });
    upsertMock.mockResolvedValueOnce({ id: "db-user-1", neonAuthId: "neon-user-1" });

    const handler = withNeonAuth(async (req, res) => {
      expect(req.auth.userId).toBe("db-user-1");
      expect(req.auth.neonAuthId).toBe("neon-user-1");
      res.status(200).json({ ok: true });
    });

    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res as unknown as NextApiResponse);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ ok: true });
  });
});
