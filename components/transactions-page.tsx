"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { TopNavigation } from "@/components/top-navigation"
import { TransactionsContent } from "@/components/transactions/transactions-content"
import { NewTransactionModal } from "@/components/transactions/new-transaction-modal"

export function TransactionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newTransactionOpen, setNewTransactionOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} activeItem="Transactions" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavigation
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onAddTransaction={() => setNewTransactionOpen(true)}
        />
        <TransactionsContent onNewTransaction={() => setNewTransactionOpen(true)} />
      </div>
      <NewTransactionModal open={newTransactionOpen} onOpenChange={setNewTransactionOpen} />
    </div>
  )
}
