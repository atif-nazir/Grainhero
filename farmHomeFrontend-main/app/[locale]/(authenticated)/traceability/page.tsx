"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QrCode, MapPin, Clock, Package } from "lucide-react"

// Mock data
const traceabilityData = [
  {
    id: "GH001",
    qrCode: "QR123456789",
    grainType: "Wheat",
    origin: "Farm A, Punjab",
    currentLocation: "Silo 3",
    status: "Stored",
    lastUpdate: "2 hours ago",
    journey: ["Farm A", "Processing Center", "Quality Check", "Silo 3"]
  },
  {
    id: "GH002", 
    qrCode: "QR987654321",
    grainType: "Rice",
    origin: "Farm B, Sindh",
    currentLocation: "In Transit",
    status: "Moving",
    lastUpdate: "30 minutes ago",
    journey: ["Farm B", "Collection Point", "In Transit"]
  }
]

export default function TraceabilityPage() {
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
        {traceabilityData.map((item) => (
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
                <span className="text-sm">{item.qrCode}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.currentLocation}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.lastUpdate}</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Journey:</h4>
                <div className="flex flex-wrap gap-1">
                  {item.journey.map((step, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {step}
                    </Badge>
                  ))}
                </div>
              </div>

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
