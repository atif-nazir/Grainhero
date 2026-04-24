"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, AlertTriangle, CheckCircle, Clock, AlertCircle, Cpu, RefreshCw, Zap, BellRing, Shield, ShieldAlert, Activity, UserPlus } from 'lucide-react'
import { useAuth } from '@/app/[locale]/providers'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface GrainAlert {
  _id: string
  alert_id: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'acknowledged' | 'resolved'
  source: string
  category: string
  triggered_at: string
  acknowledged_at?: string
  resolved_at?: string
  entity_type?: string
  entity_id?: string
  escalation_status?: string
  metadata?: any
}

export default function GrainAlertsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const { user: _user } = useAuth()
  const [alerts, setAlerts] = useState<GrainAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<GrainAlert | null>(null)

  // Escalate Dialog State
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      // The backend now provides /api/alerts (or /api/alerts?limit=100)
      const res = await api.get<{ alerts: GrainAlert[] }>('/api/alerts?limit=100')
      if (res.ok && res.data) {
        setAlerts(res.data.alerts)
      } else {
        toast.error("Failed to fetch alerts")
      }
    } catch {
      toast.error("Error fetching alerts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'escalate', metadata?: any) => {
    try {
      const res = await api.post<{ alert: GrainAlert }>(`/api/alerts/${alertId}/action`, { action, metadata })
      if (res.ok && res.data) {
        setAlerts(prev => prev.map(a => a._id === alertId ? res.data!.alert : a))
        if (selectedAlert?._id === alertId) setSelectedAlert(res.data.alert)
        toast.success(`Alert ${action}d`)
        setShowEscalate(false)
      } else {
        toast.error(`Failed to ${action} alert`)
      }
    } catch {
      toast.error(`Error during ${action}`)
    }
  }

  // Analytics Computation
  const activeAlerts = alerts.filter(a => a.status !== 'resolved')
  const criticalCount = activeAlerts.filter(a => a.priority === 'critical').length
  const highCount = activeAlerts.filter(a => a.priority === 'high').length
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length
  const resRate = alerts.length ? Math.round((resolvedCount / alerts.length) * 100) : 0

  // Filter for feed
  const filteredAlerts = alerts.filter(alert => {
    return alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
           alert.alert_id.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Priority UI config
  const PRIORITY_CFG = {
    critical: { color: 'bg-red-500 text-white', border: 'border-red-500', glow: 'animate-pulse ring-2 ring-red-400', icon: ShieldAlert },
    high: { color: 'bg-orange-500 text-white', border: 'border-orange-500', glow: '', icon: AlertTriangle },
    medium: { color: 'bg-amber-400 text-amber-900', border: 'border-amber-400', glow: '', icon: AlertCircle },
    low: { color: 'bg-blue-400 text-white', border: 'border-blue-400', glow: '', icon: Activity },
  }

  // Source Icons
  const SOURCE_ICON = {
    ai_prediction: <Cpu className="h-4 w-4" />,
    sensor_network: <Zap className="h-4 w-4" />,
    system: <Shield className="h-4 w-4" />,
    default: <BellRing className="h-4 w-4" />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header & Dashboard */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-600" /> Real-time Alert Center
        </h1>
        <p className="text-gray-500">Monitor, escalate, and resolve priority incidents</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Critical Unresolved</CardTitle><ShieldAlert className="h-4 w-4 text-red-500" /></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-600">{criticalCount}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">High Priority</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></CardHeader>
          <CardContent><div className="text-3xl font-bold text-orange-600">{highCount}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Total Active Alerts</CardTitle><Activity className="h-4 w-4 text-blue-500" /></CardHeader>
          <CardContent><div className="text-3xl font-bold">{activeAlerts.length}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Resolution Rate</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-600">{resRate}%</div><Progress value={resRate} className="h-2 mt-2" /></CardContent>
        </Card>
      </div>

      {/* Main Layout: Feed + Detail Panel */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left: Alert Feed */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search feed..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
            </div>
            <Button variant="outline" size="icon" onClick={fetchAlerts}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>

          <div className="space-y-3 h-[700px] overflow-y-auto pr-2">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><BellRing className="h-10 w-10 mx-auto mb-2 opacity-50"/>No alerts found</div>
            ) : (
              filteredAlerts.map(alert => {
                const isSelected = selectedAlert?._id === alert._id
                const pCfg = PRIORITY_CFG[alert.priority]
                const isPending = alert.status === 'pending'
                const Icon = pCfg.icon

                return (
                  <Card 
                    key={alert._id} 
                    className={`cursor-pointer transition-all border-l-4 ${pCfg.border} ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:bg-gray-50'} ${isPending && alert.priority === 'critical' ? pCfg.glow : ''}`}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={`text-[10px] ${pCfg.color} border-none`}><Icon className="h-3 w-3 mr-1" />{alert.priority.toUpperCase()}</Badge>
                        <span className="text-[10px] text-gray-400 flex items-center"><Clock className="h-3 w-3 mr-1"/> {new Date(alert.triggered_at).toLocaleTimeString()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1">{alert.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{alert.message}</p>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center text-[10px] text-gray-500 font-medium">
                          {SOURCE_ICON[alert.source as keyof typeof SOURCE_ICON] || SOURCE_ICON.default}
                          <span className="ml-1 uppercase">{alert.source.replace('_', ' ')}</span>
                        </div>
                        <Badge variant="outline" className={alert.status === 'resolved' ? 'bg-green-50 text-green-700' : alert.status === 'acknowledged' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}>
                          {alert.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Alert Detail Panel */}
        <div className="lg:col-span-2">
          {selectedAlert ? (
            <Card className="h-full shadow-lg border-t-8" style={{ borderTopColor: selectedAlert.priority === 'critical' ? '#ef4444' : selectedAlert.priority === 'high' ? '#f97316' : selectedAlert.priority === 'medium' ? '#fbbf24' : '#60a5fa' }}>
              <CardHeader className="pb-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={PRIORITY_CFG[selectedAlert.priority].color}>{selectedAlert.priority.toUpperCase()}</Badge>
                      <Badge variant="outline">{selectedAlert.alert_id}</Badge>
                    </div>
                    <CardTitle className="text-2xl">{selectedAlert.title}</CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-bold text-lg capitalize">{selectedAlert.status}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Actions */}
                <div className="flex gap-3 bg-gray-50 p-3 rounded-lg border">
                  {selectedAlert.status === 'pending' && <Button onClick={() => handleAction(selectedAlert._id, 'acknowledge')} className="flex-1 bg-amber-600 hover:bg-amber-700"><CheckCircle className="mr-2 h-4 w-4"/> Acknowledge</Button>}
                  {selectedAlert.status !== 'resolved' && <Button onClick={() => handleAction(selectedAlert._id, 'resolve')} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle className="mr-2 h-4 w-4"/> Mark Resolved</Button>}
                  {selectedAlert.status !== 'resolved' && <Button variant="destructive" onClick={() => setShowEscalate(true)} className="flex-1"><UserPlus className="mr-2 h-4 w-4"/> Escalate</Button>}
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Message</h3>
                  <p className="text-gray-800 bg-gray-50 p-4 rounded-lg border leading-relaxed">{selectedAlert.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Context</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex justify-between border-b pb-1"><span>Source</span> <span className="font-medium capitalize">{selectedAlert.source.replace('_', ' ')}</span></li>
                      <li className="flex justify-between border-b pb-1"><span>Category</span> <span className="font-medium">{selectedAlert.category}</span></li>
                      <li className="flex justify-between border-b pb-1"><span>Target Entity</span> <span className="font-medium">{selectedAlert.entity_type} {selectedAlert.entity_id}</span></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Timeline</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex justify-between border-b pb-1"><span>Triggered</span> <span className="font-medium">{new Date(selectedAlert.triggered_at).toLocaleString()}</span></li>
                      <li className="flex justify-between border-b pb-1"><span>Acknowledged</span> <span className="font-medium">{selectedAlert.acknowledged_at ? new Date(selectedAlert.acknowledged_at).toLocaleString() : '-'}</span></li>
                      <li className="flex justify-between border-b pb-1"><span>Resolved</span> <span className="font-medium">{selectedAlert.resolved_at ? new Date(selectedAlert.resolved_at).toLocaleString() : '-'}</span></li>
                    </ul>
                  </div>
                </div>

                {/* Metadata / Trigger Conditions */}
                {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Trigger Payload</h3>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedAlert.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
              <ShieldAlert className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg">Select an alert from the feed to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Escalate Dialog */}
      <Dialog open={showEscalate} onOpenChange={setShowEscalate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Alert</DialogTitle>
            <DialogDescription>Assign this alert to an administrator or manager for immediate review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Assign To Role</label>
              <Select defaultValue="super_admin">
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="super_admin">Super Admin</SelectItem><SelectItem value="manager">Facility Manager</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Escalation Reason</label>
              <Textarea placeholder="Explain why this requires escalation..." value={escalateReason} onChange={e => setEscalateReason(e.target.value)} />
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => handleAction(selectedAlert!._id, 'escalate', { reason: escalateReason })}>Confirm Escalation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
