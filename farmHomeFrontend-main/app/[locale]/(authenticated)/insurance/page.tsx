"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Plus,
  Shield,
  DollarSign,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Download,
  X,
  Camera,
  Flame,
  Bug,
  Droplets,
  Thermometer,
  Wind,
  RefreshCw,
  Eye,
  Calendar,
  Mail,
  Send,
} from 'lucide-react'
import { api } from '@/lib/api'
import { config } from '@/config'

// ── Interfaces ──────────────────────────────────────────
interface InsurancePolicy {
  _id: string
  policy_number: string
  provider_name: string
  coverage_type: string
  coverage_amount: number
  premium_amount: number
  deductible: number
  status: string
  start_date: string
  end_date: string
  renewal_date: string
  covered_batches: Array<{
    batch_id: string
    grain_type: string
    quantity_kg: number
    coverage_value: number
  }>
  risk_factors: {
    fire_risk: number
    theft_risk: number
    spoilage_risk: number
    weather_risk: number
  }
  claims_count: number
  total_claims_amount: number
}

interface InsuranceClaim {
  _id: string
  claim_number: string
  policy_id: string
  claim_type: string
  description: string
  amount_claimed: number
  amount_approved: number
  status: string
  incident_date: string
  filed_date: string
  approved_date?: string
  photos?: string[]
  batch_affected: {
    batch_id: string
    grain_type: string
    quantity_affected: number
  }
}

interface SpoilageEvent {
  event_id: string
  event_type: string
  severity: string
  description: string
  estimated_loss_kg: number
  estimated_value_loss: number
  detected_date: string
  reported_by: string
  photos: Array<{ path: string; original_name: string; upload_date: string }>
  environmental_conditions: Record<string, unknown>
}

interface GrainBatch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  status: string
  spoilage_events?: SpoilageEvent[]
}

// ── Helpers ─────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  mold: <Bug className="h-4 w-4" />,
  pests: <Bug className="h-4 w-4" />,
  moisture: <Droplets className="h-4 w-4" />,
  heat: <Thermometer className="h-4 w-4" />,
  smell: <Wind className="h-4 w-4" />,
  contamination: <AlertTriangle className="h-4 w-4" />,
  fire: <Flame className="h-4 w-4" />,
  other: <AlertTriangle className="h-4 w-4" />,
}

