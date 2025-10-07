"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Package, Thermometer, Droplets, Wind, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface Silo {
  _id: string
  silo_id: string
  name: string
  capacity_kg: number
  current_occupancy_kg: number
  status: string
  current_conditions: {
    temperature: { value: number; timestamp: string }
    humidity: { value: number; timestamp: string }
    co2: { value: number; timestamp: string }
  }
  current_batch_id?: {
    batch_id: string
    grain_type: string
  }
}

export default function SilosPage() {
  const t = useTranslations('Silos')
  const [silos, setSilos] = useState<Silo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await api.get<{ silos: Silo[] }>(`/silos?limit=50`)
      if (!mounted) return
      if (res.ok && res.data) {
        setSilos(res.data.silos as unknown as Silo[])
      }
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      offline: 'bg-red-100 text-red-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getOccupancyPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100)
  }

  const getConditionStatus = (value: number, type: 'temperature' | 'humidity' | 'co2') => {
    const thresholds = {
      temperature: { min: 15, max: 30, critical_max: 35 },
      humidity: { min: 40, max: 70, critical_max: 80 },
      co2: { max: 1000, critical_max: 5000 }
    }
    
    if (type === 'co2') {
      const threshold = thresholds.co2
      if (value > threshold.critical_max) return { status: 'critical', color: 'text-red-600' }
      if (value > threshold.max) return { status: 'warning', color: 'text-yellow-600' }
      return { status: 'normal', color: 'text-green-600' }
    }
    const threshold = thresholds[type] as { min: number; max: number; critical_max: number }
    if (value > threshold.critical_max || value < threshold.min) return { status: 'critical', color: 'text-red-600' }
    if (value > threshold.max) return { status: 'warning', color: 'text-yellow-600' }
    return { status: 'normal', color: 'text-green-600' }
  }

  const filteredSilos = silos.filter(silo =>
    silo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    silo.silo_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading silos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Silo Management</h1>
          <p className="text-muted-foreground">
            Monitor storage facilities and environmental conditions
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Silo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Silos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{silos.length}</div>
            <p className="text-xs text-muted-foreground">
              Storage facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {silos.reduce((sum, silo) => sum + silo.capacity_kg, 0).toLocaleString()} kg
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum storage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {silos.reduce((sum, silo) => sum + silo.current_occupancy_kg, 0).toLocaleString()} kg
            </div>
            <p className="text-xs text-muted-foreground">
              Grain in storage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((silos.reduce((sum, silo) => sum + silo.current_occupancy_kg, 0) / 
                          silos.reduce((sum, silo) => sum + silo.capacity_kg, 0)) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall capacity used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Silos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by silo name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Silos Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSilos.map((silo) => {
          const occupancyPercentage = getOccupancyPercentage(silo.current_occupancy_kg, silo.capacity_kg)
          const tempValue = silo.current_conditions?.temperature?.value
          const humValue = silo.current_conditions?.humidity?.value
          const co2Value = silo.current_conditions?.co2?.value
          const tempStatus = getConditionStatus(typeof tempValue === 'number' ? tempValue : 0, 'temperature')
          const humidityStatus = getConditionStatus(typeof humValue === 'number' ? humValue : 0, 'humidity')
          const co2Status = getConditionStatus(typeof co2Value === 'number' ? co2Value : 0, 'co2')

          return (
            <Card key={silo._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{silo.name}</CardTitle>
                  <Badge className={getStatusBadge(silo.status)}>
                    {silo.status.charAt(0).toUpperCase() + silo.status.slice(1)}
                  </Badge>
                </div>
                <CardDescription>{silo.silo_id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Capacity */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Capacity Usage</span>
                    <span className="font-medium">{occupancyPercentage}%</span>
                  </div>
                  <Progress value={occupancyPercentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{silo.current_occupancy_kg.toLocaleString()} kg</span>
                    <span>{silo.capacity_kg.toLocaleString()} kg</span>
                  </div>
                </div>

                {/* Current Batch */}
                {silo.current_batch_id && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">Current Batch</div>
                    <div className="text-sm text-blue-700">
                      {silo.current_batch_id.batch_id} - {silo.current_batch_id.grain_type}
                    </div>
                  </div>
                )}

                {/* Environmental Conditions */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Environmental Conditions</div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4" />
                      <span>Temperature</span>
                    </div>
                    <span className={tempStatus.color}>
                      {typeof tempValue === 'number' ? `${tempValue}°C` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4" />
                      <span>Humidity</span>
                    </div>
                    <span className={humidityStatus.color}>
                      {typeof humValue === 'number' ? `${humValue}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4" />
                      <span>CO₂</span>
                    </div>
                    <span className={co2Status.color}>
                      {typeof co2Value === 'number' ? `${co2Value} ppm` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
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

      {filteredSilos.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No silos found matching your search</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
