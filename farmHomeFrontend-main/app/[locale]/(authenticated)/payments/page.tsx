"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle,
  Loader2,
  Download,
  FileText,
  Smartphone,
  Mail,
  Search,
  RefreshCw,
  TrendingUp,
  XCircle,
  AlertCircle,
  Package
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/app/[locale]/providers"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { config } from "@/config"
import { AnimatedBackground } from "@/components/animations/MotionGraphics"

interface PaymentItem {
  _id: string
  tenant_id: string
  plan_name: string
  price_per_month: number
  billing_cycle: string
  status: string
  payment_status: string
  start_date?: string
  next_payment_date?: string
  stripe_subscription_id?: string
}

interface PaymentsResponse {
  payments: PaymentItem[]
  pagination: {
    current_page: number
    total_pages: number
    total_items: number
    items_per_page: number
  }
}

interface DispatchedBatch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  purchase_price_per_kg: number
  sell_price_per_kg?: number
  dispatch_details?: {
    quantity: number
    buyer_name: string
    dispatch_date: string
    vehicle_number?: string
    driver_name?: string
    driver_contact?: string
    destination?: string
    transport_cost?: number
  }
  buyer_id?: {
    _id: string
    name: string
    contact_info?: string
    contact_person?: {
      email?: string
      phone?: string
    }
  }
  status: string
  created_at: string
  updated_at: string
  admin_id?: string
  silo_id?: string
  farmer_name?: string
  farmer_contact?: string
  source_location?: string
  risk_score?: number
  spoilage_label?: string
  dispatched_quantity_kg?: number
  revenue?: number
  profit?: number
}

interface PaymentsSummary {
  total_subscriptions: number
  total_revenue: number
  active: number
  cancelled: number
  past_due: number
}

