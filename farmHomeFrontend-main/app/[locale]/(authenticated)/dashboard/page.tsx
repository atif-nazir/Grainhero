"use client"

import { useAuth } from "@/app/[locale]/providers"
import { useState, useEffect } from 'react'
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard"
import { TenantDashboard } from "@/components/dashboards/TenantDashboard"
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard"
import { TechnicianDashboard } from "@/components/dashboards/TechnicianDashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Shield,
  Thermometer,
  Droplets,
  Wind,
  Smartphone
} from "lucide-react"
import {
  AnimatedBarChart,
  AnimatedLineChart,
  AnimatedPieChart,
  AnimatedAreaChart,
  AnimatedMetricCard
} from "@/components/animations/AnimatedCharts"
import {
  AnimatedBackground,
  AnimatedCounter
} from "@/components/animations/MotionGraphics"

// Helper function for status colors
const getStatusColor = (status: string) => {
  if (!status) return 'default'
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


interface DashboardStat {
  title: string
  value: string | number
}

interface DashboardBatch {
  id: string
  grain: string
  quantity: number
  status: string
  silo: string
  date: string
  risk: string
}

interface DashboardAlert {
  id: string
  type: string
  message: string
  severity: string
  time: string
}

interface DashboardAnalytics {
  monthlyIntake: Array<{ month: string; total: number }>
  grainDistribution: Array<{ grain: string; percentage: number; quantity: number }>
  qualityMetrics: Array<{ quality: string; value: number }>
}

interface DashboardSensor {
  id: string
  type: string
  value: number
  unit: string
  status: string
  location: string
  lastReading: string
  battery: number
  signal: number
}

interface DashboardBusiness {
  activeBuyers: number
  avgPricePerKg: number
  dispatchRate: number
  qualityScore: number
}

interface DashboardSuggestion {
  siloId: string
  name: string
  reason: string
}

interface DashboardApi {
  stats: DashboardStat[]
  storageDistribution: Array<{ status: string; count: number }>
  grainTypeDistribution: Array<{ grainType: string; count: number }>
  capacityStats: {
    totalCapacity: number
    totalCurrentQuantity: number
    utilizationPercentage: number
  }
  suggestions: {
    criticalStorage: DashboardSuggestion[]
    optimization: DashboardSuggestion[]
  }
  recentBatches: DashboardBatch[]
  alerts: DashboardAlert[]
  analytics: DashboardAnalytics
  sensors: DashboardSensor[]
  business: DashboardBusiness
}

type IconType = typeof Package

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardApi | null>(null)
  const [error, setError] = useState<string>("")
  const [sensors, setSensors] = useState<DashboardSensor[]>([])
  const [loadingSensors, setLoadingSensors] = useState(false)
  const [errorSensors, setErrorSensors] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        // Dashboard Overview
        const res = await fetch(`${backendUrl}/dashboard`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        if (res.ok) {
          const data = await res.json()
          setDashboard(data)
        } else {
          setError('Failed to load dashboard stats')
        }
      } catch {
        setError('Server Error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const userRole = user?.role || "technician"

  const metricIconMap: Record<string, { icon: IconType; color: string }> = {
    "Total Grain Batches": { icon: Package, color: "blue" },
    "Storage Utilization": { icon: Warehouse, color: "green" },
    "Recent Incidents (last month)": { icon: AlertTriangle, color: "yellow" },
    "Active Users": { icon: Users, color: "purple" },
    "Active Alerts": { icon: AlertTriangle, color: "red" },
  }

  const formatDate = (value?: string | Date) => {
    if (!value) return "N/A"
    const date = typeof value === "string" ? new Date(value) : value
    return date.toLocaleDateString()
  }

  const fetchLiveSensors = async () => {
    setLoadingSensors(true)
    setErrorSensors('')
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${backendUrl}/dashboard/live-sensors`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      if (res.ok) {
        const data = await res.json()
        setSensors(Array.isArray(data) ? data : data.sensors || [])
      } else {
        setErrorSensors('Failed to load live sensor data.')
      }
    } catch {
      setErrorSensors('Could not fetch live sensor data.')
    } finally {
      setLoadingSensors(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 animate-pulse">
            <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3" strokeWidth="4" />
            </svg>
          </div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-500 font-bold">{error}</div>
      </div>
    )
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
              Here&apos;s what&apos;s happening with your {userRole.replace('_', ' ')} dashboard today.
            </p>
          </div>
        </div>

        {/* Animated Key Metrics Cards (using real dashboard API) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dashboard?.stats?.map((stat, i) => {
            const config = metricIconMap[stat.title] || { icon: Activity, color: "blue" }
            const valueNode =
              typeof stat.value === 'number'
                ? <AnimatedCounter end={stat.value} />
                : stat.value
            return (
              <AnimatedMetricCard
                key={i}
                title={stat.title}
                value={valueNode}
                icon={config.icon}
                color={config.color}
              />
            )
          })}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className={`w-full grid ${(userRole === "super_admin" || userRole === "admin") ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="overview" className="w-full">Overview</TabsTrigger>
            <TabsTrigger value="analytics" className="w-full">Analytics</TabsTrigger>
            <TabsTrigger value="monitoring" className="w-full">Monitoring</TabsTrigger>
            {(userRole === "super_admin" || userRole === "admin") && (
              <TabsTrigger value="business" className="w-full">Business</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5" />
                    Storage Overview
                  </CardTitle>
                  <CardDescription>Current storage capacity and utilization</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard?.capacityStats ? (
                    <div className="space-y-6">
                      {/* Main Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Total Capacity</p>
                          <p className="text-2xl font-bold">{dashboard.capacityStats.totalCapacity.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">kg</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Current Usage</p>
                          <p className="text-2xl font-bold">{dashboard.capacityStats.totalCurrentQuantity.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">kg</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Available</p>
                          <p className="text-2xl font-bold">{(dashboard.capacityStats.totalCapacity - dashboard.capacityStats.totalCurrentQuantity).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">kg</p>
                        </div>
                      </div>

                      {/* Utilization Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Utilization</span>
                          <span className="text-sm font-bold">{dashboard.capacityStats.utilizationPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                          {/* Dynamic width requires inline style for percentage values - browser extension warning can be ignored */}
                          <div
                            className={`h-4 rounded-full transition-all duration-500 ${dashboard.capacityStats.utilizationPercentage > 80 ? 'bg-red-500' :
                              dashboard.capacityStats.utilizationPercentage > 60 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                            style={{ width: `${Math.min(dashboard.capacityStats.utilizationPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Avg. Utilization</p>
                            <p className="text-sm font-semibold">{dashboard.capacityStats.utilizationPercentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Storage Health</p>
                            <p className="text-sm font-semibold">
                              {dashboard.capacityStats.utilizationPercentage > 80 ? 'High' :
                                dashboard.capacityStats.utilizationPercentage > 60 ? 'Medium' : 'Optimal'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No storage data available.</p>
                  )}
                </CardContent>
              </Card>

              {/* Storage Distribution chart */}
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Storage Distribution</CardTitle>
                  <CardDescription>Real-time storage status across all silos</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard?.storageDistribution?.length ? (
                    <div className="space-y-4">
                      <AnimatedPieChart
                        data={dashboard.storageDistribution.map(d => ({ name: d.status, value: d.count }))}
                        title="Silo Storage Status"
                      />
                      {/* Legend with better spacing to avoid overlap */}
                      <div className="space-y-2 pt-4 border-t">
                        {dashboard.storageDistribution.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-amber-500' : 'bg-green-500'
                                  }`}
                              />
                              <span className="font-medium">{item.status}</span>
                            </div>
                            <span className="text-muted-foreground">{item.count} silos</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div>No silo data</div>}
                </CardContent>
              </Card>

            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {dashboard?.alerts?.length ? (
                    dashboard.alerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${alert.severity.toLowerCase() === "high" ? "bg-red-500" :
                            alert.severity.toLowerCase() === "medium" ? "bg-yellow-500" : "bg-blue-500"
                            }`} />
                          <div>
                            <div className="font-medium text-sm">{alert.type}</div>
                            <div className="text-sm text-muted-foreground">{alert.message}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusColor(alert.severity)}>{alert.severity}</Badge>
                          <div className="text-xs text-muted-foreground mt-1">{formatDate(alert.time)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No active alerts 🎉</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <AnimatedPieChart
                data={dashboard?.analytics?.grainDistribution?.map(grain => ({
                  name: grain.grain,
                  value: grain.percentage
                })) || []}
                title="Grain Distribution"
              />

              <AnimatedBarChart
                data={dashboard?.analytics?.qualityMetrics?.map(metric => ({
                  name: metric.quality,
                  value: metric.value
                })) || []}
                title="Quality Distribution"
              />
            </div>

            <AnimatedAreaChart
              data={dashboard?.analytics?.monthlyIntake?.map(month => ({
                name: month.month,
                value: month.total
              })) || []}
              title="Monthly Grain Intake Trends"
            />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold">IoT Sensors (Live)</h3>
              <button className="rounded px-3 py-1 border text-sm hover:bg-muted transition" onClick={fetchLiveSensors} disabled={loadingSensors}>Refresh</button>
            </div>
            {loadingSensors ? (
              <div className="py-6 text-center text-gray-500">Loading live sensors...</div>
            ) : errorSensors ? (
              <div className="py-6 text-center text-red-500">{errorSensors}</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {sensors.length ? sensors.map(sensor => (
                  <Card key={sensor.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        {sensor.type === 'temperature' && <Thermometer className="mr-2 h-4 w-4" />}
                        {sensor.type === 'humidity' && <Droplets className="mr-2 h-4 w-4" />}
                        {sensor.type === 'co2' && <Wind className="mr-2 h-4 w-4" />}
                        {sensor.type.charAt(0).toUpperCase() + sensor.type.slice(1)}
                      </CardTitle>
                      <CardDescription>{sensor.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">
                          {sensor.value} {sensor.unit}
                        </div>
                        <Badge variant={getStatusColor(sensor.status)}>{sensor.status}</Badge>
                        <div className="text-xs text-muted-foreground">Last reading: {formatDate(sensor.lastReading)}</div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Battery</span> <span>{sensor.battery}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Signal</span> <span>{sensor.signal} dBm</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <Card className="col-span-full">
                    <CardContent className="text-center py-12">
                      <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">No sensors registered yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {(userRole === "super_admin" || userRole === "admin") && (
            <TabsContent value="business" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Buyers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard?.business?.activeBuyers ?? 0}</div>
                    <p className="text-xs text-muted-foreground">Engaged buyers this month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Price/kg</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">PKR {dashboard?.business?.avgPricePerKg?.toFixed(2) ?? "0.00"}</div>
                    <p className="text-xs text-muted-foreground">Based on recent batches</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Dispatch Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard?.business?.dispatchRate ?? 0}%</div>
                    <p className="text-xs text-muted-foreground">On-time deliveries</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard?.business?.qualityScore ?? 0}/5</div>
                    <p className="text-xs text-muted-foreground">Customer satisfaction</p>
                  </CardContent>
                </Card>
              </div>

              <AnimatedLineChart
                data={dashboard?.analytics?.monthlyIntake?.map(month => ({
                  name: month.month,
                  value: month.total
                })) || []}
                title="Revenue & Throughput Trends"
              />
            </TabsContent>
          )}
        </Tabs>
        {renderDashboard()}
      </div>
    </AnimatedBackground>
  )
}
