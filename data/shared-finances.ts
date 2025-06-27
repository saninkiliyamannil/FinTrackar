export const sharedFinancesData = {
  groups: [
    {
      id: "g1",
      name: "Roommates",
      members: [
        { id: "1", name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
        { id: "2", name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
        { id: "3", name: "Michael Johnson", avatar: "/placeholder-user-3.jpg", initials: "MJ" },
      ],
    },
    {
      id: "g2",
      name: "Summer Trip",
      members: [
        { id: "1", name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
        { id: "4", name: "Emily Davis", avatar: "/placeholder-user-4.jpg", initials: "ED" },
        { id: "5", name: "David Wilson", avatar: "/placeholder-user-5.jpg", initials: "DW" },
        { id: "6", name: "Jessica Brown", avatar: "/placeholder-user-6.jpg", initials: "JB" },
      ],
    },
    {
      id: "g3",
      name: "Family",
      members: [
        { id: "1", name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
        { id: "7", name: "Robert Doe", avatar: "/placeholder-user-7.jpg", initials: "RD" },
        { id: "8", name: "Mary Doe", avatar: "/placeholder-user-8.jpg", initials: "MD" },
      ],
    },
  ],

  budgets: [
    {
      id: "b1",
      name: "Vacation Fund",
      target: 3000,
      current: 1850,
      percentage: 62,
      lastContribution: "2 days ago",
      nextGoal: 2000,
      contributors: [
        { name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
        { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
      ],
    },
    {
      id: "b2",
      name: "Home Renovation",
      target: 10000,
      current: 4200,
      percentage: 42,
      lastContribution: "1 week ago",
      nextGoal: 5000,
      contributors: [
        { name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
        { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
      ],
    },
  ],

  balances: [
    {
      id: "bal1",
      person: { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
      amount: 45.5,
      lastActivity: "Dinner at Restaurant",
    },
    {
      id: "bal2",
      person: { name: "Michael Johnson", avatar: "/placeholder-user-3.jpg", initials: "MJ" },
      amount: -23.75,
      lastActivity: "Movie Tickets",
    },
    {
      id: "bal3",
      person: { name: "Emily Davis", avatar: "/placeholder-user-4.jpg", initials: "ED" },
      amount: 120.0,
      lastActivity: "Trip Expenses",
    },
  ],

  expenses: [
    {
      id: "e1",
      description: "Dinner at Italian Restaurant",
      amount: 120.0,
      date: "Jul 25, 2023",
      paidBy: "John Doe",
      status: "pending",
      splits: [
        {
          person: { name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
          amount: 40.0,
          status: "paid",
        },
        {
          person: { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
          amount: 40.0,
          status: "unpaid",
        },
        {
          person: { name: "Michael Johnson", avatar: "/placeholder-user-3.jpg", initials: "MJ" },
          amount: 40.0,
          status: "unpaid",
        },
      ],
    },
    {
      id: "e2",
      description: "Utility Bills",
      amount: 180.0,
      date: "Jul 20, 2023",
      paidBy: "Sarah Smith",
      status: "settled",
      splits: [
        {
          person: { name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
          amount: 60.0,
          status: "paid",
        },
        {
          person: { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
          amount: 60.0,
          status: "paid",
        },
        {
          person: { name: "Michael Johnson", avatar: "/placeholder-user-3.jpg", initials: "MJ" },
          amount: 60.0,
          status: "paid",
        },
      ],
    },
    {
      id: "e3",
      description: "Groceries",
      amount: 85.5,
      date: "Jul 18, 2023",
      paidBy: "Michael Johnson",
      status: "pending",
      splits: [
        {
          person: { name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
          amount: 28.5,
          status: "unpaid",
        },
        {
          person: { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
          amount: 28.5,
          status: "paid",
        },
        {
          person: { name: "Michael Johnson", avatar: "/placeholder-user-3.jpg", initials: "MJ" },
          amount: 28.5,
          status: "paid",
        },
      ],
    },
    {
      id: "e4",
      description: "Movie Night",
      amount: 45.0,
      date: "Jul 15, 2023",
      paidBy: "John Doe",
      status: "settled",
      splits: [
        {
          person: { name: "John Doe", avatar: "/placeholder-user.jpg", initials: "JD" },
          amount: 15.0,
          status: "paid",
        },
        {
          person: { name: "Sarah Smith", avatar: "/placeholder-user-2.jpg", initials: "SS" },
          amount: 15.0,
          status: "paid",
        },
        {
          person: { name: "Michael Johnson", avatar: "/placeholder-user-3.jpg", initials: "MJ" },
          amount: 15.0,
          status: "paid",
        },
      ],
    },
  ],
}
