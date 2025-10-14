"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Package, Thermometer, Droplets, Wind, Edit, Trash2, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Silo {
  _id: string
  silo_id: string
  name: string
  capacity_kg: number
  current_occupancy_kg?: number
  status?: string
  location?: {
    description?: string
    coordinates?: {
      latitude?: number
      longitude?: number
    }
    address?: string
  }
  type?: string
  updated_at?: string
  current_conditions?: {
    temperature?: { value: number; timestamp: string }
    humidity?: { value: number; timestamp: string }
    co2?: { value: number; timestamp: string }
  }
  current_batch_id?: {
    batch_id: string
    grain_type: string
  }
}

export default function SilosPage() {
  const [silos, setSilos] = useState<Silo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSilo, setSelectedSilo] = useState<Silo | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    silo_id: '',
    name: '',
    capacity_kg: '',
    location: {
      description: '',
      address: ''
    },
    status: 'active'
  })

  const fetchSilos = async () => {
    try {
      console.log('Fetching silos from /api/silos?limit=50')
      const res = await api.get<{ silos: Silo[] }>(`/api/silos?limit=50`)
      console.log('Silos API response:', res)
      if (res.ok && res.data) {
        console.log('Silos data received:', res.data)
        setSilos(res.data.silos as unknown as Silo[])
      } else {
        console.error('Failed to fetch silos:', res.error)
        toast.error('Failed to fetch silos')
      }
    } catch (error) {
      console.error('Error fetching silos:', error)
      toast.error('Error fetching silos')
    }
  }

  useEffect(() => {
    let mounted = true
      ; (async () => {
        await fetchSilos()
      if (!mounted) return
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  // CRUD Operations
  const handleAddSilo = async () => {
    try {
      // Convert capacity_kg to number
      const dataToSend = {
        ...formData,
        capacity_kg: Number(formData.capacity_kg)
      }
      console.log('Creating silo with data:', dataToSend)

      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Please log in to create silos')
        return
      }

      const res = await api.post('/api/silos', dataToSend)
      console.log('API Response:', res)

      if (res.ok) {
        toast.success('Silo created successfully')
        setIsAddDialogOpen(false)
        resetForm()
        await fetchSilos()
      } else {
        console.error('API Error:', res.error)
        toast.error(`Failed to create silo: ${res.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating silo:', error)
      toast.error(`Failed to create silo: ${(error as Error).message || 'Network error'}`)
    }
  }

  const handleEditSilo = async () => {
    if (!selectedSilo) return
    try {
      // Convert capacity_kg to number
      const dataToSend = {
        ...formData,
        capacity_kg: Number(formData.capacity_kg)
      }
      const res = await api.put(`/api/silos/${selectedSilo._id}`, dataToSend)
      if (res.ok) {
        toast.success('Silo updated successfully')
        setIsEditDialogOpen(false)
        resetForm()
        await fetchSilos()
      } else {
        toast.error(`Failed to update silo: ${res.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating silo:', error)
      toast.error(`Failed to update silo: ${(error as Error).message || 'Network error'}`)
    }
  }

  const handleDeleteSilo = async () => {
    if (!selectedSilo) return
    try {
      const res = await api.delete(`/api/silos/${selectedSilo._id}`)
      if (res.ok) {
        toast.success('Silo deleted successfully')
        setIsDeleteDialogOpen(false)
        await fetchSilos()
      } else {
        toast.error(`Failed to delete silo: ${res.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting silo:', error)
      toast.error(`Failed to delete silo: ${(error as Error).message || 'Network error'}`)
    }
  }


  const resetForm = () => {
    setFormData({
      silo_id: '',
      name: '',
      capacity_kg: '',
      location: {
        description: '',
        address: ''
      },
      status: 'active'
    })
    setSelectedSilo(null)
  }

  const openEditDialog = (silo: Silo) => {
    setSelectedSilo(silo)
    setFormData({
      silo_id: silo.silo_id,
      name: silo.name,
      capacity_kg: silo.capacity_kg.toString(),
      location: {
        description: silo.location?.description || '',
        address: silo.location?.address || ''
      },
      status: silo.status || 'active'
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (silo: Silo) => {
    setSelectedSilo(silo)
    setIsViewDialogOpen(true)
  }

  const openDeleteDialog = (silo: Silo) => {
    setSelectedSilo(silo)
    setIsDeleteDialogOpen(true)
  }

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
        <Button className="gap-2 bg-black hover:bg-gray-800 text-white" onClick={() => setIsAddDialogOpen(true)}>
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
              {silos.reduce((sum, silo) => sum + (silo.current_occupancy_kg || 0), 0).toLocaleString()} kg
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
              {silos.length > 0 ? Math.round((silos.reduce((sum, silo) => sum + (silo.current_occupancy_kg || 0), 0) /
                silos.reduce((sum, silo) => sum + silo.capacity_kg, 0)) * 100) : 0}%
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
          const occupancyPercentage = getOccupancyPercentage(silo.current_occupancy_kg || 0, silo.capacity_kg)
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
                  <Badge className={getStatusBadge(silo.status || 'active')}>
                    {(silo.status || 'active').charAt(0).toUpperCase() + (silo.status || 'active').slice(1)}
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
                    <span>{(silo.current_occupancy_kg || 0).toLocaleString()} kg</span>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openViewDialog(silo)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(silo)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => openDeleteDialog(silo)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
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

      {/* Add Silo Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-black" />
              Add New Silo
            </DialogTitle>
            <DialogDescription>
              Create a new grain storage silo with comprehensive capacity and location details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="silo_id" className="text-sm font-medium">Silo ID</Label>
                    <Input
                      id="silo_id"
                      value={formData.silo_id}
                      onChange={(e) => setFormData({ ...formData, silo_id: e.target.value })}
                      placeholder="Enter unique silo ID"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">Silo Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter silo name"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Capacity & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capacity & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capacity_kg" className="text-sm font-medium">Capacity (kg)</Label>
                    <Input
                      id="capacity_kg"
                      type="number"
                      value={formData.capacity_kg}
                      onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
                      placeholder="Enter capacity in kg"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="location_description" className="text-sm font-medium">Location Description</Label>
                  <Input
                    id="location_description"
                    value={formData.location.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, description: e.target.value }
                    })}
                    placeholder="Enter location description"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="location_address" className="text-sm font-medium">Address</Label>
                  <Input
                    id="location_address"
                    value={formData.location.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, address: e.target.value }
                    })}
                    placeholder="Enter address"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSilo} className="bg-black hover:bg-gray-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Silo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Silo Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Silo
            </DialogTitle>
            <DialogDescription>
              Update silo information, capacity, and operational settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_silo_id" className="text-sm font-medium">Silo ID</Label>
                    <Input
                      id="edit_silo_id"
                      value={formData.silo_id}
                      onChange={(e) => setFormData({ ...formData, silo_id: e.target.value })}
                      placeholder="Enter unique silo ID"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_name" className="text-sm font-medium">Silo Name</Label>
                    <Input
                      id="edit_name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter silo name"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Capacity & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capacity & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_capacity_kg" className="text-sm font-medium">Capacity (kg)</Label>
                    <Input
                      id="edit_capacity_kg"
                      type="number"
                      value={formData.capacity_kg}
                      onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
                      placeholder="Enter capacity in kg"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_status" className="text-sm font-medium">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="edit_location_description" className="text-sm font-medium">Location Description</Label>
                  <Input
                    id="edit_location_description"
                    value={formData.location.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, description: e.target.value }
                    })}
                    placeholder="Enter location description"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_location_address" className="text-sm font-medium">Address</Label>
                  <Input
                    id="edit_location_address"
                    value={formData.location.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, address: e.target.value }
                    })}
                    placeholder="Enter address"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSilo} className="bg-black hover:bg-gray-800 text-white">
              <Edit className="h-4 w-4 mr-2" />
              Update Silo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Silo Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Silo Details - {selectedSilo?.name}
            </DialogTitle>
            <DialogDescription>
              Complete information about this grain silo
            </DialogDescription>
          </DialogHeader>
          {selectedSilo && (
            <div className="space-y-6 py-4">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                        <p className="text-lg font-semibold">{selectedSilo.capacity_kg.toLocaleString()} kg</p>
                      </div>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                        <p className="text-lg font-semibold">{(selectedSilo.current_occupancy_kg || 0).toLocaleString()} kg</p>
                      </div>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Utilization</p>
                        <p className="text-lg font-semibold">{Math.round(((selectedSilo.current_occupancy_kg || 0) / selectedSilo.capacity_kg) * 100)}%</p>
                      </div>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Silo Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="font-semibold">Silo ID</Label>
                      <p className="text-sm text-muted-foreground font-mono">{selectedSilo.silo_id}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Name</Label>
                      <p className="text-sm text-muted-foreground">{selectedSilo.name}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Location</Label>
                      <p className="text-sm text-muted-foreground">{selectedSilo.location?.description || 'N/A'}</p>
                      {selectedSilo.location?.address && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedSilo.location.address}</p>
                      )}
                    </div>
                    <div>
                      <Label className="font-semibold">Type</Label>
                      <p className="text-sm text-muted-foreground">{selectedSilo.type || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="font-semibold">Current Batch</Label>
                      <p className="text-sm text-muted-foreground">
                        {typeof selectedSilo.current_batch_id === 'string'
                          ? selectedSilo.current_batch_id
                          : selectedSilo.current_batch_id?.batch_id || 'Empty'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Available Space</Label>
                      <p className="text-sm text-muted-foreground">{(selectedSilo.capacity_kg - (selectedSilo.current_occupancy_kg || 0)).toLocaleString()} kg</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Last Updated</Label>
                      <p className="text-sm text-muted-foreground">{selectedSilo.updated_at ? new Date(selectedSilo.updated_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Batch Section */}
              {selectedSilo.current_batch_id && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Batch</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Package className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">{selectedSilo.current_batch_id.batch_id}</p>
                        <p className="text-sm text-green-600">{selectedSilo.current_batch_id.grain_type}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Silo Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Silo
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the silo and all associated data.
            </DialogDescription>
          </DialogHeader>
          {selectedSilo && (
            <div className="py-4">
              <Card className={`border-2 ${(selectedSilo.current_occupancy_kg || 0) > 0 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${(selectedSilo.current_occupancy_kg || 0) > 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
                      <Package className={`h-4 w-4 ${(selectedSilo.current_occupancy_kg || 0) > 0 ? 'text-red-600' : 'text-orange-600'}`} />
                    </div>
                    <div>
                      <p className={`font-semibold ${(selectedSilo.current_occupancy_kg || 0) > 0 ? 'text-red-800' : 'text-orange-800'}`}>
                        {selectedSilo.name}
                      </p>
                      <p className={`text-sm ${(selectedSilo.current_occupancy_kg || 0) > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        ID: {selectedSilo.silo_id} • {selectedSilo.capacity_kg.toLocaleString()} kg capacity
                      </p>
                      {(selectedSilo.current_occupancy_kg || 0) > 0 && (
                        <p className="text-xs text-red-500 mt-1 font-medium">
                          ⚠️ Contains {(selectedSilo.current_occupancy_kg || 0).toLocaleString()} kg of grain
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSilo}
              disabled={(selectedSilo?.current_occupancy_kg || 0) > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Silo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
