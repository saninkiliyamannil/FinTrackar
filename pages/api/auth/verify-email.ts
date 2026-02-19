import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { sendError, sendOk } from "@/lib/api/response";
import { verifyEmailOtp } from "@/lib/auth/email-otp";
import { setSessionCookie } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().trim().email().max(320),
  otp: z.string().trim().regex(/^\d{6}$/),
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

  const result = await verifyEmailOtp(parsed.data.email, parsed.data.otp);
  if (!result.ok) {
    return sendError(res, 400, result.message, result.code);
  }

  await setSessionCookie(res, { userId: result.userId, email: result.email });
  return sendOk(res, { verified: true, alreadyVerified: result.alreadyVerified });
}
