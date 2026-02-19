import fs from "node:fs/promises";
import path from "node:path";
import type { NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type AuthenticatedRequest, withAuth } from "@/lib/api/with-auth";
import { sendError, sendOk } from "@/lib/api/response";

const avatarSchema = z.object({
  dataUrl: z.string().min(30),
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb",
    },
  },
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return sendError(res, 405, `Method ${req.method} not allowed`, "METHOD_NOT_ALLOWED");
  }

  const parsed = avatarSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, "Invalid payload", "VALIDATION_ERROR", parsed.error.flatten());
  }

  const match = parsed.data.dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) {
    return sendError(res, 400, "Unsupported image format", "VALIDATION_ERROR");
  }

  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const raw = match[2];

  try {
    const buffer = Buffer.from(raw, "base64");
    if (buffer.byteLength > 4 * 1024 * 1024) {
      return sendError(res, 400, "Image is too large", "VALIDATION_ERROR");
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await fs.mkdir(uploadsDir, { recursive: true });
    const filename = `${req.auth.userId}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    const imagePath = `/uploads/avatars/${filename}`;
    await prisma.user.update({
      where: { id: req.auth.userId },
      data: { image: imagePath },
    });

    return sendOk(res, { image: imagePath });
  } catch (error) {
    console.error("Avatar upload failed:", error);
    return sendError(res, 500, "Failed to upload avatar", "INTERNAL_ERROR");
  }
}

export default withAuth(handler);

