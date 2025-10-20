"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  BarChart3,
  Users,
  Truck,
  QrCode,
  Eye,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Zap
} from "lucide-react"

export function ManagerDashboard() {
  // Mock data - in real app, this would come from API
  const managerStats = {
    totalBatches: 89,
    activeBatches: 67,
    dispatchedToday: 12,
    totalRevenue: 28500,
    riskAlerts: 3,
    qualityScore: 94.2
  }

  const recentBatches = [
    { 
      id: 1, 
      type: "Wheat", 
      quantity: "500 tons", 
      status: "stored", 
      risk: "low", 
      location: "Silo A",
      intakeDate: "2024-01-15",
      quality: 95,
      qrCode: "QR001"
    },
    { 
      id: 2, 
      type: "Rice", 
      quantity: "300 tons", 
      status: "processing", 
      risk: "medium", 
      location: "Silo B",
      intakeDate: "2024-01-14",
      quality: 88,
      qrCode: "QR002"
    },
    { 
      id: 3, 
      type: "Maize", 
      quantity: "750 tons", 
      status: "stored", 
      risk: "low", 
      location: "Silo C",
      intakeDate: "2024-01-13",
      quality: 92,
      qrCode: "QR003"
    },
    { 
      id: 4, 
      type: "Barley", 
      quantity: "200 tons", 
      status: "dispatched", 
      risk: "low", 
      location: "Silo D",
      intakeDate: "2024-01-10",
      quality: 96,
      qrCode: "QR004"
    }
  ]

  const riskAlerts = [
    { 
      id: 1, 
      type: "high", 
      message: "Temperature spike detected in Silo B", 
      time: "10 min ago", 
      location: "Silo B",
      batch: "Rice - QR002"
    },
    { 
      id: 2, 
      type: "medium", 
      message: "Humidity levels above threshold", 
      time: "1 hour ago", 
      location: "Silo A",
      batch: "Wheat - QR001"
    },
    { 
      id: 3, 
      type: "low", 
      message: "Routine quality check due", 
      time: "2 hours ago", 
      location: "Silo C",
      batch: "Maize - QR003"
    }
  ]

  const dispatchSchedule = [
    { id: 1, batch: "Wheat - QR001", buyer: "Golden Mills", quantity: "100 tons", scheduledTime: "Today 2:00 PM", status: "pending" },
    { id: 2, batch: "Rice - QR002", buyer: "Premium Foods", quantity: "150 tons", scheduledTime: "Tomorrow 9:00 AM", status: "confirmed" },
    { id: 3, batch: "Maize - QR003", buyer: "Agro Distributors", quantity: "200 tons", scheduledTime: "Tomorrow 3:00 PM", status: "pending" }
  ]

  const qualityMetrics = [
    { metric: "Moisture Content", value: "12.5%", status: "good", threshold: "≤15%" },
    { metric: "Protein Level", value: "14.2%", status: "excellent", threshold: "≥12%" },
    { metric: "Foreign Matter", value: "0.8%", status: "good", threshold: "≤2%" },
    { metric: "Broken Kernels", value: "3.2%", status: "acceptable", threshold: "≤5%" }
  ]

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
              +3 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${managerStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +18% from last month
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
      {managerStats.riskAlerts > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Risk Alerts ({managerStats.riskAlerts})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {riskAlerts.map((alert) => (
                <div key={alert.id} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${
                  alert.type === "high" ? "border-red-200" :
                  alert.type === "medium" ? "border-orange-200" :
                  "border-yellow-200"
                }`}>
                  <div>
                    <p className={`font-medium ${
                      alert.type === "high" ? "text-red-900" :
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

      <div className="grid gap-6 md:grid-cols-2">
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
            <div className="space-y-4">
              {recentBatches.map((batch) => (
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
                      <Badge variant="outline">
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>{batch.quantity}</span>
                      <span>{batch.location}</span>
                      <span>Quality: {batch.quality}%</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <QrCode className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">{batch.qrCode}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dispatch Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Dispatch Schedule
            </CardTitle>
            <CardDescription>
              Upcoming grain dispatches and deliveries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dispatchSchedule.map((dispatch) => (
                <div key={dispatch.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{dispatch.batch}</h4>
                      <Badge variant={dispatch.status === "confirmed" ? "default" : "secondary"}>
                        {dispatch.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>Buyer: {dispatch.buyer}</span>
                      <span>Qty: {dispatch.quantity}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">{dispatch.scheduledTime}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">View</Button>
                    <Button size="sm" variant="outline">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Quality Metrics
          </CardTitle>
          <CardDescription>
            Current grain quality measurements and thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {qualityMetrics.map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{metric.metric}</h4>
                  <div className={`w-2 h-2 rounded-full ${
                    metric.status === "excellent" ? "bg-green-500" :
                    metric.status === "good" ? "bg-blue-500" :
                    metric.status === "acceptable" ? "bg-yellow-500" :
                    "bg-red-500"
                  }`} />
                </div>
                <div className="text-2xl font-bold mb-1">{metric.value}</div>
                <div className="text-xs text-muted-foreground">Threshold: {metric.threshold}</div>
                <div className="text-xs capitalize text-gray-600 mt-1">{metric.status}</div>
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
              <Users className="h-6 w-6" />
              <span>Manage Team</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
