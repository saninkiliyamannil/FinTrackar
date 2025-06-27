"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { generateInvitation } from "@/lib/shared-finances"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Check, AlertCircle } from "lucide-react"

interface InvitationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: Array<{ id: string; name: string }>
}

export function InvitationModal({ open, onOpenChange, groups }: InvitationModalProps) {
  const { currentUser } = useAuth()
  const [selectedGroup, setSelectedGroup] = useState("")
  const [expiryTime, setExpiryTime] = useState("24")
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerateInvite = async () => {
    if (!currentUser || !selectedGroup) return

    setLoading(true)
    setError("")

    try {
      const result = await generateInvitation(currentUser.uid, selectedGroup, Number.parseInt(expiryTime))

      if (result.success && result.inviteLink) {
        setInviteLink(result.inviteLink)
      } else {
        setError(result.error?.toString() || "Failed to generate invitation")
      }
    } catch (error: any) {
      setError(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite to Shared Finances</DialogTitle>
          <DialogDescription>Generate an invitation link to share with others</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group">Select Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger id="group">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry">Expires After</Label>
            <Select value={expiryTime} onValueChange={setExpiryTime}>
              <SelectTrigger id="expiry">
                <SelectValue placeholder="Select expiry time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="72">3 days</SelectItem>
                <SelectItem value="168">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {inviteLink && (
            <div className="space-y-2">
              <Label htmlFor="invite-link">Invitation Link</Label>
              <div className="flex items-center space-x-2">
                <Input id="invite-link" value={inviteLink} readOnly className="flex-1" />
                <Button type="button" size="icon" variant="outline" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">This link will expire after {expiryTime} hours</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleGenerateInvite} disabled={!selectedGroup || loading}>
            {loading ? "Generating..." : inviteLink ? "Regenerate Link" : "Generate Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
