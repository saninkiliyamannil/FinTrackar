import type { NextApiResponse } from "next";
import { AccountType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../src/lib/prisma";
import {
  type AuthenticatedRequest,
  withAuth,
} from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.nativeEnum(AccountType),
  balance: z.coerce.number().optional(),
});

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const userId = req.auth.userId;

  try {
    switch (req.method) {
      case "GET": {
        const accounts = await prisma.bankAccount.findMany({
          where: { userId },
          orderBy: { id: "asc" },
        });
        return sendOk(res, accounts);
      }

      case "POST": {
        const limit = checkRateLimit({
          key: `account:create:${userId}`,
          limit: 20,
          windowMs: 60 * 1000,
        });
        if (!limit.allowed) {
          return sendError(res, 429, "Too many requests", "RATE_LIMITED");
        }

        const parsed = createAccountSchema.safeParse(req.body || {});
        if (!parsed.success) {
          return sendError(
            res,
            400,
            "Invalid payload",
            "VALIDATION_ERROR",
            parsed.error.flatten()
          );
        }
        const { name, type, balance } = parsed.data;

        const account = await prisma.bankAccount.create({
          data: {
            name,
            type,
            balance: balance ?? 0,
            userId,
          },
        });

        return sendOk(res, account, 201);
      }

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return sendError(
          res,
          405,
          `Method ${req.method} not allowed`,
          "METHOD_NOT_ALLOWED"
        );
    }
  } catch (error) {
    console.error("Accounts API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(handler);


