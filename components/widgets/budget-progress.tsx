import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const budgets = [
  {
    category: "Housing",
    spent: 1200,
    total: 1500,
    percentage: 80,
  },
  {
    category: "Food & Dining",
    spent: 450,
    total: 600,
    percentage: 75,
  },
  {
    category: "Transportation",
    spent: 280,
    total: 400,
    percentage: 70,
  },
  {
    category: "Entertainment",
    spent: 150,
    total: 300,
    percentage: 50,
  },
  {
    category: "Shopping",
    spent: 320,
    total: 350,
    percentage: 91,
  },
  {
    category: "Utilities",
    spent: 180,
    total: 200,
    percentage: 90,
  },
]

export function BudgetProgress() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Budget Progress</CardTitle>
        <CardDescription>Track your spending against budget</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {budgets.map((budget) => (
            <div key={budget.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{budget.category}</span>
                <span className="text-sm text-muted-foreground">
                  ${budget.spent} / ${budget.total}
                </span>
              </div>
              <div className="relative">
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
