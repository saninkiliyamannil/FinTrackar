import type { NextApiRequest, NextApiResponse } from "next";
import { sendError, sendOk } from "@/lib/api/response";
import { clearSessionCookie } from "@/lib/auth/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  clearSessionCookie(res);
  return sendOk(res, { ok: true });
}
