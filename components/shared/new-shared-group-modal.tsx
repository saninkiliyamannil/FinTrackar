"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { createSharedGroup } from "@/lib/shared-finances"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface NewSharedGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewSharedGroupModal({ open, onOpenChange, onSuccess }: NewSharedGroupModalProps) {
  const { currentUser } = useAuth()
  const [groupName, setGroupName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim()) return

    setLoading(true)
    setError("")

    try {
      const result = await createSharedGroup(currentUser.uid, groupName.trim())

      if (result.success) {
        setGroupName("")
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        setError(result.error?.toString() || "Failed to create group")
      }
    } catch (error: any) {
      setError(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Shared Group</DialogTitle>
          <DialogDescription>Create a new group to share expenses with friends, family, or roommates</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g., Roommates, Family Trip, etc."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreateGroup} disabled={!groupName.trim() || loading}>
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
