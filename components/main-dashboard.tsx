"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { FinancialOverview } from "@/components/widgets/financial-overview"
import { BudgetProgress } from "@/components/widgets/budget-progress"
import { RecentTransactions } from "@/components/widgets/recent-transactions"
import { UpcomingBills } from "@/components/widgets/upcoming-bills"
import { SpendingInsights } from "@/components/widgets/spending-insights"
import { SharedFinances } from "@/components/widgets/shared-finances"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { useState, useEffect } from "react"
import { NewTransactionModal } from "@/components/transactions/new-transaction-modal"
import { getTransactions } from "@/lib/api"
import { useRouter } from "next/navigation"

export function MainDashboard() {
  const [newTransactionOpen, setNewTransactionOpen] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true)
        const result = await getTransactions()
        if (result.success) {
          setTransactions(result.transactions)
        }
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const handleTransactionSuccess = async () => {
    // Refresh transactions after adding a new one
    try {
      const result = await getTransactions()
      if (result.success) {
        setTransactions(result.transactions)
      }
    } catch (error) {
      console.error("Error refreshing transactions:", error)
    }
    
    // Also refresh the page
    router.refresh()
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <main className="grid gap-4 p-4 md:gap-6 md:p-6 lg:grid-cols-6 xl:grid-cols-8">
          <div className="col-span-full flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, John. Here's your financial overview.</p>
            </div>
            <Button className="gap-1" onClick={() => setNewTransactionOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>

          <div className="col-span-full lg:col-span-4 xl:col-span-5">
            <FinancialOverview />
          </div>

          <div className="col-span-full lg:col-span-2 xl:col-span-3">
            <BudgetProgress />
          </div>

          <div className="col-span-full lg:col-span-4 xl:col-span-5">
            <RecentTransactions transactions={transactions} loading={loading} />
          </div>

          <div className="col-span-full lg:col-span-2 xl:col-span-3">
            <UpcomingBills />
          </div>

          <div className="col-span-full lg:col-span-3 xl:col-span-4">
            <SpendingInsights />
          </div>

          <div className="col-span-full lg:col-span-3 xl:col-span-4">
            <SharedFinances />
          </div>
        </main>
      </ScrollArea>
      <NewTransactionModal 
        open={newTransactionOpen} 
        onOpenChange={setNewTransactionOpen} 
        onSuccess={handleTransactionSuccess}
      />
    </>
  )
}
