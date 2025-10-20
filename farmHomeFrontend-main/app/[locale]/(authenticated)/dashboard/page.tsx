"use client"

import { useAuth } from "@/app/[locale]/providers"
<<<<<<< HEAD
import { useState, useEffect } from 'react'

// Mock data for dashboard
const dashboardData = {
  overview: {
    totalBatches: 156,
    totalSilos: 12,
    totalCapacity: 50000, // kg
    currentStock: 42500, // kg
    utilizationRate: 85, // %
    activeAlerts: 8,
    monthlyRevenue: 2850000, // PKR
    activeBuyers: 24
  },
  recentBatches: [
    { id: "GH001", grain: "Wheat", quantity: 2500, status: "Stored", silo: "Silo A", date: "2024-01-15", risk: "Low" },
    { id: "GH002", grain: "Rice", quantity: 3200, status: "Processing", silo: "Silo B", date: "2024-01-14", risk: "Medium" },
    { id: "GH003", grain: "Corn", quantity: 1800, status: "Dispatched", silo: "Silo C", date: "2024-01-13", risk: "Low" },
    { id: "GH004", grain: "Wheat", quantity: 2100, status: "Quality Check", silo: "Silo D", date: "2024-01-12", risk: "High" }
  ],
  siloStatus: [
    { id: "Silo A", capacity: 5000, current: 4200, grain: "Wheat", temp: 22, humidity: 45, status: "Optimal" },
    { id: "Silo B", capacity: 4500, current: 3800, grain: "Rice", temp: 24, humidity: 52, status: "Warning" },
    { id: "Silo C", capacity: 3000, current: 1500, grain: "Corn", temp: 21, humidity: 40, status: "Optimal" },
    { id: "Silo D", capacity: 4000, current: 3200, grain: "Mixed", temp: 26, humidity: 58, status: "Critical" }
  ],
  alerts: [
    { id: 1, type: "Temperature", message: "High temperature detected in Silo B", severity: "Medium", time: "2 hours ago" },
    { id: 2, type: "Humidity", message: "Humidity levels critical in Silo D", severity: "High", time: "30 minutes ago" },
    { id: 3, type: "Stock", message: "Silo C running low on stock", severity: "Low", time: "1 hour ago" },
    { id: 4, type: "Quality", message: "Quality check required for Batch GH004", severity: "High", time: "45 minutes ago" }
  ],
  analytics: {
    monthlyIntake: [
      { month: "Jan", wheat: 12000, rice: 8000, corn: 5000 },
      { month: "Feb", wheat: 15000, rice: 9500, corn: 6200 },
      { month: "Mar", wheat: 13500, rice: 7800, corn: 5800 },
      { month: "Apr", wheat: 16000, rice: 10200, corn: 7000 }
    ],
    grainDistribution: [
      { grain: "Wheat", percentage: 45, quantity: 19125 },
      { grain: "Rice", percentage: 32, quantity: 13600 },
      { grain: "Corn", percentage: 23, quantity: 9775 }
    ],
    qualityMetrics: {
      excellent: 65,
      good: 25,
      fair: 8,
      poor: 2
    }
  },
  sensors: [
    { id: "TEMP-001", type: "Temperature", value: 22.5, unit: "°C", status: "Normal", location: "Silo A" },
    { id: "HUM-001", type: "Humidity", value: 45.2, unit: "%", status: "Normal", location: "Silo A" },
    { id: "TEMP-002", type: "Temperature", value: 26.8, unit: "°C", status: "Warning", location: "Silo D" },
    { id: "CO2-001", type: "CO2", value: 420, unit: "ppm", status: "Normal", location: "Silo B" }
  ]
}
=======
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard"
import { TenantDashboard } from "@/components/dashboards/TenantDashboard"
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard"
import { TechnicianDashboard } from "@/components/dashboards/TechnicianDashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
>>>>>>> main

