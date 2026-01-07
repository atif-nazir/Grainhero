"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, Mail, Plus, UserCheck, Clock, AlertCircle, Edit, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/app/[locale]/providers"

interface TeamMember {
    _id: string
    name: string
    email: string
    role: string
    status: string
    created_at: string
    emailVerified: boolean
    warehouse_id?: {
        _id: string
        name: string
        warehouse_id: string
    }
}

export default function TeamManagementPage() {
    const { user } = useAuth()
    const currentUserRole = user?.role || ''
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
    const [inviteForm, setInviteForm] = useState({
        email: '',
        name: '',
        role: 'technician'
    })
    const [isInviting, setIsInviting] = useState(false)
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    // Check if current user can invite
    const canInvite = currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'manager'
    
    // Check if current user can edit a specific member
    const canEdit = (member: TeamMember) => {
        if (currentUserRole === 'super_admin') return true
        if (currentUserRole === 'admin') {
            // Admin can edit managers and technicians under them
            return member.role === 'manager' || member.role === 'technician'
        }
        if (currentUserRole === 'manager') {
            // Manager can only edit technicians in their warehouse
            return member.role === 'technician'
        }
        return false // Technician can't edit anyone
    }

    // Check if current user can delete a specific member
    const canDelete = (member: TeamMember) => {
        if (currentUserRole === 'super_admin') return true
        if (currentUserRole === 'admin') {
            // Admin can delete managers and technicians under them
            return member.role === 'manager' || member.role === 'technician'
        }
        if (currentUserRole === 'manager') {
            // Manager can only delete technicians in their warehouse
            return member.role === 'technician'
        }
        return false // Technician can't delete anyone
    }

    // Get available roles for invitation based on current user role
    const getAvailableRoles = () => {
        if (currentUserRole === 'super_admin') {
            return ['admin', 'manager', 'technician']
        }
        if (currentUserRole === 'admin') {
            return ['manager', 'technician']
        }
        if (currentUserRole === 'manager') {
            return ['technician'] // Manager can only invite technicians
        }
        return []
    }

    const fetchTeamMembers = async () => {
        try {
            const res = await api.get<TeamMember[]>('/auth/users')
            if (res.ok) {
                setTeamMembers(res.data || [])
            } else {
                toast.error('Failed to fetch team members')
            }
        } catch {
            toast.error('Failed to fetch team members')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTeamMembers()
    }, [])

    const handleInvite = async () => {
        if (!inviteForm.email || !inviteForm.role) {
            toast.error('Please fill in all required fields')
            return
        }

        // Manager can only invite technicians
        if (currentUserRole === 'manager' && inviteForm.role !== 'technician') {
            toast.error('Managers can only invite technicians')
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
                fetchTeamMembers() // Refresh the list
            } else {
                toast.error(res.error || 'Failed to send invitation')
            }
        } catch {
            toast.error('Failed to send invitation')
        } finally {
            setIsInviting(false)
        }
    }

    const handleDelete = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this team member?')) {
            return
        }

        setIsDeleting(memberId)
        try {
            const res = await api.delete(`/api/user-management/users/${memberId}`)
            if (res.ok) {
                toast.success('Team member removed successfully')
                fetchTeamMembers() // Refresh the list
            } else {
                toast.error(res.error || 'Failed to remove team member')
            }
        } catch {
            toast.error('Failed to remove team member')
        } finally {
            setIsDeleting(null)
        }
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'super_admin':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'admin':
                return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'manager':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'technician':
                return 'bg-green-100 text-green-800 border-green-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getStatusBadge = (status: string, emailVerified: boolean) => {
        if (status === 'pending') {
            return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }
        if (!emailVerified) {
            return 'bg-orange-100 text-orange-800 border-orange-200'
        }
        return 'bg-green-100 text-green-800 border-green-200'
    }

    const getStatusText = (status: string, emailVerified: boolean) => {
        if (status === 'pending') {
            return 'Pending Invitation'
        }
        if (!emailVerified) {
            return 'Email Not Verified'
        }
        return 'Active'
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-gray-600 mt-2">
                        {currentUserRole === 'super_admin' && 'Manage all users globally'}
                        {currentUserRole === 'admin' && 'Manage your team members (managers and technicians)'}
                        {currentUserRole === 'manager' && 'Manage technicians in your warehouse'}
                        {currentUserRole === 'technician' && 'View team members (read-only)'}
                    </p>
                </div>

                {canInvite && (
                    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-black hover:bg-gray-800 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Invite Team Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Invite Team Member</DialogTitle>
                                <DialogDescription>
                                    Send an invitation to join your GrainHero team
                                </DialogDescription>
                            </DialogHeader>

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
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="invite-role">Role *</Label>
                                    <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getAvailableRoles().map(role => (
                                                <SelectItem key={role} value={role}>
                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsInviteDialogOpen(false)}
                                        disabled={isInviting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleInvite}
                                        disabled={isInviting || !inviteForm.email || !inviteForm.role}
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
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <Users className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Members</p>
                                <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
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
                                <p className="text-2xl font-bold text-gray-900">
                                    {teamMembers.filter(member => member.emailVerified && member.role !== 'pending').length}
                                </p>
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
                                <p className="text-2xl font-bold text-gray-900">
                                    {teamMembers.filter(member => member.role === 'pending').length}
                                </p>
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
                                <p className="text-2xl font-bold text-gray-900">
                                    {teamMembers.filter(member => !member.emailVerified && member.role !== 'pending').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Team Members List */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        {currentUserRole === 'technician' 
                            ? 'View your team members (read-only)'
                            : 'Manage your team members and their roles'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Loading team members...</p>
                        </div>
                    ) : teamMembers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No team members found</p>
                            {canInvite && (
                                <p className="text-sm text-gray-500">Invite your first team member to get started</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {teamMembers.map((member) => (
                                <div key={member._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                            <Users className="h-5 w-5 text-gray-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{member.name}</h3>
                                            <p className="text-sm text-gray-600">{member.email}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Badge className={getRoleBadge(member.role)}>
                                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                </Badge>
                                                <Badge className={getStatusBadge(member.status, member.emailVerified)}>
                                                    {getStatusText(member.status, member.emailVerified)}
                                                </Badge>
                                                {member.warehouse_id && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {member.warehouse_id.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="text-sm text-gray-500 mr-4">
                                            Joined {new Date(member.created_at).toLocaleDateString()}
                                        </div>
                                        {canEdit(member) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    // TODO: Implement edit functionality
                                                    toast.info('Edit functionality coming soon')
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canDelete(member) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDelete(member._id)}
                                                disabled={isDeleting === member._id}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                {isDeleting === member._id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
