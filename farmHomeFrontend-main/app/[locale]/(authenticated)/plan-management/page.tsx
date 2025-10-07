"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Crown, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign, 
  Users, 
  HardDrive, 
  Smartphone,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  Settings,
  Zap,
  Shield,
  BarChart3
} from "lucide-react"
import { DataTable } from "@/components/dashboard/DataTable"
import { StatCard } from "@/components/dashboard/StatCard"
import { AlertCard } from "@/components/dashboard/AlertCard"

interface Plan {
  id: string
  name: string
  description: string
  price: number
  priceFrontend: string
  priceId: string
  stripeLink: string
  features: string[]
  limits: {
    users: number
    devices: number
    storage: number
    batches: number
  }
  features_enabled: {
    ai_features: boolean
    priority_support: boolean
    custom_integrations: boolean
    advanced_analytics: boolean
    api_access: boolean
    white_label: boolean
  }
  status: "active" | "inactive" | "draft"
  subscribers: number
  revenue: number
  created_at: string
  updated_at: string
}

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

export default function PlanManagementPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  // Mock data - in real app, this would come from API
  const planStats = {
    totalPlans: 3,
    activePlans: 3,
    totalSubscribers: 1247,
    monthlyRevenue: 125000,
    averageRevenue: 100.2,
    growthRate: 15.8
  }

  const mockPlans: Plan[] = [
    {
      id: "basic",
      name: "Basic",
      description: "Essential tools for small farms to get started.",
      price: 9,
      priceFrontend: "$9/mo",
      priceId: "price_1RoRPZRYMUmJuwVF7aJeMEmm",
      stripeLink: "https://buy.stripe.com/test_8x2bJ3cyO4AofwHcBZa3u00",
      features: [
        "Animal management",
        "Basic analytics", 
        "Role-based access",
        "Email support"
      ],
      limits: {
        users: 5,
        devices: 10,
        storage: 1,
        batches: 100
      },
      features_enabled: {
        ai_features: false,
        priority_support: false,
        custom_integrations: false,
        advanced_analytics: false,
        api_access: false,
        white_label: false
      },
      status: "active",
      subscribers: 856,
      revenue: 7704,
      created_at: "2024-01-01",
      updated_at: "2024-01-15"
    },
    {
      id: "intermediate", 
      name: "Intermediate",
      description: "Advanced features for growing farms and teams.",
      price: 29,
      priceFrontend: "$29/mo",
      priceId: "price_1RonmCRYMUmJuwVF0bBYtZJW",
      stripeLink: "https://buy.stripe.com/test_fZu7sN6aq7MA5W71Xla3u02",
      features: [
        "Everything in Basic",
        "Breeding & health tracking",
        "Advanced analytics",
        "Priority email support"
      ],
      limits: {
        users: 25,
        devices: 50,
        storage: 10,
        batches: 500
      },
      features_enabled: {
        ai_features: true,
        priority_support: true,
        custom_integrations: false,
        advanced_analytics: true,
        api_access: true,
        white_label: false
      },
      status: "active",
      subscribers: 312,
      revenue: 9048,
      created_at: "2024-01-01",
      updated_at: "2024-01-15"
    },
    {
      id: "pro",
      name: "Pro",
      description: "Custom solutions for large operations and enterprises.",
      price: 99,
      priceFrontend: "$99/mo",
      priceId: "price_1RonmYRYMUmJuwVFHKWWflRo",
      stripeLink: "https://buy.stripe.com/test_4gM3cx9mC6Iw1FR1Xla3u03",
      features: [
        "Everything in Intermediate",
        "Custom integrations",
        "Dedicated account manager",
        "24/7 support"
      ],
      limits: {
        users: 100,
        devices: 200,
        storage: 100,
        batches: -1 // unlimited
      },
      features_enabled: {
        ai_features: true,
        priority_support: true,
        custom_integrations: true,
        advanced_analytics: true,
        api_access: true,
        white_label: true
      },
      status: "active",
      subscribers: 79,
      revenue: 7821,
      created_at: "2024-01-01",
      updated_at: "2024-01-15"
    }
  ]

  const criticalAlerts: Alert[] = [
    {
      id: 1,
      type: "warning",
      message: "Basic plan approaching user limit",
      time: "2 hours ago",
      details: "856/1000 users on Basic plan"
    },
    {
      id: 2,
      type: "info",
      message: "New plan feature request from Enterprise customer",
      time: "1 day ago",
      details: "Request for custom API endpoints"
    }
  ]

  useEffect(() => {
    setPlans(mockPlans)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default"
      case "inactive": return "secondary"
      case "draft": return "outline"
      default: return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "inactive": return <XCircle className="h-4 w-4 text-red-600" />
      case "draft": return <Edit className="h-4 w-4 text-yellow-600" />
      default: return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === "all" || plan.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const columns = [
    {
      key: "plan",
      label: "Plan",
      render: (value: any, row: Plan) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Crown className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-sm text-muted-foreground">{row.id}</div>
          </div>
        </div>
      )
    },
    {
      key: "pricing",
      label: "Pricing",
      render: (value: any, row: Plan) => (
        <div>
          <div className="font-medium">{row.priceFrontend}</div>
          <div className="text-sm text-muted-foreground">${row.price}/month</div>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (value: any, row: Plan) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(row.status)}
          <Badge variant={getStatusColor(row.status)}>
            {row.status}
          </Badge>
        </div>
      )
    },
    {
      key: "subscribers",
      label: "Subscribers",
      render: (value: any, row: Plan) => (
        <div className="text-center">
          <div className="font-medium">{row.subscribers}</div>
          <div className="text-sm text-muted-foreground">users</div>
        </div>
      )
    },
    {
      key: "revenue",
      label: "Monthly Revenue",
      render: (value: any, row: Plan) => (
        <div className="text-center">
          <div className="font-medium">${row.revenue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">per month</div>
        </div>
      )
    },
    {
      key: "limits",
      label: "Limits",
      render: (value: any, row: Plan) => (
        <div className="text-sm">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{row.limits.users === -1 ? "∞" : row.limits.users}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Smartphone className="h-3 w-3" />
            <span>{row.limits.devices === -1 ? "∞" : row.limits.devices}</span>
          </div>
        </div>
      )
    },
    {
      key: "features",
      label: "Key Features",
      render: (value: any, row: Plan) => (
        <div className="flex flex-wrap gap-1">
          {row.features_enabled.ai_features && <Badge variant="secondary" className="text-xs">AI</Badge>}
          {row.features_enabled.priority_support && <Badge variant="secondary" className="text-xs">Support</Badge>}
          {row.features_enabled.custom_integrations && <Badge variant="secondary" className="text-xs">API</Badge>}
        </div>
      )
    }
  ]

  const actions = [
    {
      label: "View",
      icon: Eye,
      onClick: (row: Plan) => console.log("View plan:", row.id),
      variant: "outline" as const
    },
    {
      label: "Edit",
      icon: Edit,
      onClick: (row: Plan) => setEditingPlan(row),
      variant: "outline" as const
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (row: Plan) => console.log("Delete plan:", row.id),
      variant: "destructive" as const,
      show: (row: Plan) => row.subscribers === 0
    }
  ]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Plan Management</h2>
          <p className="text-muted-foreground">
            Manage subscription plans and pricing for all tenants
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Plans"
          value={planStats.totalPlans}
          description={`${planStats.activePlans} active`}
          icon={Crown}
          trend={{ value: planStats.growthRate, label: "from last month", positive: true }}
        />
        <StatCard
          title="Total Subscribers"
          value={planStats.totalSubscribers.toLocaleString()}
          description="Across all plans"
          icon={Users}
          trend={{ value: 8.2, label: "from last month", positive: true }}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${planStats.monthlyRevenue.toLocaleString()}`}
          description={`Avg: $${planStats.averageRevenue}/user`}
          icon={DollarSign}
          trend={{ value: 12.5, label: "from last month", positive: true }}
        />
        <StatCard
          title="Growth Rate"
          value={`${planStats.growthRate}%`}
          description="New subscribers this month"
          icon={TrendingUp}
          trend={{ value: 2.1, label: "vs last month", positive: true }}
        />
      </div>

      {/* Critical Alerts */}
      <AlertCard
        title="Plan Alerts"
        description="Issues requiring attention"
        alerts={criticalAlerts}
        maxItems={2}
      />

      {/* Plans Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <span>{plan.name}</span>
                </CardTitle>
                <Badge variant={getStatusColor(plan.status)}>
                  {plan.status}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pricing */}
                <div className="text-center">
                  <div className="text-3xl font-bold">{plan.priceFrontend}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{plan.subscribers}</div>
                    <div className="text-muted-foreground">Subscribers</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">${plan.revenue.toLocaleString()}</div>
                    <div className="text-muted-foreground">Revenue</div>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>Users</span>
                    </span>
                    <span>{plan.limits.users === -1 ? "Unlimited" : plan.limits.users}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1">
                      <Smartphone className="h-3 w-3" />
                      <span>Devices</span>
                    </span>
                    <span>{plan.limits.devices === -1 ? "Unlimited" : plan.limits.devices}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1">
                      <HardDrive className="h-3 w-3" />
                      <span>Storage</span>
                    </span>
                    <span>{plan.limits.storage === -1 ? "Unlimited" : `${plan.limits.storage}GB`}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-1">
                  {plan.features_enabled.ai_features && <Badge variant="secondary" className="text-xs">AI Features</Badge>}
                  {plan.features_enabled.priority_support && <Badge variant="secondary" className="text-xs">Priority Support</Badge>}
                  {plan.features_enabled.custom_integrations && <Badge variant="secondary" className="text-xs">Custom API</Badge>}
                  {plan.features_enabled.advanced_analytics && <Badge variant="secondary" className="text-xs">Analytics</Badge>}
                </div>
              </div>
            </CardContent>
            <div className="absolute top-4 right-4">
              <Button size="sm" variant="outline" onClick={() => setEditingPlan(plan)}>
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Plans</CardTitle>
          <CardDescription>
            Manage and monitor all subscription plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Input
                placeholder="Search plans by name, description, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          {/* Data Table */}
          <DataTable
            title=""
            data={filteredPlans}
            columns={columns}
            actions={actions}
            emptyMessage="No plans found matching your criteria"
          />
        </CardContent>
      </Card>

      {/* Create/Edit Plan Modal would go here */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Plan</CardTitle>
              <CardDescription>
                Create a new subscription plan for tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Plan Name</label>
                  <Input placeholder="e.g., Enterprise" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea placeholder="Plan description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Price ($)</label>
                    <Input type="number" placeholder="99" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Stripe Price ID</label>
                    <Input placeholder="price_xxx" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Limits</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Users</label>
                      <Input type="number" placeholder="100" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Devices</label>
                      <Input type="number" placeholder="200" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Storage (GB)</label>
                      <Input type="number" placeholder="100" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Batches</label>
                      <Input type="number" placeholder="-1 for unlimited" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Features</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <label className="text-sm">AI Features</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <label className="text-sm">Priority Support</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <label className="text-sm">Custom Integrations</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <label className="text-sm">Advanced Analytics</label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateForm(false)}>
                Create Plan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
