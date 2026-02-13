import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { sendError } from "@/lib/api/response";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/auth/session";

export interface AuthenticatedRequest extends NextApiRequest {
  auth: {
    userId: string;
    email: string;
  };
}

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<unknown> | unknown;

export function withAuth(handler: AuthenticatedHandler): NextApiHandler {
  return async (req, res) => {
    try {
      const session = await getSessionFromRequest(req);
      if (!session) {
        clearSessionCookie(res);
        return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
      }

      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true },
      });

      if (!user || user.email !== session.email) {
        clearSessionCookie(res);
        return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
      }

      const authReq = req as AuthenticatedRequest;
      authReq.auth = {
        userId: user.id,
        email: user.email,
      };

      return handler(authReq, res);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Auth validation failed:", error);
      }
      clearSessionCookie(res);
      return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
    }
  };
}
