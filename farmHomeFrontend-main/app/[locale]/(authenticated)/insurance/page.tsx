"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Plus, 
  Search, 
  Shield, 
  DollarSign, 
  AlertTriangle, 
  FileText, 
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Package
} from 'lucide-react'
import { api } from '@/lib/api'

interface InsurancePolicy {
  _id: string
  policy_number: string
  provider_name: string
  coverage_type: string
  coverage_amount: number
  premium_amount: number
  deductible: number
  status: string
  start_date: string
  end_date: string
  renewal_date: string
  covered_batches: Array<{
    batch_id: string
    grain_type: string
    quantity_kg: number
    coverage_value: number
  }>
  risk_factors: {
    fire_risk: number
    theft_risk: number
    spoilage_risk: number
    weather_risk: number
  }
  claims_count: number
  total_claims_amount: number
}

interface InsuranceClaim {
  _id: string
  claim_number: string
  policy_id: string
  claim_type: string
  description: string
  amount_claimed: number
  amount_approved: number
  status: string
  incident_date: string
  filed_date: string
  approved_date?: string
  batch_affected: {
    batch_id: string
    grain_type: string
    quantity_affected: number
  }
}

export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [policiesRes, claimsRes] = await Promise.all([
          api.get<{ policies: InsurancePolicy[] }>('/insurance/policies?limit=50'),
          api.get<{ claims: InsuranceClaim[] }>('/insurance/claims?limit=50')
        ])
        
        if (!mounted) return
        
        if (policiesRes.ok && policiesRes.data) {
          setPolicies(policiesRes.data.policies as unknown as InsurancePolicy[])
        }
        
        if (claimsRes.ok && claimsRes.data) {
          setClaims(claimsRes.data.claims as unknown as InsuranceClaim[])
        }
      } catch (error) {
        console.error('Failed to load insurance data:', error)
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getClaimStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: FileText }
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const calculateTotalCoverage = () => {
    return policies.reduce((sum, policy) => sum + policy.coverage_amount, 0)
  }

  const calculateTotalPremium = () => {
    return policies.reduce((sum, policy) => sum + policy.premium_amount, 0)
  }

  const calculateRiskScore = (policy: InsurancePolicy) => {
    const factors = policy.risk_factors
    return Math.round((factors.fire_risk + factors.theft_risk + factors.spoilage_risk + factors.weather_risk) / 4)
  }

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.provider_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || policy.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading insurance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insurance Management</h1>
          <p className="text-muted-foreground">
            Manage grain insurance policies, claims, and risk assessment
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Policy
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policies.filter(p => p.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              Total coverage: ${calculateTotalCoverage().toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Premium</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${calculateTotalPremium().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Monthly: ${Math.round(calculateTotalPremium() / 12).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{claims.length}</div>
            <p className="text-xs text-muted-foreground">
              Amount: ${claims.reduce((sum, claim) => sum + claim.amount_approved, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(policies.reduce((sum, policy) => sum + calculateRiskScore(policy), 0) / policies.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Risk assessment
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Policy Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => (
              <Card key={policy._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{policy.policy_number}</CardTitle>
                    <Badge className={getStatusBadge(policy.status)}>
                      {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                    </Badge>
                  </div>
                  <CardDescription>{policy.provider_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Coverage</p>
                      <p className="font-medium">${policy.coverage_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Premium</p>
                      <p className="font-medium">${policy.premium_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deductible</p>
                      <p className="font-medium">${policy.deductible.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Risk Score</p>
                      <p className="font-medium">{calculateRiskScore(policy)}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Coverage Progress</span>
                      <span>{policy.covered_batches.length} batches</span>
                    </div>
                    <Progress value={(policy.covered_batches.length / 5) * 100} className="h-2" />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      File Claim
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Policies</CardTitle>
              <CardDescription>Search and filter insurance policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by policy number or provider..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Policies Table */}
          <Card>
            <CardHeader>
              <CardTitle>Insurance Policies</CardTitle>
              <CardDescription>
                Complete list of grain insurance policies with coverage details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Number</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Coverage Type</TableHead>
                    <TableHead>Coverage Amount</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((policy) => (
                    <TableRow key={policy._id}>
                      <TableCell className="font-medium">{policy.policy_number}</TableCell>
                      <TableCell>{policy.provider_name}</TableCell>
                      <TableCell>{policy.coverage_type}</TableCell>
                      <TableCell>${policy.coverage_amount.toLocaleString()}</TableCell>
                      <TableCell>${policy.premium_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(policy.status)}>
                          {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{calculateRiskScore(policy)}%</span>
                          <Progress value={calculateRiskScore(policy)} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{new Date(policy.end_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredPolicies.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No policies found matching your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          {/* Claims Table */}
          <Card>
            <CardHeader>
              <CardTitle>Insurance Claims</CardTitle>
              <CardDescription>
                History of insurance claims and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount Claimed</TableHead>
                    <TableHead>Amount Approved</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Incident Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => {
                    const statusConfig = getClaimStatusBadge(claim.status)
                    const StatusIcon = statusConfig.icon
                    
                    return (
                      <TableRow key={claim._id}>
                        <TableCell className="font-medium">{claim.claim_number}</TableCell>
                        <TableCell>{claim.claim_type}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{claim.description}</TableCell>
                        <TableCell>${claim.amount_claimed.toLocaleString()}</TableCell>
                        <TableCell>${claim.amount_approved.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(claim.incident_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {claims.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No claims found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          {/* Risk Assessment */}
          <div className="grid gap-4 md:grid-cols-2">
            {policies.map((policy) => (
              <Card key={policy._id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Assessment - {policy.policy_number}
                  </CardTitle>
                  <CardDescription>{policy.provider_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fire Risk</span>
                      <div className="flex items-center gap-2">
                        <Progress value={policy.risk_factors.fire_risk} className="w-20 h-2" />
                        <span className="text-sm font-medium">{policy.risk_factors.fire_risk}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Theft Risk</span>
                      <div className="flex items-center gap-2">
                        <Progress value={policy.risk_factors.theft_risk} className="w-20 h-2" />
                        <span className="text-sm font-medium">{policy.risk_factors.theft_risk}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Spoilage Risk</span>
                      <div className="flex items-center gap-2">
                        <Progress value={policy.risk_factors.spoilage_risk} className="w-20 h-2" />
                        <span className="text-sm font-medium">{policy.risk_factors.spoilage_risk}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Weather Risk</span>
                      <div className="flex items-center gap-2">
                        <Progress value={policy.risk_factors.weather_risk} className="w-20 h-2" />
                        <span className="text-sm font-medium">{policy.risk_factors.weather_risk}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Risk Score</span>
                      <span className="text-lg font-bold">{calculateRiskScore(policy)}%</span>
                    </div>
                  </div>
        </CardContent>
      </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}