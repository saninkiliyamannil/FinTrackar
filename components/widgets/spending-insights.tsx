import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Lightbulb } from "lucide-react"

const data = [
  { name: "Housing", value: 1200, color: "#3b82f6" },
  { name: "Food", value: 450, color: "#10b981" },
  { name: "Transportation", value: 280, color: "#f59e0b" },
  { name: "Entertainment", value: 150, color: "#8b5cf6" },
  { name: "Shopping", value: 320, color: "#ec4899" },
  { name: "Utilities", value: 180, color: "#6366f1" },
]

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"]

const insights = [
  "You spend 15% more on dining out compared to last month",
  "Your utility bills are lower than 80% of similar households",
  "Setting up automatic savings could help you save $240 more per month",
]

export function SpendingInsights() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Spending Insights</CardTitle>
        <CardDescription>Understand your spending patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`$${value}`, "Amount"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Personalized Tips</h3>
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 text-amber-500" />
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
