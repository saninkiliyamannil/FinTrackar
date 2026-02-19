import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendError, sendOk } from "@/lib/api/response";
import { issueEmailOtp } from "@/lib/auth/email-otp";
import { sendEmailOtp } from "@/lib/email/send-email-otp";
import { checkRateLimit } from "@/lib/api/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(320),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase();
  const limit = checkRateLimit({
    key: `auth:otp:resend:${email}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user) {
    return sendOk(res, { sent: true });
  }
  if (user.emailVerified) {
    return sendOk(res, { sent: false, message: "Email already verified." });
  }

  const otp = await issueEmailOtp(user.id, user.email);
  await sendEmailOtp({ to: user.email, code: otp.code });
  return sendOk(res, { sent: true });
}
