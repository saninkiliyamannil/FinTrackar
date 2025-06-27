"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { TopNavigation } from "@/components/top-navigation"
import { CalendarContent } from "@/components/calendar/calendar-content"

export function CalendarPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} activeItem="Calendar" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavigation onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <CalendarContent />
      </div>
    </div>
  )
}
