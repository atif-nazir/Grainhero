"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
//import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Smartphone, Wifi, Battery, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useEnvironmentalHistory } from '@/lib/useEnvironmentalData'
import { ActuatorQuickActions } from '@/components/actuator-quick-actions'
import { useLanguage } from '@/app/[locale]/providers'
import { AnimatedBackground } from "@/components/animations/MotionGraphics"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'
import { Checkbox } from "@/components/ui/checkbox"

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

interface Silo {
  _id: string
  name: string
  silo_id: string
}

export default function SensorsPage() {
  const [sensors, setSensors] = useState<SensorDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  //const [activeTab, setActiveTab] = useState('overview')
  const { latest } = useEnvironmentalHistory({ limit: 50 })
  const { t } = useLanguage()
  const [telemetry, setTelemetry] = useState<null | {
    temperature: number
    humidity: number
    tvoc: number
    fanState: string
    lidState: string
    mlDecision: string
    humanOverride: boolean
    guardrails: string[]
    timestamp: number
  }>(null)
  const [siloId, setSiloId] = useState<string>('')
  const backendUrl = (typeof window !== 'undefined' ? (window as typeof window & Record<string, unknown>).__BACKEND_URL : undefined) || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  
  // Module 2: Sensor Registration Dialog State
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)
  const [silos, setSilos] = useState<Silo[]>([])
  const [registerFormData, setRegisterFormData] = useState({
    device_id: '',
    device_name: '',
    silo_id: '',
    device_type: 'sensor' as 'sensor' | 'actuator',
    category: 'probe_core', // probe_core, probe_ambient, sensor_array, actuator
    sensor_types: [] as string[],
    mac_address: '',
    model: '',
    manufacturer: '',
    firmware_version: '',
    // Probe deployment
    probe_type: 'core' as 'core' | 'ambient',
    // Actuator setup
    capabilities: {
      fan: false,
      dehumidifier: false,
      vent: false,
      alarm: false
    }
  })

  // Fetch silos for registration
  useEffect(() => {
    ;(async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`${backendUrl}/api/silos?limit=100`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        if (res.ok) {
          const data = await res.json()
          setSilos((data.silos || []).map((s: any) => ({ _id: s._id, name: s.name, silo_id: s.silo_id })))
        }
      } catch (error) {
        console.error('Error fetching silos:', error)
      }
    })()
  }, [])

  // Load sensors from backend
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`${backendUrl}/api/sensors?limit=100`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        if (!mounted) return
        if (res.ok) {
          const data = await res.json()
          // Define type for raw API response
          interface RawSensorData {
            _id?: string;
            device_id?: string;
            device_name?: string;
            status?: string;
            health_status?: string;
            sensor_types?: string[];
            battery_level?: number;
            signal_strength?: number;
            device_metrics?: {
              battery_level?: number;
              signal_strength?: number;
            };
            silo_id?: {
              name?: string;
              _id?: string;
            };
            health_metrics?: {
              uptime_percentage?: number;
              error_count?: number;
              last_heartbeat?: string;
            };
          }
          
          const mapped: SensorDevice[] = (data.sensors || []).map((s: RawSensorData) => ({
            _id: s._id || '',
            device_id: s.device_id || s._id || '',
            device_name: s.device_name || 'Unnamed Device',
            status: s.health_status === 'healthy' ? 'active' : (s.health_status || s.status || 'active'),
            sensor_types: s.sensor_types || [],
            battery_level: s.battery_level || s.device_metrics?.battery_level || 100,
            signal_strength: s.signal_strength || s.device_metrics?.signal_strength || -50,
            silo_id: s.silo_id ? { name: s.silo_id.name || 'Silo', silo_id: s.silo_id._id || '' } : { name: '-', silo_id: '' },
            last_reading: s.health_metrics?.last_heartbeat || new Date().toISOString(),
            health_metrics: s.health_metrics || { uptime_percentage: 99, error_count: 0, last_heartbeat: new Date().toISOString() }
          }))
          setSensors(mapped)
          if (!siloId && mapped.length > 0) {
            setSiloId(mapped[0].device_id)
          }
        } else {
          setSensors([])
        }
      } catch {
        if (!mounted) return
        setSensors([])
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const fetchTelemetry = async () => {
      if (!siloId) return
      try {
        const res = await fetch(`${backendUrl}/api/iot/silos/${siloId}/telemetry`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        })
        if (!mounted) return
        if (res.ok) {
          const data = await res.json()
          setTelemetry(data)
        } else {
          setTelemetry(null)
        }
      } catch {
        if (!mounted) return
        setTelemetry(null)
      }
    }
    fetchTelemetry()
    const i = setInterval(fetchTelemetry, 3000)
    return () => {
      mounted = false
      clearInterval(i)
    }
  }, [siloId])

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
    <AnimatedBackground className="min-h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('sensors')}</h1>
          <p className="text-muted-foreground">
            Monitor and manage IoT sensor devices for environmental tracking
          </p>
        </div>
        <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Register Sensor/Actuator
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Module 2: Sensor & Actuator Registration</DialogTitle>
              <DialogDescription>
                Register new IoT device with probe deployment and sensor array setup
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Device Identification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Device Identification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="device_id">Device ID / QR Code *</Label>
                      <Input
                        id="device_id"
                        value={registerFormData.device_id}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, device_id: e.target.value })}
                        placeholder="Scan QR or enter device ID"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="device_name">Device Name *</Label>
                      <Input
                        id="device_name"
                        value={registerFormData.device_name}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, device_name: e.target.value })}
                        placeholder="e.g., Silo 3 Core Probe"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="device_type">Device Type *</Label>
                      <Select
                        value={registerFormData.device_type}
                        onValueChange={(value: 'sensor' | 'actuator') => setRegisterFormData({ ...registerFormData, device_type: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sensor">Sensor</SelectItem>
                          <SelectItem value="actuator">Actuator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="silo_id">Silo Assignment *</Label>
                      <Select
                        value={registerFormData.silo_id}
                        onValueChange={(value) => setRegisterFormData({ ...registerFormData, silo_id: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select silo" />
                        </SelectTrigger>
                        <SelectContent>
                          {silos.map((silo) => (
                            <SelectItem key={silo._id} value={silo._id}>
                              {silo.name} ({silo.silo_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Device Category *</Label>
                      <Select
                        value={registerFormData.category}
                        onValueChange={(value) => setRegisterFormData({ ...registerFormData, category: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="probe_core">Probe (Core - into grain)</SelectItem>
                          <SelectItem value="probe_ambient">Probe (Ambient - above grain)</SelectItem>
                          <SelectItem value="sensor_array">Sensor Array</SelectItem>
                          <SelectItem value="actuator">Actuator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="mac_address">MAC Address</Label>
                      <Input
                        id="mac_address"
                        value={registerFormData.mac_address}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, mac_address: e.target.value })}
                        placeholder="AA:BB:CC:DD:EE:FF"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Probe Deployment */}
              {(registerFormData.category === 'probe_core' || registerFormData.category === 'probe_ambient') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Probe Deployment</CardTitle>
                    <CardDescription>
                      {registerFormData.category === 'probe_core' 
                        ? 'One probe into grain (core)' 
                        : 'One ambient probe above grain'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Probe Type</Label>
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium">
                            {registerFormData.category === 'probe_core' ? 'Core Probe' : 'Ambient Probe'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {registerFormData.category === 'probe_core' 
                              ? 'Deployed into grain core for internal monitoring'
                              : 'Deployed above grain for ambient conditions'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="sensor_types_probe">Sensor Types *</Label>
                        <div className="mt-2 space-y-2">
                          {['temperature', 'humidity', 'moisture'].map((type) => (
                            <label key={type} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={registerFormData.sensor_types.includes(type)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRegisterFormData({
                                      ...registerFormData,
                                      sensor_types: [...registerFormData.sensor_types, type]
                                    })
                                  } else {
                                    setRegisterFormData({
                                      ...registerFormData,
                                      sensor_types: registerFormData.sensor_types.filter(t => t !== type)
                                    })
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm capitalize">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sensor Array */}
              {registerFormData.category === 'sensor_array' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sensor Array Configuration</CardTitle>
                    <CardDescription>Temp, humidity, CO₂, VOC, moisture, light</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['temperature', 'humidity', 'co2', 'voc', 'moisture', 'light'].map((type) => (
                        <label key={type} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={registerFormData.sensor_types.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRegisterFormData({
                                  ...registerFormData,
                                  sensor_types: [...registerFormData.sensor_types, type]
                                })
                              } else {
                                setRegisterFormData({
                                  ...registerFormData,
                                  sensor_types: registerFormData.sensor_types.filter(t => t !== type)
                                })
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actuator Setup */}
              {registerFormData.device_type === 'actuator' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actuator Setup</CardTitle>
                    <CardDescription>Install: fans, dehumidifiers, vents, alarms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['fan', 'dehumidifier', 'vent', 'alarm'].map((cap) => (
                        <label key={cap} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={registerFormData.capabilities[cap as keyof typeof registerFormData.capabilities]}
                            onChange={(e) => {
                              setRegisterFormData({
                                ...registerFormData,
                                capabilities: {
                                  ...registerFormData.capabilities,
                                  [cap]: e.target.checked
                                }
                              })
                            }}
                            className="rounded"
                          />
                          <span className="text-sm capitalize">{cap}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Device Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Device Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={registerFormData.model}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, model: e.target.value })}
                        placeholder="Device model"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input
                        id="manufacturer"
                        value={registerFormData.manufacturer}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, manufacturer: e.target.value })}
                        placeholder="Manufacturer name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="firmware_version">Firmware Version</Label>
                      <Input
                        id="firmware_version"
                        value={registerFormData.firmware_version}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, firmware_version: e.target.value })}
                        placeholder="e.g., 1.0.0"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRegisterDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!registerFormData.device_id || !registerFormData.device_name || !registerFormData.silo_id || registerFormData.sensor_types.length === 0) {
                    toast.error('Please fill all required fields')
                    return
                  }
                  try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                    const res = await fetch(`${backendUrl}/api/sensors/register`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({
                        ...registerFormData,
                        capabilities: registerFormData.device_type === 'actuator' ? registerFormData.capabilities : undefined
                      })
                    })
                    if (res.ok) {
                      toast.success('Device registered successfully')
                      setIsRegisterDialogOpen(false)
                      setRegisterFormData({
                        device_id: '',
                        device_name: '',
                        silo_id: '',
                        device_type: 'sensor',
                        category: 'probe_core',
                        sensor_types: [],
                        mac_address: '',
                        model: '',
                        manufacturer: '',
                        firmware_version: '',
                        probe_type: 'core',
                        capabilities: { fan: false, dehumidifier: false, vent: false, alarm: false }
                      })
                      // Reload sensors
                      window.location.reload()
                    } else {
                      const error = await res.json()
                      toast.error(error.error || 'Failed to register device')
                    }
                  } catch (error) {
                    console.error('Error registering device:', error)
                    toast.error('Failed to register device')
                  }
                }}
                className="bg-black hover:bg-gray-800 text-white"
              >
                Register Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Environmental Snapshot</CardTitle>
          <CardDescription>
            {latest ? `Last reading ${new Date(latest.timestamp).toLocaleString()}` : 'Waiting for telemetry'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Core Temp</div>
            <div className="text-lg font-semibold">
              {(latest?.temperature?.value ??
                latest?.environmental_context?.weather?.temperature ??
                '--') + '°C'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Core RH</div>
            <div className="text-lg font-semibold">
              {(latest?.humidity?.value ??
                latest?.environmental_context?.weather?.humidity ??
                '--') + '%'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Fan Duty</div>
            <div className="text-lg font-semibold">
              {latest?.actuation_state?.fan_duty_cycle?.toFixed(0) ?? 0}%
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">VOC Relative</div>
            <div className="text-lg font-semibold">
              {latest?.derived_metrics?.voc_relative?.toFixed(1) ?? '0'}%
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Telemetry</CardTitle>
          <CardDescription>
            {telemetry ? `Last update ${new Date(telemetry.timestamp).toLocaleString()}` : 'Data unavailable'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Temperature</div>
            <div className="text-lg font-semibold">
              {telemetry ? `${telemetry.temperature.toFixed(1)}°C` : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Humidity</div>
            <div className="text-lg font-semibold">
              {telemetry ? `${telemetry.humidity.toFixed(1)}%` : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">TVOC</div>
            <div className="text-lg font-semibold">
              {telemetry ? `${telemetry.tvoc}` : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Actuators</div>
            <div className="text-lg font-semibold">
              {telemetry ? `${telemetry.fanState.toUpperCase()} / ${telemetry.lidState.toUpperCase()}` : '--'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ML & Guardrails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className={`border rounded-lg p-4 ${telemetry?.mlDecision === 'fan_on' ? 'bg-green-50' : ''}`}>
              <div className="text-xs uppercase text-muted-foreground">ML Decision</div>
              <div className="text-lg font-semibold">
                {telemetry ? telemetry.mlDecision : '--'}
              </div>
            </div>
            <div className={`border rounded-lg p-4 ${telemetry?.humanOverride ? 'bg-yellow-50' : ''}`}>
              <div className="text-xs uppercase text-muted-foreground">Human Override</div>
              <div className="text-lg font-semibold">
                {telemetry ? (telemetry.humanOverride ? 'Active' : 'None') : '--'}
              </div>
            </div>
            <div className={`border rounded-lg p-4 ${telemetry && telemetry.guardrails.length ? 'bg-red-50' : ''}`}>
              <div className="text-xs uppercase text-muted-foreground">Guardrails</div>
              <div className="text-lg font-semibold">
                {telemetry ? (telemetry.guardrails.length ? telemetry.guardrails.join(', ') : 'None') : '--'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ActuatorQuickActions />
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
                  placeholder="Enter sensor name or device ID to search..."
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
      </div>
    </AnimatedBackground>
  )
}
