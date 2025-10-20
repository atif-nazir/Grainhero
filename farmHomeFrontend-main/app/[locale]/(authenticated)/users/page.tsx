"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/[locale]/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  ShieldOff,
  Eye,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface User {
  _id: string
  name: string
  email: string
  phone: string
  role: "super_admin" | "admin" | "manager" | "technician"
  blocked: boolean
  location?: string
  admin_id?: {
    _id: string
    name: string
    email: string
  }
  subscription_plan?: string
  created_at: string
  lastLogin?: string
}

interface CreateUserData {
  name: string
  email: string
  phone: string
  password: string
  role: "admin" | "manager" | "technician"
  location?: string
}

interface UserListResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "technician",
    location: ""
  })
  const [editUserData, setEditUserData] = useState<Partial<CreateUserData>>({})
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  // Fetch users
  const fetchUsers = async (page = 1, limit = 10) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      if (roleFilter !== "all") {
        params.append("role", roleFilter)
      }
      
      const response = await api.get<UserListResponse>(`/api/user-management/users?${params}`)
      
      if (response.ok && response.data) {
        setUsers(response.data.users)
        setPagination(response.data.pagination)
        setError(null)
      } else {
        setError(response.error || "Failed to fetch users")
      }
    } catch (err) {
      setError("Failed to fetch users")
      console.error("Error fetching users:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  // Create user
  const handleCreateUser = async () => {
    try {
      if (!createUserData.name || !createUserData.email || !createUserData.phone || !createUserData.password) {
        toast.error("Please fill in all required fields")
        return
      }

      const response = await api.post("/api/user-management/users", createUserData)
      
      if (response.ok) {
        toast.success("User created successfully")
        setIsCreateDialogOpen(false)
        setCreateUserData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "technician",
          location: ""
        })
        fetchUsers(pagination.page)
      } else {
        toast.error(response.error || "Failed to create user")
      }
    } catch (err) {
      toast.error("Failed to create user")
      console.error("Error creating user:", err)
    }
  }

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return
    
    try {
      const response = await api.put(`/api/user-management/users/${selectedUser._id}`, editUserData)
      
      if (response.ok) {
        toast.success("User updated successfully")
        setIsEditDialogOpen(false)
        setSelectedUser(null)
        setEditUserData({})
        fetchUsers(pagination.page)
      } else {
        toast.error(response.error || "Failed to update user")
      }
    } catch (err) {
      toast.error("Failed to update user")
      console.error("Error updating user:", err)
    }
  }

  // Block/Unblock user
  const handleToggleBlock = async (user: User) => {
    try {
      const response = await api.patch(`/api/user-management/users/${user._id}/block`, {
        blocked: !user.blocked
      })
      
      if (response.ok) {
        toast.success(`User ${user.blocked ? 'unblocked' : 'blocked'} successfully`)
        fetchUsers(pagination.page)
      } else {
        toast.error(response.error || `Failed to ${user.blocked ? 'unblock' : 'block'} user`)
      }
    } catch (err) {
      toast.error(`Failed to ${user.blocked ? 'unblock' : 'block'} user`)
      console.error("Error toggling user block:", err)
    }
  }

  // Delete user
  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await api.delete(`/api/user-management/users/${user._id}`)
      
      if (response.ok) {
        toast.success("User deleted successfully")
        fetchUsers(pagination.page)
      } else {
        toast.error(response.error || "Failed to delete user")
      }
    } catch (err) {
      toast.error("Failed to delete user")
      console.error("Error deleting user:", err)
    }
  }

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditUserData({
      name: user.name,
      phone: user.phone,
      role: user.role as "admin" | "manager" | "technician",
      location: user.location || ""
    })
    setIsEditDialogOpen(true)
  }

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800"
      case "admin":
        return "bg-blue-100 text-blue-800"
      case "manager":
        return "bg-green-100 text-green-800"
      case "technician":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Check if current user can manage target user
  const canManageUser = (targetRole: string) => {
    if (!currentUser) return false
    
    const roleHierarchy = {
      super_admin: 4,
      admin: 3,
      manager: 2,
      technician: 1
    }
    
    const currentLevel = roleHierarchy[currentUser.role as keyof typeof roleHierarchy] || 0
    const targetLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy] || 0
    
    return currentLevel > targetLevel
  }

  // Get available roles for current user
  const getAvailableRoles = () => {
    if (!currentUser) return []
    
    const allRoles = [
      { value: "admin", label: "Admin" },
      { value: "manager", label: "Manager" },
      { value: "technician", label: "Technician" }
    ]
    
    if (currentUser.role === "super_admin") {
      return allRoles
    } else if (currentUser.role === "admin") {
      return allRoles.filter(role => role.value !== "admin")
    }
    
    return []
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm)
    return matchesSearch
  })

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage your team members and their roles
          </p>
        </div>
        {getAvailableRoles().length > 0 && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to your team. All fields are required.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={createUserData.name}
                    onChange={(e) => setCreateUserData({ ...createUserData, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter full name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={createUserData.email}
                    onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={createUserData.phone}
                    onChange={(e) => setCreateUserData({ ...createUserData, phone: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={createUserData.password}
                    onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter password"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select value={createUserData.role} onValueChange={(value) => setCreateUserData({ ...createUserData, role: value as any })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRoles().map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={createUserData.location}
                    onChange={(e) => setCreateUserData({ ...createUserData, location: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter location (optional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser}>Create User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Users ({pagination.total})
          </CardTitle>
          <CardDescription>
            Manage your team members and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin/Plan</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {user.blocked ? (
                          <>
                            <ShieldOff className="h-4 w-4 text-red-500 mr-1" />
                            <span className="text-red-600">Blocked</span>
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-green-600">Active</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.admin_id ? (
                        <Badge variant="outline">{user.admin_id.name}</Badge>
                      ) : user.subscription_plan ? (
                        <Badge variant="secondary">{user.subscription_plan}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {canManageUser(user.role) && (
                            <DropdownMenuItem 
                              onClick={() => handleToggleBlock(user)}
                              className={user.blocked ? "text-green-600" : "text-red-600"}
                            >
                              {user.blocked ? (
                                <>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Unblock
                                </>
                              ) : (
                                <>
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                  Block
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          {canManageUser(user.role) && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
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
              Update user information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editUserData.name || ""}
                onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="edit-phone"
                value={editUserData.phone || ""}
                onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Role
              </Label>
              <Select value={editUserData.role || ""} onValueChange={(value) => setEditUserData({ ...editUserData, role: value as any })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-location" className="text-right">
                Location
              </Label>
              <Input
                id="edit-location"
                value={editUserData.location || ""}
                onChange={(e) => setEditUserData({ ...editUserData, location: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}