"use client"

import { Checkbox } from "@/components/ui/checkbox"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Bell, CreditCard, User, Palette, Globe, Check, Smartphone, Laptop, Plus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Improve responsive design for settings content
export function SettingsContent() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)
  const [monthlyReports, setMonthlyReports] = useState(true)
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [currency, setCurrency] = useState("usd")
  const [dateFormat, setDateFormat] = useState("mm/dd/yyyy")

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)

    // Apply dark mode to document
    if (newDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return (
    <ScrollArea className="flex-1">
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="w-full justify-start border-b pb-0 pt-2 overflow-auto">
            <TabsTrigger
              value="account"
              className="flex items-center gap-2 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="flex items-center gap-2 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Globe className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="flex items-center gap-2 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src="/placeholder-user.jpg" alt="User" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">John Doe</h3>
                    <p className="text-sm text-muted-foreground">john@example.com</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        Change Avatar
                      </Button>
                      <Button variant="outline" size="sm">
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" defaultValue="john@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="america_new_york">
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="america_new_york">America/New York (EST)</SelectItem>
                        <SelectItem value="america_chicago">America/Chicago (CST)</SelectItem>
                        <SelectItem value="america_denver">America/Denver (MST)</SelectItem>
                        <SelectItem value="america_los_angeles">America/Los Angeles (PST)</SelectItem>
                        <SelectItem value="europe_london">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your password and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-medium">Password</h4>
                      <p className="text-sm text-muted-foreground">Last changed 3 months ago</p>
                    </div>
                    <Button variant="outline">Change Password</Button>
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-medium">Active Sessions</h4>
                      <p className="text-sm text-muted-foreground">Manage your active sessions</p>
                    </div>
                    <Button variant="outline">View All</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border border-destructive/20 p-4">
                  <div>
                    <h4 className="font-medium text-destructive">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all your data</p>
                  </div>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>Customize the appearance of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="dark-mode">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                  </div>
                  <Switch id="dark-mode" checked={darkMode} onCheckedChange={toggleDarkMode} />
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="compact-mode">Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">Reduce spacing for a more compact view</p>
                  </div>
                  <Switch id="compact-mode" checked={compactMode} onCheckedChange={setCompactMode} />
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="high-contrast">High Contrast</Label>
                    <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
                  </div>
                  <Switch id="high-contrast" checked={highContrast} onCheckedChange={setHighContrast} />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2">
                    {["blue", "green", "purple", "orange", "pink"].map((color) => (
                      <button
                        key={color}
                        className={`h-8 w-8 rounded-full ${
                          color === "blue"
                            ? "bg-blue-500"
                            : color === "green"
                              ? "bg-emerald-500"
                              : color === "purple"
                                ? "bg-purple-500"
                                : color === "orange"
                                  ? "bg-orange-500"
                                  : "bg-pink-500"
                        } ${color === "blue" ? "ring-2 ring-offset-2 ring-blue-500" : ""}`}
                        aria-label={`${color} theme`}
                      >
                        {color === "blue" && <Check className="mx-auto h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dashboard Layout</CardTitle>
                <CardDescription>Customize your dashboard view</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Widget Visibility</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Financial Overview",
                      "Budget Progress",
                      "Recent Transactions",
                      "Upcoming Bills",
                      "Spending Insights",
                      "Shared Finances",
                    ].map((widget) => (
                      <div key={widget} className="flex items-center space-x-2">
                        <Checkbox id={`widget-${widget.toLowerCase().replace(/\s+/g, "-")}`} defaultChecked />
                        <label
                          htmlFor={`widget-${widget.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {widget}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="dashboard-layout">Layout</Label>
                  <Select defaultValue="grid">
                    <SelectTrigger id="dashboard-layout">
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="columns">Columns</SelectItem>
                      <SelectItem value="masonry">Masonry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Email Notifications</h3>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications" className="flex-1">
                      Receive email notifications
                    </Label>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="weekly-reports" className="flex-1">
                      Weekly summary reports
                    </Label>
                    <Switch
                      id="weekly-reports"
                      checked={weeklyReports}
                      onCheckedChange={setWeeklyReports}
                      disabled={!emailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="monthly-reports" className="flex-1">
                      Monthly financial reports
                    </Label>
                    <Switch
                      id="monthly-reports"
                      checked={monthlyReports}
                      onCheckedChange={setMonthlyReports}
                      disabled={!emailNotifications}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Push Notifications</h3>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-notifications" className="flex-1">
                      Receive push notifications
                    </Label>
                    <Switch
                      id="push-notifications"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="budget-alerts" className="flex-1">
                      Budget limit alerts
                    </Label>
                    <Switch
                      id="budget-alerts"
                      checked={budgetAlerts}
                      onCheckedChange={setBudgetAlerts}
                      disabled={!pushNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="bill-reminders" className="flex-1">
                      Bill payment reminders
                    </Label>
                    <Switch id="bill-reminders" defaultChecked disabled={!pushNotifications} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="large-transactions" className="flex-1">
                      Large transaction alerts
                    </Label>
                    <Switch id="large-transactions" defaultChecked disabled={!pushNotifications} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected Devices</CardTitle>
                <CardDescription>Manage notification settings for your devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">iPhone 13 Pro</p>
                        <p className="text-xs text-muted-foreground">Last active: Today</p>
                      </div>
                    </div>
                    <Badge>Current</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Laptop className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">MacBook Pro</p>
                        <p className="text-xs text-muted-foreground">Last active: 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>Customize regional preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                        <SelectItem value="gbp">GBP (£)</SelectItem>
                        <SelectItem value="jpy">JPY (¥)</SelectItem>
                        <SelectItem value="cad">CAD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger id="date-format">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="first-day">First Day of Week</Label>
                    <Select defaultValue="sunday">
                      <SelectTrigger id="first-day">
                        <SelectValue placeholder="Select first day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Preferences</CardTitle>
                <CardDescription>Customize your financial settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budget-period">Default Budget Period</Label>
                    <Select defaultValue="monthly">
                      <SelectTrigger id="budget-period">
                        <SelectValue placeholder="Select period" />
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
                    <Label htmlFor="transaction-view">Default Transaction View</Label>
                    <Select defaultValue="all">
                      <SelectTrigger id="transaction-view">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Transactions</SelectItem>
                        <SelectItem value="expenses">Expenses Only</SelectItem>
                        <SelectItem value="income">Income Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rollover-budgets" className="flex-1">
                      Roll over unused budget amounts
                    </Label>
                    <Switch id="rollover-budgets" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-categorize" className="flex-1">
                      Automatically categorize transactions
                    </Label>
                    <Switch id="auto-categorize" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Free Plan</h3>
                      <p className="text-sm text-muted-foreground">Basic features for personal finance tracking</p>
                    </div>
                    <Badge>Current Plan</Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Up to 100 transactions per month</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Basic budgeting tools</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Standard reports</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Premium Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        Advanced features for comprehensive financial management
                      </p>
                    </div>
                    <Badge variant="outline">$9.99/month</Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Unlimited transactions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Advanced budgeting and forecasting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Custom reports and analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Bank account synchronization</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">Priority support</span>
                    </div>
                  </div>

                  <Button className="mt-4 w-full">Upgrade to Premium</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-xs text-muted-foreground">Expires 12/25</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Payment Method
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </ScrollArea>
  )
}
