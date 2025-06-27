"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { TopNavigation } from "@/components/top-navigation"
import { GoalsContent } from "@/components/goals/goals-content"
import { NewGoalModal } from "@/components/goals/new-goal-modal"

export function GoalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newGoalOpen, setNewGoalOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} activeItem="Goals" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavigation onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <GoalsContent onNewGoal={() => setNewGoalOpen(true)} />
      </div>
      <NewGoalModal open={newGoalOpen} onOpenChange={setNewGoalOpen} />
    </div>
  )
}
