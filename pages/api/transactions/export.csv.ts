import type { NextApiResponse } from "next";
import { Prisma, TransactionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  type AuthenticatedRequest,
  withAuth,
} from "@/lib/api/with-auth";
import { sendError } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";

const querySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function transactionExportCsvHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return sendError(
      res,
      405,
      `Method ${req.method} not allowed`,
      "METHOD_NOT_ALLOWED"
    );
  }

  const limit = checkRateLimit({
    key: `tx:export:${req.auth.userId}`,
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return sendError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid query parameters",
      "VALIDATION_ERROR",
      parsed.error.flatten()
    );
  }

  const where: Prisma.TransactionWhereInput = { userId: req.auth.userId };
  if (parsed.data.type) where.type = parsed.data.type as TransactionType;
  if (parsed.data.from || parsed.data.to) {
    where.date = {
      ...(parsed.data.from ? { gte: new Date(parsed.data.from) } : {}),
      ...(parsed.data.to ? { lte: new Date(parsed.data.to) } : {}),
    };
  }

  try {
    const rows = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { name: true } },
        bankAccount: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 5000,
    });

    const header = [
      "id",
      "date",
      "type",
      "amount",
      "note",
      "category",
      "bankAccount",
    ];
    const lines = rows.map((row) =>
      [
        row.id,
        row.date.toISOString(),
        row.type,
        row.amount.toString(),
        row.note || "",
        row.category?.name || "",
        row.bankAccount?.name || "",
      ]
        .map(csvEscape)
        .join(",")
    );

    const csv = [header.join(","), ...lines].join("\n");
    const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error("Transactions export CSV API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(transactionExportCsvHandler);


