"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, Trophy, Calendar, DollarSign } from "lucide-react"
import { goalsData } from "@/data/goals"

interface GoalsContentProps {
  onNewGoal: () => void
}

// Improve responsive design for goals content
export function GoalsContent({ onNewGoal }: GoalsContentProps) {
  return (
    <ScrollArea className="flex-1">
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Goals</h1>
            <p className="text-muted-foreground">Track your progress towards financial milestones</p>
          </div>
          <Button onClick={onNewGoal} className="gap-1 w-full md:w-auto">
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-3 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle>Active Goals</CardTitle>
              <CardDescription>Your current financial targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4</div>
              <div className="mt-1 text-sm text-muted-foreground">Total target amount: $35,000</div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle>Completed Goals</CardTitle>
              <CardDescription>Financial targets achieved</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">2</div>
              <div className="mt-1 text-sm text-muted-foreground">Total achieved: $12,500</div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle>Next Milestone</CardTitle>
              <CardDescription>Your closest goal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Emergency Fund</div>
              <div className="mt-1 text-sm text-muted-foreground">$8,500 of $10,000 (85%)</div>
              <Progress value={85} className="mt-4 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">Estimated completion: 2 months</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="mt-6">
          <TabsList className="mb-4 w-full justify-start overflow-auto">
            <TabsTrigger value="active">Active Goals</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {goalsData
              .filter((goal) => !goal.completed)
              .map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${goal.iconBg}`}>
                          <goal.icon className={`h-5 w-5 ${goal.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">{goal.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Target date: {goal.targetDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                        <Button variant="outline" size="sm" className="h-8 gap-1 w-full md:w-auto">
                          <DollarSign className="h-3.5 w-3.5" />
                          Add Funds
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1 w-full md:w-auto">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>
                          ${goal.currentAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()}
                        </span>
                        <span className="font-medium">{goal.percentage}%</span>
                      </div>
                      <Progress
                        value={goal.percentage}
                        className="h-2"
                        indicatorClassName="bg-gradient-to-r from-emerald-500 to-cyan-500"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          ${(goal.targetAmount - goal.currentAmount).toLocaleString()} remaining
                        </span>
                        <span className="text-muted-foreground">
                          {goal.monthlyContribution ? `$${goal.monthlyContribution.toLocaleString()}/month` : ""}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {goalsData
              .filter((goal) => goal.completed)
              .map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                          <Trophy className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">{goal.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Completed: {goal.completedDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                        <Button variant="outline" size="sm" className="h-8 gap-1 w-full md:w-auto">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>${goal.targetAmount.toLocaleString()} achieved</span>
                        <span className="font-medium">100%</span>
                      </div>
                      <Progress value={100} className="h-2" indicatorClassName="bg-emerald-500" />
                      <p className="mt-2 text-xs text-emerald-600">Goal completed {goal.completedDate}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </main>
    </ScrollArea>
  )
}
