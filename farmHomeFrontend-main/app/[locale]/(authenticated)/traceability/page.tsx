"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QrCode, MapPin, Clock, Package } from "lucide-react"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"

interface TraceItem {
  id: string
  qrCode?: string
  grainType: string
  currentLocation?: string
  status: string
  lastUpdate?: string
  journey?: string[]
}

export default function TraceabilityPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<TraceItem[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await api.get<{ batches: any[] }>(`/grain-batches?limit=12`)
      if (!mounted) return
      if (res.ok && res.data) {
        const mapped: TraceItem[] = (res.data.batches || []).map((b: any) => ({
          id: b.batch_id || b._id,
          qrCode: b.qr_code,
          grainType: b.grain_type,
          currentLocation: b.silo_id?.name,
          status: (b.status || '').charAt(0).toUpperCase() + (b.status || '').slice(1),
        }))
        setItems(mapped)
      }
      setIsLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading traceability data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Grain Traceability</h2>
        <div className="flex items-center space-x-2">
          <Button>
            <QrCode className="mr-2 h-4 w-4" />
            Scan QR Code
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{item.id}</CardTitle>
                <Badge variant={item.status === "Stored" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </div>
              <CardDescription>{item.grainType}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.qrCode || '—'}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.currentLocation || '—'}</span>
              </div>
              
              {/* Optional last update/journey omitted due to missing data in API */}

              <Button variant="outline" className="w-full">
                View Full History
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
