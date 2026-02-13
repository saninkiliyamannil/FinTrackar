import type { NextApiRequest, NextApiResponse } from "next";
import { sendOk } from "@/lib/api/response";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return sendOk(res, { status: "ok" });
}


