import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"

export function UpcomingBills() {
  const today = new Date()

  // Dates with bills
  const billDates = [
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), // Rent
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5), // Internet
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8), // Phone
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15), // Electricity
  ]

  // Upcoming bills list
  const upcomingBills = [
    {
      name: "Rent",
      amount: 1200,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
    },
    {
      name: "Internet",
      amount: 65,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
    },
    {
      name: "Phone",
      amount: 45,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8),
    },
    {
      name: "Electricity",
      amount: 95,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15),
    },
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Upcoming Bills</CardTitle>
        <CardDescription>Keep track of your upcoming payments</CardDescription>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={today}
          className="rounded-md border"
          modifiers={{
            billDates: billDates,
          }}
          modifiersStyles={{
            billDates: {
              backgroundColor: "hsl(var(--primary) / 0.1)",
              color: "hsl(var(--primary))",
              fontWeight: "bold",
            },
          }}
        />

        <div className="mt-4 space-y-3">
          {upcomingBills.map((bill) => (
            <div key={bill.name} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{bill.name}</p>
                <p className="text-xs text-muted-foreground">
                  Due in {Math.ceil((bill.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">${bill.amount}</span>
                {Math.ceil((bill.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 3 && (
                  <Badge variant="destructive" className="ml-2">
                    Soon
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
