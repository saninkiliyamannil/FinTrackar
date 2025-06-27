"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { TopNavigation } from "@/components/top-navigation"
import { SharedFinancesContent } from "@/components/shared/shared-finances-content"
import { NewSharedExpenseModal } from "@/components/shared/new-shared-expense-modal"

export function SharedFinancesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newSharedExpenseOpen, setNewSharedExpenseOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} activeItem="Shared Finances" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavigation onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <SharedFinancesContent onNewSharedExpense={() => setNewSharedExpenseOpen(true)} />
      </div>
      <NewSharedExpenseModal open={newSharedExpenseOpen} onOpenChange={setNewSharedExpenseOpen} />
    </div>
  )
}
