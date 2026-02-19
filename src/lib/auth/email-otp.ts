import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MINUTES = 10;

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(email: string, code: string) {
  const secret = process.env.AUTH_SECRET || "fintrack-dev-secret";
  return crypto.createHash("sha256").update(`${email}:${code}:${secret}`).digest("hex");
}

export async function issueEmailOtp(userId: string, email: string) {
  const code = generateOtpCode();
  const otpHash = hashOtp(email.toLowerCase(), code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailOtpHash: otpHash,
      emailOtpExpiresAt: expiresAt,
      emailOtpAttempts: 0,
      emailOtpLastSentAt: new Date(),
    },
  });

  return { code, expiresAt };
}

export async function verifyEmailOtp(email: string, code: string) {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      emailOtpHash: true,
      emailOtpExpiresAt: true,
      emailOtpAttempts: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return { ok: false as const, code: "INVALID_OTP", message: "Invalid OTP." };
  }

  if (user.emailVerified) {
    return { ok: true as const, alreadyVerified: true as const, userId: user.id, email: user.email };
  }

  if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
    return { ok: false as const, code: "OTP_NOT_ISSUED", message: "OTP not found. Request a new code." };
  }

  if (user.emailOtpExpiresAt.getTime() < Date.now()) {
    return { ok: false as const, code: "OTP_EXPIRED", message: "OTP expired. Request a new code." };
  }

  if (user.emailOtpAttempts >= 6) {
    return { ok: false as const, code: "OTP_ATTEMPTS_EXCEEDED", message: "Too many OTP attempts. Request a new code." };
  }

  const expected = hashOtp(normalizedEmail, code);
  if (expected !== user.emailOtpHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailOtpAttempts: { increment: 1 } },
    });
    return { ok: false as const, code: "INVALID_OTP", message: "Invalid OTP." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailOtpHash: null,
      emailOtpExpiresAt: null,
      emailOtpAttempts: 0,
    },
  });

  return { ok: true as const, alreadyVerified: false as const, userId: user.id, email: user.email };
}
