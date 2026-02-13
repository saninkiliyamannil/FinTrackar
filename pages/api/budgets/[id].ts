import type { NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

function parseId(req: AuthenticatedRequest): string | null {
  const id = req.query.id;
  return typeof id === "string" && id ? id : null;
}

const updateBudgetSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export async function budgetByIdHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const id = parseId(req);
  if (!id) {
    return sendError(res, 400, "Invalid budget id", "VALIDATION_ERROR");
  }

  try {
    const existing = await prisma.budget.findFirst({
      where: { id, userId: req.auth.userId },
      include: {
        category: {
          select: { id: true, name: true, color: true, type: true },
        },
      },
    });
    if (!existing) {
      return sendError(res, 404, "Budget not found", "NOT_FOUND");
    }

    if (req.method === "PATCH") {
      const limit = checkRateLimit({
        key: `budget:update:${req.auth.userId}`,
        limit: 60,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }

      const parsed = updateBudgetSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
      }
      if (Object.keys(parsed.data).length === 0) {
        return sendError(res, 400, "No fields provided", "VALIDATION_ERROR");
      }

      const nextCategoryId = parsed.data.categoryId ?? existing.categoryId;
      if (parsed.data.categoryId) {
        const category = await prisma.category.findFirst({
          where: { id: parsed.data.categoryId, userId: req.auth.userId, type: "EXPENSE" },
          select: { id: true },
        });
        if (!category) {
          return sendError(res, 400, "Invalid categoryId (must be an EXPENSE category)", "VALIDATION_ERROR");
        }
      }

      try {
        const updated = await prisma.budget.update({
          where: { id },
          data: {
            ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
            ...(parsed.data.month !== undefined ? { month: parsed.data.month } : {}),
            ...(parsed.data.year !== undefined ? { year: parsed.data.year } : {}),
            ...(parsed.data.categoryId !== undefined ? { categoryId: nextCategoryId } : {}),
          },
          include: {
            category: {
              select: { id: true, name: true, color: true, type: true },
            },
          },
        });
        return sendOk(res, { ...updated, amount: Number(updated.amount) });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return sendError(
            res,
            409,
            "Budget already exists for this category in the selected month/year",
            "CONFLICT"
          );
        }
        throw error;
      }
    }

    if (req.method === "DELETE") {
      const limit = checkRateLimit({
        key: `budget:delete:${req.auth.userId}`,
        limit: 40,
        windowMs: 60 * 1000,
      });
      if (!limit.allowed) {
        return sendError(res, 429, "Too many requests", "RATE_LIMITED");
      }
      await prisma.budget.delete({ where: { id } });
      return sendOk(res, { ok: true });
    }

    if (req.method === "GET") {
      return sendOk(res, { ...existing, amount: Number(existing.amount) });
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  } catch (error) {
    console.error("Budget by id API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(budgetByIdHandler);
