"use client"

import { cn } from "@/lib/utils"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Plus, UserPlus, Users, DollarSign, Pencil, Trash2 } from "lucide-react"
import { sharedFinancesData } from "@/data/shared-finances"

interface SharedFinancesContentProps {
  onNewSharedExpense: () => void
  onNewGroup: () => void
  onInvite: () => void
  groups: any[]
}

// Improve responsive design for shared finances content
export function SharedFinancesContent({
  onNewSharedExpense,
  onNewGroup,
  onInvite,
  groups,
}: SharedFinancesContentProps) {
  return (
    <ScrollArea className="flex-1">
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shared Finances</h1>
            <p className="text-muted-foreground">Manage shared expenses and budgets with others</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-1 w-full sm:w-auto" onClick={onInvite}>
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
            <Button onClick={onNewSharedExpense} className="gap-1 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Shared Expense
            </Button>
          </div>
        </div>

        {groups.length === 0 ? (
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-medium">No Shared Groups Yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create a group to start sharing expenses with friends, family, or roommates
              </p>
              <Button onClick={onNewGroup}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-3 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Active Groups</CardTitle>
                    <CardDescription>Your shared finance groups</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={onNewGroup}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.members?.length || 0} members</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle>Shared Budgets</CardTitle>
                  <CardDescription>Budgets you share with others</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sharedFinancesData.budgets.map((budget) => (
                      <div key={budget.id} className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{budget.name}</h3>
                          <div className="flex -space-x-2">
                            {budget.contributors.map((contributor, index) => (
                              <Avatar key={index} className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={contributor.avatar} alt={contributor.name} />
                                <AvatarFallback>{contributor.initials}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              ${budget.current.toLocaleString()} of ${budget.target.toLocaleString()}
                            </span>
                            <span className="font-medium">{budget.percentage}%</span>
                          </div>
                          <Progress value={budget.percentage} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Last contribution: {budget.lastContribution}</span>
                          <span>Next goal: ${budget.nextGoal.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle>Balances</CardTitle>
                  <CardDescription>Who owes what</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sharedFinancesData.balances.map((balance) => (
                      <div key={balance.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={balance.person.avatar} alt={balance.person.name} />
                            <AvatarFallback>{balance.person.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{balance.person.name}</p>
                            <p className="text-xs text-muted-foreground">{balance.lastActivity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-medium", balance.amount > 0 ? "text-emerald-600" : "text-red-600")}>
                            {balance.amount > 0 ? "Owes you" : "You owe"}
                          </p>
                          <p className="font-bold">${Math.abs(balance.amount).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="all" className="mt-6">
              <TabsList className="mb-4 w-full justify-start overflow-auto">
                <TabsTrigger value="all">All Expenses</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="settled">Settled</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {sharedFinancesData.expenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">{expense.description}</h3>
                            <p className="text-sm text-muted-foreground">
                              Paid by {expense.paidBy} on {expense.date}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                          <Badge variant={expense.status === "settled" ? "outline" : "secondary"}>
                            {expense.status === "settled" ? "Settled" : "Pending"}
                          </Badge>
                          <span className="font-bold">${expense.amount.toFixed(2)}</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t pt-4">
                        <h4 className="mb-2 text-sm font-medium">Split Details</h4>
                        <div className="space-y-2">
                          {expense.splits.map((split, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={split.person.avatar} alt={split.person.name} />
                                  <AvatarFallback>{split.person.initials}</AvatarFallback>
                                </Avatar>
                                <span>{split.person.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>${split.amount.toFixed(2)}</span>
                                <Badge variant={split.status === "paid" ? "outline" : "secondary"} className="text-xs">
                                  {split.status === "paid" ? "Paid" : "Unpaid"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Other tab contents remain the same */}
            </Tabs>
          </>
        )}
      </main>
    </ScrollArea>
  )
}
