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
  Smartphone,
  Wrench,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Thermometer,
  Droplets,
  Zap,
  QrCode,
  FileText,
  Settings
} from "lucide-react"

export function TechnicianDashboard() {
  // Mock data - in real app, this would come from API
  const technicianStats = {
    assignedBatches: 24,
    activeTasks: 8,
    completedToday: 5,
    qualityChecks: 12,
    sensorReadings: 156,
    alertsResolved: 3
  }

  const assignedTasks = [
    { 
      id: 1, 
      type: "Quality Check", 
      batch: "Wheat - QR001", 
      priority: "high", 
      location: "Silo A",
      dueTime: "2:00 PM",
      status: "pending",
      description: "Check moisture content and temperature"
    },
    { 
      id: 2, 
      type: "Sensor Calibration", 
      batch: "Rice - QR002", 
      priority: "medium", 
      location: "Silo B",
      dueTime: "3:30 PM",
      status: "in_progress",
      description: "Calibrate humidity sensors"
    },
    { 
      id: 3, 
      type: "Environmental Check", 
      batch: "Maize - QR003", 
      priority: "low", 
      location: "Silo C",
      dueTime: "4:00 PM",
      status: "pending",
      description: "Check ventilation system"
    },
    { 
      id: 4, 
      type: "Batch Inspection", 
      batch: "Barley - QR004", 
      priority: "high", 
      location: "Silo D",
      dueTime: "5:00 PM",
      status: "completed",
      description: "Full batch quality inspection"
    }
  ]

  const sensorReadings = [
    { 
      id: 1, 
      sensor: "Temperature", 
      value: "22.5°C", 
      status: "normal", 
      location: "Silo A",
      lastUpdate: "2 min ago",
      threshold: "≤25°C"
    },
    { 
      id: 2, 
      sensor: "Humidity", 
      value: "65%", 
      status: "warning", 
      location: "Silo B",
      lastUpdate: "5 min ago",
      threshold: "≤70%"
    },
    { 
      id: 3, 
      sensor: "CO2", 
      value: "450 ppm", 
      status: "normal", 
      location: "Silo C",
      lastUpdate: "3 min ago",
      threshold: "≤500 ppm"
    },
    { 
      id: 4, 
      sensor: "Moisture", 
      value: "12.3%", 
      status: "good", 
      location: "Silo D",
      lastUpdate: "1 min ago",
      threshold: "≤15%"
    }
  ]

  const recentAlerts = [
    { 
      id: 1, 
      type: "temperature", 
      message: "Temperature spike detected", 
      location: "Silo B", 
      time: "10 min ago",
      severity: "high",
      status: "resolved"
    },
    { 
      id: 2, 
      type: "humidity", 
      message: "Humidity above threshold", 
      location: "Silo A", 
      time: "25 min ago",
      severity: "medium",
      status: "acknowledged"
    },
    { 
      id: 3, 
      type: "maintenance", 
      message: "Scheduled maintenance due", 
      location: "Silo C", 
      time: "1 hour ago",
      severity: "low",
      status: "pending"
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-orange-100 text-orange-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case "normal":
      case "good":
        return "bg-green-100 text-green-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSensorIcon = (sensor: string) => {
    switch (sensor.toLowerCase()) {
      case "temperature":
        return <Thermometer className="h-4 w-4" />
      case "humidity":
        return <Droplets className="h-4 w-4" />
      case "co2":
        return <Activity className="h-4 w-4" />
      case "moisture":
        return <Droplets className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Technician Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianStats.assignedBatches}</div>
            <p className="text-xs text-muted-foreground">
              {technicianStats.activeTasks} active tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianStats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Checks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianStats.qualityChecks}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts Resolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianStats.alertsResolved}</div>
            <p className="text-xs text-muted-foreground">
              Today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {recentAlerts.filter(alert => alert.status !== "resolved").length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts ({recentAlerts.filter(alert => alert.status !== "resolved").length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAlerts.filter(alert => alert.status !== "resolved").map((alert) => (
                <div key={alert.id} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${
                  alert.severity === "high" ? "border-red-200" :
                  alert.severity === "medium" ? "border-orange-200" :
                  "border-yellow-200"
                }`}>
                  <div>
                    <p className={`font-medium ${
                      alert.severity === "high" ? "text-red-900" :
                      alert.severity === "medium" ? "text-orange-900" :
                      "text-yellow-900"
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.location} • {alert.time}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getSensorStatusColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Button size="sm" variant="outline">Acknowledge</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assigned Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              My Tasks
            </CardTitle>
            <CardDescription>
              Tasks assigned to you today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(task.status)}
                      <h4 className="font-medium">{task.type}</h4>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span>{task.batch}</span>
                      <span>{task.location}</span>
                      <span>Due: {task.dueTime}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">Start</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sensor Readings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Sensor Readings
            </CardTitle>
            <CardDescription>
              Real-time sensor data from your assigned silos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sensorReadings.map((reading) => (
                <div key={reading.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {getSensorIcon(reading.sensor)}
                      <h4 className="font-medium">{reading.sensor}</h4>
                      <Badge className={getSensorStatusColor(reading.status)}>
                        {reading.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span className="text-lg font-bold">{reading.value}</span>
                      <span>{reading.location}</span>
                      <span>Threshold: {reading.threshold}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last update: {reading.lastUpdate}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Recent Alerts
          </CardTitle>
          <CardDescription>
            Alert history and resolution status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                alert.status === "resolved" ? "bg-green-50 border-green-200" :
                alert.status === "acknowledged" ? "bg-blue-50 border-blue-200" :
                "bg-yellow-50 border-yellow-200"
              }`}>
                <div className="flex items-center space-x-3">
                  {alert.status === "resolved" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : alert.status === "acknowledged" ? (
                    <Clock className="h-4 w-4 text-blue-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      alert.status === "resolved" ? "text-green-900" :
                      alert.status === "acknowledged" ? "text-blue-900" :
                      "text-yellow-900"
                    }`}>
                      {alert.message}
                    </p>
                    <p className={`text-sm ${
                      alert.status === "resolved" ? "text-green-600" :
                      alert.status === "acknowledged" ? "text-blue-600" :
                      "text-yellow-600"
                    }`}>
                      {alert.location} • {alert.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    alert.severity === "high" ? "destructive" :
                    alert.severity === "medium" ? "secondary" :
                    "default"
                  }>
                    {alert.severity}
                  </Badge>
                  <Badge className={
                    alert.status === "resolved" ? "bg-green-100 text-green-800" :
                    alert.status === "acknowledged" ? "bg-blue-100 text-blue-800" :
                    "bg-yellow-100 text-yellow-800"
                  }>
                    {alert.status}
                  </Badge>
                </div>
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
            Common technician tasks and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-20 flex flex-col items-center justify-center space-y-2">
              <Package className="h-6 w-6" />
              <span>Quality Check</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Smartphone className="h-6 w-6" />
              <span>Sensor Reading</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Wrench className="h-6 w-6" />
              <span>Maintenance</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <QrCode className="h-6 w-6" />
              <span>Scan Batch</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <FileText className="h-6 w-6" />
              <span>Report Issue</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}