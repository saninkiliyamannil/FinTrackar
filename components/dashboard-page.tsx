"use client"

import { useState } from "react"
import { MainDashboard } from "@/components/main-dashboard"
import { Sidebar } from "@/components/sidebar"
import { TopNavigation } from "@/components/top-navigation"

export function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newTransactionOpen, setNewTransactionOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavigation
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onAddTransaction={() => setNewTransactionOpen(true)}
        />
        <MainDashboard />
      </div>
    </div>
  )
}
