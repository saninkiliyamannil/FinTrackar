import { describe, expect, it, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { createSessionToken, parseSessionToken } from "@/lib/auth/session";

describe("session token", () => {
  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = "test-secret-123";
  });

  it("parses valid token payload", async () => {
    const token = await createSessionToken({
      userId: "user-1",
      email: "user@example.com",
    });

    const session = await parseSessionToken(token);
    expect(session).toEqual({
      userId: "user-1",
      email: "user@example.com",
    });
  });

  it("returns null for expired token", async () => {
    const secret = new TextEncoder().encode(process.env.AUTH_SESSION_SECRET);
    const token = await new SignJWT({ email: "user@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuedAt()
      .setExpirationTime("-1s")
      .sign(secret);

    const session = await parseSessionToken(token);
    expect(session).toBeNull();
  });
});
