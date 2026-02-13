export interface User {
    id: string
    name: string
    email: string
    photoURL?: string
    currency: "USD" | "INR" | "EUR"
    createdAt: Date
}