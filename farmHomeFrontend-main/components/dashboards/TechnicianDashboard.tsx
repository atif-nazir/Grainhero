"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Smartphone, 
  AlertTriangle, 
  Activity,
  Wrench,
  Battery,
  Wifi,
  Thermometer,
  Droplets,
  Eye,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  MapPin,
  Gauge
} from "lucide-react"

export function TechnicianDashboard() {
  // Mock data - in real app, this would come from API
  const technicianStats = {
    totalSensors: 24,
    activeSensors: 22,
    offlineSensors: 2,
    maintenanceDue: 5,
    criticalAlerts: 3,
    batteryLow: 4
  }

  const sensorDevices = [
    { 
      id: 1, 
      name: "Temperature Sensor A", 
      type: "temperature", 
      status: "active", 
      location: "Silo A",
      battery: 85,
      signal: "strong",
      lastReading: "2 min ago",
      value: "22.5°C",
      threshold: "≤25°C"
    },
    { 
      id: 2, 
      name: "Humidity Sensor B", 
      type: "humidity", 
      status: "active", 
      location: "Silo B",
      battery: 45,
      signal: "medium",
      lastReading: "5 min ago",
      value: "65%",
      threshold: "≤70%"
    },
    { 
      id: 3, 
      name: "CO2 Monitor C", 
      type: "co2", 
      status: "offline", 
      location: "Silo C",
      battery: 15,
      signal: "weak",
      lastReading: "2 hours ago",
      value: "N/A",
      threshold: "≤1000ppm"
    },
    { 
      id: 4, 
      name: "Moisture Sensor D", 
      type: "moisture", 
      status: "maintenance", 
      location: "Silo D",
      battery: 92,
      signal: "strong",
      lastReading: "1 hour ago",
      value: "12.3%",
      threshold: "≤15%"
    }
  ]

  const criticalAlerts = [
    { 
      id: 1, 
      type: "critical", 
      message: "Temperature spike detected", 
      time: "5 min ago", 
      location: "Silo A",
      sensor: "Temperature Sensor A",
      value: "28.5°C",
      threshold: "25°C"
    },
    { 
      id: 2, 
      type: "warning", 
      message: "Battery critically low", 
      time: "15 min ago", 
      location: "Silo C",
      sensor: "CO2 Monitor C",
      value: "15%",
      threshold: "20%"
    },
    { 
      id: 3, 
      type: "info", 
      message: "Maintenance due", 
      time: "1 hour ago", 
      location: "Silo D",
      sensor: "Moisture Sensor D",
      value: "Due",
      threshold: "Scheduled"
    }
  ]

  const maintenanceTasks = [
    { 
      id: 1, 
      sensor: "Temperature Sensor A", 
      task: "Calibration check", 
      dueDate: "Today", 
      priority: "high",
      location: "Silo A",
      estimatedTime: "30 min"
    },
    { 
      id: 2, 
      sensor: "Humidity Sensor B", 
      task: "Battery replacement", 
      dueDate: "Tomorrow", 
      priority: "medium",
      location: "Silo B",
      estimatedTime: "15 min"
    },
    { 
      id: 3, 
      sensor: "CO2 Monitor C", 
      task: "Signal troubleshooting", 
      dueDate: "ASAP", 
      priority: "critical",
      location: "Silo C",
      estimatedTime: "45 min"
    }
  ]

  const environmentalReadings = [
    { type: "Temperature", value: "22.5°C", status: "normal", icon: Thermometer },
    { type: "Humidity", value: "65%", status: "normal", icon: Droplets },
    { type: "CO2", value: "450ppm", status: "good", icon: Activity },
    { type: "Moisture", value: "12.3%", status: "optimal", icon: Gauge }
  ]

  const getSensorIcon = (type: string) => {
    switch (type) {
      case "temperature": return Thermometer
      case "humidity": return Droplets
      case "co2": return Activity
      case "moisture": return Gauge
      default: return Smartphone
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500"
      case "offline": return "bg-red-500"
      case "maintenance": return "bg-yellow-500"
      default: return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      {/* Technician Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sensors</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianStats.totalSensors}</div>
            <p className="text-xs text-muted-foreground">
              {technicianStats.activeSensors} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline Sensors</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{technicianStats.offlineSensors}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{technicianStats.maintenanceDue}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battery Low</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{technicianStats.batteryLow}</div>
            <p className="text-xs text-muted-foreground">
              Need replacement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {technicianStats.criticalAlerts > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Alerts ({technicianStats.criticalAlerts})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAlerts.map((alert) => (
                <div key={alert.id} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${
                  alert.type === "critical" ? "border-red-200" :
                  alert.type === "warning" ? "border-orange-200" :
                  "border-blue-200"
                }`}>
                  <div>
                    <p className={`font-medium ${
                      alert.type === "critical" ? "text-red-900" :
                      alert.type === "warning" ? "text-orange-900" :
                      "text-blue-900"
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.sensor} • {alert.location} • {alert.time}
                    </p>
                    <p className="text-xs text-gray-500">
                      Current: {alert.value} | Threshold: {alert.threshold}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant={
                      alert.type === "critical" ? "destructive" :
                      alert.type === "warning" ? "secondary" :
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
        {/* Sensor Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Sensor Devices
            </CardTitle>
            <CardDescription>
              Real-time sensor status and readings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sensorDevices.map((sensor) => {
                const IconComponent = getSensorIcon(sensor.type)
                return (
                  <div key={sensor.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4" />
                        <h4 className="font-medium">{sensor.name}</h4>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(sensor.status)}`} />
                        <Badge variant={
                          sensor.status === "active" ? "default" :
                          sensor.status === "offline" ? "destructive" :
                          "secondary"
                        }>
                          {sensor.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span>{sensor.location}</span>
                        <span>Value: {sensor.value}</span>
                        <span>Last: {sensor.lastReading}</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <Battery className="h-3 w-3" />
                          <span className="text-xs">{sensor.battery}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Wifi className="h-3 w-3" />
                          <span className="text-xs capitalize">{sensor.signal}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              Maintenance Tasks
            </CardTitle>
            <CardDescription>
              Scheduled maintenance and repairs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {maintenanceTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{task.sensor}</h4>
                      <Badge variant={
                        task.priority === "critical" ? "destructive" :
                        task.priority === "high" ? "secondary" :
                        "default"
                      }>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>{task.task}</span>
                      <span>{task.location}</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{task.dueDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Wrench className="h-3 w-3" />
                        <span className="text-xs">{task.estimatedTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">View</Button>
                    <Button size="sm" variant="default">Start</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Readings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Environmental Readings
          </CardTitle>
          <CardDescription>
            Current environmental conditions across all silos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {environmentalReadings.map((reading, index) => {
              const IconComponent = reading.icon
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                    <Badge variant={
                      reading.status === "optimal" ? "default" :
                      reading.status === "good" ? "default" :
                      reading.status === "normal" ? "secondary" :
                      "destructive"
                    }>
                      {reading.status}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mb-1">{reading.value}</div>
                  <div className="text-sm text-muted-foreground">{reading.type}</div>
                </div>
              )
            })}
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
            Common technician tasks and field operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-20 flex flex-col items-center justify-center space-y-2">
              <Wrench className="h-6 w-6" />
              <span>Start Maintenance</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Smartphone className="h-6 w-6" />
              <span>Add Sensor</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Battery className="h-6 w-6" />
              <span>Replace Battery</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Settings className="h-6 w-6" />
              <span>Calibrate</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <MapPin className="h-6 w-6" />
              <span>Field Inspection</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <Eye className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