export default function DashboardPage() {
  const { user } = useAuth()
  const [aiStats, setAiStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAIData = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
        const res = await fetch(`${backendUrl}/ai-spoilage/statistics`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        })
        if (res.ok) {
          const data = await res.json()
          setAiStats(data)
        }
      } catch (error) {
        console.error('Error fetching AI stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAIData()
  }, [])
  const userRole = user?.role || "technician"

  // Render role-specific dashboard
  const renderDashboard = () => {
    switch (userRole) {
      case "super_admin":
        return <SuperAdminDashboard />
      case "admin":
        return <TenantDashboard />
      case "manager":
        return <ManagerDashboard />
      case "technician":
        return <TechnicianDashboard />
      default:
        return (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unknown user role. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || "User"}!
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your {userRole.replace('_', ' ')} dashboard today.
          </p>
        </div>
      </div>

<<<<<<< HEAD
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats?.total_predictions || dashboardData.overview.totalBatches}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Utilization</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.utilizationRate}%</div>
            <Progress value={dashboardData.overview.utilizationRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {dashboardData.overview.currentStock.toLocaleString()} / {dashboardData.overview.totalCapacity.toLocaleString()} kg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {(dashboardData.overview.monthlyRevenue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.2%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{aiStats?.high_risk_predictions || dashboardData.overview.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.alerts.filter(a => a.severity === "High").length} critical
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
          {(userRole === "super_admin" || userRole === "admin") && (
            <TabsTrigger value="business">Business</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Batches */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Grain Batches</CardTitle>
                <CardDescription>Latest batch activities and status updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentBatches.map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div>
                          <div className="font-medium">{batch.id} - {batch.grain}</div>
                          <div className="text-sm text-muted-foreground">
                            {batch.quantity} kg • {batch.silo} • {batch.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(batch.status)}>{batch.status}</Badge>
                        <span className={`text-xs font-medium ${getRiskColor(batch.risk)}`}>
                          {batch.risk} Risk
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Silo Status */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Silo Status</CardTitle>
                <CardDescription>Real-time storage conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.siloStatus.map((silo) => (
                    <div key={silo.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{silo.id}</div>
                        <Badge variant={getStatusColor(silo.status)}>{silo.status}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{silo.grain}</span>
                          <span>{silo.current}/{silo.capacity} kg</span>
                        </div>
                        <Progress value={(silo.current / silo.capacity) * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{silo.temp}°C</span>
                          <span>{silo.humidity}% RH</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {dashboardData.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        alert.severity === "High" ? "bg-red-500" :
                        alert.severity === "Medium" ? "bg-yellow-500" : "bg-blue-500"
                      }`}></div>
                      <div>
                        <div className="font-medium text-sm">{alert.type}</div>
                        <div className="text-sm text-muted-foreground">{alert.message}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getStatusColor(alert.severity)}>{alert.severity}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">{alert.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Grain Distribution */}
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Grain Distribution
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                  {dashboardData.analytics.grainDistribution.map((grain) => (
                    <div key={grain.grain} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{grain.grain}</span>
                        <span className="text-sm text-muted-foreground">
                          {grain.percentage}% ({grain.quantity.toLocaleString()} kg)
                        </span>
                      </div>
                      <Progress value={grain.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
            </CardContent>
          </Card>

            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Quality Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dashboardData.analytics.qualityMetrics).map(([quality, percentage]) => (
                    <div key={quality} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{quality}</span>
                        <span className="text-sm text-muted-foreground">{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Intake Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Monthly Grain Intake Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.analytics.monthlyIntake.map((month) => (
                  <div key={month.month} className="space-y-2">
                    <div className="font-medium">{month.month} 2024</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Wheat</span>
                          <span>{month.wheat.toLocaleString()} kg</span>
                        </div>
                        <Progress value={(month.wheat / 20000) * 100} className="h-2" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Rice</span>
                          <span>{month.rice.toLocaleString()} kg</span>
                        </div>
                        <Progress value={(month.rice / 15000) * 100} className="h-2" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Corn</span>
                          <span>{month.corn.toLocaleString()} kg</span>
                        </div>
                        <Progress value={(month.corn / 10000) * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dashboardData.sensors.map((sensor) => (
              <Card key={sensor.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    {sensor.type === "Temperature" && <Thermometer className="mr-2 h-4 w-4" />}
                    {sensor.type === "Humidity" && <Droplets className="mr-2 h-4 w-4" />}
                    {sensor.type === "CO2" && <Wind className="mr-2 h-4 w-4" />}
                    {sensor.type}
                  </CardTitle>
                  <CardDescription>{sensor.location}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {sensor.value} {sensor.unit}
                    </div>
                    <Badge variant={getStatusColor(sensor.status)}>{sensor.status}</Badge>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      Last updated: 2 min ago
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Environmental Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Environmental Trends (Last 24 Hours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Live environmental data visualization</p>
                  <p className="text-sm">Charts will be integrated with real sensor data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab (Admin/Super Admin only) */}
        {(userRole === "super_admin" || userRole === "admin") && (
          <TabsContent value="business" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Buyers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.overview.activeBuyers}</div>
                  <p className="text-xs text-muted-foreground">+3 new this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Price/kg</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                  <div className="text-2xl font-bold">PKR 85</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+5%</span> from last week
                  </p>
          </CardContent>
        </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dispatch Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                  <div className="text-2xl font-bold">92%</div>
                  <p className="text-xs text-muted-foreground">On-time deliveries</p>
          </CardContent>
        </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.8/5</div>
                  <p className="text-xs text-muted-foreground">Customer satisfaction</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
          <CardHeader>
                <CardTitle>Revenue & Profit Analysis</CardTitle>
          </CardHeader>
          <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                    <p>Revenue trends and profit margins</p>
                    <p className="text-sm">Financial analytics dashboard</p>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        )}
      </Tabs>
=======
      {renderDashboard()}
>>>>>>> main
    </div>
  )
}
