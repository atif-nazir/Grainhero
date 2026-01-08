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
  Globe,
  Shield,
  BarChart3,
  Settings,
  Crown,
  Zap
} from "lucide-react"

export function SuperAdminDashboard() {
  // Mock data - in real app, this would come from API
  const systemStats = {
    totalTenants: 45,
    totalUsers: 1247,
    totalRevenue: 125000,
    systemHealth: 98.5,
    activeAlerts: 3,
    criticalIssues: 1
  }

  const recentTenants = [
    { id: 1, name: "Green Valley Farms", plan: "Pro", status: "active", revenue: 2500, users: 12 },
    { id: 2, name: "Golden Harvest Co.", plan: "Enterprise", status: "active", revenue: 5000, users: 25 },
    { id: 3, name: "Sunrise Agriculture", plan: "Basic", status: "trial", revenue: 0, users: 3 },
    { id: 4, name: "Mountain View Storage", plan: "Pro", status: "active", revenue: 3200, users: 18 }
  ]

  const systemAlerts = [
    { id: 1, type: "critical", message: "Database connection pool exhausted", time: "2 min ago" },
    { id: 2, type: "warning", message: "High memory usage on server-02", time: "15 min ago" },
    { id: 3, type: "info", message: "Scheduled maintenance completed", time: "1 hour ago" }
  ]

  return (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${systemStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +23% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.systemHealth}%</div>
            <Progress value={systemStats.systemHealth} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {systemStats.criticalIssues > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemAlerts.filter(alert => alert.type === "critical").map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-red-900">{alert.message}</p>
                    <p className="text-sm text-red-600">{alert.time}</p>
                  </div>
                  <Button size="sm" variant="destructive">Resolve</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Recent Tenants
            </CardTitle>
            <CardDescription>
              Latest tenant registrations and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{tenant.name}</h4>
                      <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                        {tenant.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>Plan: {tenant.plan}</span>
                      <span>Users: {tenant.users}</span>
                      <span>Revenue: ${tenant.revenue}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              System Alerts
            </CardTitle>
            <CardDescription>
              Recent system notifications and issues
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
                      {alert.time}
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
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Revenue Overview
          </CardTitle>
          <CardDescription>
            Monthly revenue trends and growth metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Revenue chart will be implemented with Chart.js</p>
            </div>
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
            Common administrative tasks and system management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-20 flex flex-col items-center justify-center space-y-2">
              <Users className="h-6 w-6" />
              <span>Manage Users</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Building2 className="h-6 w-6" />
              <span>Tenant Management</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Settings className="h-6 w-6" />
              <span>System Settings</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Globe className="h-6 w-6" />
              <span>Global Analytics</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Shield className="h-6 w-6" />
              <span>Security Center</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Crown className="h-6 w-6" />
              <span>Plan Management</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
