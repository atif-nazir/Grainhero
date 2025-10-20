"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, Mail, Plus, UserCheck, Clock, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface TeamMember {
    _id: string
    name: string
    email: string
    role: string
    status: string
    created_at: string
    emailVerified: boolean
}

export default function TeamManagementPage() {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
    const [inviteForm, setInviteForm] = useState({
        email: '',
        name: '',
        role: 'technician'
    })
    const [isInviting, setIsInviting] = useState(false)

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

    const getRoleBadge = (role: string) => {
        switch (role) {
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
                    <p className="text-gray-600 mt-2">Manage your team members and send invitations</p>
                </div>

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
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="technician">Technician</SelectItem>
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
                        Manage your team members and their roles
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
                            <p className="text-sm text-gray-500">Invite your first team member to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {teamMembers.map((member) => (
                                <div key={member._id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                            <Users className="h-5 w-5 text-gray-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{member.name}</h3>
                                            <p className="text-sm text-gray-600">{member.email}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Badge className={getRoleBadge(member.role)}>
                                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                </Badge>
                                                <Badge className={getStatusBadge(member.status, member.emailVerified)}>
                                                    {getStatusText(member.status, member.emailVerified)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Joined {new Date(member.created_at).toLocaleDateString()}
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
