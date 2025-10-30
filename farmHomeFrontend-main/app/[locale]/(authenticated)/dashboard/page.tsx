"use client"

import { useAuth } from "@/app/[locale]/providers"
import { useState, useEffect } from 'react'
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard"
import { TenantDashboard } from "@/components/dashboards/TenantDashboard"
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard"
import { TechnicianDashboard } from "@/components/dashboards/TechnicianDashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  AlertCircle, 
  Package, 
  TrendingUp, 
  Users, 
  Activity, 
  Warehouse, 
  DollarSign, 
  AlertTriangle, 
  PieChart, 
  Shield, 
  Thermometer, 
  Droplets, 
  Wind,
  BarChart3,
  Clock
} from "lucide-react"
import { AnimatedSilo, SiloGrid } from "@/components/animations/AnimatedSilo"
import { 
  AnimatedBarChart, 
  AnimatedLineChart, 
  AnimatedPieChart, 
  AnimatedAreaChart,
  AnimatedMetricCard 
} from "@/components/animations/AnimatedCharts"
import { 
  AnimatedBackground, 
  FloatingElements, 
  InteractiveCard,
  AnimatedText,
  AnimatedCounter,
  AnimatedProgressBar,
  AnimatedFeatureGrid
} from "@/components/animations/MotionGraphics"

// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'optimal':
    case 'normal':
    case 'stored':
    case 'excellent':
      return 'default'
    case 'warning':
    case 'medium':
    case 'processing':
      return 'secondary'
    case 'critical':
    case 'high':
    case 'dispatched':
      return 'destructive'
    case 'low':
    case 'quality check':
      return 'outline'
    default:
      return 'default'
  }
}

// Helper function for risk colors
const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'low':
      return 'text-green-600'
    case 'medium':
      return 'text-yellow-600'
    case 'high':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

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

export default function DashboardPage() {
  const { user } = useAuth()
  const [aiStats, setAiStats] = useState<{
    total_predictions?: number
    high_risk_predictions?: number
    [key: string]: any
  } | null>(null)
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
    <AnimatedBackground className="min-h-screen">
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

      {/* Animated Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedMetricCard
          title="Total Batches"
          value={<AnimatedCounter end={aiStats?.total_predictions || dashboardData.overview.totalBatches} />}
          change={12}
          icon={Package}
          color="blue"
        />

        <AnimatedMetricCard
          title="Storage Utilization"
          value={`${dashboardData.overview.utilizationRate}%`}
          change={5}
          icon={Warehouse}
          color="green"
        />

        <AnimatedMetricCard
          title="Monthly Revenue"
          value={`PKR ${(dashboardData.overview.monthlyRevenue / 1000000).toFixed(1)}M`}
          change={8}
          icon={DollarSign}
          color="purple"
        />

        <AnimatedMetricCard
          title="Active Alerts"
          value={aiStats?.high_risk_predictions || dashboardData.overview.activeAlerts}
          change={-2}
          icon={AlertTriangle}
          color="red"
        />
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

            {/* Animated 3D Silo Status */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Warehouse className="w-5 h-5 mr-2" />
                  Silo Status
                </CardTitle>
                <CardDescription>Interactive 3D storage visualization</CardDescription>
              </CardHeader>
              <CardContent>
                <SiloGrid 
                  silos={dashboardData.siloStatus.map(silo => ({
                    fillLevel: (silo.current / silo.capacity) * 100,
                    capacity: silo.capacity,
                    grainType: silo.grain,
                    temperature: silo.temp,
                    humidity: silo.humidity,
                    status: silo.status.toLowerCase() as 'optimal' | 'warning' | 'critical'
                  }))}
                />
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

        {/* Animated Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatedPieChart
              data={dashboardData.analytics.grainDistribution.map(grain => ({
                name: grain.grain,
                value: grain.percentage
              }))}
              title="Grain Distribution"
            />

            <AnimatedBarChart
              data={Object.entries(dashboardData.analytics.qualityMetrics).map(([quality, percentage]) => ({
                name: quality.charAt(0).toUpperCase() + quality.slice(1),
                value: percentage
              }))}
              title="Quality Distribution"
            />
          </div>

          <AnimatedAreaChart
            data={dashboardData.analytics.monthlyIntake.map(month => ({
              name: month.month,
              value: month.wheat + month.rice + month.corn
            }))}
            title="Monthly Grain Intake Trends"
          />
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
      {renderDashboard()}
      </div>
    </AnimatedBackground>
  )
}
