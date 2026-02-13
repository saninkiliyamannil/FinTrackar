import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { ensurePersonalGroup, isGroupMember } from "@/lib/shared-groups";

const connectSchema = z.object({
  groupId: z.string().min(1).optional(),
});

export async function connectExistingSharedExpensesHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const parsed = connectSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  try {
    const targetGroupId = parsed.data.groupId ?? (await ensurePersonalGroup(req.auth.userId));
    const membership = await isGroupMember(targetGroupId, req.auth.userId);
    if (!membership) {
      return sendError(res, 404, "Shared group not found", "NOT_FOUND");
    }

    const result = await prisma.sharedExpense.updateMany({
      where: {
        userId: req.auth.userId,
        groupId: null,
      },
      data: {
        groupId: targetGroupId,
      },
    });

    return sendOk(res, {
      updated: result.count,
      groupId: targetGroupId,
    });
  } catch (error) {
    console.error("Connect existing shared expenses API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(connectExistingSharedExpensesHandler);
