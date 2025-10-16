"use client"

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Zap, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface SensorReading {
  _id: string
  device_id: string
  timestamp: string
  temperature?: { value: number; unit: string }
  humidity?: { value: number; unit: string }
  co2?: { value: number; unit: string }
  voc?: { value: number; unit: string }
  moisture?: { value: number; unit: string }
  light?: { value: number; unit: string }
  pressure?: { value: number; unit: string }
  ph?: { value: number; unit: string }
  probe_type?: 'ambient' | 'core'
  quality_indicators: {
    is_valid: boolean
    confidence_score: number
    anomaly_detected: boolean
  }
}

interface EnvironmentalData {
  current_readings: SensorReading[]
  historical_data: any[]
  weather_data: any
  air_quality: any
  alerts: any[]
  device_status: any[]
}

export default function EnvironmentalDataPage() {
  const t = useTranslations('EnvironmentalData')
  const [data, setData] = useState<EnvironmentalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSilo, setSelectedSilo] = useState('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [selectedProbe, setSelectedProbe] = useState('all')
  const [isRealTime, setIsRealTime] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load environmental data
  useEffect(() => {
    loadEnvironmentalData()
    
    // Set up real-time connection
    if (isRealTime) {
      setupRealTimeConnection()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [selectedSilo, selectedTimeRange, selectedProbe, isRealTime])

  const loadEnvironmentalData = async () => {
    try {
      const backendUrl = (await import('@/config')).config.backendUrl
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      
      const params = new URLSearchParams({
        silo_id: selectedSilo,
        time_range: selectedTimeRange,
        probe_type: selectedProbe
      })

      const res = await fetch(`${backendUrl}/ai-spoilage/predictions?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      })
      
        if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Load environmental data error:', error)
      } finally {
        setLoading(false)
      }
    }

  const setupRealTimeConnection = () => {
    try {
      const ws = new WebSocket('ws://localhost:5000')
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionStatus('connected')
        console.log('Real-time connection established')
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === 'sensor_reading') {
          // Update data with new reading
          setData(prev => {
            if (!prev) return prev
            return {
              ...prev,
              current_readings: [message.data, ...prev.current_readings.slice(0, 99)]
            }
          })
        }
      }

      ws.onclose = () => {
        setConnectionStatus('disconnected')
        console.log('Real-time connection closed')
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Setup real-time connection error:', error)
      setConnectionStatus('disconnected')
    }
  }

  const getSensorIcon = (type: string) => {
    const icons = {
      temperature: Thermometer,
      humidity: Droplets,
      co2: Wind,
      voc: Activity,
      moisture: Droplets,
      light: Eye,
      pressure: Zap
    }
    return icons[type as keyof typeof icons] || Activity
  }

  const getSensorColor = (type: string) => {
    const colors = {
      temperature: 'text-red-600',
      humidity: 'text-blue-600',
      co2: 'text-gray-600',
      voc: 'text-purple-600',
      moisture: 'text-green-600',
      light: 'text-yellow-600',
      pressure: 'text-indigo-600'
    }
    return colors[type as keyof typeof colors] || 'text-gray-600'
  }

  const getSensorStatus = (value: number, type: string) => {
    const thresholds = {
      temperature: { min: 15, max: 35, critical_min: 5, critical_max: 45 },
      humidity: { min: 30, max: 70, critical_min: 10, critical_max: 90 },
      co2: { min: 300, max: 1000, critical_min: 200, critical_max: 2000 },
      voc: { min: 0, max: 500, critical_min: 0, critical_max: 1000 },
      moisture: { min: 8, max: 15, critical_min: 5, critical_max: 20 }
    }

    const threshold = thresholds[type as keyof typeof thresholds]
    if (!threshold) return 'normal'

    if (value < threshold.critical_min || value > threshold.critical_max) return 'critical'
    if (value < threshold.min || value > threshold.max) return 'warning'
    return 'normal'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      normal: CheckCircle,
      warning: AlertTriangle,
      critical: AlertTriangle
    }
    return icons[status as keyof typeof icons] || CheckCircle
  }

  const getStatusColor = (status: string) => {
    const colors = {
      normal: 'text-green-600',
      warning: 'text-yellow-600',
      critical: 'text-red-600'
    }
    return colors[status as keyof typeof colors] || 'text-gray-600'
  }

  const formatChartData = (readings: SensorReading[]) => {
    return readings.map(reading => ({
      timestamp: new Date(reading.timestamp).toLocaleTimeString(),
      temperature: reading.temperature?.value,
      humidity: reading.humidity?.value,
      co2: reading.co2?.value,
      voc: reading.voc?.value,
      moisture: reading.moisture?.value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading environmental data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Environmental Data</h1>
          <p className="text-muted-foreground">
            Real-time environmental monitoring and analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm text-muted-foreground">
              {connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </span>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsRealTime(!isRealTime)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isRealTime ? 'Stop Live' : 'Start Live'}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Data Filters</CardTitle>
          <CardDescription>Configure environmental data display</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Select value={selectedSilo} onValueChange={setSelectedSilo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Silo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Silos</SelectItem>
                <SelectItem value="silo-a">Silo A</SelectItem>
                <SelectItem value="silo-b">Silo B</SelectItem>
                <SelectItem value="silo-c">Silo C</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedProbe} onValueChange={setSelectedProbe}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Probe Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Probes</SelectItem>
                <SelectItem value="ambient">Ambient</SelectItem>
                <SelectItem value="core">Core</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Current Readings */}
      {data?.current_readings && data.current_readings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data.current_readings[0]).map(([key, value]) => {
            if (typeof value !== 'object' || !value?.value) return null
            
            const Icon = getSensorIcon(key)
            const status = getSensorStatus(value.value, key)
            const StatusIcon = getStatusIcon(status)
            
            return (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {key.replace('_', ' ')}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${getSensorColor(key)}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value.value.toFixed(1)}</div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <StatusIcon className={`h-3 w-3 ${getStatusColor(status)}`} />
                    <span>{value.unit}</span>
                    <span>•</span>
                    <span className="capitalize">{status}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="temperature">Temperature</TabsTrigger>
          <TabsTrigger value="humidity">Humidity</TabsTrigger>
          <TabsTrigger value="air-quality">Air Quality</TabsTrigger>
          <TabsTrigger value="comparison">Ambient vs Core</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Temperature Trends</CardTitle>
                <CardDescription className="text-sm text-gray-600">Temperature over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatChartData(data?.current_readings || [])}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#666" 
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis 
                        stroke="#666" 
                        fontSize={12}
                        label={{ value: '°C', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => [`${value}°C`, 'Temperature']}
                        labelFormatter={(label) => `Time: ${new Date(label).toLocaleString()}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#374151" 
                        strokeWidth={2}
                        dot={{ fill: '#374151', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#374151', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Humidity Trends</CardTitle>
                <CardDescription className="text-sm text-gray-600">Humidity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formatChartData(data?.current_readings || [])}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#666" 
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis 
                        stroke="#666" 
                        fontSize={12}
                        label={{ value: '%', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => [`${value}%`, 'Humidity']}
                        labelFormatter={(label) => `Time: ${new Date(label).toLocaleString()}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="humidity" 
                        stroke="#374151" 
                        strokeWidth={2}
                        fill="#374151"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="temperature" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Temperature Analysis</CardTitle>
              <CardDescription>Detailed temperature monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatChartData(data?.current_readings || [])}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="humidity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Humidity Analysis</CardTitle>
              <CardDescription>Detailed humidity monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formatChartData(data?.current_readings || [])}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#3b82f6" 
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="air-quality" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>CO2 Levels</CardTitle>
                <CardDescription>Carbon dioxide concentration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatChartData(data?.current_readings || [])}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="co2" 
                        stroke="#6b7280" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>VOC Levels</CardTitle>
                <CardDescription>Volatile organic compounds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatChartData(data?.current_readings || [])}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="voc" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ambient vs Core Comparison</CardTitle>
              <CardDescription>Compare ambient and core sensor readings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatChartData(data?.current_readings || [])}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Temperature"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Humidity"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Weather Data */}
      {data?.weather_data && (
        <Card>
          <CardHeader>
            <CardTitle>Weather Forecast</CardTitle>
            <CardDescription>External weather conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.weather_data.temperature}°C</div>
                <div className="text-sm text-muted-foreground">Temperature</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.weather_data.humidity}%</div>
                <div className="text-sm text-muted-foreground">Humidity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.weather_data.pressure} hPa</div>
                <div className="text-sm text-muted-foreground">Pressure</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Environmental Alerts</CardTitle>
            <CardDescription>Recent environmental alerts and warnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.alerts.map((alert, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 rounded-lg bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">{alert.message}</span>
                  <Badge variant="outline">{alert.priority}</Badge>
                </div>
              ))}
            </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
