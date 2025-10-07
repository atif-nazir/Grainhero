"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  Package,
  Smartphone,
  BarChart3,
  Settings,
  Crown,
  Zap,
  UserPlus,
  Shield,
  Bell
} from "lucide-react"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"

type DashboardResponse = {
  stats: Array<{ title: string; value: number | string }>
  storageDistribution: Array<{ status: string; count: number }>
  grainTypeDistribution: Array<{ grainType: string; count: number }>
  capacityStats: { totalCapacity: number; totalCurrentQuantity: number; utilizationPercentage: number }
  suggestions: { criticalStorage: Array<any>; optimization: Array<any> }
}

export function TenantDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await api.get<DashboardResponse>("/dashboard")
      if (!mounted) return
      if (res.ok && res.data) {
        setData(res.data)
      } else {
        setError(res.error || "Failed to load dashboard")
      }
      setIsLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  const tenantStats = {
    totalUsers: 0,
    totalBatches: 0,
    totalRevenue: 0,
    systemHealth: data?.capacityStats?.utilizationPercentage ?? 0,
    activeAlerts: 0,
    criticalIssues: (data?.suggestions?.criticalStorage?.length ?? 0) > 0 ? 1 : 0,
    planUsage: 0
  }

  const recentUsers = [
    { id: 1, name: "John Manager", role: "manager", status: "active", lastLogin: "2 hours ago" },
    { id: 2, name: "Sarah Tech", role: "technician", status: "active", lastLogin: "1 hour ago" },
    { id: 3, name: "Mike Assistant", role: "technician", status: "inactive", lastLogin: "2 days ago" },
    { id: 4, name: "Lisa Manager", role: "manager", status: "active", lastLogin: "30 min ago" }
  ]

  const grainBatches = [
    { id: 1, type: "Wheat", quantity: "500 tons", status: "stored", risk: "low", location: "Silo A" },
    { id: 2, type: "Rice", quantity: "300 tons", status: "stored", risk: "medium", location: "Silo B" },
    { id: 3, type: "Maize", quantity: "750 tons", status: "processing", risk: "low", location: "Silo C" },
    { id: 4, type: "Barley", quantity: "200 tons", status: "stored", risk: "high", location: "Silo D" }
  ]

  const systemAlerts = [
    ...(tenantStats.criticalIssues > 0
      ? [{ id: 1, type: "critical", message: "Storage near capacity detected", time: "just now", location: "Multiple Silos" }]
      : []),
  ] as Array<{ id: number; type: "critical" | "warning" | "info"; message: string; time: string; location?: string }>

  const planDetails = {
    name: "Pro Plan",
    price: "$299/month",
    features: ["Up to 50 users", "Unlimited batches", "Advanced AI", "Priority support"],
    usage: {
      users: { used: 24, limit: 50 },
      batches: { used: 156, limit: "unlimited" },
      storage: { used: 2.3, limit: 10 }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Tenant Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {planDetails.usage.users.used}/{planDetails.usage.users.limit} limit
            </p>
            <Progress value={(tenantStats.totalUsers / planDetails.usage.users.limit) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grain Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats.totalBatches}</div>
            <p className="text-xs text-muted-foreground">
              +8 new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${tenantStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats.systemHealth}%</div>
            <Progress value={tenantStats.systemHealth} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="h-5 w-5 mr-2" />
            Current Plan: {planDetails.name}
          </CardTitle>
          <CardDescription>
            {planDetails.price} - Plan usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Users</span>
                <span>{planDetails.usage.users.used}/{planDetails.usage.users.limit}</span>
              </div>
              <Progress value={(planDetails.usage.users.used / planDetails.usage.users.limit) * 100} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage</span>
                <span>{planDetails.usage.storage.used}GB/{planDetails.usage.storage.limit}GB</span>
              </div>
              <Progress value={(planDetails.usage.storage.used / planDetails.usage.storage.limit) * 100} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Batches</span>
                <span>{planDetails.usage.batches.used} (unlimited)</span>
              </div>
              <Progress value={75} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm">Upgrade Plan</Button>
            <Button size="sm" variant="outline">View Usage Details</Button>
            <Button size="sm" variant="outline">Billing</Button>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {tenantStats.criticalIssues > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemAlerts.filter(alert => alert.type === "critical").map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-red-900">{alert.message}</p>
                    <p className="text-sm text-red-600">{alert.location} • {alert.time}</p>
                  </div>
                  <Button size="sm" variant="destructive">Resolve</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage your team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{user.name}</h4>
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last login: {user.lastLogin}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grain Batches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Recent Grain Batches
            </CardTitle>
            <CardDescription>
              Latest grain batch status and risk levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grainBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{batch.type}</h4>
                      <Badge variant={
                        batch.risk === "high" ? "destructive" :
                        batch.risk === "medium" ? "secondary" :
                        "default"
                      }>
                        {batch.risk} risk
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>{batch.quantity}</span>
                      <span>{batch.location}</span>
                      <span className="capitalize">{batch.status}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            System Alerts
          </CardTitle>
          <CardDescription>
            Recent notifications and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                alert.type === "critical" ? "bg-red-50 border-red-200" :
                alert.type === "warning" ? "bg-yellow-50 border-yellow-200" :
                "bg-blue-50 border-blue-200"
              }`}>
                <div>
                  <p className={`font-medium ${
                    alert.type === "critical" ? "text-red-900" :
                    alert.type === "warning" ? "text-yellow-900" :
                    "text-blue-900"
                  }`}>
                    {alert.message}
                  </p>
                  <p className={`text-sm ${
                    alert.type === "critical" ? "text-red-600" :
                    alert.type === "warning" ? "text-yellow-600" :
                    "text-blue-600"
                  }`}>
                    {alert.location} • {alert.time}
                  </p>
                </div>
                <Badge variant={
                  alert.type === "critical" ? "destructive" :
                  alert.type === "warning" ? "secondary" :
                  "default"
                }>
                  {alert.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common administrative tasks for your tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-20 flex flex-col items-center justify-center space-y-2">
              <UserPlus className="h-6 w-6" />
              <span>Add User</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Package className="h-6 w-6" />
              <span>New Batch</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Smartphone className="h-6 w-6" />
              <span>Manage Sensors</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Settings className="h-6 w-6" />
              <span>Settings</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Shield className="h-6 w-6" />
              <span>Security</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
