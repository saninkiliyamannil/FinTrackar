import type { NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  try {
    const items = await prisma.messageImport.findMany({
      where: { userId: req.auth.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return sendOk(
      res,
      items.map((item) => ({
        ...item,
        parsedAmount: item.parsedAmount ? Number(item.parsedAmount) : null,
      }))
    );
  } catch (error) {
    console.error("Message import recent API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(handler);

