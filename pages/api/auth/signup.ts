import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendError, sendOk } from "@/lib/api/response";
import { setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { hashPassword } from "@/lib/auth/password";

const signupSchema = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().min(1).max(120).optional(),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[a-zA-Z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one number"),
});

function getClientIdentifier(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const clientId = getClientIdentifier(req);
  const ipLimit = checkRateLimit({
    key: `auth:signup:ip:${clientId}`,
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const parsed = signupSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;
  const emailLimit = checkRateLimit({
    key: `auth:signup:email:${email}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!emailLimit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return sendError(res, 409, "Email already registered", "EMAIL_EXISTS");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: parsed.data.displayName || null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    await setSessionCookie(res, { userId: user.id, email: user.email });
    return sendOk(res, { user }, 201);
  } catch (error) {
    console.error("Signup API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}
