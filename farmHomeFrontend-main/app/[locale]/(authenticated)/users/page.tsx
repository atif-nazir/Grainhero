"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  Search, 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/app/[locale]/providers'

interface User {
  _id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'manager' | 'technician'
  location?: string | { display_name: string; type?: string; coordinates?: number[] }
  blocked: boolean
  created_at: string
  lastLogin?: string
}

interface UserStats {
  total_users: number
  active_users: number
  blocked_users: number
  role_distribution: {
    admin: number
    manager: number
    technician: number
  }
  recent_users: Array<{
    id: string
    name: string
    email: string
    role: string
    created_at: string
  }>
}

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'technician' as 'manager' | 'technician',
    location: ''
  })

  useEffect(() => {
    console.log('Current user:', user)
    console.log('Token:', typeof window !== 'undefined' ? localStorage.getItem('token') : 'N/A')
    loadUsers()
    loadStats()
  }, [])

  const loadUsers = async () => {
    try {
      console.log('Loading users...')
      const res = await api.get<{ users: User[] }>('/api/user-management/users?limit=50')
      console.log('Users API response:', res)
      if (res.ok && res.data) {
        console.log('Users data:', res.data.users)
        setUsers(res.data.users as unknown as User[])
      } else {
        console.error('API error:', res.error)
        // Add mock users for testing
        const mockUsers: User[] = [
          {
            _id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            role: 'admin',
            location: 'New York, NY',
            blocked: false,
            created_at: new Date().toISOString()
          },
          {
            _id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+1234567891',
            role: 'manager',
            location: 'Los Angeles, CA',
            blocked: false,
            created_at: new Date().toISOString()
          }
        ]
        setUsers(mockUsers)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      // Add mock users for testing
      const mockUsers: User[] = [
        {
          _id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          role: 'admin',
          location: 'New York, NY',
          blocked: false,
          created_at: new Date().toISOString()
        },
        {
          _id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1234567891',
          role: 'manager',
          location: 'Los Angeles, CA',
          blocked: false,
          created_at: new Date().toISOString()
        }
      ]
      setUsers(mockUsers)
    }
  }

  const loadStats = async () => {
    try {
      const res = await api.get<UserStats>('/api/user-management/statistics')
      if (res.ok && res.data) {
        setStats(res.data)
      } else {
        // Add mock stats for testing
        const mockStats: UserStats = {
          total_users: 2,
          active_users: 2,
          blocked_users: 0,
          role_distribution: {
            admin: 1,
            manager: 1,
            technician: 0
          },
          recent_users: [
            {
              id: '1',
              name: 'John Doe',
              email: 'john@example.com',
              role: 'admin',
              created_at: new Date().toISOString()
            },
            {
              id: '2',
              name: 'Jane Smith',
              email: 'jane@example.com',
              role: 'manager',
              created_at: new Date().toISOString()
            }
          ]
        }
        setStats(mockStats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
      // Add mock stats for testing
      const mockStats: UserStats = {
        total_users: 2,
        active_users: 2,
        blocked_users: 0,
        role_distribution: {
          admin: 1,
          manager: 1,
          technician: 0
        },
        recent_users: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'admin',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'manager',
            created_at: new Date().toISOString()
          }
        ]
      }
      setStats(mockStats)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      const res = await api.post('/api/user-management/users', formData)
      if (res.ok) {
        setIsCreateDialogOpen(false)
        setFormData({ name: '', email: '', phone: '', password: '', role: 'technician', location: '' })
        loadUsers()
        loadStats()
      }
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    
    try {
      const updateData = { ...formData }
      delete (updateData as any).password // Don't send password for updates
      
      const res = await api.put(`/api/user-management/users/${selectedUser._id}`, updateData)
      if (res.ok) {
        setIsEditDialogOpen(false)
        setSelectedUser(null)
        setFormData({ name: '', email: '', phone: '', password: '', role: 'technician', location: '' })
        loadUsers()
        loadStats()
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      const res = await api.delete(`/api/user-management/users/${userId}`)
      if (res.ok) {
        loadUsers()
        loadStats()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const handleToggleBlock = async (user: User) => {
    try {
      const res = await api.put(`/api/user-management/users/${user._id}`, {
        blocked: !user.blocked
      })
      if (res.ok) {
        loadUsers()
        loadStats()
      }
    } catch (error) {
      console.error('Failed to toggle user block status:', error)
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: '',
      role: user.role === 'admin' ? 'manager' : user.role as 'manager' | 'technician',
      location: typeof user.location === 'string' ? user.location : user.location?.display_name || ''
    })
    setIsEditDialogOpen(true)
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      technician: 'bg-green-100 text-green-800'
    }
    return roleColors[role] || 'bg-gray-100 text-gray-800'
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !user.blocked) ||
                         (statusFilter === 'blocked' && user.blocked)
    return matchesSearch && matchesRole && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    )
  }

  // Debug info
  console.log('Users state:', users)
  console.log('Stats state:', stats)
  console.log('Loading state:', loading)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage team members and their access permissions
          </p>
          {/* Debug info */}
          <div className="mt-2 text-sm text-gray-500">
            Debug: Users loaded: {users.length}, Loading: {loading.toString()}, User authenticated: {user ? 'Yes' : 'No'}
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account for your team member.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select value={formData.role} onValueChange={(value: 'manager' | 'technician') => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="col-span-3"
                />
              </div>
        </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">
                Team members
              </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{stats.active_users}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{stats.role_distribution.manager}</div>
              <p className="text-xs text-muted-foreground">
                Management roles
              </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Technicians</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{stats.role_distribution.technician}</div>
              <p className="text-xs text-muted-foreground">
                Field technicians
              </p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Users</CardTitle>
          <CardDescription>Search and filter team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
              <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Complete list of team members with their roles and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{user.phone}</span>
                  </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadge(user.role)}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {typeof user.location === 'string' 
                            ? user.location 
                            : user.location.display_name || 'Location set'
                          }
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.blocked ? "destructive" : "default"}>
                      {user.blocked ? (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Blocked
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleBlock(user)}
                      >
                        {user.blocked ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </Button>
                      {user.role !== 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                    </Button>
                      )}
                  </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No users found matching your filters</p>
                </div>
          )}
              </CardContent>
            </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">Role</Label>
              <Select value={formData.role} onValueChange={(value: 'manager' | 'technician') => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-location" className="text-right">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="col-span-3"
              />
                    </div>
                  </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}