"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowDownIcon, ArrowUpIcon, DollarSign } from "lucide-react"

const data = [
  { name: "Jan", income: 4000, expenses: 2400 },
  { name: "Feb", income: 3000, expenses: 1398 },
  { name: "Mar", income: 2000, expenses: 3800 },
  { name: "Apr", income: 2780, expenses: 3908 },
  { name: "May", income: 1890, expenses: 4800 },
  { name: "Jun", income: 2390, expenses: 3800 },
  { name: "Jul", income: 3490, expenses: 2300 },
]

export function FinancialOverview() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Your income vs. expenses</CardDescription>
        </div>
        <Tabs defaultValue="monthly">
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <ArrowUpIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Income</p>
              <p className="text-xl font-bold">$8,942.00</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
              <ArrowDownIcon className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expenses</p>
              <p className="text-xl font-bold">$5,184.00</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-xl font-bold">$3,758.00</p>
            </div>
          </div>
        </div>

        <div className="mt-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