// ── Component ───────────────────────────────────────────
export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [batches, setBatches] = useState<GrainBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')



  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimSaving, setClaimSaving] = useState(false)
  const [claimPhotos, setClaimPhotos] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [claimForm, setClaimForm] = useState({
    policy_id: '', claim_type: 'Spoilage', description: '',
    amount_claimed: 0, incident_date: '', batch_id: '', quantity_affected: 0,
  })

  // Spoilage event form
  const [showSpoilageModal, setShowSpoilageModal] = useState(false)
  const [spoilageSaving, setSpoilageSaving] = useState(false)
  const [spoilagePhotos, setSpoilagePhotos] = useState<File[]>([])
  const [spoilageForm, setSpoilageForm] = useState({
    batch_id: '', event_type: 'mold', severity: 'medium',
    description: '', estimated_loss_kg: 0, estimated_value_loss: 0,
  })

  // Timeline data
  const [selectedBatchForTimeline, setSelectedBatchForTimeline] = useState<string>('')
  const [timelineEvents, setTimelineEvents] = useState<SpoilageEvent[]>([])

  // Insurance request form
  const [requestSending, setRequestSending] = useState(false)
  const [requestForm, setRequestForm] = useState({
    preferred_provider: 'EFU', coverage_type: 'Comprehensive', message: '',
  })

  // ── Data Loading ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [policiesRes, claimsRes, batchesRes] = await Promise.all([
        api.get<{ policies: InsurancePolicy[] }>('/api/insurance/policies?limit=50'),
        api.get<{ claims: InsuranceClaim[] }>('/api/insurance/claims?limit=50'),
        api.get<{ batches: GrainBatch[] }>('/api/grain-batches?limit=100'),
      ])
      if (policiesRes.ok && policiesRes.data) setPolicies(policiesRes.data.policies as unknown as InsurancePolicy[])
      if (claimsRes.ok && claimsRes.data) setClaims(claimsRes.data.claims as unknown as InsuranceClaim[])
      if (batchesRes.ok && batchesRes.data) setBatches((batchesRes.data.batches || []) as unknown as GrainBatch[])
    } catch {
      toast.error('Failed to load insurance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Load timeline when batch selected
  useEffect(() => {
    if (!selectedBatchForTimeline) { setTimelineEvents([]); return }
    const batch = batches.find(b => b._id === selectedBatchForTimeline)
    setTimelineEvents(batch?.spoilage_events || [])
  }, [selectedBatchForTimeline, batches])



  // ── Claim Handlers ────────────────────────────────────
  const openClaimModal = (policy?: InsurancePolicy) => {
    setClaimForm(prev => ({ ...prev, policy_id: policy?._id || policies[0]?._id || '', claim_type: 'Spoilage', description: '', amount_claimed: 0, incident_date: new Date().toISOString().slice(0, 10), batch_id: batches[0]?._id || '', quantity_affected: 0 }))
    setClaimPhotos([])
    setShowClaimModal(true)
  }

  const submitClaimWithPhotos = async () => {
    if (claimPhotos.length === 0) { toast.error('Please upload at least one damage photo'); return }
    setUploadingPhotos(true)
    try {
      const photoUrls: string[] = []
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      for (const photo of claimPhotos) {
        const fd = new FormData(); fd.append('photo', photo); fd.append('claim_type', claimForm.claim_type)
        const uploadRes = await fetch(`${config.backendUrl}/api/insurance/upload-photo`, { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: fd })
        if (uploadRes.ok) { const data = await uploadRes.json(); photoUrls.push(data.url) }
      }
      const body = { ...claimForm, amount_claimed: Number(claimForm.amount_claimed), batch_affected: { batch_id: claimForm.batch_id, quantity_affected: Number(claimForm.quantity_affected) }, photos: photoUrls }
      const res = await api.post('/api/insurance/claims', body)
      if (res.ok) { toast.success('Claim filed with photos'); setShowClaimModal(false); setClaimPhotos([]); loadData() }
      else toast.error(res.error || 'Failed to file claim')
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setUploadingPhotos(false) }
  }

  // ── Spoilage Event Handlers ───────────────────────────
  const submitSpoilageEvent = async () => {
    if (!spoilageForm.batch_id) { toast.error('Select a batch'); return }
    setSpoilageSaving(true)
    try {
      const res = await api.post(`/api/logging/batches/${spoilageForm.batch_id}/spoilage-events`, {
        event_type: spoilageForm.event_type, severity: spoilageForm.severity,
        description: spoilageForm.description, estimated_loss_kg: Number(spoilageForm.estimated_loss_kg),
        estimated_value_loss: Number(spoilageForm.estimated_value_loss),
      })
      if (res.ok) {
        toast.success('Spoilage event logged')
        // Upload photos if any
        if (spoilagePhotos.length > 0 && (res.data as any)?.event?.event_id) {
          const eventId = (res.data as any).event.event_id
          const fd = new FormData()
          spoilagePhotos.forEach(p => fd.append('photos', p))
          const token = localStorage.getItem('token')
          await fetch(`${config.backendUrl}/api/logging/batches/${spoilageForm.batch_id}/spoilage-events/${eventId}/photos`, {
            method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: fd,
          })
        }
        setShowSpoilageModal(false); setSpoilagePhotos([]); loadData()
      } else toast.error((res as any).error || 'Failed to log spoilage event')
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setSpoilageSaving(false) }
  }

  // ── Insurance Export ──────────────────────────────────
  const downloadInsuranceExport = async (batchId: string, format: string, claimNumber: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${config.backendUrl}/api/grain-batches/${batchId}/export-insurance?format=${format}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `claim-${claimNumber}-${format}.json`; a.click()
        toast.success(`${format.toUpperCase()} export downloaded`)
      } else toast.error('Failed to export')
    } catch { toast.error('Export failed') }
  }

  // ── Batch Report Download ─────────────────────────────
  const downloadBatchReport = async (batchId: string, batchRef: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${config.backendUrl}/api/logging/batches/${batchId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `batch-report-${batchRef}.pdf`; a.click()
      URL.revokeObjectURL(url); toast.success('Report downloaded!')
    } catch { toast.error('Failed to download report') }
  }

  // ── Request Insurance from Super Admin ────────────────
  const sendInsuranceRequest = async () => {
    if (!requestForm.message.trim()) { toast.error('Please write a short message'); return }
    setRequestSending(true)
    try {
      const res = await api.post('/api/insurance/request-coverage', {
        preferred_provider: requestForm.preferred_provider,
        coverage_type: requestForm.coverage_type,
        message: requestForm.message,
      })
      if (res.ok) {
        toast.success('Request sent to administrator!')
        setRequestForm({ preferred_provider: 'EFU', coverage_type: 'Comprehensive', message: '' })
      } else {
        toast.error((res as any).error || 'Failed to send request')
      }
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed to send') }
    finally { setRequestSending(false) }
  }

  // ── Computed ──────────────────────────────────────────
  const calculateRiskScore = (p: InsurancePolicy) => {
    const f = p.risk_factors; return Math.round((f.fire_risk + f.theft_risk + f.spoilage_risk + f.weather_risk) / 4)
  }
  const totalCoverage = policies.reduce((s, p) => s + p.coverage_amount, 0)
  const totalPremium = policies.reduce((s, p) => s + p.premium_amount, 0)
  const activePolicies = policies.filter(p => p.status === 'active').length
  const avgRisk = policies.length > 0 ? Math.round(policies.reduce((s, p) => s + calculateRiskScore(p), 0) / policies.length) : 0
  const allSpoilageEvents = batches.flatMap(b => (b.spoilage_events || []).map(e => ({ ...e, batch_id: b.batch_id, batch_obj_id: b._id })))
  const statusBadge = (s: string) => ({ active: 'bg-green-100 text-green-800', expired: 'bg-red-100 text-red-800', pending: 'bg-yellow-100 text-yellow-800', cancelled: 'bg-gray-100 text-gray-800' }[s] || 'bg-gray-100 text-gray-800')
  const claimStatusCfg = (s: string) => ({ approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle }, pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock }, rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }, under_review: { color: 'bg-blue-100 text-blue-800', icon: FileText } }[s] || { color: 'bg-yellow-100 text-yellow-800', icon: Clock })

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center"><Shield className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" /><p className="text-gray-500">Loading insurance data...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-600" />
            Insurance & Loss Claim Support
          </h1>
          <p className="text-gray-500 mt-1">Spoilage logging, batch reports, photo documentation & insurer exports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadData()} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button onClick={() => { setShowSpoilageModal(true); setSpoilageForm({ batch_id: batches[0]?._id || '', event_type: 'mold', severity: 'medium', description: '', estimated_loss_kg: 0, estimated_value_loss: 0 }); setSpoilagePhotos([]) }} className="gap-2 bg-red-600 hover:bg-red-700"><AlertTriangle className="h-4 w-4" />Log Spoilage</Button>
          <Button onClick={() => openClaimModal()} className="gap-2 bg-amber-600 hover:bg-amber-700"><Plus className="h-4 w-4" />File Claim</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Policies</CardTitle><Shield className="h-4 w-4 text-green-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{activePolicies}</div><p className="text-xs text-muted-foreground">Coverage: PKR {totalCoverage.toLocaleString()}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Annual Premium</CardTitle><DollarSign className="h-4 w-4 text-blue-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">PKR {totalPremium.toLocaleString()}</div><p className="text-xs text-muted-foreground">Monthly: PKR {Math.round(totalPremium / 12).toLocaleString()}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Claims</CardTitle><FileText className="h-4 w-4 text-amber-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{claims.length}</div><p className="text-xs text-muted-foreground">Approved: PKR {claims.reduce((s, c) => s + c.amount_approved, 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Spoilage Events</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{allSpoilageEvents.length}</div><p className="text-xs text-muted-foreground">Across {batches.filter(b => (b.spoilage_events?.length || 0) > 0).length} batches</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle><AlertTriangle className="h-4 w-4 text-purple-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgRisk}%</div><Progress value={avgRisk} className="h-2 mt-1" /></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spoilage">Spoilage Events</TabsTrigger>
          <TabsTrigger value="claims">Claims & Exports</TabsTrigger>
          <TabsTrigger value="reports">Batch Reports</TabsTrigger>
          <TabsTrigger value="timeline">Event Timeline</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* ── TAB: Overview ──────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map(policy => (
              <Card key={policy._id} className="hover:shadow-lg transition-shadow border-t-4 border-t-amber-400">
                <CardHeader>
                  <div className="flex items-center justify-between"><CardTitle className="text-lg">{policy.policy_number}</CardTitle><Badge className={statusBadge(policy.status)}>{policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}</Badge></div>
                  <CardDescription>{policy.provider_name} • {policy.coverage_type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Coverage</p><p className="font-medium">PKR {policy.coverage_amount.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Premium</p><p className="font-medium">PKR {policy.premium_amount.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Deductible</p><p className="font-medium">PKR {policy.deductible.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Risk</p><p className="font-medium">{calculateRiskScore(policy)}%</p></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>Batches Covered</span><span>{policy.covered_batches.length}</span></div>
                    <Progress value={(policy.covered_batches.length / 5) * 100} className="h-2" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setActiveTab('policies')}><Eye className="h-3 w-3 mr-1" />View Details</Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openClaimModal(policy)}>File Claim</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {policies.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400"><Shield className="h-12 w-12 mx-auto mb-3" /><p>No active policies. Policies are managed by your system administrator.</p></div>}
          </div>
        </TabsContent>

        {/* ── TAB: Spoilage Events ───────────────────────── */}
        <TabsContent value="spoilage" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Spoilage Event Log</CardTitle><CardDescription>All logged spoilage/damage events across batches</CardDescription></div>
                <Button onClick={() => { setShowSpoilageModal(true); setSpoilagePhotos([]) }} className="gap-2 bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4" />Log New Event</Button>
              </div>
            </CardHeader>
            <CardContent>
              {allSpoilageEvents.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><AlertTriangle className="h-12 w-12 mx-auto mb-3" /><p className="text-lg font-medium">No spoilage events logged</p><p className="text-sm mt-1">Use &quot;Log Spoilage&quot; to record damage events</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Event ID</TableHead><TableHead>Batch</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Loss (kg)</TableHead><TableHead>Value Loss</TableHead><TableHead>Date</TableHead><TableHead>Photos</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {allSpoilageEvents.map((evt: any) => (
                      <TableRow key={evt.event_id}>
                        <TableCell className="font-mono text-xs">{evt.event_id}</TableCell>
                        <TableCell><Badge variant="outline">{evt.batch_id}</Badge></TableCell>
                        <TableCell><span className="flex items-center gap-1">{EVENT_ICONS[evt.event_type] || EVENT_ICONS.other}{evt.event_type}</span></TableCell>
                        <TableCell><Badge variant="outline" className={SEVERITY_COLORS[evt.severity]}>{evt.severity}</Badge></TableCell>
                        <TableCell>{evt.estimated_loss_kg || 0} kg</TableCell>
                        <TableCell>PKR {(evt.estimated_value_loss || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{new Date(evt.detected_date).toLocaleDateString()}</TableCell>
                        <TableCell><span className="flex items-center gap-1"><Camera className="h-3 w-3" />{evt.photos?.length || 0}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Claims & Exports ──────────────────────── */}
        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Insurance Claims</CardTitle><CardDescription>File &amp; manage claims — export in EFU, Adamjee, ZTBL formats</CardDescription></div>
                <Button onClick={() => openClaimModal()} className="gap-2 bg-amber-600 hover:bg-amber-700"><Plus className="h-4 w-4" />New Claim</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Claim #</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Claimed</TableHead><TableHead>Approved</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Export / Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {claims.map(claim => {
                    const cfg = claimStatusCfg(claim.status); const Icon = cfg.icon
                    return (
                      <TableRow key={claim._id}>
                        <TableCell className="font-medium">{claim.claim_number}</TableCell>
                        <TableCell>{claim.claim_type}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{claim.description}</TableCell>
                        <TableCell>PKR {claim.amount_claimed.toLocaleString()}</TableCell>
                        <TableCell>PKR {claim.amount_approved.toLocaleString()}</TableCell>
                        <TableCell><Badge className={cfg.color}><Icon className="h-3 w-3 mr-1" />{claim.status}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(claim.incident_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {['efu', 'adamjee', 'ztbl'].map(fmt => (
                              <Button key={fmt} variant="outline" size="sm" onClick={() => downloadInsuranceExport(claim.batch_affected?.batch_id, fmt, claim.claim_number)} disabled={!claim.batch_affected?.batch_id}>
                                <Download className="h-3 w-3 mr-1" />{fmt.toUpperCase()}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {claims.length === 0 && <div className="text-center py-12 text-gray-400"><FileText className="h-12 w-12 mx-auto mb-3" /><p>No claims filed yet</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Batch Reports ─────────────────────────── */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-500" />Batch-wise PDF Reports</CardTitle><CardDescription>Download traceability &amp; spoilage PDF reports per batch</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Batch ID</TableHead><TableHead>Grain Type</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead>Spoilage Events</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {batches.map(batch => (
                    <TableRow key={batch._id}>
                      <TableCell className="font-medium">{batch.batch_id}</TableCell>
                      <TableCell>{batch.grain_type}</TableCell>
                      <TableCell>{batch.quantity_kg?.toLocaleString()} kg</TableCell>
                      <TableCell><Badge variant="outline">{batch.status}</Badge></TableCell>
                      <TableCell><Badge variant={batch.spoilage_events?.length ? "destructive" : "secondary"}>{batch.spoilage_events?.length || 0} events</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => downloadBatchReport(batch._id, batch.batch_id)} className="gap-1"><Download className="h-3 w-3" />PDF Report</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {batches.length === 0 && <div className="text-center py-12 text-gray-400"><Package className="h-12 w-12 mx-auto mb-3" /><p>No batches found</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Event Timeline ────────────────────────── */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-purple-500" />Visual Event Timeline</CardTitle>
              <CardDescription>Select a batch to view spoilage events with photos</CardDescription>
              <Select value={selectedBatchForTimeline} onValueChange={setSelectedBatchForTimeline}>
                <SelectTrigger className="w-64 mt-2"><SelectValue placeholder="Select a batch..." /></SelectTrigger>
                <SelectContent>{batches.map(b => <SelectItem key={b._id} value={b._id}>{b.batch_id} — {b.grain_type}</SelectItem>)}</SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {!selectedBatchForTimeline ? (
                <div className="text-center py-16 text-gray-400"><Eye className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Select a batch above to view its timeline</p></div>
              ) : timelineEvents.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" /><p className="text-lg font-medium">No spoilage events</p><p className="text-sm">This batch has a clean record</p></div>
              ) : (
                <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-red-400 before:to-amber-300">
                  {timelineEvents.sort((a, b) => new Date(a.detected_date).getTime() - new Date(b.detected_date).getTime()).map((evt, idx) => (
                    <div key={evt.event_id} className="relative">
                      <div className={`absolute -left-8 top-1 w-7 h-7 rounded-full flex items-center justify-center border-2 ${evt.severity === 'critical' ? 'bg-red-100 border-red-400' : evt.severity === 'high' ? 'bg-orange-100 border-orange-400' : evt.severity === 'medium' ? 'bg-yellow-100 border-yellow-400' : 'bg-green-100 border-green-400'}`}>
                        <span className="text-xs font-bold">{idx + 1}</span>
                      </div>
                      <Card className="border-l-4" style={{ borderLeftColor: evt.severity === 'critical' ? '#ef4444' : evt.severity === 'high' ? '#f97316' : evt.severity === 'medium' ? '#eab308' : '#22c55e' }}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {EVENT_ICONS[evt.event_type] || EVENT_ICONS.other}
                                <span className="font-semibold capitalize">{evt.event_type}</span>
                                <Badge variant="outline" className={SEVERITY_COLORS[evt.severity]}>{evt.severity}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{evt.description || 'No description'}</p>
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(evt.detected_date).toLocaleString()}</span>
                                {evt.estimated_loss_kg > 0 && <span>Loss: {evt.estimated_loss_kg} kg</span>}
                                {evt.estimated_value_loss > 0 && <span>Value: PKR {evt.estimated_value_loss.toLocaleString()}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">{evt.event_id}</span>
                          </div>
                          {evt.photos && evt.photos.length > 0 && (
                            <div className="mt-3 grid grid-cols-4 gap-2">
                              {evt.photos.map((photo, pIdx) => (
                                <a key={pIdx} href={photo.path} target="_blank" rel="noopener noreferrer" className="block">
                                  <img src={photo.path} alt={photo.original_name || `Photo ${pIdx + 1}`} className="w-full h-20 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: My Policies (Read-Only) ────────────────── */}
        <TabsContent value="policies" className="space-y-4">
          {/* Provider Info Banner */}
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-800">Your insurance policies are managed by your system administrator. Contact them to add or modify coverage plans from providers like <strong>EFU</strong>, <strong>Adamjee</strong>, or <strong>ZTBL</strong>.</p>
            </CardContent>
          </Card>

          {/* Policy Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map(p => (
              <Card key={p._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.status === 'active' ? 'bg-green-100' : p.status === 'expired' ? 'bg-red-100' : 'bg-gray-100'}`}>
                        <Shield className={`h-5 w-5 ${p.status === 'active' ? 'text-green-600' : p.status === 'expired' ? 'text-red-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{p.provider_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{p.policy_number}</p>
                      </div>
                    </div>
                    <Badge className={statusBadge(p.status)}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline" className="text-xs">{p.coverage_type}</Badge>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coverage</p><p className="font-semibold">PKR {p.coverage_amount.toLocaleString()}</p></div>
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Premium</p><p className="font-semibold">PKR {p.premium_amount.toLocaleString()}</p></div>
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deductible</p><p className="font-semibold">PKR {p.deductible.toLocaleString()}</p></div>
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Score</p><div className="flex items-center gap-1"><span className="font-semibold">{calculateRiskScore(p)}%</span><Progress value={calculateRiskScore(p)} className="w-12 h-1.5" /></div></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.start_date).toLocaleDateString()} — {new Date(p.end_date).toLocaleDateString()}</span>
                    <span>{p.covered_batches.length} batches covered</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openClaimModal(p)}><FileText className="h-3 w-3 mr-1" />File Claim Against This Policy</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {policies.length === 0 && (
            <Card>
              <CardContent className="text-center py-16">
                <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600">No Insurance Policies</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Your administrator has not assigned any insurance policies yet. Use the form below to request coverage.</p>
              </CardContent>
            </Card>
          )}

          {/* Request Insurance Coverage Form */}
          <Card className="border-2 border-dashed border-amber-300 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5 text-amber-600" />Request Insurance Coverage</CardTitle>
              <CardDescription>Send a request to your system administrator to activate a new insurance policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Provider</label>
                  <Select value={requestForm.preferred_provider} onValueChange={v => setRequestForm({ ...requestForm, preferred_provider: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFU">EFU General Insurance</SelectItem>
                      <SelectItem value="Adamjee">Adamjee Insurance</SelectItem>
                      <SelectItem value="ZTBL">ZTBL (Zarai Taraqiati Bank)</SelectItem>
                      <SelectItem value="Other">Other Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Coverage Type Needed</label>
                  <Select value={requestForm.coverage_type} onValueChange={v => setRequestForm({ ...requestForm, coverage_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                      <SelectItem value="Fire & Theft">Fire & Theft</SelectItem>
                      <SelectItem value="Spoilage Only">Spoilage Only</SelectItem>
                      <SelectItem value="Weather Damage">Weather Damage</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message to Administrator</label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g. I need coverage for 5 wheat batches in Silo A. Estimated total value PKR 2,500,000..."
                  value={requestForm.message}
                  onChange={e => setRequestForm({ ...requestForm, message: e.target.value })}
                />
              </div>
              <Button onClick={sendInsuranceRequest} disabled={requestSending} className="gap-2 bg-amber-600 hover:bg-amber-700">
                <Send className="h-4 w-4" />
                {requestSending ? 'Sending...' : 'Send Request to Admin'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Spoilage Event Modal ──────────────────────────── */}
      <Dialog open={showSpoilageModal} onOpenChange={setShowSpoilageModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Log Spoilage Event</DialogTitle><DialogDescription>Record a spoilage or damage event with photos</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Batch *</label><Select value={spoilageForm.batch_id} onValueChange={v => setSpoilageForm({ ...spoilageForm, batch_id: v })}><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent>{batches.map(b => <SelectItem key={b._id} value={b._id}>{b.batch_id} — {b.grain_type}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Event Type</label><Select value={spoilageForm.event_type} onValueChange={v => setSpoilageForm({ ...spoilageForm, event_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['mold', 'pests', 'moisture', 'heat', 'smell', 'contamination', 'other'].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Severity</label><Select value={spoilageForm.severity} onValueChange={v => setSpoilageForm({ ...spoilageForm, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low', 'medium', 'high', 'critical'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Description</label><Input value={spoilageForm.description} onChange={e => setSpoilageForm({ ...spoilageForm, description: e.target.value })} placeholder="Describe what was observed..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Est. Loss (kg)</label><Input type="number" value={spoilageForm.estimated_loss_kg} onChange={e => setSpoilageForm({ ...spoilageForm, estimated_loss_kg: Number(e.target.value) })} /></div>
              <div className="space-y-2"><label className="text-sm text-muted-foreground">Est. Value Loss (PKR)</label><Input type="number" value={spoilageForm.estimated_value_loss} onChange={e => setSpoilageForm({ ...spoilageForm, estimated_value_loss: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Damage Photos</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input type="file" id="spoilage-photos" multiple accept="image/*" className="hidden" onChange={e => setSpoilagePhotos(Array.from(e.target.files || []))} />
                <label htmlFor="spoilage-photos" className="cursor-pointer flex flex-col items-center space-y-1"><Upload className="h-6 w-6 text-gray-400" /><span className="text-sm text-gray-500">Click to upload photos</span></label>
                {spoilagePhotos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{spoilagePhotos.map((f, i) => <div key={i} className="relative"><img src={URL.createObjectURL(f)} alt="" className="w-full h-20 object-cover rounded" /><button type="button" onClick={() => setSpoilagePhotos(spoilagePhotos.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button></div>)}</div>}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowSpoilageModal(false)}>Cancel</Button>
            <Button onClick={submitSpoilageEvent} disabled={spoilageSaving} className="bg-red-600 hover:bg-red-700">{spoilageSaving ? "Saving..." : "Log Event"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Claim Modal ──────────────────────────────────── */}
      <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>File Insurance Claim</DialogTitle><DialogDescription>Submit a claim with damage evidence</DialogDescription></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Policy</label><Select value={claimForm.policy_id} onValueChange={v => setClaimForm({ ...claimForm, policy_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{policies.map(p => <SelectItem key={p._id} value={p._id}>{p.policy_number} • {p.provider_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Claim Type</label><Select value={claimForm.claim_type} onValueChange={v => setClaimForm({ ...claimForm, claim_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Fire', 'Theft', 'Spoilage', 'Weather Damage', 'Equipment Failure', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2 md:col-span-2"><label className="text-sm text-muted-foreground">Description</label><Input value={claimForm.description} onChange={e => setClaimForm({ ...claimForm, description: e.target.value })} placeholder="Describe the incident..." /></div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Amount Claimed</label><Input type="number" value={claimForm.amount_claimed} onChange={e => setClaimForm({ ...claimForm, amount_claimed: Number(e.target.value) })} /></div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Incident Date</label><Input type="date" value={claimForm.incident_date} onChange={e => setClaimForm({ ...claimForm, incident_date: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Affected Batch</label><Select value={claimForm.batch_id} onValueChange={v => setClaimForm({ ...claimForm, batch_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{batches.map(b => <SelectItem key={b._id} value={b._id}>{b.batch_id} • {b.grain_type}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Quantity Affected (kg)</label><Input type="number" value={claimForm.quantity_affected} onChange={e => setClaimForm({ ...claimForm, quantity_affected: Number(e.target.value) })} /></div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-muted-foreground">Damage Photos *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input type="file" id="claim-photos" multiple accept="image/*" className="hidden" onChange={e => setClaimPhotos(Array.from(e.target.files || []))} />
                <label htmlFor="claim-photos" className="cursor-pointer flex flex-col items-center space-y-1"><Upload className="h-6 w-6 text-gray-400" /><span className="text-sm text-gray-500">Click to upload damage photos</span><span className="text-xs text-gray-400">PNG, JPG up to 10MB each</span></label>
                {claimPhotos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{claimPhotos.map((f, i) => <div key={i} className="relative"><img src={URL.createObjectURL(f)} alt="" className="w-full h-24 object-cover rounded" /><button type="button" onClick={() => setClaimPhotos(claimPhotos.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button></div>)}</div>}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setShowClaimModal(false); setClaimPhotos([]) }}>Close</Button>
            <Button onClick={submitClaimWithPhotos} disabled={claimSaving || uploadingPhotos}>{claimSaving || uploadingPhotos ? "Submitting..." : "Submit Claim with Photos"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
