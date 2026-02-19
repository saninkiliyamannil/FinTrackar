type OtpEmailInput = {
  to: string;
  code: string;
};

export async function sendEmailOtp({ to, code }: OtpEmailInput) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_OTP_FROM || "no-reply@fintrack.local";

  if (!host || !user || !pass) {
    // Dev fallback so OTP flow can still be tested locally.
    console.info(`[OTP DEV] ${to} -> ${code}`);
    return { delivered: false as const, fallback: true as const };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 3500,
      greetingTimeout: 3500,
      socketTimeout: 4500,
    });

    await transporter.sendMail({
      from,
      to,
      subject: "FinTrack verification code",
      text: `Your FinTrack verification code is: ${code}. It expires in 10 minutes.`,
      html: `<p>Your FinTrack verification code is:</p><p style="font-size:22px;font-weight:700;letter-spacing:2px;">${code}</p><p>It expires in 10 minutes.</p>`,
    });

    return { delivered: true as const, fallback: false as const };
  } catch (error) {
    console.warn("OTP email send failed:", (error as Error).message);
    // Do not fail auth flow if mail transport is slow/unavailable.
    return { delivered: false as const, fallback: true as const };
  }
}
