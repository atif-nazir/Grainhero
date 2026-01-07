"use client"

import { useState } from "react"

interface Tenant extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  users: number;
  revenue: number;
  location: string;
  joinDate: string;
  lastActivity: string;
  subscriptionEnd: string;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  DollarSign, 
  Activity,
  Crown,
  Calendar,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { DataTable } from "@/components/dashboard/DataTable"
import { StatCard } from "@/components/dashboard/StatCard"
import { AlertCard } from "@/components/dashboard/AlertCard"

interface Alert {
  id: string | number
  type: "critical" | "warning" | "info" | "success"
  message: string
  time: string
  location?: string
  details?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }
}

export default function TenantManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  // Mock data - in real app, this would come from API
  const tenantStats = {
    totalTenants: 45,
    activeTenants: 42,
    trialTenants: 3,
    totalRevenue: 125000,
    averageRevenue: 2778,
    growthRate: 12.5
  }

  const tenants = [
    {
      id: "T001",
      name: "Green Valley Farms",
      email: "contact@greenvalley.com",
      phone: "+1-555-0123",
      plan: "Pro",
      status: "active",
      users: 12,
      revenue: 2500,
      location: "California, USA",
      joinDate: "2024-01-15",
      lastActivity: "2 hours ago",
      subscriptionEnd: "2024-12-15"
    },
    {
      id: "T002", 
      name: "Golden Harvest Co.",
      email: "info@goldenharvest.com",
      phone: "+1-555-0456",
      plan: "Enterprise",
      status: "active",
      users: 25,
      revenue: 5000,
      location: "Texas, USA",
      joinDate: "2023-11-20",
      lastActivity: "30 min ago",
      subscriptionEnd: "2024-11-20"
    },
    {
      id: "T003",
      name: "Sunrise Agriculture",
      email: "hello@sunriseag.com", 
      phone: "+1-555-0789",
      plan: "Basic",
      status: "trial",
      users: 3,
      revenue: 0,
      location: "Florida, USA",
      joinDate: "2024-01-20",
      lastActivity: "1 day ago",
      subscriptionEnd: "2024-02-20"
    },
    {
      id: "T004",
      name: "Mountain View Storage",
      email: "admin@mountainview.com",
      phone: "+1-555-0321",
      plan: "Pro", 
      status: "active",
      users: 18,
      revenue: 3200,
      location: "Colorado, USA",
      joinDate: "2023-09-10",
      lastActivity: "5 hours ago",
      subscriptionEnd: "2024-09-10"
    },
    {
      id: "T005",
      name: "Prairie Grain Co.",
      email: "support@prairiegrain.com",
      phone: "+1-555-0654",
      plan: "Basic",
      status: "suspended",
      users: 8,
      revenue: 800,
      location: "Kansas, USA", 
      joinDate: "2023-12-05",
      lastActivity: "1 week ago",
      subscriptionEnd: "2024-12-05"
    }
  ]

  const criticalAlerts: Alert[] = [
    {
      id: 1,
      type: "critical",
      message: "Prairie Grain Co. payment overdue - 15 days",
      time: "2 hours ago",
      location: "Kansas, USA",
      details: "Payment of $800 overdue since Jan 10, 2024"
    },
    {
      id: 2,
      type: "warning", 
      message: "Sunrise Agriculture trial expires in 3 days",
      time: "1 day ago",
      location: "Florida, USA",
      details: "Trial period ends on Feb 20, 2024"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default"
      case "trial": return "secondary"
      case "suspended": return "destructive"
      case "cancelled": return "outline"
      default: return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "trial": return <Calendar className="h-4 w-4 text-blue-600" />
      case "suspended": return <XCircle className="h-4 w-4 text-red-600" />
      case "cancelled": return <XCircle className="h-4 w-4 text-gray-600" />
      default: return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === "all" || tenant.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const columns = [
    {
      key: "tenant",
      label: "Tenant",
      render: (value: unknown, row: Tenant) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-sm text-muted-foreground">{row.id}</div>
          </div>
        </div>
      )
    },
    {
      key: "contact",
      label: "Contact",
      render: (value: unknown, row: Tenant) => (
        <div>
          <div className="flex items-center space-x-1 text-sm">
            <Mail className="h-3 w-3" />
            <span>{row.email}</span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{row.phone}</span>
          </div>
        </div>
      )
    },
    {
      key: "plan",
      label: "Plan",
      render: (value: unknown, row: Tenant) => (
        <div className="flex items-center space-x-2">
          <Crown className="h-4 w-4 text-yellow-600" />
          <Badge variant={row.plan === "Enterprise" ? "default" : "secondary"}>
            {row.plan}
          </Badge>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (value: unknown, row: Tenant) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(row.status)}
          <Badge variant={getStatusColor(row.status)}>
            {row.status}
          </Badge>
        </div>
      )
    },
    {
      key: "metrics",
      label: "Metrics",
      render: (value: unknown, row: Tenant) => (
        <div className="text-sm">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{row.users} users</span>
          </div>
          <div className="flex items-center space-x-1 text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>${row.revenue}/mo</span>
          </div>
        </div>
      )
    },
    {
      key: "location",
      label: "Location",
      render: (value: unknown, row: Tenant) => (
        <div className="flex items-center space-x-1 text-sm">
          <MapPin className="h-3 w-3" />
          <span>{row.location}</span>
        </div>
      )
    },
    {
      key: "lastActivity",
      label: "Last Activity",
      render: (value: unknown, row: Tenant) => (
        <div className="text-sm text-muted-foreground">
          {row.lastActivity}
        </div>
      )
    }
  ]

  type LucideIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

  const actions: {
    label: string;
    icon?: LucideIconComponent;
    onClick: (row: Tenant) => void;
    variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    show?: (row: Tenant) => boolean;
  }[] = [
    {
      label: "View",
      icon: Eye,
      onClick: (row: Tenant) => console.log("View tenant:", row.id),
      variant: "outline" as const
    },
    {
      label: "Edit",
      icon: Edit,
      onClick: (row: Tenant) => console.log("Edit tenant:", row.id),
      variant: "outline" as const
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (row: Tenant) => console.log("Delete tenant:", row.id),
      variant: "destructive" as const,
      show: (row: Tenant) => row.status !== "active"
    }
  ]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenant Management</h2>
          <p className="text-muted-foreground">
            Manage all tenant organizations and their subscriptions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Tenant
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={tenantStats.totalTenants}
          description={`${tenantStats.activeTenants} active`}
          icon={Building2}
          trend={{ value: tenantStats.growthRate, label: "from last month", positive: true }}
        />
        <StatCard
          title="Active Tenants"
          value={tenantStats.activeTenants}
          description={`${tenantStats.trialTenants} on trial`}
          icon={CheckCircle}
          progress={(tenantStats.activeTenants / tenantStats.totalTenants) * 100}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${tenantStats.totalRevenue.toLocaleString()}`}
          description={`Avg: $${tenantStats.averageRevenue}`}
          icon={DollarSign}
          trend={{ value: 8.2, label: "from last month", positive: true }}
        />
        <StatCard
          title="Growth Rate"
          value={`${tenantStats.growthRate}%`}
          description="New tenants this month"
          icon={TrendingUp}
          trend={{ value: 2.1, label: "vs last month", positive: true }}
        />
      </div>

      {/* Critical Alerts */}
      <AlertCard
        title="Critical Alerts"
        description="Issues requiring immediate attention"
        alerts={criticalAlerts}
        maxItems={2}
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            Manage and monitor all tenant organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          {/* Data Table */}
          <DataTable<Tenant>
            title=""
            data={filteredTenants}
            columns={columns}
            actions={actions}
            emptyMessage="No tenants found matching your criteria"
          />
        </CardContent>
      </Card>
    </div>
  )
}
