"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, DollarSign, Calendar, CheckCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/app/[locale]/providers"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { config } from "@/config"

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
  dispatch_details?: {
    quantity: number
    buyer_name: string
    dispatch_date: string
    vehicle_number?: string;
    driver_name?: string;
    driver_contact?: string;
    destination?: string;
    transport_cost?: number;
  };
  buyer_id?: {
    name: string;
    contact_info?: string;
  };
  status: string;
  created_at: string;
  updated_at: string;
  // Additional fields that might be in the response
  admin_id?: string;
  silo_id?: string;
  farmer_name?: string;
  farmer_contact?: string;
  source_location?: string;
  risk_score?: number;
  spoilage_label?: string;
}

interface PaymentsSummary {
  total_subscriptions: number
  total_revenue: number
  active: number
  cancelled: number
  past_due: number
}

interface BatchesResponse {
  batches: DispatchedBatch[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
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

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.get<PaymentsResponse>("/api/payments")
        if (!mounted) return
        if (res.ok && res.data) {
          setItems(res.data.payments)
        } else {
          toast.error(res.error || "Failed to load payments")
        }
      } catch {
        toast.error("Failed to load payments")
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    ;(async () => {
      try {
        const res = await api.get<PaymentsSummary>("/api/payments/summary")
        if (!mounted) return
        if (res.ok && res.data) {
          setSummary(res.data)
        } else {
          toast.error(res.error || "Failed to load summary")
        }
      } catch {
        toast.error("Failed to load summary")
      } finally {
        if (mounted) setSummaryLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setDispatchLoading(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const backendUrl = (await import('@/config')).config.backendUrl
        const dashRes = await fetch(`${backendUrl}/dashboard`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        if (dashRes.ok) {
          const dash = await dashRes.json()
          setAvgPricePerKg(dash?.business?.avgPricePerKg || 0)
        }
        const batchesRes = await api.get<BatchesResponse>(`/api/grain-batches?status=dispatched&limit=100`)
        if (mounted && batchesRes.ok && batchesRes.data) {
          setDispatchedBatches(batchesRes.data.batches || [])
        } else if (mounted && !batchesRes.ok) {
          toast.error(batchesRes.error || "Failed to load dispatched batches")
        }
      } catch {
        toast.error("Failed to load grain sales payments")
      } finally {
        if (mounted) setDispatchLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

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
      const qty = b.dispatch_details?.quantity || b.quantity_kg || 0
      const rate = b.purchase_price_per_kg || avgPricePerKg || 0
      const amount = qty * rate
      return { amount }
    })
    const total = rows.reduce((s, r) => s + r.amount, 0)
    return { total }
  }, [dispatchedBatches, avgPricePerKg])

  if (loading && summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payments...
        </div>
      </div>
    )
  }

  const handleExport = (format: "pdf" | "csv" = "csv") => {
    const url = `${config.backendUrl}/dashboard/export-report?type=summary&format=${format}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Payment Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => handleExport("csv")}>Export</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Live from subscriptions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.active ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active subscriptions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.cancelled ?? 0}</div>
            <p className="text-xs text-muted-foreground">Ended subscriptions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Due / Failed</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.past_due ?? 0}</div>
            <p className="text-xs text-muted-foreground">Payment issues</p>
          </CardContent>
        </Card>
      </div>

      {user?.role === "admin" || user?.role === "super_admin" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Grain Sales Payments</h3>
            <div className="text-sm text-muted-foreground">
              Avg Rate: ${avgPricePerKg?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Dispatched Batches • Payments</CardTitle>
              <CardDescription>Total: ${salesTotals.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</CardDescription>
            </CardHeader>
            <CardContent>
              {dispatchLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading dispatched batches...
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Grain</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Qty (kg)</TableHead>
                        <TableHead>Rate ($/kg)</TableHead>
                        <TableHead>Amount ($)</TableHead>
                        <TableHead>Dispatch Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispatchedBatches.map((b) => {
                        const qty = b.dispatch_details?.quantity || b.quantity_kg || 0
                        const rate = b.purchase_price_per_kg || avgPricePerKg || 0
                        const amount = qty * rate
                        const buyerName = b.dispatch_details?.buyer_name || b.buyer_id?.name || "N/A"
                        return (
                          <TableRow key={b._id}>
                            <TableCell className="font-medium">{b.batch_id}</TableCell>
                            <TableCell>{b.grain_type}</TableCell>
                            <TableCell>{buyerName}</TableCell>
                            <TableCell>{qty.toLocaleString()}</TableCell>
                            <TableCell>${rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>${amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</TableCell>
                            <TableCell>{b.dispatch_details?.dispatch_date ? new Date(b.dispatch_details.dispatch_date).toLocaleDateString() : "N/A"}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  {dispatchedBatches.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">No dispatched batches found.</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Payment List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Subscriptions / Payments</h3>
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.plan_name}</CardTitle>
                    <CardDescription>
                      Billing: {item.billing_cycle || "N/A"} • ${item.price_per_month?.toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={
                      item.status === "active" ? "default" :
                      item.status === "cancelled" ? "secondary" : "outline"
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
                      Payment status: {item.payment_status || "n/a"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Start: {item.start_date ? new Date(item.start_date).toLocaleDateString() : "N/A"}
                      {" • "}
                      Next: {item.next_payment_date ? new Date(item.next_payment_date).toLocaleDateString() : "N/A"}
                    </div>
                    {item.stripe_subscription_id && (
                      <div className="text-xs text-muted-foreground">
                        Stripe ID: {item.stripe_subscription_id}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant="outline">
                      ${item.price_per_month?.toLocaleString() || 0}/mo
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No payments found.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
