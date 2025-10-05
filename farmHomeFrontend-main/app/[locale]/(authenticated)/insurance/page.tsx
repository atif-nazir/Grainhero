"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, AlertTriangle } from 'lucide-react'

export default function InsurancePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-purple-600" />
            Insurance Management
          </h1>
          <p className="text-muted-foreground">
            Insurance policies, claims processing, and loss documentation
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Insurance & Claims System</h2>
          <p className="text-gray-500 mb-4">
            Policy management, automated claims processing, and loss documentation
          </p>
          <Badge variant="secondary">Under Development</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
