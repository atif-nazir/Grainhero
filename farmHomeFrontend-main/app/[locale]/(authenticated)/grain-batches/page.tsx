"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Filter, Package, QrCode, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'

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
    name: string
    silo_id: string
  }
  farmer_name?: string
}

export default function GrainBatchesPage() {
  const t = useTranslations('GrainBatches')
  const [batches, setBatches] = useState<GrainBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [grainTypeFilter, setGrainTypeFilter] = useState('all')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await api.get<{ batches: GrainBatch[] }>(`/grain-batches?limit=50`)
      if (!mounted) return
      if (res.ok && res.data) {
        setBatches(res.data.batches as unknown as GrainBatch[])
      }
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Batch
        </Button>
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
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
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
    </div>
  )
}
