"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Package, QrCode, AlertTriangle, Edit, Trash2, Eye, MoreVertical, Truck } from 'lucide-react'
import { api } from '@/lib/api'
import { config } from '@/config'
import { toast } from 'sonner'
import QRCodeDisplay from '@/components/QRCodeDisplay'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface GrainBatch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  status: string
  risk_score: number
  spoilage_label: string
  intake_date: string
  silo_id: {
    _id: string
    name: string
    silo_id: string
    capacity_kg: number
  }
  farmer_name?: string
  farmer_contact?: string
  moisture_content?: number
  qr_code?: string
  variety?: string
  grade?: string
  harvest_date?: string
  notes?: string
  dispatch_details?: {
    buyer_name: string
    buyer_contact: string
    quantity: number
    dispatch_date: string
    notes?: string
  }
}

interface Silo {
  _id: string
  name: string
  silo_id: string
  capacity_kg: number
  current_occupancy_kg: number
}

export default function GrainBatchesPage() {
  const [batches, setBatches] = useState<GrainBatch[]>([])
  const [silos, setSilos] = useState<Silo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [grainTypeFilter, setGrainTypeFilter] = useState('all')

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<GrainBatch | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    batch_id: '',
    grain_type: '',
    quantity_kg: '',
    silo_id: '',
    farmer_name: '',
    farmer_contact: '',
    moisture_content: '',
    variety: '',
    grade: 'Standard',
    harvest_date: '',
    notes: ''
  })

  // Dispatch form data
  const [dispatchData, setDispatchData] = useState({
    buyer_name: '',
    buyer_contact: '',
    quantity_dispatched: '',
    dispatch_date: '',
    notes: ''
  })

  const fetchBatches = async () => {
    try {
      console.log('Fetching batches...')
      const res = await api.get<{ batches: GrainBatch[] }>(`/api/grain-batches?limit=50`)
      console.log('Fetch response:', res)

      if (res.ok && res.data) {
        setBatches(res.data.batches as unknown as GrainBatch[])
        console.log('Batches loaded:', res.data.batches.length)
      } else {
        console.error('Fetch error:', res.error)
        toast.error(`Failed to fetch grain batches: ${res.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error fetching batches:', error)
      toast.error(`Failed to fetch grain batches: ${(error as Error).message || 'Network error'}`)
    }
  }

  const fetchSilos = async () => {
    try {
      const res = await api.get<{ silos: Silo[] }>(`/api/silos`)
      if (res.ok && res.data) {
        setSilos(res.data.silos as unknown as Silo[])
      }
    } catch (error) {
      console.error('Error fetching silos:', error)
    }
  }

  useEffect(() => {
    let mounted = true
      ; (async () => {
        // Check if user is authenticated
        const token = localStorage.getItem('token')
        if (!token) {
          console.error('No authentication token found')
          toast.error('Please log in to access grain batches')
          setLoading(false)
          return
        }

        console.log('User authenticated, fetching data...')
        await Promise.all([fetchBatches(), fetchSilos()])
        if (mounted) {
          setLoading(false)
        }
      })()
    return () => {
      mounted = false
    }
  }, [])

  // CRUD Operations
  const handleAddBatch = async () => {
    try {
      console.log('Creating batch with data:', formData)

      // Check if user is authenticated
      const token = localStorage.getItem('token')
      console.log('Token from localStorage:', token ? 'Token exists' : 'No token found')

      if (!token) {
        toast.error('Please log in to create grain batches')
        return
      }

      // Log the full request details
      console.log('Making API request to:', `${config.backendUrl}/grain-batches`)
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })

      const res = await api.post('/api/grain-batches', formData)
      console.log('Full API Response:', res)
      console.log('Response status:', res.status)
      console.log('Response data:', res.data)
      console.log('Response error:', res.error)

      if (res.ok) {
        toast.success('Grain batch created successfully')
        setIsAddDialogOpen(false)
        resetForm()
        await fetchBatches()
      } else {
        console.error('API Error Details:', {
          status: res.status,
          error: res.error,
          response: res
        })
        toast.error(`Failed to create grain batch: ${res.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Network/Request Error:', error)
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      })
      toast.error(`Failed to create grain batch: ${(error as Error).message || 'Network error'}`)
    }
  }

  const handleEditBatch = async () => {
    if (!selectedBatch) return
    try {
      const res = await api.put(`/api/grain-batches/${selectedBatch._id}`, formData)
      if (res.ok) {
        toast.success('Grain batch updated successfully')
        setIsEditDialogOpen(false)
        resetForm()
        await fetchBatches()
      } else {
        toast.error('Failed to update grain batch')
      }
    } catch (error) {
      console.error('Error updating batch:', error)
      toast.error('Failed to update grain batch')
    }
  }

  const handleDeleteBatch = async () => {
    if (!selectedBatch) return
    try {
      const res = await api.delete(`/api/grain-batches/${selectedBatch._id}`)
      if (res.ok) {
        toast.success('Grain batch deleted successfully')
        setIsDeleteDialogOpen(false)
        await fetchBatches()
      } else {
        toast.error('Failed to delete grain batch')
      }
    } catch (error) {
      console.error('Error deleting batch:', error)
      toast.error('Failed to delete grain batch')
    }
  }

  const handleDispatchBatch = async () => {
    if (!selectedBatch) return
    try {
      const res = await api.post(`/api/grain-batches/${selectedBatch._id}/dispatch-simple`, dispatchData)
      if (res.ok) {
        toast.success('Grain batch dispatched successfully')
        setIsDispatchDialogOpen(false)
        setDispatchData({
          buyer_name: '',
          buyer_contact: '',
          quantity_dispatched: '',
          dispatch_date: '',
          notes: ''
        })
        await fetchBatches()
      } else {
        toast.error('Failed to dispatch grain batch')
      }
    } catch (error) {
      console.error('Error dispatching batch:', error)
      toast.error('Failed to dispatch grain batch')
    }
  }

  const openDispatchDialog = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setDispatchData({
      buyer_name: '',
      buyer_contact: '',
      quantity_dispatched: batch.quantity_kg.toString(),
      dispatch_date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setIsDispatchDialogOpen(true)
  }

  const handleViewBatch = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setIsViewDialogOpen(true)
  }

  const handleEditClick = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setFormData({
      batch_id: batch.batch_id,
      grain_type: batch.grain_type,
      quantity_kg: batch.quantity_kg.toString(),
      silo_id: batch.silo_id._id,
      farmer_name: batch.farmer_name || '',
      farmer_contact: batch.farmer_contact || '',
      moisture_content: batch.moisture_content?.toString() || '',
      variety: batch.variety || '',
      grade: batch.grade || 'Standard',
      harvest_date: batch.harvest_date || '',
      notes: batch.notes || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setIsDeleteDialogOpen(true)
  }

  const handleQRCodeClick = (batch: GrainBatch) => {
    if (batch.qr_code) {
      setSelectedBatch(batch)
      setIsQRDialogOpen(true)
    } else {
      toast.error('No QR code available for this batch')
    }
  }

  const resetForm = () => {
    setFormData({
      batch_id: '',
      grain_type: '',
      quantity_kg: '',
      silo_id: '',
      farmer_name: '',
      farmer_contact: '',
      moisture_content: '',
      variety: '',
      grade: 'Standard',
      harvest_date: '',
      notes: ''
    })
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      stored: 'bg-blue-100 text-blue-800',
      dispatched: 'bg-green-100 text-green-800',
      sold: 'bg-purple-100 text-purple-800',
      damaged: 'bg-red-100 text-red-800',
      on_hold: 'bg-yellow-100 text-yellow-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getRiskBadge = (riskScore: number, spoilageLabel: string) => {
    if (spoilageLabel === 'Safe') return 'bg-green-100 text-green-800'
    if (spoilageLabel === 'Risky') return 'bg-yellow-100 text-yellow-800'
    if (spoilageLabel === 'Spoiled') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.grain_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter
    const matchesGrainType = grainTypeFilter === 'all' || batch.grain_type === grainTypeFilter
    return matchesSearch && matchesStatus && matchesGrainType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading grain batches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grain Batches</h1>
          <p className="text-muted-foreground">
            Manage and track grain batches with AI-powered quality monitoring
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-black hover:bg-gray-800">
              <Plus className="h-4 w-4" />
              Add New Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-black" />
                Add New Grain Batch
              </DialogTitle>
              <DialogDescription>
                Create a new grain batch with comprehensive quality monitoring and tracking
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
                      <Label htmlFor="batch_id" className="text-sm font-medium">Batch ID</Label>
                      <Input
                        id="batch_id"
                        value={formData.batch_id}
                        onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                        placeholder="e.g., GH-2024-001"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="grain_type" className="text-sm font-medium">Grain Type</Label>
                      <Select value={formData.grain_type} onValueChange={(value) => setFormData({ ...formData, grain_type: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select grain type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Wheat">Wheat</SelectItem>
                          <SelectItem value="Rice">Rice</SelectItem>
                          <SelectItem value="Maize">Maize</SelectItem>
                          <SelectItem value="Corn">Corn</SelectItem>
                          <SelectItem value="Barley">Barley</SelectItem>
                          <SelectItem value="Sorghum">Sorghum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Storage Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Storage Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity_kg" className="text-sm font-medium">Quantity (kg)</Label>
                      <Input
                        id="quantity_kg"
                        type="number"
                        value={formData.quantity_kg}
                        onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                        placeholder="Enter quantity"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="silo_id" className="text-sm font-medium">Silo Assignment</Label>
                      <Select value={formData.silo_id} onValueChange={(value) => setFormData({ ...formData, silo_id: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select silo" />
                        </SelectTrigger>
                        <SelectContent>
                          {silos.map((silo) => (
                            <SelectItem key={silo._id} value={silo._id}>
                              {silo.name} (Available: {(silo.capacity_kg - (silo.current_occupancy_kg || 0)).toLocaleString()} kg)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Farmer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Farmer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="farmer_name" className="text-sm font-medium">Farmer Name</Label>
                      <Input
                        id="farmer_name"
                        value={formData.farmer_name}
                        onChange={(e) => setFormData({ ...formData, farmer_name: e.target.value })}
                        placeholder="Enter farmer name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="farmer_contact" className="text-sm font-medium">Contact Number</Label>
                      <Input
                        id="farmer_contact"
                        value={formData.farmer_contact}
                        onChange={(e) => setFormData({ ...formData, farmer_contact: e.target.value })}
                        placeholder="Enter contact number"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quality Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="moisture_content" className="text-sm font-medium">Moisture Content (%)</Label>
                      <Input
                        id="moisture_content"
                        type="number"
                        step="0.1"
                        value={formData.moisture_content}
                        onChange={(e) => setFormData({ ...formData, moisture_content: e.target.value })}
                        placeholder="Enter moisture %"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="grade" className="text-sm font-medium">Grade</Label>
                      <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Premium">Premium</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="A">Grade A</SelectItem>
                          <SelectItem value="B">Grade B</SelectItem>
                          <SelectItem value="C">Grade C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this batch"
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
              <Button onClick={handleAddBatch} className="bg-black hover:bg-gray-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Batch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
            <p className="text-xs text-muted-foreground">
              Active grain batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batches.reduce((sum, batch) => sum + batch.quantity_kg, 0).toLocaleString()} kg
            </div>
            <p className="text-xs text-muted-foreground">
              Grain in storage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batches.filter(b => b.spoilage_label === 'Risky' || b.spoilage_label === 'Spoiled').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Batches need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(batches.reduce((sum, batch) => sum + batch.risk_score, 0) / batches.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              AI risk assessment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Batches</CardTitle>
          <CardDescription>Search and filter grain batches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by batch ID, farmer, or grain type..."
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
                <SelectItem value="stored">Stored</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={grainTypeFilter} onValueChange={setGrainTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Grain Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grains</SelectItem>
                <SelectItem value="Wheat">Wheat</SelectItem>
                <SelectItem value="Rice">Rice</SelectItem>
                <SelectItem value="Maize">Maize</SelectItem>
                <SelectItem value="Corn">Corn</SelectItem>
                <SelectItem value="Barley">Barley</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Grain Batches</CardTitle>
          <CardDescription>
            Complete list of grain batches with AI-powered quality monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Grain Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Farmer</TableHead>
                <TableHead>Silo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Intake Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((batch) => (
                <TableRow key={batch._id}>
                  <TableCell className="font-medium">{batch.batch_id}</TableCell>
                  <TableCell>{batch.grain_type}</TableCell>
                  <TableCell>{batch.quantity_kg.toLocaleString()} kg</TableCell>
                  <TableCell>{batch.farmer_name || 'N/A'}</TableCell>
                  <TableCell>{batch.silo_id.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(batch.status)}>
                      {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskBadge(batch.risk_score, batch.spoilage_label)}>
                      {batch.spoilage_label} ({batch.risk_score}%)
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(batch.intake_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleQRCodeClick(batch)}
                          className="cursor-pointer"
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          View QR Code
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleViewBatch(batch)}
                          className="cursor-pointer"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEditClick(batch)}
                          className="cursor-pointer"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Batch
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDispatchDialog(batch)}
                          className="cursor-pointer"
                          disabled={batch.status === 'dispatched' || batch.status === 'sold'}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Dispatch Batch
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(batch)}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Batch
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredBatches.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No grain batches found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Batch Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Batch Details - {selectedBatch?.batch_id}
            </DialogTitle>
            <DialogDescription>
              Complete information about this grain batch
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-6 py-4">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <Badge className={getStatusBadge(selectedBatch.status)}>
                          {selectedBatch.status.charAt(0).toUpperCase() + selectedBatch.status.slice(1)}
                        </Badge>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                        <Badge className={getRiskBadge(selectedBatch.risk_score, selectedBatch.spoilage_label)}>
                          {selectedBatch.spoilage_label} ({selectedBatch.risk_score}%)
                        </Badge>
                      </div>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                        <p className="text-lg font-semibold">{selectedBatch.quantity_kg.toLocaleString()} kg</p>
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
                    <CardTitle className="text-lg">Batch Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="font-semibold">Batch ID</Label>
                      <p className="text-sm text-muted-foreground font-mono">{selectedBatch.batch_id}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Grain Type</Label>
                      <p className="text-sm text-muted-foreground">{selectedBatch.grain_type}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Grade</Label>
                      <p className="text-sm text-muted-foreground">{selectedBatch.grade || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Moisture Content</Label>
                      <p className="text-sm text-muted-foreground">{selectedBatch.moisture_content ? `${selectedBatch.moisture_content}%` : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Storage & Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="font-semibold">Silo</Label>
                      <p className="text-sm text-muted-foreground">{selectedBatch.silo_id.name}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Farmer</Label>
                      <p className="text-sm text-muted-foreground">{selectedBatch.farmer_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Farmer Contact</Label>
                      <p className="text-sm text-muted-foreground">{selectedBatch.farmer_contact || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Intake Date</Label>
                      <p className="text-sm text-muted-foreground">{new Date(selectedBatch.intake_date).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* QR Code Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-muted-foreground">{selectedBatch.qr_code || 'Not generated'}</p>
                    </div>
                    {selectedBatch.qr_code && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsViewDialogOpen(false)
                          handleQRCodeClick(selectedBatch)
                        }}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        View QR Code
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes Section */}
              {selectedBatch.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedBatch.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Batch History/Traceability Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Batch History & Traceability
                  </CardTitle>
                  <CardDescription>
                    Complete timeline of events for this grain batch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Intake Event */}
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-blue-900">Batch Intake</h4>
                          <span className="text-xs text-blue-600">
                            {new Date(selectedBatch.intake_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Batch {selectedBatch.batch_id} created with {selectedBatch.quantity_kg.toLocaleString()} kg of {selectedBatch.grain_type}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Farmer: {selectedBatch.farmer_name || 'N/A'} • Contact: {selectedBatch.farmer_contact || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Quality Recording Event */}
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-green-900">Quality Assessment</h4>
                          <span className="text-xs text-green-600">
                            {new Date(selectedBatch.intake_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-green-700">
                          Moisture Content: {selectedBatch.moisture_content || 'N/A'}% • Grade: {selectedBatch.grade || 'N/A'}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Quality tests recorded during intake
                        </p>
                      </div>
                    </div>

                    {/* Storage Assignment Event */}
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-purple-900">Storage Assignment</h4>
                          <span className="text-xs text-purple-600">
                            {new Date(selectedBatch.intake_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-purple-700">
                          Assigned to Silo: {selectedBatch.silo_id.name}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Storage capacity: {selectedBatch.silo_id.capacity_kg?.toLocaleString() || 'N/A'} kg
                        </p>
                      </div>
                    </div>

                    {/* Risk Assessment Event */}
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-orange-900">Risk Assessment</h4>
                          <span className="text-xs text-orange-600">
                            {new Date(selectedBatch.intake_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-orange-700">
                          Risk Level: {selectedBatch.spoilage_label} ({selectedBatch.risk_score}%)
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          Current status: {selectedBatch.status}
                        </p>
                      </div>
                    </div>

                    {/* Dispatch Event (if dispatched) */}
                    {selectedBatch.dispatch_details && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <Truck className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-green-900">Batch Dispatch</h4>
                            <span className="text-xs text-green-600">
                              {selectedBatch.dispatch_details.dispatch_date ?
                                new Date(selectedBatch.dispatch_details.dispatch_date).toLocaleDateString() :
                                'N/A'
                              }
                            </span>
                          </div>
                          <p className="text-sm text-green-700">
                            Dispatched to: {selectedBatch.dispatch_details.buyer_name || 'N/A'}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Quantity: {selectedBatch.dispatch_details.quantity || 'N/A'} kg •
                            Contact: {selectedBatch.dispatch_details.buyer_contact || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* No additional events message */}
                    {!selectedBatch.dispatch_details && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No additional events recorded yet</p>
                        <p className="text-xs">Dispatch and other events will appear here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Grain Batch
            </DialogTitle>
            <DialogDescription>
              Update grain batch information with comprehensive details and quality metrics
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
                    <Label htmlFor="edit_batch_id" className="text-sm font-medium">Batch ID</Label>
                    <Input
                      id="edit_batch_id"
                      value={formData.batch_id}
                      onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                      placeholder="e.g., GH-2024-001"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_grain_type" className="text-sm font-medium">Grain Type</Label>
                    <Select value={formData.grain_type} onValueChange={(value) => setFormData({ ...formData, grain_type: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select grain type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wheat">Wheat</SelectItem>
                        <SelectItem value="Rice">Rice</SelectItem>
                        <SelectItem value="Maize">Maize</SelectItem>
                        <SelectItem value="Corn">Corn</SelectItem>
                        <SelectItem value="Barley">Barley</SelectItem>
                        <SelectItem value="Sorghum">Sorghum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Storage Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Storage Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_quantity_kg" className="text-sm font-medium">Quantity (kg)</Label>
                    <Input
                      id="edit_quantity_kg"
                      type="number"
                      value={formData.quantity_kg}
                      onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                      placeholder="Enter quantity"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_silo_id" className="text-sm font-medium">Silo Assignment</Label>
                    <Select value={formData.silo_id} onValueChange={(value) => setFormData({ ...formData, silo_id: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select silo" />
                      </SelectTrigger>
                      <SelectContent>
                        {silos.map((silo) => (
                          <SelectItem key={silo._id} value={silo._id}>
                            {silo.name} (Available: {(silo.capacity_kg - (silo.current_occupancy_kg || 0)).toLocaleString()} kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Farmer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Farmer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_farmer_name" className="text-sm font-medium">Farmer Name</Label>
                    <Input
                      id="edit_farmer_name"
                      value={formData.farmer_name}
                      onChange={(e) => setFormData({ ...formData, farmer_name: e.target.value })}
                      placeholder="Enter farmer name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_farmer_contact" className="text-sm font-medium">Contact Number</Label>
                    <Input
                      id="edit_farmer_contact"
                      value={formData.farmer_contact}
                      onChange={(e) => setFormData({ ...formData, farmer_contact: e.target.value })}
                      placeholder="Enter contact number"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quality Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_moisture_content" className="text-sm font-medium">Moisture Content (%)</Label>
                    <Input
                      id="edit_moisture_content"
                      type="number"
                      step="0.1"
                      value={formData.moisture_content}
                      onChange={(e) => setFormData({ ...formData, moisture_content: e.target.value })}
                      placeholder="Enter moisture %"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_grade" className="text-sm font-medium">Grade</Label>
                    <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Premium">Premium</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="A">Grade A</SelectItem>
                        <SelectItem value="B">Grade B</SelectItem>
                        <SelectItem value="C">Grade C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="edit_notes" className="text-sm font-medium">Notes</Label>
                  <Textarea
                    id="edit_notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this batch"
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
            <Button onClick={handleEditBatch} className="bg-black hover:bg-gray-800 text-white">
              <Edit className="h-4 w-4 mr-2" />
              Update Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Batch Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Grain Batch
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the grain batch and remove it from storage.
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="py-4">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <Package className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-800">Batch {selectedBatch.batch_id}</p>
                      <p className="text-sm text-red-600">
                        {selectedBatch.grain_type} • {selectedBatch.quantity_kg.toLocaleString()} kg
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        Stored in: {selectedBatch.silo_id.name}
                      </p>
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
            <Button variant="destructive" onClick={handleDeleteBatch} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      {/* Dispatch Batch Dialog */}
      <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Truck className="h-5 w-5" />
              Dispatch Grain Batch
            </DialogTitle>
            <DialogDescription>
              Record the dispatch of this grain batch to a buyer. This will update the batch status and reduce silo occupancy.
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="py-4 space-y-6">
              {/* Batch Information Card */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-800">Batch Information</h4>
                      <p className="text-sm text-green-600">
                        {selectedBatch.batch_id} - {selectedBatch.grain_type} ({selectedBatch.quantity_kg.toLocaleString()} kg)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dispatch Form */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Dispatch Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buyer_name">Buyer Name *</Label>
                        <Input
                          id="buyer_name"
                          value={dispatchData.buyer_name}
                          onChange={(e) => setDispatchData({ ...dispatchData, buyer_name: e.target.value })}
                          placeholder="Enter buyer name"
                          className="mt-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="buyer_contact">Buyer Contact *</Label>
                        <Input
                          id="buyer_contact"
                          value={dispatchData.buyer_contact}
                          onChange={(e) => setDispatchData({ ...dispatchData, buyer_contact: e.target.value })}
                          placeholder="Email or phone number"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity_dispatched">Quantity Dispatched (kg) *</Label>
                        <Input
                          id="quantity_dispatched"
                          type="number"
                          value={dispatchData.quantity_dispatched}
                          onChange={(e) => setDispatchData({ ...dispatchData, quantity_dispatched: e.target.value })}
                          placeholder="Enter quantity"
                          max={selectedBatch.quantity_kg}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground">
                          Available: {selectedBatch.quantity_kg.toLocaleString()} kg
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dispatch_date">Dispatch Date *</Label>
                        <Input
                          id="dispatch_date"
                          type="date"
                          value={dispatchData.dispatch_date}
                          onChange={(e) => setDispatchData({ ...dispatchData, dispatch_date: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dispatch_notes">Notes</Label>
                      <Textarea
                        id="dispatch_notes"
                        value={dispatchData.notes}
                        onChange={(e) => setDispatchData({ ...dispatchData, notes: e.target.value })}
                        placeholder="Additional dispatch information..."
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDispatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDispatchBatch}
              className="bg-black hover:bg-gray-800 text-white"
              disabled={!dispatchData.buyer_name || !dispatchData.buyer_contact || !dispatchData.quantity_dispatched || !dispatchData.dispatch_date}
            >
              <Truck className="h-4 w-4 mr-2" />
              Dispatch Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedBatch && (
        <QRCodeDisplay
          qrCode={selectedBatch.qr_code || ''}
          batchId={selectedBatch.batch_id}
          grainType={selectedBatch.grain_type}
          isOpen={isQRDialogOpen}
          onClose={() => setIsQRDialogOpen(false)}
        />
      )}
    </div>
  )
}
