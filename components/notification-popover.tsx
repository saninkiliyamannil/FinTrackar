"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  type: "info" | "warning" | "success" | "error"
}

export function NotificationPopover() {
  const [notifications, setNotifications] = React.useState<Notification[]>([
    {
      id: "1",
      title: "Budget Alert",
      description: "Your Shopping budget is at 90% of its limit.",
      time: "Just now",
      read: false,
      type: "warning",
    },
    {
      id: "2",
      title: "Bill Due Soon",
      description: "Your Electric Bill is due in 3 days.",
      time: "1 hour ago",
      read: false,
      type: "info",
    },
    {
      id: "3",
      title: "Goal Achieved",
      description: "Congratulations! You've reached your Emergency Fund goal.",
      time: "Yesterday",
      read: true,
      type: "success",
    },
    {
      id: "4",
      title: "Large Transaction",
      description: "A transaction of $500 was made from your account.",
      time: "2 days ago",
      read: true,
      type: "info",
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((notification) => ({ ...notification, read: true })))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="font-medium">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          <div className="space-y-1 p-1">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-md p-3 transition-colors hover:bg-muted",
                    !notification.read && "bg-muted/50",
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          notification.type === "info" && "bg-blue-500",
                          notification.type === "warning" && "bg-amber-500",
                          notification.type === "success" && "bg-emerald-500",
                          notification.type === "error" && "bg-red-500",
                        )}
                      />
                      <span className="font-medium">{notification.title}</span>
                    </div>
                    {!notification.read && (
                      <Badge variant="outline" className="ml-auto">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                  <span className="text-xs text-muted-foreground">{notification.time}</span>
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <Bell className="mb-2 h-10 w-10 text-muted-foreground/50" />
                <h3 className="font-medium">No notifications</h3>
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
