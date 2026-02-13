import type { NextApiResponse } from "next";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return sendError(
      res,
      405,
      `Method ${req.method} not allowed`,
      "METHOD_NOT_ALLOWED"
    );
  }

  return sendOk(res, {
    user: {
      id: req.auth.userId,
      email: req.auth.email,
    },
  });
}

export default withAuth(handler);


