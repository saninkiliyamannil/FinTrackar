"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { getUserSharedGroups } from "@/lib/shared-finances"
import { Sidebar } from "@/components/sidebar"
import { TopNavigation } from "@/components/top-navigation"
import { SharedFinancesContent } from "@/components/shared/shared-finances-content"
import { NewSharedExpenseModal } from "@/components/shared/new-shared-expense-modal"
import { NewSharedGroupModal } from "@/components/shared/new-shared-group-modal"
import { InvitationModal } from "@/components/shared/invitation-modal"
import { Loader2 } from "lucide-react"

export function SharedFinancesPage() {
  const { currentUser } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newSharedExpenseOpen, setNewSharedExpenseOpen] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGroups() {
      if (!currentUser) return

      try {
        const result = await getUserSharedGroups(currentUser.uid)
        if (result.success) {
          setGroups(result.groups)
        }
      } catch (error) {
        console.error("Error fetching groups:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [currentUser])

  const refreshGroups = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      const result = await getUserSharedGroups(currentUser.uid)
      if (result.success) {
        setGroups(result.groups)
      }
    } catch (error) {
      console.error("Error refreshing groups:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} activeItem="Shared Finances" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavigation onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <SharedFinancesContent
          onNewSharedExpense={() => setNewSharedExpenseOpen(true)}
          onNewGroup={() => setNewGroupOpen(true)}
          onInvite={() => setInviteOpen(true)}
          groups={groups}
        />
      </div>
      <NewSharedExpenseModal open={newSharedExpenseOpen} onOpenChange={setNewSharedExpenseOpen} groups={groups} />
      <NewSharedGroupModal open={newGroupOpen} onOpenChange={setNewGroupOpen} onSuccess={refreshGroups} />
      <InvitationModal open={inviteOpen} onOpenChange={setInviteOpen} groups={groups} />
    </div>
  )
}
