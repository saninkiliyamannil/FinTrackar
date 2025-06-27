"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, BarChart, PieChart } from "lucide-react"
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
} from "recharts"

export function ReportsContent() {
  const [reportType, setReportType] = useState("expense")
  const [timeframe, setTimeframe] = useState("monthly")

  // Sample data for charts
  const monthlyExpenseData = [
    { name: "Jan", amount: 2400 },
    { name: "Feb", amount: 1398 },
    { name: "Mar", amount: 3800 },
    { name: "Apr", amount: 3908 },
    { name: "May", amount: 4800 },
    { name: "Jun", amount: 3800 },
    { name: "Jul", amount: 4300 },
  ]

  const categoryData = [
    { name: "Housing", value: 1200, color: "#3b82f6" },
    { name: "Food", value: 450, color: "#10b981" },
    { name: "Transportation", value: 280, color: "#f59e0b" },
    { name: "Entertainment", value: 150, color: "#8b5cf6" },
    { name: "Shopping", value: 320, color: "#ec4899" },
    { name: "Utilities", value: 180, color: "#6366f1" },
  ]

  const trendData = [
    { name: "Week 1", income: 4000, expenses: 2400 },
    { name: "Week 2", income: 3000, expenses: 1398 },
    { name: "Week 3", income: 2000, expenses: 3800 },
    { name: "Week 4", income: 2780, expenses: 3908 },
  ]

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"]

  const availableReports = [
    {
      name: "Monthly Expense Summary",
      description: "Breakdown of expenses by month",
      date: "Generated on Jul 31, 2023",
      icon: FileText,
    },
    {
      name: "Income vs. Expenses",
      description: "Comparison of income and expenses",
      date: "Generated on Jul 15, 2023",
      icon: BarChart,
    },
    {
      name: "Category Analysis",
      description: "Spending by category",
      date: "Generated on Jul 10, 2023",
      icon: PieChart,
    },
    {
      name: "Annual Financial Report",
      description: "Complete financial overview for 2022",
      date: "Generated on Jan 15, 2023",
      icon: FileText,
    },
  ]

  return (
    <ScrollArea className="flex-1">
      <main className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Analyze your financial data and generate reports</p>
          </div>
          <Button variant="outline" className="gap-1">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Select parameters to create a custom financial report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense Report</SelectItem>
                    <SelectItem value="income">Income Report</SelectItem>
                    <SelectItem value="category">Category Analysis</SelectItem>
                    <SelectItem value="trend">Trend Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Timeframe</label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <DatePickerWithRange />
              </div>
            </div>
            <Button className="mt-4">Generate Report</Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="charts" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Expenses</CardTitle>
                  <CardDescription>Expense trend over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={monthlyExpenseData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                          formatter={(value) => [`$${value}`, "Amount"]}
                        />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                  <CardDescription>Distribution of expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {categoryData.map((entry, index) => (
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
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Income vs. Expenses</CardTitle>
                  <CardDescription>Weekly comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                          formatter={(value) => [`$${value}`, ""]}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {availableReports.map((report, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <report.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{report.name}</h3>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{report.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>
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
