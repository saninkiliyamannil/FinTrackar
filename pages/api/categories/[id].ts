import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  type AuthenticatedRequest,
  withAuth,
} from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  type: z.string().trim().min(1).max(20).optional(),
  color: z.string().trim().min(1).max(20).optional(),
  icon: z.string().trim().max(60).nullable().optional(),
});

function parseId(req: AuthenticatedRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

async function findOwnedCategory(id: string, userId: string) {
  return prisma.category.findFirst({
    where: { id, userId },
    select: { id: true },
  });
}

async function handlePatch(req: AuthenticatedRequest, res: NextApiResponse) {
  const limit = checkRateLimit({
    key: `category:update:${req.auth.userId}`,
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const id = parseId(req);
  if (!id) return sendError(res, 400, "Invalid category id", "VALIDATION_ERROR");

  const owned = await findOwnedCategory(id, req.auth.userId);
  if (!owned) return sendError(res, 404, "Category not found", "NOT_FOUND");

  const parsed = updateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid payload",
      "VALIDATION_ERROR",
      parsed.error.flatten()
    );
  }

  const updated = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });

  return sendOk(res, updated);
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse) {
  const limit = checkRateLimit({
    key: `category:delete:${req.auth.userId}`,
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const id = parseId(req);
  if (!id) return sendError(res, 400, "Invalid category id", "VALIDATION_ERROR");

  const owned = await findOwnedCategory(id, req.auth.userId);
  if (!owned) return sendError(res, 404, "Category not found", "NOT_FOUND");

  const inUseCount = await prisma.transaction.count({
    where: { userId: req.auth.userId, categoryId: id },
  });
  if (inUseCount > 0) {
    return sendError(
      res,
      409,
      "Cannot delete category that is used by transactions",
      "CATEGORY_IN_USE"
    );
  }

  await prisma.category.delete({ where: { id } });
  return sendOk(res, { ok: true });
}

export async function categoryByIdHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "PATCH") return handlePatch(req, res);
    if (req.method === "DELETE") return handleDelete(req, res);

    res.setHeader("Allow", ["PATCH", "DELETE"]);
    return sendError(
      res,
      405,
      `Method ${req.method} not allowed`,
      "METHOD_NOT_ALLOWED"
    );
  } catch (error) {
    console.error("Category by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(categoryByIdHandler);

