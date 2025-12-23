"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Users, Mail, Plus, UserCheck, Clock, AlertCircle, Search, MoreHorizontal, Edit, Trash2, Shield, ShieldOff } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface TeamMember {
    _id: string
    name: string
    email: string
    phone?: string
    role: string
    status: string
    blocked?: boolean
    created_at: string
    emailVerified: boolean
}

interface PlanLimit {
    canInvite: boolean
    currentCount: number
    limit: number | string
    message?: string
}

export default function TeamManagementPage() {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
    const [planLimit, setPlanLimit] = useState<PlanLimit | null>(null)
    const [inviteForm, setInviteForm] = useState({
        email: '',
        name: '',
        role: 'technician'
    })
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        role: ''
    })
    const [isInviting, setIsInviting] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchTeamMembers = async () => {
        try {
            setIsLoading(true)
            const res = await api.get<{ users: TeamMember[] }>('/api/user-management/users?limit=100')
            if (res.ok && res.data) {
                setTeamMembers(res.data.users || [])
            } else {
                toast.error('Failed to fetch team members')
            }
        } catch (err) {
            console.error('Error fetching team members:', err)
            toast.error('Failed to fetch team members')
        } finally {
            setIsLoading(false)
        }
    }

    const checkPlanLimits = async () => {
        try {
            const res = await api.post<{
                canPerform: boolean
                currentCount: number
                limit: number | string
            }>('/api/plan-management/check-limits', {
                action: 'create_user',
                resourceType: 'user'
            })
            if (res.ok && res.data) {
                setPlanLimit({
                    canInvite: res.data.canPerform,
                    currentCount: res.data.currentCount,
                    limit: res.data.limit,
                    message: res.data.canPerform
                        ? undefined
                        : `You've reached your user limit (${res.data.limit}). Please upgrade your plan to invite more team members.`
                })
            }
        } catch (err) {
            console.error('Error checking plan limits:', err)
            // Don't block invitation if limit check fails
            setPlanLimit({ canInvite: true, currentCount: 0, limit: 'unlimited' })
        }
    }

    useEffect(() => {
        fetchTeamMembers()
        checkPlanLimits()
    }, [])

    const handleInvite = async () => {
        if (!inviteForm.email || !inviteForm.role) {
            toast.error('Please fill in all required fields')
            return
        }

        if (planLimit && !planLimit.canInvite) {
            toast.error(planLimit.message || 'Cannot invite more users. Plan limit reached.')
            return
        }

        setIsInviting(true)
        try {
            const res = await api.post('/auth/invite-team-member', {
                email: inviteForm.email.trim().toLowerCase(),
                name: inviteForm.name.trim() || undefined,
                role: inviteForm.role
            })

            if (res.ok) {
                toast.success('Invitation sent successfully!')
                setInviteForm({ email: '', name: '', role: 'technician' })
                setIsInviteDialogOpen(false)
                fetchTeamMembers()
                checkPlanLimits()
            } else {
                toast.error(res.error || 'Failed to send invitation')
            }
        } catch (err) {
            toast.error((err as Error).message || 'Failed to send invitation')
        } finally {
            setIsInviting(false)
        }
    }

    const handleEdit = (member: TeamMember) => {
        setSelectedMember(member)
        setEditForm({
            name: member.name,
            phone: member.phone || '',
            role: member.role
        })
        setIsEditDialogOpen(true)
    }

    const handleUpdate = async () => {
        if (!selectedMember) return

        setIsUpdating(true)
        try {
            const res = await api.put(`/api/user-management/users/${selectedMember._id}`, {
                name: editForm.name,
                phone: editForm.phone || undefined,
                role: editForm.role
            })

            if (res.ok) {
                toast.success('Team member updated successfully!')
                setIsEditDialogOpen(false)
                setSelectedMember(null)
                fetchTeamMembers()
            } else {
                toast.error(res.error || 'Failed to update team member')
            }
        } catch (err) {
            toast.error((err as Error).message || 'Failed to update team member')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedMember) return

        setIsDeleting(true)
        try {
            const res = await api.delete(`/api/user-management/users/${selectedMember._id}`)

            if (res.ok) {
                toast.success('Team member deleted successfully!')
                setIsDeleteDialogOpen(false)
                setSelectedMember(null)
                fetchTeamMembers()
                checkPlanLimits()
            } else {
                toast.error(res.error || 'Failed to delete team member')
            }
        } catch (err) {
            toast.error((err as Error).message || 'Failed to delete team member')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleBlock = async (member: TeamMember, block: boolean) => {
        try {
            const res = await api.patch(`/api/user-management/users/${member._id}/block`, {
                blocked: block
            })

            if (res.ok) {
                toast.success(`Team member ${block ? 'blocked' : 'unblocked'} successfully!`)
                fetchTeamMembers()
            } else {
                toast.error(res.error || `Failed to ${block ? 'block' : 'unblock'} team member`)
            }
        } catch (err) {
            toast.error((err as Error).message || `Failed to ${block ? 'block' : 'unblock'} team member`)
        }
    }

    const filteredMembers = useMemo(() => {
        let filtered = teamMembers

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(m =>
                m.name.toLowerCase().includes(query) ||
                m.email.toLowerCase().includes(query) ||
                (m.phone && m.phone.includes(query))
            )
        }

        if (roleFilter !== 'all') {
            filtered = filtered.filter(m => m.role === roleFilter)
        }

        if (statusFilter !== 'all') {
            if (statusFilter === 'active') {
                filtered = filtered.filter(m => m.emailVerified && m.role !== 'pending' && !m.blocked)
            } else if (statusFilter === 'pending') {
                filtered = filtered.filter(m => m.role === 'pending')
            } else if (statusFilter === 'blocked') {
                filtered = filtered.filter(m => m.blocked)
            } else if (statusFilter === 'unverified') {
                filtered = filtered.filter(m => !m.emailVerified && m.role !== 'pending')
            }
        }

        return filtered
    }, [teamMembers, searchQuery, roleFilter, statusFilter])

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'manager':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'technician':
                return 'bg-green-100 text-green-800 border-green-200'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getStatusBadge = (member: TeamMember) => {
        if (member.blocked) {
            return { text: 'Blocked', class: 'bg-red-100 text-red-800 border-red-200' }
        }
        if (member.role === 'pending') {
            return { text: 'Pending Invitation', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
        }
        if (!member.emailVerified) {
            return { text: 'Email Not Verified', class: 'bg-orange-100 text-orange-800 border-orange-200' }
        }
        return { text: 'Active', class: 'bg-green-100 text-green-800 border-green-200' }
    }

    const stats = useMemo(() => {
        const total = teamMembers.length
        const active = teamMembers.filter(m => m.emailVerified && m.role !== 'pending' && !m.blocked).length
        const pending = teamMembers.filter(m => m.role === 'pending').length
        const unverified = teamMembers.filter(m => !m.emailVerified && m.role !== 'pending').length
        return { total, active, pending, unverified }
    }, [teamMembers])

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-gray-600 mt-2">Manage your team members and send invitations</p>
                </div>

                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-black hover:bg-gray-800 text-white"
                            disabled={planLimit ? !planLimit.canInvite : false}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Invite Team Member
                            {planLimit && !planLimit.canInvite && (
                                <span className="ml-2 text-xs">(Limit Reached)</span>
                            )}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                            <DialogDescription>
                                Send an invitation to join your GrainHero team
                                {planLimit && (
                                    <span className="block mt-2 text-sm">
                                        {planLimit.currentCount} / {planLimit.limit === 'unlimited' ? '∞' : planLimit.limit} users
                                    </span>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {planLimit && !planLimit.canInvite && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                                {planLimit.message}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Email Address *</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="colleague@example.com"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                    disabled={planLimit ? !planLimit.canInvite : false}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="invite-name">Name (Optional)</Label>
                                <Input
                                    id="invite-name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={inviteForm.name}
                                    onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                                    disabled={planLimit ? !planLimit.canInvite : false}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="invite-role">Role *</Label>
                                <Select
                                    value={inviteForm.role}
                                    onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                                    disabled={planLimit ? !planLimit.canInvite : false}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="technician">Technician</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsInviteDialogOpen(false)}
                                    disabled={isInviting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleInvite}
                                    disabled={isInviting || !inviteForm.email || !inviteForm.role || (planLimit ? !planLimit.canInvite : false)}
                                    className="bg-black hover:bg-gray-800 text-white"
                                >
                                    {isInviting ? (
                                        <>
                                            <Mail className="h-4 w-4 mr-2 animate-pulse" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="h-4 w-4 mr-2" />
                                            Send Invitation
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <Users className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Members</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <UserCheck className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Active Members</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <Clock className="h-8 w-8 text-yellow-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending Invitations</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <AlertCircle className="h-8 w-8 text-orange-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Unverified</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.unverified}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Search & Filter</CardTitle>
                    <CardDescription>Find team members by name, email, or filter by role and status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="technician">Technician</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="blocked">Blocked</SelectItem>
                                <SelectItem value="unverified">Unverified</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Team Members Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        Manage your team members and their roles
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Loading team members...</p>
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">
                                {teamMembers.length === 0
                                    ? "No team members found. Invite your first team member to get started."
                                    : "No team members match your search or filters."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.map((member) => {
                                        const statusBadge = getStatusBadge(member)
                                        return (
                                            <TableRow key={member._id}>
                                                <TableCell className="font-medium">{member.name}</TableCell>
                                                <TableCell>{member.email}</TableCell>
                                                <TableCell>{member.phone || '—'}</TableCell>
                                                <TableCell>
                                                    <Badge className={getRoleBadge(member.role)}>
                                                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusBadge.class}>
                                                        {statusBadge.text}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(member)}>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            {member.blocked ? (
                                                                <DropdownMenuItem onClick={() => handleBlock(member, false)}>
                                                                    <Shield className="h-4 w-4 mr-2" />
                                                                    Unblock
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => handleBlock(member, true)}>
                                                                    <ShieldOff className="h-4 w-4 mr-2" />
                                                                    Block
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedMember(member)
                                                                    setIsDeleteDialogOpen(true)
                                                                }}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Team Member</DialogTitle>
                        <DialogDescription>Update team member information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={editForm.phone}
                                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="technician">Technician</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={isUpdating}>
                            {isUpdating ? 'Updating...' : 'Update'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Team Member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedMember?.name}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
