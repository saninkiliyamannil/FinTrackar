"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react"
import { budgetsData } from "@/data/budgets"

interface BudgetsContentProps {
  onNewBudget: () => void
}

export function BudgetsContent({ onNewBudget }: BudgetsContentProps) {
  return (
    <ScrollArea className="flex-1">
      <main className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
            <p className="text-muted-foreground">Set and manage your spending limits</p>
          </div>
          <Button onClick={onNewBudget} className="gap-1">
            <Plus className="h-4 w-4" />
            New Budget
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Budget</CardTitle>
              <CardDescription>Monthly spending limit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$3,500.00</div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">$2,380 spent</span>
                <span className="font-medium">68% used</span>
              </div>
              <Progress value={68} className="mt-2 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">$1,120 remaining for this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Top Category</CardTitle>
              <CardDescription>Your highest spending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Housing</div>
              <div className="mt-1 text-sm text-muted-foreground">$1,200 of $1,500 budget</div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">80% of budget used</span>
              </div>
              <Progress value={80} className="mt-2 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">$300 remaining for this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Budget Alerts</CardTitle>
              <CardDescription>Categories nearing limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Shopping near limit</p>
                    <p className="text-xs text-muted-foreground">91% of budget used ($320 of $350)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Utilities over limit</p>
                    <p className="text-xs text-muted-foreground">105% of budget used ($210 of $200)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Budgets</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {budgetsData.map((budget) => (
              <Card key={budget.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-medium">{budget.category}</h3>
                      <p className="text-sm text-muted-foreground">Monthly budget: ${budget.total.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>
                        ${budget.spent.toFixed(2)} of ${budget.total.toFixed(2)}
                      </span>
                      <span className="font-medium">{budget.percentage}%</span>
                    </div>
                    <Progress
                      value={budget.percentage}
                      className="h-2"
                      indicatorClassName={
                        budget.percentage > 90
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : budget.percentage > 75
                            ? "bg-gradient-to-r from-amber-500 to-amber-600"
                            : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                      }
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      ${(budget.total - budget.spent).toFixed(2)} remaining for this month
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {budgetsData
              .filter((budget) => budget.active)
              .map((budget) => (
                <Card key={budget.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-medium">{budget.category}</h3>
                        <p className="text-sm text-muted-foreground">Monthly budget: ${budget.total.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 gap-1">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>
                          ${budget.spent.toFixed(2)} of ${budget.total.toFixed(2)}
                        </span>
                        <span className="font-medium">{budget.percentage}%</span>
                      </div>
                      <Progress
                        value={budget.percentage}
                        className="h-2"
                        indicatorClassName={
                          budget.percentage > 90
                            ? "bg-gradient-to-r from-red-500 to-red-600"
                            : budget.percentage > 75
                              ? "bg-gradient-to-r from-amber-500 to-amber-600"
                              : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                        }
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        ${(budget.total - budget.spent).toFixed(2)} remaining for this month
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            {budgetsData
              .filter((budget) => !budget.active)
              .map((budget) => (
                <Card key={budget.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-medium">{budget.category}</h3>
                        <p className="text-sm text-muted-foreground">Monthly budget: ${budget.total.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 gap-1">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>
                          ${budget.spent.toFixed(2)} of ${budget.total.toFixed(2)}
                        </span>
                        <span className="font-medium">{budget.percentage}%</span>
                      </div>
                      <Progress
                        value={budget.percentage}
                        className="h-2"
                        indicatorClassName={
                          budget.percentage > 90
                            ? "bg-gradient-to-r from-red-500 to-red-600"
                            : budget.percentage > 75
                              ? "bg-gradient-to-r from-amber-500 to-amber-600"
                              : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                        }
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        ${(budget.total - budget.spent).toFixed(2)} remaining for this month
                      </p>
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