interface BatchesResponse {
  batches: DispatchedBatch[]
  pagination: {
    current_page: number
    total_pages: number
    total_items: number
    items_per_page: number
  }
}

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentItem[]>([])
  const [summary, setSummary] = useState<PaymentsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const { user } = useAuth()
  const [avgPricePerKg, setAvgPricePerKg] = useState<number>(0)
  const [dispatchedBatches, setDispatchedBatches] = useState<DispatchedBatch[]>([])
  const [dispatchLoading, setDispatchLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null)

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0,
      }),
    [],
  )

  const loadPayments = async () => {
    try {
      const res = await api.get<PaymentsResponse>("/api/payments")
      if (res.ok && res.data) {
        setItems(res.data.payments)
      } else {
        toast.error(res.error || "Failed to load payments")
      }
    } catch {
      toast.error("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      const res = await api.get<PaymentsSummary>("/api/payments/summary")
      if (res.ok && res.data) {
        setSummary(res.data)
      } else {
        toast.error(res.error || "Failed to load summary")
      }
    } catch {
      toast.error("Failed to load summary")
    } finally {
      setSummaryLoading(false)
    }
  }

  const loadDispatchedBatches = async () => {
    try {
      setDispatchLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const backendUrl = config.backendUrl

      // Get dashboard data for avg price
      const dashRes = await fetch(`${backendUrl}/dashboard`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      })
      if (dashRes.ok) {
        const dash = await dashRes.json()
        setAvgPricePerKg(dash?.business?.avgPricePerKg || 0)
      }

      // Get dispatched batches
      const batchesRes = await api.get<BatchesResponse>(`/api/grain-batches?status=dispatched&limit=100`)
      if (batchesRes.ok && batchesRes.data) {
        setDispatchedBatches(batchesRes.data.batches || [])
      } else {
        toast.error(batchesRes.error || "Failed to load dispatched batches")
      }
    } catch {
      toast.error("Failed to load grain sales payments")
    } finally {
      setDispatchLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
    loadSummary()
    loadDispatchedBatches()
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    setSummaryLoading(true)
    await Promise.all([loadPayments(), loadSummary(), loadDispatchedBatches()])
  }

  const totals = useMemo(() => {
    return {
      totalRevenue: summary?.total_revenue || 0,
      completed: items.filter(i => i.payment_status !== "failed" && i.status === "active").length,
      pending: items.filter(i => i.payment_status === "pending").length,
      processing: items.filter(i => i.payment_status === "processing").length,
    }
  }, [items, summary])

  const salesTotals = useMemo(() => {
    const rows = dispatchedBatches.map((b) => {
      const qty = b.dispatched_quantity_kg || b.dispatch_details?.quantity || b.quantity_kg || 0
      const rate = b.sell_price_per_kg || b.purchase_price_per_kg || avgPricePerKg || 0
      const amount = qty * rate
      return { amount }
    })
    const total = rows.reduce((s, r) => s + r.amount, 0)
    return { total }
  }, [dispatchedBatches, avgPricePerKg])

  // Filter batches by search term
  const filteredBatches = useMemo(() => {
    if (!searchTerm) return dispatchedBatches
    const term = searchTerm.toLowerCase()
    return dispatchedBatches.filter(b =>
      b.batch_id.toLowerCase().includes(term) ||
      b.grain_type.toLowerCase().includes(term) ||
      (b.dispatch_details?.buyer_name || b.buyer_id?.name || '').toLowerCase().includes(term)
    )
  }, [dispatchedBatches, searchTerm])

  const handleDownloadInvoice = async (batch: DispatchedBatch) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const backendUrl = config.backendUrl
      const res = await fetch(`${backendUrl}/api/grain-batches/${batch._id}/invoice-pdf`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${batch.batch_id}-${Date.now()}.pdf`
        a.click()
        toast.success('Invoice PDF downloaded')
      } else {
        toast.error('Failed to generate invoice')
      }
    } catch {
      toast.error('Failed to download invoice')
    }
  }

  const handleSendInvoiceEmail = async (batch: DispatchedBatch) => {
    const buyerEmail = batch.buyer_id?.contact_person?.email
    if (!buyerEmail) {
      toast.error('No buyer email available for this batch')
      return
    }

    setSendingInvoice(batch._id)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const backendUrl = config.backendUrl
      const res = await fetch(`${backendUrl}/api/grain-batches/${batch._id}/send-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ email: buyerEmail })
      })
      if (res.ok) {
        toast.success(`Invoice sent to ${buyerEmail}`)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to send invoice email')
      }
    } catch {
      toast.error('Failed to send invoice email')
    } finally {
      setSendingInvoice(null)
    }
  }

  const handleExport = (format: "pdf" | "csv" = "csv") => {
    const url = `${config.backendUrl}/dashboard/export-report?type=payments&format=${format}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handlePaymentGateway = async (batch: DispatchedBatch, amount: number, buyerName: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const backendUrl = config.backendUrl
      const paymentMethods = ['jazzcash', 'easypaisa', 'sadapay', 'raast']
      const selectedMethod = window.prompt(`Select payment method:\n1. JazzCash\n2. Easypaisa\n3. Sadapay\n4. Raast\n\nEnter number (1-4):`)
      if (!selectedMethod || !['1', '2', '3', '4'].includes(selectedMethod)) return
      const method = paymentMethods[parseInt(selectedMethod) - 1]
      const res = await fetch(`${backendUrl}/api/payments/initiate-gateway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          batch_id: batch._id,
          amount: amount,
          payment_method: method,
          buyer_name: buyerName
        })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.payment_url) {
          window.open(data.payment_url, '_blank')
          toast.success(`Redirecting to ${method} payment gateway`)
        } else {
          toast.success(`Payment initiated via ${method}`)
        }
      } else {
        toast.error('Failed to initiate payment')
      }
    } catch {
      toast.error('Payment gateway error')
    }
  }

  if (loading && summaryLoading) {
    return (
      <AnimatedBackground className="min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span>Loading payments...</span>
          </div>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground className="min-h-screen">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Payment Management
            </h2>
            <p className="text-muted-foreground">
              Manage grain payments, invoices, and subscriptions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button variant="outline" onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button className="bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600" onClick={() => handleExport("pdf")}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/30 rounded-full -mr-12 -mt-12" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">Total Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900">
                {formatter.format(totals.totalRevenue)}
              </div>
              <div className="flex items-center text-xs text-emerald-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live from subscriptions
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/30 rounded-full -mr-12 -mt-12" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Active</CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{summary?.active ?? 0}</div>
              <p className="text-xs text-blue-600 mt-1">Active subscriptions</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-200/30 rounded-full -mr-12 -mt-12" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Cancelled</CardTitle>
              <XCircle className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary?.cancelled ?? 0}</div>
              <p className="text-xs text-gray-500 mt-1">Ended subscriptions</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-200/30 rounded-full -mr-12 -mt-12" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-900">Past Due / Failed</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">{summary?.past_due ?? 0}</div>
              <p className="text-xs text-red-600 mt-1">Payment issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Grain Sales Payments - Admin Only */}
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <div className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-amber-900">
                      <Package className="h-5 w-5" />
                      Grain Sales Payments
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                      Avg Rate: {formatter.format(avgPricePerKg)}/kg • Dispatched Batches
                    </CardDescription>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold text-amber-900">{formatter.format(salesTotals.total)}</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search batches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {dispatchLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading dispatched batches...
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/80">
                            <TableHead className="font-semibold">Batch</TableHead>
                            <TableHead className="font-semibold">Grain</TableHead>
                            <TableHead className="font-semibold">Buyer</TableHead>
                            <TableHead className="font-semibold text-right">Qty (kg)</TableHead>
                            <TableHead className="font-semibold text-right">Rate</TableHead>
                            <TableHead className="font-semibold text-right">Amount</TableHead>
                            <TableHead className="font-semibold">Dispatch Date</TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBatches.map((b) => {
                            const qty = b.dispatched_quantity_kg || b.dispatch_details?.quantity || b.quantity_kg || 0
                            const sellRate = b.sell_price_per_kg || b.purchase_price_per_kg || avgPricePerKg || 0
                            const amount = qty * sellRate
                            const buyerName = b.dispatch_details?.buyer_name || b.buyer_id?.name || "N/A"
                            const buyerEmail = b.buyer_id?.contact_person?.email

                            return (
                              <TableRow key={b._id} className="hover:bg-gray-50/50 transition-colors">
                                <TableCell className="font-medium">
                                  <Badge variant="outline" className="font-mono">
                                    {b.batch_id}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                    {b.grain_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{buyerName}</p>
                                    {buyerEmail && (
                                      <p className="text-xs text-muted-foreground">{buyerEmail}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">{qty.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{formatter.format(sellRate)}</TableCell>
                                <TableCell className="text-right font-bold text-emerald-700">
                                  {formatter.format(amount)}
                                </TableCell>
                                <TableCell>
                                  {b.dispatch_details?.dispatch_date
                                    ? new Date(b.dispatch_details.dispatch_date).toLocaleDateString('en-PK')
                                    : "N/A"
                                  }
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadInvoice(b)}
                                      className="h-8"
                                    >
                                      <FileText className="h-3.5 w-3.5 mr-1" />
                                      Invoice
                                    </Button>
                                    {buyerEmail && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSendInvoiceEmail(b)}
                                        disabled={sendingInvoice === b._id}
                                        className="h-8"
                                      >
                                        {sendingInvoice === b._id ? (
                                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                        ) : (
                                          <Mail className="h-3.5 w-3.5 mr-1" />
                                        )}
                                        Email
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePaymentGateway(b, amount, buyerName)}
                                      className="h-8 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-green-700 border-green-200"
                                    >
                                      <Smartphone className="h-3.5 w-3.5 mr-1" />
                                      Pay
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredBatches.length === 0 && (
                      <div className="py-12 text-center text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No dispatched batches found.</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subscriptions List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Subscriptions / Payments</h3>
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item._id} className="border shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.plan_name}</CardTitle>
                      <CardDescription>
                        Billing: {item.billing_cycle || "N/A"} • {formatter.format(item.price_per_month || 0)}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        item.status === "active" ? "default" :
                          item.status === "cancelled" ? "secondary" : "outline"
                      }
                      className={
                        item.status === "active"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : ""
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Payment status: <span className="font-medium">{item.payment_status || "n/a"}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Start: {item.start_date ? new Date(item.start_date).toLocaleDateString('en-PK') : "N/A"}
                        {" • "}
                        Next: {item.next_payment_date ? new Date(item.next_payment_date).toLocaleDateString('en-PK') : "N/A"}
                      </div>
                      {item.stripe_subscription_id && (
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {item.stripe_subscription_id}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">
                      {formatter.format(item.price_per_month || 0)}/mo
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && (
              <Card className="border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No payments found.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AnimatedBackground>
  )
}
