import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendError, sendOk } from "@/lib/api/response";
import { setSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const parsed = loginSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    if (!user) {
      return sendError(res, 401, "Invalid email", "INVALID_CREDENTIALS");
    }

    await setSessionCookie(res, { userId: user.id, email: user.email });
    return sendOk(res, { user });
  } catch (error) {
    console.error("Login API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}
