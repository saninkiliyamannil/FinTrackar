"use client"

import { BarChart3, Calendar, CreditCard, Home, PieChart, Settings, Target, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
  activeItem?: string
}

export function Sidebar({ open, setOpen, activeItem = "Dashboard" }: SidebarProps) {
  const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: CreditCard, label: "Transactions", href: "/transactions" },
    { icon: PieChart, label: "Budgets", href: "/budgets" },
    { icon: Target, label: "Goals", href: "/goals" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Calendar, label: "Calendar", href: "/calendar" },
    { icon: Users, label: "Shared Finances", href: "/shared" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <CreditCard className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">FinTrack</span>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-1 px-2">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={item.label === activeItem ? "secondary" : "ghost"}
              className={cn("justify-start gap-3 text-sm", item.label === activeItem && "font-medium")}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="/placeholder-user.jpg" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5 text-sm">
            <div className="font-medium">John Doe</div>
            <div className="text-muted-foreground">john@example.com</div>
          </div>
        </div>
      </div>
    </div>
  )
}
