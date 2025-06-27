export interface Transaction {
  id: string
  date: string | Date
  description: string
  category: string
  amount: number
  type: "income" | "expense"
}
