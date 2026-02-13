import type { NextApiRequest, NextApiResponse } from "next";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

export interface AppSession {
  userId: string;
  email: string;
}

const encoder = new TextEncoder();
const SESSION_COOKIE_NAME = "fintrack_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SESSION_SECRET");
  }
  return encoder.encode(secret);
}

function serializeCookie(name: string, value: string, maxAge?: number) {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : "",
    typeof maxAge === "number" ? `Max-Age=${maxAge}` : "",
  ].filter(Boolean);

  return parts.join("; ");
}

export async function createSessionToken(session: AppSession) {
  return new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function parseSessionToken(token: string): Promise<AppSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JWTInvalid ||
      error instanceof joseErrors.JWSSignatureVerificationFailed
    ) {
      return null;
    }
    throw error;
  }
}

export function getSessionTokenFromRequest(req: NextApiRequest) {
  return req.cookies?.[SESSION_COOKIE_NAME] || null;
}

export async function getSessionFromRequest(req: NextApiRequest) {
  const token = getSessionTokenFromRequest(req);
  if (!token) {
    return null;
  }
  return parseSessionToken(token);
}

export async function setSessionCookie(res: NextApiResponse, session: AppSession) {
  const token = await createSessionToken(session);
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE_NAME, token, SESSION_TTL_SECONDS));
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE_NAME, "", 0));
}

