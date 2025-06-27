import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coffee, Home, ShoppingBag, Car, Film, Zap, MoreHorizontal, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

// Map of category to icon
const categoryIcons: Record<string, any> = {
  "Housing": { icon: Home, color: "text-blue-500 bg-blue-100" },
  "Food & Dining": { icon: Coffee, color: "text-amber-500 bg-amber-100" },
  "Shopping": { icon: ShoppingBag, color: "text-emerald-500 bg-emerald-100" },
  "Transportation": { icon: Car, color: "text-red-500 bg-red-100" },
  "Entertainment": { icon: Film, color: "text-purple-500 bg-purple-100" },
  "Utilities": { icon: Zap, color: "text-yellow-500 bg-yellow-100" },
}

// Default to ShoppingBag for unknown categories
const getIconForCategory = (category: string) => {
  return categoryIcons[category] || { icon: ShoppingBag, color: "text-gray-500 bg-gray-100" }
}

interface RecentTransactionsProps {
  transactions?: any[]
  loading?: boolean
}

export function RecentTransactions({ transactions = [], loading = false }: RecentTransactionsProps) {
  // Show a loading state
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-1 h-4 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show an empty state if no transactions
  if (transactions.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] flex-col items-center justify-center text-center p-4">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No transactions yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Start tracking your finances by adding your first transaction.
            </p>
            <Link href="/transactions">
              <Button>Go to Transactions</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get the latest 6 transactions
  const recentTransactions = transactions.slice(0, 6)

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activity</CardDescription>
        </div>
        <Link href="/transactions">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => {
            const { icon: Icon, color } = getIconForCategory(transaction.category)
            
            return (
              <div key={transaction.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={transaction.amount < 0 ? "text-red-600" : "text-emerald-600"}>
                    {formatCurrency(transaction.amount)}
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {transaction.category}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
