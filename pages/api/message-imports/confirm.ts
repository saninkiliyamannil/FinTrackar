import type { NextApiResponse } from "next";
import { z } from "zod";
import { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";

const confirmSchema = z.object({
  importId: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.nativeEnum(TransactionType),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional(),
  bankAccountId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
});

function signedAmountDelta(type: "INCOME" | "EXPENSE", amount: number) {
  return type === TransactionType.INCOME ? amount : -amount;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const parsed = confirmSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  const { userId } = req.auth;
  const { importId, amount, type, date, note, bankAccountId, categoryId } = parsed.data;

  try {
    const existingImport = await prisma.messageImport.findFirst({
      where: { id: importId, userId },
    });
    if (!existingImport) {
      return sendError(res, 404, "Import record not found", "NOT_FOUND");
    }
    if (existingImport.status === "CONFIRMED") {
      return sendError(res, 409, "Import already confirmed", "CONFLICT");
    }

    const account = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, userId },
      select: { id: true },
    });
    if (!account) {
      return sendError(res, 400, "Invalid bankAccountId", "VALIDATION_ERROR");
    }

    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      });
      if (!category) {
        return sendError(res, 400, "Invalid categoryId", "VALIDATION_ERROR");
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId,
          amount,
          type,
          date: date ?? new Date(),
          note: note ?? existingImport.parsedNote ?? "Imported from bank message sample",
          bankAccountId,
          ...(categoryId ? { categoryId } : {}),
        },
        include: {
          bankAccount: true,
          category: true,
        },
      });

      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          balance: { increment: signedAmountDelta(type, amount) },
        },
      });

      await tx.messageImport.update({
        where: { id: importId },
        data: {
          status: "CONFIRMED",
          parsedAmount: amount,
          parsedType: type,
          parsedDate: date ?? undefined,
          parsedNote: note ?? undefined,
        },
      });

      return created;
    });

    return sendOk(res, transaction, 201);
  } catch (error) {
    console.error("Message import confirm API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(handler);

