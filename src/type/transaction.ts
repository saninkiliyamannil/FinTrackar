export type TransactionType = "expense" | "income"

export interface Transaction {
    id: string
    userId: string
    type: TransactionType
    amount: number
    categoryId: string
    note?: string
    date: Date
    createdAt: Date
}