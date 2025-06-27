import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

const sharedBudgets = [
  {
    name: "Vacation Fund",
    target: 3000,
    current: 1850,
    percentage: 62,
    contributors: [
      { name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
      { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
    ],
  },
  {
    name: "Home Renovation",
    target: 10000,
    current: 4200,
    percentage: 42,
    contributors: [
      { name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
      { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
    ],
  },
]

export function SharedFinances() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Shared Finances</CardTitle>
        <CardDescription>Track shared budgets and goals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sharedBudgets.map((budget) => (
            <div key={budget.name} className="space-y-3 rounded-lg border p-4">
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
                <span>Last contribution: 2 days ago</span>
                <span>Next goal: $5,000</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
