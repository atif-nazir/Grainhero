"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Fan,
  Droplets,
  Volume2,
  Thermometer,
  Power,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react'

interface IoTDevice {
  _id: string
  device_id: string
  name: string
  type: 'sensor' | 'actuator'
  category: string
  location: string
  status: 'online' | 'offline'
  current_value: number
  unit: string
  threshold_min?: number
  threshold_max?: number
  power_consumption?: number
  last_reading?: string
  last_activity?: string
  human_requested_fan?: boolean
  ml_requested_fan?: boolean
  target_fan_speed?: number
}

export default function ActuatorsPage() {
  const [devices, setDevices] = useState<IoTDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const [selectedDevices, setSelectedDevices] = useState<string[]>([])

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  const [singleDeviceId, setSingleDeviceId] = useState<string>(process.env.NEXT_PUBLIC_DEVICE_ID || '')
  const socketRef = useRef<import('socket.io-client').Socket | null>(null)

  useEffect(() => {
    loadDevices()
    const i = setInterval(loadDevices, 2000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const mod = await import('socket.io-client')
        const socket = mod.io(backendUrl, { transports: ['websocket'], path: '/socket.io' })
        socketRef.current = socket
        socket.on('connect', () => {
          if (!mounted) return
          toast.success(`Realtime connected: ${socket.id}`)
        })
        socket.on('actuator_status', (msg: { data: Record<string, unknown> }) => {
          if (!mounted) return
          try {
            const d = (msg?.data as Record<string, unknown>) || {}
            setDevices(prev => prev.map(dev => {
              const actId = (d as Record<string, unknown>)?.['actuatorId']
              if (actId && (dev._id === actId || dev.device_id === actId)) {
                return { ...dev, status: 'online', last_activity: new Date().toISOString() }
              }
              return dev
            }))
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'unknown'
            toast.error(`Realtime actuator parse error: ${msg}`)
          }
        })
        socket.on('connect_error', (err: Error) => {
          if (!mounted) return
          toast.error(`Realtime error: ${err.message}`)
          // Fetch backend diagnostics for clearer messaging
          const id = singleDeviceId || devices[0]?._id || ''
          if (id) {
            fetch(`${backendUrl}/api/iot/diagnostics-public/${id}`).then(r => r.json()).then(d => {
              if (d && d.mqtt_connected === false) toast.error('Backend MQTT disconnected (check broker URL/env)')
              if (d && d.firebase_enabled === false) toast.error('Backend Firebase disabled or misconfigured (.env)')
            }).catch(() => {})
          }
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown'
        toast.error(`Realtime init failed: ${msg}`)
      }
    })()
    return () => {
      mounted = false
      try {
        socketRef.current?.off('actuator_status')
        socketRef.current?.disconnect()
      } catch {}
      socketRef.current = null
    }
  }, [backendUrl])

  const loadDevices = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${backendUrl}/api/iot/devices`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDevices(data.devices || [])
      }
    } catch (error) {
      console.error('Error loading devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const controlDevice = async (deviceId: string, action: string, value?: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${backendUrl}/api/iot/devices/${deviceId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action, value })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Device control result:', result)
        toast.success(`Sent ${action} to ${deviceId}${value !== undefined ? ` (${value}%)` : ''}`)
        loadDevices() // Refresh device list
      } else {
        const errText = await response.text().catch(() => '')
        toast.error(`Control failed (${response.status}): ${errText || 'unknown error'}`)
        // Try diagnostics to explain failure
        fetch(`${backendUrl}/api/iot/diagnostics-public/${deviceId}`).then(r => r.json()).then(d => {
          if (d && d.mqtt_connected === false) toast.error('MQTT broker unreachable from backend')
          if (d && d.firebase_enabled === false) toast.error('Firebase realtime disabled/missing FIREBASE_* envs')
        }).catch(() => {})
      }
    } catch (error) {
      console.error('Error controlling device:', error)
      toast.error(`Control error: ${(error as Error).message}`)
    }
  }

  const bulkControl = async (action: string, value?: number) => {
    if (selectedDevices.length === 0) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${backendUrl}/api/iot/bulk-control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          devices: selectedDevices,
          action,
          value
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Bulk control result:', result)
        setSelectedDevices([])
        loadDevices() // Refresh device list
      }
    } catch (error) {
      console.error('Error in bulk control:', error)
    }
  }

  const emergencyShutdown = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${backendUrl}/api/iot/emergency-shutdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Emergency shutdown result:', result)
        loadDevices() // Refresh device list
      }
    } catch (error) {
      console.error('Error in emergency shutdown:', error)
    }
  }

  const getDeviceIcon = (category: string) => {
    switch (category) {
      case 'ventilation': return <Fan className="h-5 w-5" />
      case 'humidity_control': return <Droplets className="h-5 w-5" />
      case 'alert': return <Volume2 className="h-5 w-5" />
      case 'environmental': return <Thermometer className="h-5 w-5" />
      default: return <Settings className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800'
      case 'offline': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredDevices = devices.filter(device => {
    if (activeTab === 'all') return true
    if (activeTab === 'sensors') return device.type === 'sensor'
    if (activeTab === 'actuators') return device.type === 'actuator'
    return device.category === activeTab
  })

  const sensors = devices.filter(d => d.type === 'sensor')
  const actuators = devices.filter(d => d.type === 'actuator')
  const onlineDevices = devices.filter(d => d.status === 'online')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IoT Device Control</h1>
          <p className="text-gray-600">Monitor and control sensors and actuators</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => loadDevices()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={emergencyShutdown}
            className="bg-red-600 hover:bg-red-700"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency Shutdown
          </Button>
        </div>
      </div>

      {/* Direct single-device control when there are no DB devices */}
      {devices.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Direct Control (Device ID)</CardTitle>
            <CardDescription>Use fixed device ID to send real commands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                className="border rounded px-3 py-2 w-64"
                placeholder="Enter device ID"
                value={singleDeviceId}
                onChange={e => setSingleDeviceId(e.target.value)}
              />
              <Button disabled={!singleDeviceId} onClick={() => controlDevice(singleDeviceId, 'turn_on', 80)} className="bg-green-600 hover:bg-green-700">
                <Power className="h-4 w-4 mr-2" />
                Turn ON (80%)
              </Button>
              <Button disabled={!singleDeviceId} onClick={() => controlDevice(singleDeviceId, 'turn_off')} className="bg-red-600 hover:bg-red-700">
                <XCircle className="h-4 w-4 mr-2" />
                Turn OFF
              </Button>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Set PWM</div>
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={0}
                onMouseUp={(e) => {
                  const v = Number((e.target as HTMLInputElement).value)
                  controlDevice(singleDeviceId, 'set_value', v)
                }}
                className="w-64"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">
              {sensors.length} sensors, {actuators.length} actuators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineDevices.length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((onlineDevices.length / devices.length) * 100)}% online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Actuators</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {actuators.filter(a => a.status === 'online').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Good</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Control */}
      {selectedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Control ({selectedDevices.length} devices selected)</CardTitle>
            <CardDescription>Control multiple devices at once</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button
                onClick={() => bulkControl('turn_on')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Power className="h-4 w-4 mr-2" />
                Turn All ON
              </Button>
              <Button
                onClick={() => bulkControl('turn_off')}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Turn All OFF
              </Button>
              <Button
                onClick={() => setSelectedDevices([])}
                variant="outline"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Devices</TabsTrigger>
          <TabsTrigger value="sensors">Sensors</TabsTrigger>
          <TabsTrigger value="actuators">Actuators</TabsTrigger>
          <TabsTrigger value="ventilation">Ventilation</TabsTrigger>
          <TabsTrigger value="humidity_control">Humidity</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading devices...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDevices.map((device) => (
                <Card key={device._id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(device.category)}
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                      </div>
                      <Badge className={getStatusColor(device.status)}>
                        {device.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {device.device_id} • {device.location}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      {/* Current Value */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Value:</span>
                        <span className="text-lg font-bold">
                          {device.current_value} {device.unit}
                        </span>
                      </div>

                      {/* Thresholds for sensors */}
                      {device.type === 'sensor' && device.threshold_min && device.threshold_max && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Min: {device.threshold_min}{device.unit}</span>
                            <span>Max: {device.threshold_max}{device.unit}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0,
                                  ((device.current_value - device.threshold_min) /
                                    (device.threshold_max - device.threshold_min)) * 100
                                ))}%`
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Power consumption for actuators */}
                      {device.type === 'actuator' && (
                        <div className="space-y-2 py-2 border-t border-b border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-500">Target Speed:</span>
                            <span className="font-bold text-blue-600">{device.target_fan_speed || 0}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              defaultValue={device.target_fan_speed || 0}
                              onMouseUp={(e) => {
                                const v = Number((e.target as HTMLInputElement).value)
                                controlDevice(device._id, 'turn_on', v)
                              }}
                              className="w-full"
                            />
                            <Badge variant="outline">{device.target_fan_speed || 0}%</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-500">Mode:</span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {device.human_requested_fan ? 'Manual Override' : (device.ml_requested_fan ? 'AI Controlled' : 'Idle')}
                            </Badge>
                          </div>
                          {device.power_consumption && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-500">Actual Power:</span>
                              <span>{device.power_consumption}W</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Control buttons for actuators */}
                      {device.type === 'actuator' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => controlDevice(device._id, 'turn_on')}
                            className="bg-green-600 hover:bg-green-700 flex-1"
                            disabled={device.human_requested_fan}
                          >
                            <Power className="h-4 w-4 mr-1" />
                            Request ON
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => controlDevice(device._id, 'turn_off')}
                            className="bg-red-600 hover:bg-red-700 flex-1"
                            disabled={!device.human_requested_fan && !device.ml_requested_fan}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Request OFF
                          </Button>
                        </div>
                      )}

                      {/* Selection checkbox for bulk control */}
                      {device.type === 'actuator' && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedDevices.includes(device._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDevices([...selectedDevices, device._id])
                              } else {
                                setSelectedDevices(selectedDevices.filter(id => id !== device._id))
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-600">Select for bulk control</span>
                        </div>
                      )}

                      {/* Last activity */}
                      <div className="text-xs text-gray-500">
                        Last {device.type === 'sensor' ? 'reading' : 'activity'}: {
                          device.last_reading || device.last_activity ?
                            new Date(device.last_reading || device.last_activity || '').toLocaleString() :
                            'Never'
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
