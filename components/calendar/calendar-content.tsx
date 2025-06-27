"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns"
import { cn } from "@/lib/utils"
import { transactionsData } from "@/data/transactions"

// Improve responsive design for calendar content
export function CalendarContent() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())

  // Helper functions for calendar navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  // Get days in current month
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get transactions for the selected day
  const selectedDayTransactions = selectedDay
    ? transactionsData.filter((transaction) => {
        const transactionDate = typeof transaction.date === "string" ? parseISO(transaction.date) : transaction.date
        return isSameDay(transactionDate, selectedDay)
      })
    : []

  // Calculate daily spending for the month
  const dailySpending = daysInMonth.map((day) => {
    const dayTransactions = transactionsData.filter((transaction) => {
      const transactionDate = typeof transaction.date === "string" ? parseISO(transaction.date) : transaction.date
      return isSameDay(transactionDate, day)
    })

    const totalSpent = dayTransactions.reduce((sum, transaction) => {
      return transaction.amount < 0 ? sum + Math.abs(transaction.amount) : sum
    }, 0)

    const totalIncome = dayTransactions.reduce((sum, transaction) => {
      return transaction.amount > 0 ? sum + transaction.amount : sum
    }, 0)

    return {
      day,
      totalSpent,
      totalIncome,
      hasTransactions: dayTransactions.length > 0,
    }
  })

  // Calculate monthly totals
  const monthlyIncome = dailySpending.reduce((sum, day) => sum + day.totalIncome, 0)
  const monthlyExpenses = dailySpending.reduce((sum, day) => sum + day.totalSpent, 0)

  return (
    <ScrollArea className="flex-1">
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Calendar</h1>
            <p className="text-muted-foreground">View your transactions by date</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Select defaultValue={format(currentMonth, "MMMM-yyyy")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue>{format(currentMonth, "MMMM yyyy")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => {
                  const month = new Date(currentMonth.getFullYear(), i)
                  return (
                    <SelectItem key={i} value={format(month, "MMMM-yyyy")} onSelect={() => setCurrentMonth(month)}>
                      {format(month, "MMMM yyyy")}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <div className="flex">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-3 lg:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Overview</CardTitle>
              <CardDescription>Financial activity for {format(currentMonth, "MMMM yyyy")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[600px] md:min-w-0">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-2 text-sm font-medium">
                      {day}
                    </div>
                  ))}

                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-16 sm:h-20 md:h-24 rounded-md p-1" />
                  ))}

                  {daysInMonth.map((day) => {
                    const dayData = dailySpending.find((d) => isSameDay(d.day, day))
                    const isSelected = selectedDay && isSameDay(day, selectedDay)

                    return (
                      <div
                        key={day.toString()}
                        className={cn(
                          "h-16 sm:h-20 md:h-24 rounded-md border p-1 transition-colors",
                          isToday(day) && "border-primary",
                          isSelected && "bg-primary/10",
                          !isSameMonth(day, currentMonth) && "opacity-50",
                        )}
                        onClick={() => setSelectedDay(day)}
                      >
                        <div className="flex justify-between">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-1 text-xs",
                              isToday(day) && "bg-primary text-primary-foreground",
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {dayData?.hasTransactions && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </div>

                        {dayData && dayData.totalSpent > 0 && (
                          <div className="mt-1 text-xs text-red-600 flex items-center">
                            <ArrowDown className="h-3 w-3 mr-0.5" />${dayData.totalSpent.toFixed(2)}
                          </div>
                        )}

                        {dayData && dayData.totalIncome > 0 && (
                          <div className="mt-1 text-xs text-emerald-600 flex items-center">
                            <ArrowUp className="h-3 w-3 mr-0.5" />${dayData.totalIncome.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 md:col-span-3 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Summary</CardTitle>
                <CardDescription>{format(currentMonth, "MMMM yyyy")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Income</span>
                    <span className="text-emerald-600 font-medium">${monthlyIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Expenses</span>
                    <span className="text-red-600 font-medium">${monthlyExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-sm font-medium">Balance</span>
                    <span className="font-medium">${(monthlyIncome - monthlyExpenses).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedDay && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>{format(selectedDay, "MMMM d, yyyy")}</CardTitle>
                  <CardDescription>{selectedDayTransactions.length} transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDayTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDayTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <Badge variant="outline" className="mt-1">
                              {transaction.category}
                            </Badge>
                          </div>
                          <span className={transaction.amount < 0 ? "text-red-600" : "text-emerald-600"}>
                            {transaction.amount < 0 ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <CalendarIcon className="mx-auto h-8 w-8 opacity-50" />
                      <p className="mt-2">No transactions for this day</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </ScrollArea>
  )
}
