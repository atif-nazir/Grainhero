"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  FileText,
  PieChart
} from 'lucide-react'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedReport, setSelectedReport] = useState('overview')

  useEffect(() => {
    // Mock loading
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const handleDownloadReport = (reportType: string) => {
    // Mock download functionality
    alert(`Downloading ${reportType} report...`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate comprehensive reports for your grain operations
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      <Tabs value={selectedReport} onValueChange={setSelectedReport} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="grain">Grain Operations</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,000</div>
                <p className="text-xs text-muted-foreground">
                  +8% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  +2 this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15%</div>
                <p className="text-xs text-muted-foreground">
                  Average risk level
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>
                Key metrics and trends for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Performance charts will be implemented with Chart.js</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grain" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Grain Batch Report</CardTitle>
                <CardDescription>
                  Detailed analysis of grain batches and quality metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Report Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Batch quality analysis</li>
                    <li>• Risk assessment trends</li>
                    <li>• Storage utilization</li>
                    <li>• Spoilage rates</li>
                    <li>• Traceability data</li>
                  </ul>
                </div>
                <Button className="w-full gap-2" onClick={() => handleDownloadReport('Grain Batch')}>
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Silo Performance Report</CardTitle>
                <CardDescription>
                  Environmental conditions and storage efficiency analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Report Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Environmental monitoring</li>
                    <li>• Storage capacity utilization</li>
                    <li>• Maintenance schedules</li>
                    <li>• Energy consumption</li>
                    <li>• Equipment performance</li>
                  </ul>
                </div>
                <Button className="w-full gap-2" onClick={() => handleDownloadReport('Silo Performance')}>
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Report</CardTitle>
                <CardDescription>
                  Financial performance and revenue analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Report Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Revenue by grain type</li>
                    <li>• Profit margins</li>
                    <li>• Cost analysis</li>
                    <li>• Market trends</li>
                    <li>• Buyer performance</li>
                  </ul>
                </div>
                <Button className="w-full gap-2" onClick={() => handleDownloadReport('Revenue')}>
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insurance Report</CardTitle>
                <CardDescription>
                  Insurance claims and risk assessment analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Report Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Claims history</li>
                    <li>• Risk assessment trends</li>
                    <li>• Premium analysis</li>
                    <li>• Coverage utilization</li>
                    <li>• Loss prevention metrics</li>
                  </ul>
                </div>
                <Button className="w-full gap-2" onClick={() => handleDownloadReport('Insurance')}>
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Report</CardTitle>
                <CardDescription>
                  Regulatory compliance and audit trail analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Report Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Regulatory compliance status</li>
                    <li>• Audit trail analysis</li>
                    <li>• Quality certifications</li>
                    <li>• Safety compliance</li>
                    <li>• Documentation status</li>
                  </ul>
                </div>
                <Button className="w-full gap-2" onClick={() => handleDownloadReport('Compliance')}>
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traceability Report</CardTitle>
                <CardDescription>
                  Complete traceability chain and quality assurance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Report Includes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Complete supply chain trace</li>
                    <li>• Quality checkpoints</li>
                    <li>• Handling procedures</li>
                    <li>• Transportation logs</li>
                    <li>• Final destination tracking</li>
                  </ul>
                </div>
                <Button className="w-full gap-2" onClick={() => handleDownloadReport('Traceability')}>
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}