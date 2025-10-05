"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Building, Truck } from 'lucide-react'

export default function BuyersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-green-600" />
            Buyers Management
          </h1>
          <p className="text-muted-foreground">
            Manage grain buyers, contracts, and dispatch operations
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="text-center py-12">
          <Truck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Buyer Management System</h2>
          <p className="text-gray-500 mb-4">
            Comprehensive buyer database, contract management, and dispatch tracking
          </p>
          <Badge variant="secondary">Under Development</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
