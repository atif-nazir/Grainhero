"use client"

import { useAuth } from "@/app/[locale]/providers"
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard"
import { TenantDashboard } from "@/components/dashboards/TenantDashboard"
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard"
import { TechnicianDashboard } from "@/components/dashboards/TechnicianDashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()
  const userRole = user?.role || "technician"

  // Render role-specific dashboard
  const renderDashboard = () => {
    switch (userRole) {
      case "super_admin":
        return <SuperAdminDashboard />
      case "admin":
        return <TenantDashboard />
      case "manager":
        return <ManagerDashboard />
      case "technician":
        return <TechnicianDashboard />
      default:
        return (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unknown user role. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || "User"}!
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your {userRole.replace('_', ' ')} dashboard today.
          </p>
        </div>
      </div>

      {renderDashboard()}
    </div>
  )
}
