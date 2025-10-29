"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Package,
  AlertTriangle,
  Activity,
  BarChart3,
  Truck,
  QrCode,
  Eye,
  FileText,
  Zap,
  AlertCircle,
  Loader2
} from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/app/[locale]/providers"

interface ManagerStats {
  totalBatches: number
  activeBatches: number
  dispatchedToday: number
  totalRevenue: number
  riskAlerts: number
  qualityScore: number
}

interface Batch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  status: string
  risk_score: number
  intake_date: string
  quality_score?: number
  silo_id?: string
}

interface Alert {
  id: string
  type: "high" | "medium" | "low"
  message: string
  time: string
  location: string
  batch: string
}

export function ManagerDashboard() {
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [managerStats, setManagerStats] = useState<ManagerStats>({
    totalBatches: 0,
    activeBatches: 0,
    dispatchedToday: 0,
    totalRevenue: 0,
    riskAlerts: 0,
    qualityScore: 0
  })
  const [recentBatches, setRecentBatches] = useState<Batch[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        setIsLoading(true)

        // Fetch grain batches
        const batchesRes = await api.get<{ batches: Batch[] }>("/grain-batches?limit=10")

        if (batchesRes.ok && batchesRes.data) {
          const batches = batchesRes.data.batches
          setRecentBatches(batches)

          // Calculate stats from batches
          const activeBatches = batches.filter(b => b.status !== "dispatched").length
          const dispatchedToday = batches.filter(
            b => b.status === "dispatched" &&
              new Date(b.intake_date).toDateString() === new Date().toDateString()
          ).length
          const avgQuality = batches.length > 0
            ? Math.round(batches.reduce((sum, b) => sum + (b.quality_score || 90), 0) / batches.length)
            : 0

          setManagerStats(prev => ({
            ...prev,
            totalBatches: batches.length,
            activeBatches,
            dispatchedToday,
            qualityScore: avgQuality,
            riskAlerts: batches.filter(b => b.risk_score > 70).length
          }))

          // Generate alerts from batches with high risk
          const generatedAlerts = batches
            .filter(b => b.risk_score > 50)
            .slice(0, 3)
            .map((batch, idx) => ({
              id: `alert-${idx}`,
              type: batch.risk_score > 80 ? "high" as const : batch.risk_score > 60 ? "medium" as const : "low" as const,
              message: `Quality alert for ${batch.grain_type} batch`,
              time: `${Math.floor(Math.random() * 120)} min ago`,
              location: batch.silo_id || "Storage",
              batch: `${batch.grain_type} - ${batch.batch_id}`
            }))

          setAlerts(generatedAlerts)
        } else {
          setError(batchesRes.error || "Failed to load batches")
        }
      } catch (err) {
        console.error('Error fetching manager data:', err)
        setError('Failed to load manager dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchManagerData()
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-600">
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Manager Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managerStats.totalBatches}</div>
            <p className="text-xs text-muted-foreground">
              {managerStats.activeBatches} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatched Today</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managerStats.dispatchedToday}</div>
            <p className="text-xs text-muted-foreground">
              Out of {managerStats.totalBatches} batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{managerStats.riskAlerts}</div>
            <p className="text-xs text-muted-foreground">
              High risk batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managerStats.qualityScore}%</div>
            <Progress value={managerStats.qualityScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Risk Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${alert.type === "high" ? "border-red-200" :
                    alert.type === "medium" ? "border-orange-200" :
                      "border-yellow-200"
                  }`}>
                  <div>
                    <p className={`font-medium ${alert.type === "high" ? "text-red-900" :
                        alert.type === "medium" ? "text-orange-900" :
                          "text-yellow-900"
                      }`}>
                      {alert.message}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.batch} • {alert.location} • {alert.time}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">View</Button>
                    <Button size="sm" variant={
                      alert.type === "high" ? "destructive" :
                        alert.type === "medium" ? "secondary" :
                          "default"
                    }>
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Recent Grain Batches
          </CardTitle>
          <CardDescription>
            Latest batch status and quality metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentBatches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No batches found</p>
          ) : (
            <div className="space-y-4">
              {recentBatches.map((batch) => {
                const getRiskColor = (score: number) => {
                  if (score < 30) return "default"
                  if (score < 70) return "secondary"
                  return "destructive"
                }

                const getRiskLabel = (score: number) => {
                  if (score < 30) return "Low"
                  if (score < 70) return "Medium"
                  return "High"
                }

                return (
                  <div key={batch._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{batch.grain_type}</h4>
                        <Badge variant={getRiskColor(batch.risk_score)}>
                          {getRiskLabel(batch.risk_score)} risk
                        </Badge>
                        <Badge variant="outline">
                          {batch.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span>{batch.quantity_kg.toLocaleString()} kg</span>
                        <span>{batch.silo_id || "Storage"}</span>
                        <span>Quality: {batch.quality_score || 90}%</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <QrCode className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">{batch.batch_id}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
            Common operational tasks and management functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-20 flex flex-col items-center justify-center space-y-2">
              <Package className="h-6 w-6" />
              <span>New Batch</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Truck className="h-6 w-6" />
              <span>Schedule Dispatch</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <QrCode className="h-6 w-6" />
              <span>Generate QR</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <FileText className="h-6 w-6" />
              <span>Quality Report</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Activity className="h-6 w-6" />
              <span>View Silos</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
