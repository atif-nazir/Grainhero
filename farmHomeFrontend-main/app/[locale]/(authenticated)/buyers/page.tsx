"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Truck, Search, Filter, Phone, Mail, MapPin, Plus, Package } from 'lucide-react'
import { useEffect, useState } from "react"

export default function BuyersPage() {
  // Loading state (simulate API)
  const [isLoading, setIsLoading] = useState(true)

  // Mock data — replace with API later
  const buyers = [
    { id: 1, name: "Golden Mills", contact: "Ali Raza", phone: "+92 300 1234567", email: "procure@goldenmills.com", location: "Lahore", rating: 5, totalOrders: 48, lastOrder: "3d ago", status: "active" },
    { id: 2, name: "Premium Foods", contact: "Sara Khan", phone: "+92 301 7654321", email: "sara@premiumfoods.pk", location: "Karachi", rating: 4, totalOrders: 31, lastOrder: "1d ago", status: "active" },
    { id: 3, name: "Agro Distributors", contact: "Umer Farooq", phone: "+92 302 1112233", email: "orders@agro-dist.com", location: "Multan", rating: 4, totalOrders: 19, lastOrder: "2w ago", status: "paused" },
    { id: 4, name: "Sunrise Bakers", contact: "Hina Malik", phone: "+92 333 9988776", email: "buy@sunrise.com", location: "Faisalabad", rating: 5, totalOrders: 54, lastOrder: "6h ago", status: "active" },
  ]

  const contracts = [
    { id: "CTR-1042", buyer: "Golden Mills", grain: "Wheat", qty: "1,200 tons", price: "$320/ton", status: "running" },
    { id: "CTR-1038", buyer: "Premium Foods", grain: "Rice", qty: "800 tons", price: "$410/ton", status: "negotiating" },
    { id: "CTR-1019", buyer: "Agro Distributors", grain: "Maize", qty: "600 tons", price: "$270/ton", status: "completed" },
  ]

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const dispatches = [
    { id: "DSP-2207", buyer: "Sunrise Bakers", batch: "Wheat QR-001", qty: "120 tons", eta: "Today 3:00 PM", status: "scheduled" },
    { id: "DSP-2199", buyer: "Premium Foods", batch: "Rice QR-145", qty: "90 tons", eta: "Tomorrow 9:30 AM", status: "confirmed" },
  ]

  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

  // Color chips aligned with Silos/Grain Batches styling
  const buyerStatusClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const contractStatusClass = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-100 text-blue-800"
      case "negotiating":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const dispatchStatusClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "scheduled":
        return "bg-yellow-100 text-yellow-800"
      case "delivered":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading buyers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyers Management</h1>
          <p className="text-muted-foreground">Central registry of grain buyers, contracts and dispatches</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Buyer
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buyers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buyers.length}</div>
            <p className="text-xs text-muted-foreground">+2 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.filter(c => c.status !== "completed").length}</div>
            <p className="text-xs text-muted-foreground">Running and negotiating</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Dispatches</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatches.length}</div>
            <p className="text-xs text-muted-foreground">Within next 48 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.0</div>
            <p className="text-xs text-muted-foreground">Best partner performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Buyers</CardTitle>
          <CardDescription>Search and filter partners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by buyer or contact" className="pl-8" />
            </div>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lahore">Lahore</SelectItem>
                <SelectItem value="karachi">Karachi</SelectItem>
                <SelectItem value="multan">Multan</SelectItem>
                <SelectItem value="faisalabad">Faisalabad</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Buyers table */}
      <Card>
        <CardHeader>
          <CardTitle>Buyers Directory</CardTitle>
          <CardDescription>Contacts, locations and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buyers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium">{b.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />{b.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{b.contact} • {b.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{b.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>{b.totalOrders}</TableCell>
                    <TableCell className="text-muted-foreground">{b.lastOrder}</TableCell>
                    <TableCell>
                      <Badge className={buyerStatusClass(b.status)}>{capitalize(b.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline">View</Button>
                        <Button size="sm" variant="outline">Edit</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Contracts and Dispatches */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Contracts</CardTitle>
            <CardDescription>Key buyer agreements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{c.id} • {c.buyer}</div>
                    <div className="text-sm text-muted-foreground">{c.grain} • {c.qty} • {c.price}</div>
                  </div>
                  <Badge className={contractStatusClass(c.status)}>{capitalize(c.status)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Dispatches</CardTitle>
            <CardDescription>Scheduled deliveries to buyers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dispatches.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{d.id} • {d.buyer}</div>
                    <div className="text-sm text-muted-foreground">{d.batch} • {d.qty} • {d.eta}</div>
                  </div>
                  <Badge className={dispatchStatusClass(d.status)}>{capitalize(d.status)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {buyers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No buyers found</p>
          </CardContent>
        </Card>
      )}
      </>
    </div>
  )
}
