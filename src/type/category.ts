export interface Category {
    id: string
    userId: string
    name: string
    type: "expense" | "income"
    color: string
    icon?: string
    createdAt: Date
}