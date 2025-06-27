"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { TopNavigation } from "@/components/top-navigation"
import { BudgetsContent } from "@/components/budgets/budgets-content"
import { NewBudgetModal } from "@/components/budgets/new-budget-modal"

export function BudgetsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newBudgetOpen, setNewBudgetOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} activeItem="Budgets" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavigation onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <BudgetsContent onNewBudget={() => setNewBudgetOpen(true)} />
      </div>
      <NewBudgetModal open={newBudgetOpen} onOpenChange={setNewBudgetOpen} />
    </div>
  )
}
