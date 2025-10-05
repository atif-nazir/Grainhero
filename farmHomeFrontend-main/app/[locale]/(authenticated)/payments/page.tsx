"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, DollarSign, Calendar, CheckCircle } from "lucide-react"

// Mock data
const payments = [
  {
    id: "PAY001",
    amount: 15000,
    currency: "PKR",
    buyer: "ABC Traders",
    batchId: "GH001",
    status: "Completed",
    date: "2024-01-15",
    method: "Bank Transfer"
  },
  {
    id: "PAY002",
    amount: 22500,
    currency: "PKR", 
    buyer: "XYZ Mills",
    batchId: "GH002",
    status: "Pending",
    date: "2024-01-14",
    method: "Digital Wallet"
  },
  {
    id: "PAY003",
    amount: 18750,
    currency: "PKR",
    buyer: "Fresh Foods Ltd",
    batchId: "GH003",
    status: "Processing",
    date: "2024-01-13",
    method: "Credit Card"
  }
]

const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
const completedPayments = payments.filter(p => p.status === "Completed").length

export default function PaymentsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Payment Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">Export</Button>
          <Button>New Payment</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPayments}</div>
            <p className="text-xs text-muted-foreground">Successful transactions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.filter(p => p.status === "Pending").length}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.filter(p => p.status === "Processing").length}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Recent Payments</h3>
        <div className="grid gap-4">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{payment.id}</CardTitle>
                    <CardDescription>{payment.buyer} • Batch {payment.batchId}</CardDescription>
                  </div>
                  <Badge 
                    variant={
                      payment.status === "Completed" ? "default" :
                      payment.status === "Pending" ? "secondary" : "outline"
                    }
                  >
                    {payment.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">
                      {payment.currency} {payment.amount.toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{payment.method}</span>
                      <span>•</span>
                      <span>{payment.date}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View</Button>
                    {payment.status === "Pending" && (
                      <Button size="sm">Process</Button>
                    )}
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
