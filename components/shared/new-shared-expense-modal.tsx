"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { addSharedExpense } from "@/lib/shared-finances"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

const formSchema = z.object({
  groupId: z.string().min(1, "Group is required"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  amount: z.string().min(1, "Amount is required"),
  date: z.date(),
  notes: z.string().optional(),
  splitType: z.enum(["equal", "custom", "percentage"]),
})

interface NewSharedExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: any[]
}

interface GroupMember {
  id: string
  name: string
  email: string
  avatar?: string
  initials: string
  amount: string
  included: boolean
}

export function NewSharedExpenseModal({ open, onOpenChange, groups }: NewSharedExpenseModalProps) {
  const { currentUser } = useAuth()
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupId: "",
      description: "",
      amount: "",
      date: new Date(),
      notes: "",
      splitType: "equal",
    },
  })

  const watchGroupId = form.watch("groupId")
  const watchAmount = form.watch("amount")
  const watchSplitType = form.watch("splitType")

  // Fetch group members when group changes
  useEffect(() => {
    async function fetchGroupMembers() {
      if (!watchGroupId || !currentUser) return
      
      setLoading(true)
      try {
        const groupDoc = await getDoc(doc(db, "sharedGroups", watchGroupId))
        
        if (!groupDoc.exists()) {
          setError("Group not found")
          setLoading(false)
          return
        }
        
        const memberIds = groupDoc.data().members || []
        const members: GroupMember[] = []
        
        // Add current user first
        if (currentUser) {
          members.push({
            id: currentUser.uid,
            name: currentUser.displayName || "You",
            email: currentUser.email || "",
            avatar: currentUser.photoURL || undefined,
            initials: getInitials(currentUser.displayName || "You"),
            amount: "0.00",
            included: true,
          })
        }
        
        // Fetch other members
        for (const memberId of memberIds) {
          if (memberId === currentUser.uid) continue // Skip current user
          
          const memberDoc = await getDoc(doc(db, "users", memberId))
          if (memberDoc.exists()) {
            const memberData = memberDoc.data()
            members.push({
              id: memberId,
              name: memberData.name || "Unknown",
              email: memberData.email || "",
              avatar: memberData.avatar,
              initials: getInitials(memberData.name || "Unknown"),
              amount: "0.00",
              included: true,
            })
          }
        }
        
        setGroupMembers(members)
        updateSplitAmounts(members, watchAmount, watchSplitType)
      } catch (error) {
        console.error("Error fetching group members:", error)
        setError("Failed to load group members")
      } finally {
        setLoading(false)
      }
    }
    
    fetchGroupMembers()
  }, [watchGroupId, currentUser])

  // Update split amounts when amount or split type changes
  useEffect(() => {
    updateSplitAmounts(groupMembers, watchAmount, watchSplitType)
  }, [watchAmount, watchSplitType])

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  function updateSplitAmounts(members: GroupMember[], amountStr: string, splitType: string) {
    if (!amountStr || isNaN(Number(amountStr)) || members.length === 0) return
    
    const totalAmount = Number(amountStr)
    const includedMembers = members.filter(m => m.included)
    
    if (includedMembers.length === 0) return
    
    if (splitType === "equal") {
      const splitAmount = (totalAmount / includedMembers.length).toFixed(2)
      
      setGroupMembers(members.map(member => ({
        ...member,
        amount: member.included ? splitAmount : "0.00"
      })))
    }
  }

  function toggleMemberInclusion(id: string) {
    const updatedMembers = groupMembers.map(member => 
      member.id === id ? { ...member, included: !member.included } : member
    )
    
    setGroupMembers(updatedMembers)
    updateSplitAmounts(updatedMembers, watchAmount, watchSplitType)
  }

  function updateMemberAmount(id: string, amount: string) {
    setGroupMembers(groupMembers.map(member => 
      member.id === id ? { ...member, amount } : member
    ))
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return
    
    setLoading(true)
    setError("")
    
    try {  
    if (!currentUser) return
    
    setLoading(true)
    setError("")
    
    try {
      const includedMembers = groupMembers.filter(m => m.included)
      
      if (includedMembers.length === 0) {
        setError("At least one member must be included in the expense")
        setLoading(false)
        return
      }
      
      // Validate that split amounts add up to total
      const totalSplit = includedMembers.reduce((sum, member) => sum + Number(member.amount), 0)
      const totalAmount = Number(values.amount)
      
      if (Math.abs(totalSplit - totalAmount) > 0.01) { // Allow for small rounding errors
        setError("Split amounts must add up to the total amount")
        setLoading(false)
        return
      }
      
      // Format splits for database
      const splits = includedMembers.map(member => ({
        userId: member.id,
        amount: Number(member.amount),
        status: member.id === currentUser.uid ? 'paid' : 'unpaid'
      }))
      
      const result = await addSharedExpense(
        values.groupId,
        currentUser.uid,
        Number(values.amount),
        values.description,
        values.date.toISOString(),
        splits
      )
      
      if (result.success) {
        form.reset()
        onOpenChange(false)
      } else {
        setError(result.error?.toString() || "Failed to add expense")
      }
    } catch (error: any) {
      setError(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Shared Expense</DialogTitle>
          <DialogDescription>Enter the details of the shared expense to split with others.</DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dinner at Restaurant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input className="pl-7" placeholder="0.00" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="splitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Split Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select split type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="equal">Split Equally</SelectItem>
                      <SelectItem value="custom">Custom Amounts</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {groupMembers.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Participants</h3>
                <div className="space-y-3 rounded-md border p-4">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`participant-${member.id}`}
                          checked={member.included}
                          onCheckedChange={() => toggleMemberInclusion(member.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{member.initials}</AvatarFallback>
                        </Avatar>
                        <label
                          htmlFor={`participant-${member.id}`}
                          className={cn("text-sm font-medium", !member.included && "text-muted-foreground")}
                        >
                          {member.id === currentUser?.uid ? `${member.name} (You)` : member.name}
                        </label>
                      </div>
                      <div className="relative w-24">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs">$</span>
                        <Input
                          className="h-8 pl-7 text-right text-sm"
                          value={member.amount}
                          onChange={(e) => updateMemberAmount(member.id, e.target.value)}
                          disabled={!member.included || watchSplitType === "equal"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details about this expense"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}\
