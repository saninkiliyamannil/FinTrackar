"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-context"
import { acceptInvitation } from "@/lib/shared-finances"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, Users } from "lucide-react"

export default function InvitePage({ params }: { params: { code: string } }) {
  const { code } = params
  const { currentUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [inviteData, setInviteData] = useState<any>(null)
  const [groupData, setGroupData] = useState<any>(null)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    async function fetchInviteData() {
      if (authLoading) return

      if (!currentUser) {
        // Redirect to login if not authenticated
        router.push(`/login?redirect=/invite/${code}`)
        return
      }

      try {
        const inviteDoc = await getDoc(doc(db, "invitations", code))

        if (!inviteDoc.exists()) {
          setError("Invitation not found")
          setLoading(false)
          return
        }

        const data = inviteDoc.data()

        // Check if invitation is expired
        if (new Date(data.expiresAt) < new Date() || data.used) {
          setError("This invitation has expired or already been used")
          setLoading(false)
          return
        }

        // Fetch group data
        const groupDoc = await getDoc(doc(db, "sharedGroups", data.groupId))
        if (groupDoc.exists()) {
          setGroupData(groupDoc.data())
        }

        setInviteData(data)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || "Failed to load invitation")
        setLoading(false)
      }
    }

    fetchInviteData()
  }, [code, currentUser, authLoading, router])

  const handleAcceptInvitation = async () => {
    if (!currentUser || !inviteData) return

    setLoading(true)

    try {
      const result = await acceptInvitation(currentUser.uid, code)

      if (result.success) {
        setJoined(true)
      } else {
        setError(result.error?.toString() || "Failed to join group")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {joined ? "Successfully Joined!" : "Join Shared Finances"}
          </CardTitle>
          <CardDescription className="text-center">
            {joined
              ? "You are now a member of this group"
              : groupData
                ? `You've been invited to join ${groupData.name}`
                : "Accept the invitation to join a shared finance group"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {joined && (
            <Alert className="bg-primary/10 border-primary">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                You have successfully joined the group. You can now collaborate on shared finances.
              </AlertDescription>
            </Alert>
          )}

          {!error && !joined && groupData && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Group Details</h3>
                <p className="text-sm text-muted-foreground mt-1">{groupData.name}</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end space-x-2">
          {joined ? (
            <Button onClick={() => router.push("/shared")}>Go to Shared Finances</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => router.push("/")}>
                Cancel
              </Button>
              <Button onClick={handleAcceptInvitation} disabled={!!error || loading}>
                {loading ? "Joining..." : "Accept Invitation"}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
