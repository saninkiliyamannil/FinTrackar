"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DataTable } from "@/components/transactions/data-table"
import { columns } from "@/components/transactions/columns"
import { transactionsData } from "@/data/transactions"
import { Plus, Download, Filter } from "lucide-react"

interface TransactionsContentProps {
  onNewTransaction: () => void
}

// Improve responsive design for transactions content
export function TransactionsContent({ onNewTransaction }: TransactionsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })

  // Filter transactions based on search, category, and date range
  const filteredTransactions = transactionsData.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter

    // Date filtering logic would go here if we had actual Date objects

    return matchesSearch && matchesCategory
  })

  return (
    <ScrollArea className="flex-1">
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">View and manage all your financial transactions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={onNewTransaction} className="gap-1">
              <Plus className="h-4 w-4" />
              New Transaction
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Narrow down transactions by date, category, or keyword</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-4 lg:col-span-1">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                    <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Shopping">Shopping</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Date Range</label>
                <DatePickerWithRange />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Filter className="h-3 w-3" />
                {filteredTransactions.length} transactions
              </Badge>
            </div>
          </div>

          <TabsContent value="all" className="mt-4">
            <DataTable columns={columns} data={filteredTransactions} />
          </TabsContent>

          <TabsContent value="income" className="mt-4">
            <DataTable columns={columns} data={filteredTransactions.filter((t) => t.amount > 0)} />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <DataTable columns={columns} data={filteredTransactions.filter((t) => t.amount < 0)} />
          </TabsContent>
        </Tabs>
      </main>
    </ScrollArea>
  )
}
