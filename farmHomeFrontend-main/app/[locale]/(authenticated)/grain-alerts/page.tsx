"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface GrainAlert {
  _id: string
  alert_id: string
  title: string
  message: string
  priority: string
  status: string
  source: string
  sensor_type?: string
  triggered_at: string
  acknowledged_at?: string
  resolved_at?: string
  silo_id: {
    name: string
    silo_id: string
  }
  trigger_conditions?: {
    threshold_type: string
    threshold_value: number
    actual_value: number
  }
}

export default function GrainAlertsPage() {

  const [alerts, setAlerts] = useState<GrainAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Load alerts from backend (uses public endpoint to avoid role-specific logic here)
  useEffect(() => {
    const run = async () => {
      try {
        const backendUrl = (await import('@/config')).config.backendUrl
        const res = await fetch(`${backendUrl}/alerts/all-public`)
        if (res.ok) {
          const data = await res.json()
                  
          // Define a more specific type for the raw data
          interface RawAlert {
            _id?: string;
            title?: string;
            category?: string;
            description?: string;
            message?: string;
            priority?: string;
            status?: string;
            source?: string;
            sensor_type?: string;
            createdAt?: string;
            acknowledged_at?: string;
            resolved_at?: string;
            silo_id?: { name?: string } | string;
            trigger_conditions?: any;
          }
                  
          const mapped: GrainAlert[] = (data || []).map((a: RawAlert) => ({
            _id: a._id,
            alert_id: (a._id && typeof a._id === 'string' && a._id.slice) ? a._id.slice(-6) : 'AL',
            title: a.title || a.category || 'Alert',
            message: a.description || a.message || '',
            priority: a.priority || 'medium',
            status: a.status || 'pending',
            source: a.source || 'system',
            sensor_type: a.sensor_type,
            triggered_at: a.createdAt || new Date().toISOString(),
            acknowledged_at: a.acknowledged_at,
            resolved_at: a.resolved_at,
            silo_id: a.silo_id ? { name: typeof a.silo_id === 'object' && a.silo_id ? a.silo_id.name || 'Silo' : 'Silo', silo_id: String(a.silo_id) } : { name: '-', silo_id: '-' },
            trigger_conditions: a.trigger_conditions,
          }))
          setAlerts(mapped)
        } else {
          setAlerts([])
        }
      } catch {
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      acknowledged: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const getSourceBadge = (source: string) => {
    const sourceColors = {
      sensor: 'bg-blue-100 text-blue-800',
      ai: 'bg-purple-100 text-purple-800',
      system: 'bg-gray-100 text-gray-800',
      manual: 'bg-green-100 text-green-800'
    }
    return sourceColors[source as keyof typeof sourceColors] || 'bg-gray-100 text-gray-800'
  }

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert._id === alertId 
        ? { ...alert, status: 'acknowledged', acknowledged_at: new Date().toISOString() }
        : alert
    ))
  }

  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert._id === alertId 
        ? { ...alert, status: 'resolved', resolved_at: new Date().toISOString() }
        : alert
    ))
  }

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.alert_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = priorityFilter === 'all' || alert.priority === priorityFilter
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter
    return matchesSearch && matchesPriority && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading alerts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grain Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage system alerts for grain storage facilities
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              All time alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter(a => a.status === 'pending' || a.status === 'acknowledged').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter(a => a.priority === 'critical' && a.status !== 'resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter(a => a.status === 'resolved' && 
                new Date(a.resolved_at || '').toDateString() === new Date().toDateString()).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Issues resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Alerts</CardTitle>
          <CardDescription>Search and filter system alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts by title, message, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>
            Real-time alerts from sensors, AI predictions, and system monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Triggered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert) => {
                const statusConfig = getStatusBadge(alert.status)
                const StatusIcon = statusConfig.icon

                return (
                  <TableRow key={alert._id} className={alert.priority === 'critical' ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">{alert.alert_id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {alert.message}
                        </div>
                        {alert.trigger_conditions && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {alert.sensor_type}: {alert.trigger_conditions.actual_value} 
                            (threshold: {alert.trigger_conditions.threshold_value})
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadge(alert.priority)}>
                        {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSourceBadge(alert.source)}>
                        {alert.source.charAt(0).toUpperCase() + alert.source.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{alert.silo_id.name}</TableCell>
                    <TableCell>{new Date(alert.triggered_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {alert.status === 'pending' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAcknowledge(alert._id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {(alert.status === 'pending' || alert.status === 'acknowledged') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleResolve(alert._id)}
                          >
                            Resolve
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {filteredAlerts.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No alerts found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
