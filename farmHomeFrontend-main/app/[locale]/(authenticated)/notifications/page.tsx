"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bell,
  Mail,
  MessageSquare,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Plus,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Smartphone,
} from "lucide-react"
import { useLanguage } from "@/app/[locale]/providers"

// Mock notification data
const notifications = [
  {
    id: "N001",
    type: "critical",
    title: "Critical Health Alert",
    message: "Animal G001 requires immediate veterinary attention",
    timestamp: "2024-01-25 14:30",
    read: false,
    category: "Health",
    priority: "High",
  },
  {
    id: "N002",
    type: "warning",
    title: "Vaccination Overdue",
    message: "15 animals have overdue vaccinations",
    timestamp: "2024-01-25 10:15",
    read: false,
    category: "Health",
    priority: "Medium",
  },
  {
    id: "N003",
    type: "info",
    title: "Breeding Success",
    message: "Successful breeding recorded for animals G003 and G004",
    timestamp: "2024-01-24 16:45",
    read: true,
    category: "Breeding",
    priority: "Low",
  },
  {
    id: "N004",
    type: "success",
    title: "Maintenance Completed",
    message: "Scheduled maintenance for Feeder-001 completed successfully",
    timestamp: "2024-01-24 09:20",
    read: true,
    category: "Maintenance",
    priority: "Low",
  },
]

const alertRules = [
  {
    id: "AR001",
    name: "Critical Health Incidents",
    description: "Alert when critical health incidents are reported",
    enabled: true,
    channels: ["email", "sms", "push"],
    conditions: "Severity = Critical AND Category = Health",
  },
  {
    id: "AR002",
    name: "Overdue Vaccinations",
    description: "Alert when vaccinations are overdue by more than 7 days",
    enabled: true,
    channels: ["email", "push"],
    conditions: "Days Overdue > 7 AND Type = Vaccination",
  },
  {
    id: "AR003",
    name: "Equipment Maintenance",
    description: "Alert when equipment maintenance is due",
    enabled: false,
    channels: ["email"],
    conditions: "Maintenance Due Date <= Today",
  },
]

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const { t } = useLanguage()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "critical":
        return "border-l-red-500 bg-red-50"
      case "warning":
        return "border-l-yellow-500 bg-yellow-50"
      case "info":
        return "border-l-blue-500 bg-blue-50"
      case "success":
        return "border-l-green-500 bg-green-50"
      default:
        return "border-l-gray-500 bg-gray-50"
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !notification.read) ||
      (filter === "read" && notification.read) ||
      notification.type === filter

    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) || notification.message.toLowerCase

    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("notifications")}</h1>
          <p className="text-gray-600">{t("alertsManagement")}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Alert
          </Button>
        </div>
      </div>

      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Notifications</p>
                <p className="text-2xl font-bold">247</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-red-600">12</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
                <p className="text-2xl font-bold text-orange-600">3</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rules</p>
                <p className="text-2xl font-bold text-green-600">8</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Tabs */}
      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter notifications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Recent alerts and system notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 rounded-lg ${getNotificationColor(notification.type)} ${
                      !notification.read ? "border-l-4" : "border-l-2 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className={`font-medium ${!notification.read ? "font-semibold" : ""}`}>
                              {notification.title}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {notification.category}
                            </Badge>
                            <Badge
                              variant={
                                notification.priority === "High"
                                  ? "destructive"
                                  : notification.priority === "Medium"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{notification.timestamp}</span>
                            </div>
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          {notification.read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>Configure automatic alert rules and conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Switch checked={rule.enabled} />
                          <div>
                            <h4 className="font-medium">{rule.name}</h4>
                            <p className="text-sm text-gray-600">{rule.description}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="text-xs text-gray-500">
                            <strong>Conditions:</strong> {rule.conditions}
                          </div>
                          <div className="flex space-x-1">
                            {rule.channels.map((channel) => (
                              <Badge key={channel} variant="outline" className="text-xs">
                                {channel === "email" && <Mail className="h-3 w-3 mr-1" />}
                                {channel === "sms" && <MessageSquare className="h-3 w-3 mr-1" />}
                                {channel === "push" && <Smartphone className="h-3 w-3 mr-1" />}
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure general notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable-notifications">Enable Notifications</Label>
                    <p className="text-sm text-gray-500">Receive all system notifications</p>
                  </div>
                  <Switch id="enable-notifications" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sound-notifications">Sound Notifications</Label>
                    <p className="text-sm text-gray-500">Play sound for new notifications</p>
                  </div>
                  <Switch id="sound-notifications" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                    <p className="text-sm text-gray-500">Show desktop notifications</p>
                  </div>
                  <Switch id="desktop-notifications" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-digest">Daily Email Digest</Label>
                    <p className="text-sm text-gray-500">Receive daily summary email</p>
                  </div>
                  <Switch id="email-digest" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Categories</CardTitle>
                <CardDescription>Configure notifications by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Health Alerts", enabled: true, critical: true },
                  { name: "Breeding Updates", enabled: true, critical: false },
                  { name: "Maintenance Reminders", enabled: false, critical: false },
                  { name: "Financial Reports", enabled: true, critical: false },
                  { name: "System Updates", enabled: false, critical: false },
                ].map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <Label>{category.name}</Label>
                      {category.critical && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Critical
                        </Badge>
                      )}
                    </div>
                    <Switch defaultChecked={category.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Configure email notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input id="email-address" defaultValue="admin@farm.com" />
                </div>
                <div>
                  <Label htmlFor="email-frequency">Email Frequency</Label>
                  <Select defaultValue="immediate">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly Digest</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                  <Switch id="email-enabled" defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SMS Settings</CardTitle>
                <CardDescription>Configure SMS notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input id="phone-number" defaultValue="+1 (555) 123-4567" />
                </div>
                <div>
                  <Label htmlFor="sms-priority">SMS Priority Level</Label>
                  <Select defaultValue="critical">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Notifications</SelectItem>
                      <SelectItem value="high">High Priority Only</SelectItem>
                      <SelectItem value="critical">Critical Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                  <Switch id="sms-enabled" defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>Configure mobile push notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mobile App Notifications</Label>
                    <p className="text-sm text-gray-500">Send notifications to mobile app</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Browser Notifications</Label>
                    <p className="text-sm text-gray-500">Show browser notifications</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button className="w-full">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Test Push Notification
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slack Integration</CardTitle>
                <CardDescription>Send notifications to Slack channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="slack-webhook">Webhook URL</Label>
                  <Input id="slack-webhook" placeholder="https://hooks.slack.com/..." />
                </div>
                <div>
                  <Label htmlFor="slack-channel">Default Channel</Label>
                  <Input id="slack-channel" placeholder="#farm-alerts" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="slack-enabled">Enable Slack Notifications</Label>
                  <Switch id="slack-enabled" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
