"use client"

import { Menu, Search, Shield, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationPopover } from "@/components/notification-popover"

interface TopNavigationProps {
  onMenuClick: () => void
  onAddTransaction?: () => void
}

// Improve responsive design for top navigation
export function TopNavigation({ onMenuClick, onAddTransaction }: TopNavigationProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <div className="w-full flex-1">
        <form className="hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search transactions..."
              className="w-full bg-background pl-8 md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>
      <div className="flex items-center gap-2">
        {onAddTransaction && (
          <Button size="sm" className="hidden md:flex gap-1" onClick={onAddTransaction}>
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        )}
        <Badge variant="outline" className="hidden md:flex items-center gap-1 px-2 py-1">
          <Shield className="h-3 w-3 text-emerald-500" />
          <span className="text-xs">Secure</span>
        </Badge>
        <ThemeToggle />
        <NotificationPopover />
      </div>
    </header>
  )
}
