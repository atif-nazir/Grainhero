"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Cloud, Thermometer, Wind } from 'lucide-react'

export default function EnvironmentalDataPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Cloud className="h-8 w-8 text-blue-600" />
            Environmental Data
          </h1>
          <p className="text-muted-foreground">
            Weather, air quality, and environmental monitoring integration
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="text-center py-12">
          <Wind className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Environmental Data Feed</h2>
          <p className="text-gray-500 mb-4">
            PMD weather data, AQI monitoring, and FAOSTAT integration coming soon
          </p>
          <Badge variant="secondary">Under Development</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
