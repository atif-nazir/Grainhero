"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, Users, Shield, Settings } from "lucide-react"

// Mock data
const users = [
  {
    id: "USR001",
    name: "Ahmad Khan",
    email: "ahmad@farmhome.com",
    role: "admin",
    status: "active",
    lastLogin: "2 hours ago",
    avatar: "/placeholder-user.jpg",
    tenant: "Khan Farm"
  },
  {
    id: "USR002",
    name: "Fatima Ali", 
    email: "fatima@farmhome.com",
    role: "manager",
    status: "active",
    lastLogin: "1 day ago",
    avatar: "/placeholder-user.jpg",
    tenant: "Khan Farm"
  },
  {
    id: "USR003",
    name: "Hassan Sheikh",
    email: "hassan@farmhome.com", 
    role: "technician",
    status: "active",
    lastLogin: "3 hours ago",
    avatar: "/placeholder-user.jpg",
    tenant: "Khan Farm"
  },
  {
    id: "USR004",
    name: "Aisha Malik",
    email: "aisha@farmhome.com",
    role: "technician", 
    status: "inactive",
    lastLogin: "1 week ago",
    avatar: "/placeholder-user.jpg",
    tenant: "Khan Farm"
  }
]

const roleStats = {
  admin: users.filter(u => u.role === "admin").length,
  manager: users.filter(u => u.role === "manager").length,
  technician: users.filter(u => u.role === "technician").length
}

export default function UsersPage() {
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "destructive"
      case "manager": return "default" 
      case "technician": return "secondary"
      default: return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    return status === "active" ? "default" : "secondary"
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Roles & Permissions
          </Button>
            <Button>
            <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.admin}</div>
            <p className="text-xs text-muted-foreground">System administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.manager}</div>
            <p className="text-xs text-muted-foreground">Operations managers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Technicians</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.technician}</div>
            <p className="text-xs text-muted-foreground">Field technicians</p>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">All Users</h3>
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                      <div>
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleColor(user.role)}>
                      {user.role}
                    </Badge>
                    <Badge variant={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </div>
          </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Tenant:</span> {user.tenant}
                  </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Last Login:</span> {user.lastLogin}
                </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">User ID:</span> {user.id}
                </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm">
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
                    </div>
                  </div>
    </div>
  )
}