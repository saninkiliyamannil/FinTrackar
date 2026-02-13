import type { NextApiResponse } from "next"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
    type AuthenticatedRequest,
    withAuth,
} from "@/lib/api/with-auth"
import { sendError, sendOk } from "@/lib/api/response"
import { checkRateLimit } from "@/lib/api/rate-limit"

const createCategorySchema = z.object({
    name: z.string().trim().min(1).max(60),
    type: z.string().trim().min(1).max(20),
    color: z.string().trim().min(1).max(20),
    icon: z.string().trim().max(60).optional(),
})

async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    const userId = req.auth.userId

    if (req.method === "POST") {
        const limit = checkRateLimit({
            key: `category:create:${userId}`,
            limit: 40,
            windowMs: 60 * 1000,
        })
        if (!limit.allowed) {
            return sendError(res, 429, "Too many requests", "RATE_LIMITED")
        }

        const parsed = createCategorySchema.safeParse(req.body || {})
        if (!parsed.success) {
            return sendError(
                res,
                400,
                "Invalid payload",
                "VALIDATION_ERROR",
                parsed.error.flatten()
            )
        }
        const { name, type, color, icon } = parsed.data

        const category = await prisma.category.create({
            data: {
                userId,
                name,
                type,
                color,
                icon,
            },
        })

        return sendOk(res, category, 201)
    }

    if (req.method === "GET") {
        const categories = await prisma.category.findMany({
            where: { userId },
            orderBy: { name: "asc" },
        })

        return sendOk(res, categories)
    }

    res.setHeader("Allow", ["GET", "POST"])
    return sendError(
        res,
        405,
        `Method ${req.method} not allowed`,
        "METHOD_NOT_ALLOWED"
    )
}

export default withAuth(handler)


