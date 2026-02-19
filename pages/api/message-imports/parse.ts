import fs from "node:fs/promises";
import path from "node:path";
import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";
import { parseBankMessage } from "@/lib/message-import/parser";

const parseSchema = z.object({
  dataUrl: z.string().min(30).optional(),
  sampleText: z.string().trim().min(1).max(4000).optional(),
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

async function saveImage(dataUrl: string | undefined, userId: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) return null;

  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const raw = match[2];
  const buffer = Buffer.from(raw, "base64");
  if (buffer.byteLength > 6 * 1024 * 1024) return null;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "message-imports");
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${userId}-${Date.now()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/message-imports/${filename}`;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const parsed = parseSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  const sourceText = parsed.data.sampleText || "";
  if (!sourceText && !parsed.data.dataUrl) {
    return sendError(res, 400, "Provide sampleText or image", "VALIDATION_ERROR");
  }

  try {
    const imagePath = await saveImage(parsed.data.dataUrl, req.auth.userId);
    const parsedMessage = parseBankMessage(sourceText);

    const created = await prisma.messageImport.create({
      data: {
        userId: req.auth.userId,
        imagePath,
        extractedText: parsedMessage.normalizedText || null,
        parsedAmount: parsedMessage.amount ?? undefined,
        parsedType: parsedMessage.type ?? undefined,
        parsedDate: parsedMessage.date ? new Date(parsedMessage.date) : undefined,
        parsedNote: parsedMessage.note ?? undefined,
        confidence: parsedMessage.confidence,
        status: parsedMessage.amount ? "PARSED" : "FAILED",
      },
    });

    return sendOk(res, {
      import: {
        ...created,
        parsedAmount: created.parsedAmount ? Number(created.parsedAmount) : null,
      },
      preview: {
        amount: parsedMessage.amount,
        type: parsedMessage.type,
        date: parsedMessage.date,
        note: parsedMessage.note,
        confidence: parsedMessage.confidence,
      },
    });
  } catch (error) {
    console.error("Message import parse API error:", error);
    return sendError(res, 500, "Internal server error", "INTERNAL_ERROR");
  }
}

export default withAuth(handler);

