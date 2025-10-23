"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Smartphone, Wifi, Battery, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface SensorDevice {
  _id: string
  device_id: string
  device_name: string
  status: string
  sensor_types: string[]
  battery_level: number
  signal_strength: number
  silo_id: {
    name: string
    silo_id: string
  }
  last_reading: string
  health_metrics: {
    uptime_percentage: number
    error_count: number
    last_heartbeat: string
  }
}

export default function SensorsPage() {
  const t = useTranslations('Sensors')
  const [sensors, setSensors] = useState<SensorDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  // Load sensors from backend
  useEffect(() => {
    const run = async () => {
      try {
        const backendUrl = (await import('@/config')).config.backendUrl
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`${backendUrl}/api/sensors?limit=100`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        if (res.ok) {
          const data = await res.json()
          const mapped: SensorDevice[] = (data.sensors || []).map((s: any) => ({
            _id: s._id,
            device_id: s.device_id || s._id,
            device_name: s.device_name,
            status: s.health_status === 'healthy' ? 'active' : (s.health_status || s.status || 'active'),
            sensor_types: s.sensor_types || [],
            battery_level: s.battery_level || s.device_metrics?.battery_level || 100,
            signal_strength: s.signal_strength || s.device_metrics?.signal_strength || -50,
            silo_id: s.silo_id ? { name: s.silo_id.name || 'Silo', silo_id: s.silo_id._id || '' } : { name: '-', silo_id: '' },
            last_reading: s.health_metrics?.last_heartbeat || new Date().toISOString(),
            health_metrics: s.health_metrics || { uptime_percentage: 99, error_count: 0, last_heartbeat: new Date().toISOString() }
          }))
          setSensors(mapped)
        } else {
          setSensors([])
        }
      } catch {
        setSensors([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      offline: { color: 'bg-red-100 text-red-800', icon: XCircle },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      error: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.offline
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600'
    if (level > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSignalColor = (strength: number) => {
    if (strength > -50) return 'text-green-600'
    if (strength > -70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthStatus = (sensor: SensorDevice) => {
    if (sensor.status === 'offline') return 'Offline'
    if (sensor.battery_level < 20) return 'Low Battery'
    if (sensor.health_metrics.error_count > 10) return 'Errors Detected'
    if (sensor.health_metrics.uptime_percentage < 90) return 'Poor Connectivity'
    return 'Healthy'
  }

  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = sensor.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sensor.device_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || sensor.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading sensors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IoT Sensors</h1>
          <p className="text-muted-foreground">
            Monitor and manage IoT sensor devices for environmental tracking
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Sensor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sensors</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sensors.length}</div>
            <p className="text-xs text-muted-foreground">
              IoT devices deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sensors</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sensors.filter(s => s.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline Sensors</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sensors.filter(s => s.status === 'offline').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Uptime</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(sensors.reduce((sum, s) => sum + s.health_metrics.uptime_percentage, 0) / sensors.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              System reliability
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Sensors</CardTitle>
          <CardDescription>Search and filter IoT sensor devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sensor name or device ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sensors Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSensors.map((sensor) => {
          const statusConfig = getStatusBadge(sensor.status)
          const StatusIcon = statusConfig.icon

          return (
            <Card key={sensor._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{sensor.device_name}</CardTitle>
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1)}
                  </Badge>
                </div>
                <CardDescription>{sensor.device_id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Location</div>
                  <div className="text-sm text-blue-700">{sensor.silo_id.name}</div>
                </div>

                {/* Sensor Types */}
                <div>
                  <div className="text-sm font-medium mb-2">Sensor Types</div>
                  <div className="flex flex-wrap gap-1">
                    {sensor.sensor_types.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Health Metrics */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Device Health</div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Battery className="h-4 w-4" />
                      <span>Battery</span>
                    </div>
                    <span className={getBatteryColor(sensor.battery_level)}>
                      {sensor.battery_level}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <span>Signal</span>
                    </div>
                    <span className={getSignalColor(sensor.signal_strength)}>
                      {sensor.signal_strength} dBm
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span>Uptime</span>
                    <span className="font-medium">{sensor.health_metrics.uptime_percentage}%</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span>Errors</span>
                    <span className={sensor.health_metrics.error_count > 0 ? 'text-red-600' : 'text-green-600'}>
                      {sensor.health_metrics.error_count}
                    </span>
                  </div>
                </div>

                {/* Last Reading */}
                <div className="text-xs text-muted-foreground">
                  Last reading: {new Date(sensor.last_reading).toLocaleString()}
                </div>

                {/* Health Status */}
                <div className="flex items-center gap-2">
                  <div className="text-sm">Status:</div>
                  <Badge variant={sensor.status === 'active' ? 'default' : 'destructive'}>
                    {getHealthStatus(sensor)}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Data
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredSensors.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No sensors found matching your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
