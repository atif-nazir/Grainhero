"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Building2,
    Users,
    MoreHorizontal,
    Plus,
    Search,
    CheckCircle,
    XCircle,
    ShieldAlert,
    Edit,
    Eye
} from "lucide-react"
import { api } from "@/lib/api"
import { DataTable } from "@/components/dashboard/DataTable"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Tenant {
    _id: string
    name: string
    email: string
    business_type: string
    subscription_id?: {
        plan_name: string
        status: string
    }
    created_by?: {
        name: string
        email: string
    }
    is_active: boolean
    created_at: string
    stats: {
        users: number
        silos: number
        batches: number
    }
}

export default function TenantManagementPage() {
    const [loading, setLoading] = useState(true)
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        loadTenants()
    }, [])

    const loadTenants = async () => {
        try {
            setLoading(true)
            const res = await api.get<Tenant[]>("/api/super-admin/tenants")
            if (res.ok && res.data) {
                setTenants(res.data)
            } else {
                toast.error("Failed to load tenants")
            }
        } catch (error) {
            toast.error("An error occurred loading tenants")
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (tenantId: string, isActive: boolean) => {
        try {
            const res = await api.patch(`/api/super-admin/tenants/${tenantId}`, { is_active: isActive })
            if (res.ok) {
                toast.success(`Tenant ${isActive ? 'activated' : 'deactivated'} successfully`)
                loadTenants()
            } else {
                toast.error("Failed to update tenant status")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const [impersonating, setImpersonating] = useState<string | null>(null)

    const handleImpersonate = async (tenantId: string) => {
        try {
            setImpersonating(tenantId)
            const res = await api.post<{ token: string, user: any }>(`/api/super-admin/tenants/${tenantId}/impersonate`, {})
            if (res.ok && res.data) {
                toast.success("Impersonation successful. Redirecting...")
                // Store token and redirect (Implementation depends on auth provider, assuming localStorage for this custom auth)
                localStorage.setItem('token', res.data.token)
                localStorage.setItem('user', JSON.stringify(res.data.user))
                // Force reload to apply new auth state
                window.location.href = '/dashboard'
            } else {
                toast.error("Failed to impersonate tenant admin")
            }
        } catch (error) {
            toast.error("An error occurred during login")
        } finally {
            setImpersonating(null)
        }
    }

    const filteredTenants = tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.created_by?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const columns = [
        {
            key: "name",
            label: "Organization",
            render: (value: unknown, row: Tenant) => (
                <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${row.is_active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                        }`}>
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-sm text-gray-500">{row.business_type}</div>
                    </div>
                </div>
            )
        },
        {
            key: "admin",
            label: "Admin",
            render: (value: unknown, row: Tenant) => (
                <div className="text-sm">
                    <div className="font-medium">{row.created_by?.name || "N/A"}</div>
                    <div className="text-muted-foreground">{row.created_by?.email || row.email}</div>
                </div>
            )
        },
        {
            key: "subscription",
            label: "Subscription",
            render: (value: unknown, row: Tenant) => (
                <div>
                    <Badge variant="outline" className="mb-1">
                        {row.subscription_id?.plan_name || "Free Trial"}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                        {row.subscription_id?.status || "active"}
                    </div>
                </div>
            )
        },
        {
            key: "stats",
            label: "Usage",
            render: (value: unknown, row: Tenant) => (
                <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span>{row.stats.users} Users</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        <span>{row.stats.silos} Silos</span>
                    </div>
                </div>
            )
        },
        {
            key: "status",
            label: "Status",
            render: (value: unknown, row: Tenant) => (
                <Badge variant={row.is_active ? "default" : "destructive"} className={row.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}>
                    {row.is_active ? (
                        <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Active
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Inactive
                        </div>
                    )}
                </Badge>
            )
        }
    ]

    // Custom wrapper for actions as DataTable actions prop might require specific types
    // Using a custom render column for actions instead
    const columnsWithActions = [
        ...columns,
        {
            key: "actions",
            label: "Actions",
            render: (value: unknown, row: Tenant) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleImpersonate(row._id)}>
                            <Users className="mr-2 h-4 w-4" /> Login as Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row._id)}>
                            Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Edit Limits
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className={row.is_active ? "text-red-600 focus:text-red-600" : "text-green-600 focus:text-green-600"}
                            onClick={() => handleStatusChange(row._id, !row.is_active)}
                        >
                            {row.is_active ? (
                                <><ShieldAlert className="mr-2 h-4 w-4" /> Deactivate Tenant</>
                            ) : (
                                <><CheckCircle className="mr-2 h-4 w-4" /> Activate Tenant</>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ]


    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Tenant Management
                    </h2>
                    <p className="text-muted-foreground">
                        Manage organizations and their access
                    </p>
                </div>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Add Tenant
                </Button>
            </div>

            <div className="flex items-center py-4 bg-white p-4 rounded-lg border shadow-sm space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                    placeholder="Filter tenants..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="max-w-sm border-0 focus-visible:ring-0 pl-1"
                />
            </div>

            <Card className="shadow-md border-0 ring-1 ring-gray-200">
                <CardContent className="p-0">
                    <DataTable
                        title=""
                        data={filteredTenants}
                        columns={columnsWithActions}
                        actions={[]} // Using custom action column
                        emptyMessage="No tenants found"
                    />
                </CardContent>
            </Card>
        </div>
    )
}
