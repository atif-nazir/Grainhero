"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  Activity, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Users,
  Thermometer,
  Droplets
} from "lucide-react"

// Comprehensive analytics data
const analyticsData = {
  performance: {
    storageEfficiency: 87,
    qualityMaintenance: 94,
    dispatchTime: 2.3, // days
    customerSatisfaction: 4.7,
    profitMargin: 23.5,
    wasteReduction: 12.8
  },
  trends: {
    intake: [
      { period: "Q1 2024", wheat: 45000, rice: 32000, corn: 18000, total: 95000 },
      { period: "Q2 2024", wheat: 52000, rice: 38000, corn: 22000, total: 112000 },
      { period: "Q3 2024", wheat: 48000, rice: 35000, corn: 20000, total: 103000 },
      { period: "Q4 2024", wheat: 55000, rice: 41000, corn: 25000, total: 121000 }
    ],
    revenue: [
      { month: "Jan", revenue: 2850000, profit: 665500, margin: 23.3 },
      { month: "Feb", revenue: 3200000, profit: 768000, margin: 24.0 },
      { month: "Mar", revenue: 2950000, profit: 708500, margin: 24.0 },
      { month: "Apr", revenue: 3450000, profit: 862500, margin: 25.0 }
    ]
  },
  predictions: [
    { metric: "Next Month Intake", predicted: 28500, confidence: 89, trend: "up" },
    { metric: "Storage Utilization", predicted: 91, confidence: 94, trend: "up" },
    { metric: "Quality Score", predicted: 4.9, confidence: 87, trend: "up" },
    { metric: "Profit Margin", predicted: 26.2, confidence: 82, trend: "up" }
  ],
  riskAnalysis: [
    { factor: "Temperature Control", risk: 15, status: "Low", impact: "Minimal spoilage risk" },
    { factor: "Humidity Management", risk: 35, status: "Medium", impact: "Monitor closely" },
    { factor: "Pest Control", risk: 8, status: "Low", impact: "Well controlled" },
    { factor: "Market Volatility", risk: 60, status: "High", impact: "Price fluctuation risk" }
  ],
  benchmarks: [
    { metric: "Storage Efficiency", current: 87, industry: 82, target: 90, unit: "%" },
    { metric: "Quality Retention", current: 94, industry: 89, target: 96, unit: "%" },
    { metric: "Dispatch Speed", current: 2.3, industry: 3.1, target: 2.0, unit: "days" },
    { metric: "Profit Margin", current: 23.5, industry: 19.8, target: 25.0, unit: "%" }
  ],
  environmental: {
    temperature: { avg: 23.2, min: 18.5, max: 28.1, optimal: "18-25°C" },
    humidity: { avg: 47.8, min: 35.2, max: 62.4, optimal: "35-50%" },
    co2: { avg: 415, min: 380, max: 480, optimal: "<450ppm" },
    airQuality: { score: 92, status: "Excellent" }
  }
}

export default function AnalyticsPage() {
  const getPerformanceColor = (value: number, benchmark: number) => {
    if (value >= benchmark * 1.1) return "text-green-600"
    if (value >= benchmark * 0.9) return "text-blue-600"
    return "text-orange-600"
  }

  const getRiskColor = (risk: number) => {
    if (risk <= 25) return "text-green-600"
    if (risk <= 50) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive insights and predictive analytics for grain management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select defaultValue="30">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Performance KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Storage Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData.performance.storageEfficiency}%
            </div>
            <Progress value={analyticsData.performance.storageEfficiency} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.performance.qualityMaintenance}%
            </div>
            <Progress value={analyticsData.performance.qualityMaintenance} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Dispatch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData.performance.dispatchTime} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: 2.0 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Customer Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.performance.customerSatisfaction}/5
            </div>
            <p className="text-xs text-muted-foreground mt-1">Excellent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.performance.profitMargin}%
            </div>
            <p className="text-xs text-green-600 mt-1">+2.1% vs target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Waste Reduction</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.performance.wasteReduction}%
              </div>
            <p className="text-xs text-muted-foreground mt-1">vs last quarter</p>
            </CardContent>
          </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="environmental">Environment</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Intake Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Quarterly Intake Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.trends.intake.map((quarter) => (
                    <div key={quarter.period} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{quarter.period}</span>
                        <span className="text-sm text-muted-foreground">
                          {quarter.total.toLocaleString()} kg total
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Wheat: {quarter.wheat.toLocaleString()} kg</span>
                          <span>{((quarter.wheat / quarter.total) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(quarter.wheat / quarter.total) * 100} className="h-2" />
                        
                        <div className="flex justify-between text-sm">
                          <span>Rice: {quarter.rice.toLocaleString()} kg</span>
                          <span>{((quarter.rice / quarter.total) * 100).toFixed(1)}%</span>
          </div>
                        <Progress value={(quarter.rice / quarter.total) * 100} className="h-2" />
                        
                        <div className="flex justify-between text-sm">
                          <span>Corn: {quarter.corn.toLocaleString()} kg</span>
                          <span>{((quarter.corn / quarter.total) * 100).toFixed(1)}%</span>
                    </div>
                        <Progress value={(quarter.corn / quarter.total) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Revenue & Profitability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.trends.revenue.map((month) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{month.month} 2024</span>
                        <Badge variant="outline">{month.margin}% margin</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Revenue</span>
                          <span className="font-medium">PKR {(month.revenue / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Profit</span>
                          <span className="font-medium text-green-600">PKR {(month.profit / 1000000).toFixed(1)}M</span>
                        </div>
                        <Progress value={month.margin} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {analyticsData.predictions.map((prediction) => (
              <Card key={prediction.metric}>
            <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    {prediction.trend === "up" ? 
                      <TrendingUp className="mr-2 h-5 w-5 text-green-500" /> : 
                      <TrendingDown className="mr-2 h-5 w-5 text-red-500" />
                    }
                    {prediction.metric}
                  </CardTitle>
            </CardHeader>
            <CardContent>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold">
                      {typeof prediction.predicted === 'number' && prediction.predicted > 100 ? 
                        prediction.predicted.toLocaleString() : 
                        prediction.predicted
                      }
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Confidence Level</span>
                      <span className="font-medium">{prediction.confidence}%</span>
                    </div>
                    <Progress value={prediction.confidence} className="h-2" />
                    <div className="flex items-center text-sm">
                      <Target className="mr-1 h-4 w-4 text-muted-foreground" />
                      AI-powered prediction based on historical data
                    </div>
                  </div>
            </CardContent>
          </Card>
            ))}
          </div>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <div className="grid gap-4">
            {analyticsData.benchmarks.map((benchmark) => (
              <Card key={benchmark.metric}>
              <CardHeader>
                  <CardTitle className="text-lg">{benchmark.metric}</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Current</div>
                      <div className={`text-2xl font-bold ${getPerformanceColor(benchmark.current, benchmark.industry)}`}>
                        {benchmark.current}{benchmark.unit}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Industry Avg</div>
                      <div className="text-2xl font-bold text-gray-600">
                        {benchmark.industry}{benchmark.unit}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Target</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {benchmark.target}{benchmark.unit}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress to Target</span>
                      <span>{Math.round((benchmark.current / benchmark.target) * 100)}%</span>
                    </div>
                    <Progress value={(benchmark.current / benchmark.target) * 100} className="h-2" />
                  </div>
              </CardContent>
            </Card>
            ))}
          </div>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {analyticsData.riskAnalysis.map((risk) => (
              <Card key={risk.factor}>
              <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    {risk.status === "Low" && <CheckCircle className="mr-2 h-5 w-5 text-green-500" />}
                    {risk.status === "Medium" && <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" />}
                    {risk.status === "High" && <AlertCircle className="mr-2 h-5 w-5 text-red-500" />}
                    {risk.factor}
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Risk Level</span>
                      <Badge variant={
                        risk.status === "Low" ? "default" :
                        risk.status === "Medium" ? "secondary" : "destructive"
                      }>
                        {risk.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Risk Score</span>
                        <span className={`font-medium ${getRiskColor(risk.risk)}`}>
                          {risk.risk}/100
                        </span>
                      </div>
                      <Progress value={risk.risk} className="h-2" />
                    </div>
                    <p className="text-sm text-muted-foreground">{risk.impact}</p>
                  </div>
              </CardContent>
            </Card>
            ))}
          </div>
        </TabsContent>

        {/* Environmental Tab */}
        <TabsContent value="environmental" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Environmental Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Thermometer className="mr-2 h-5 w-5" />
                  Environmental Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Temperature</span>
                      <span className="text-sm text-muted-foreground">
                        {analyticsData.environmental.temperature.optimal}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg: {analyticsData.environmental.temperature.avg}°C</span>
                      <span>Range: {analyticsData.environmental.temperature.min}°C - {analyticsData.environmental.temperature.max}°C</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Humidity</span>
                      <span className="text-sm text-muted-foreground">
                        {analyticsData.environmental.humidity.optimal}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg: {analyticsData.environmental.humidity.avg}%</span>
                      <span>Range: {analyticsData.environmental.humidity.min}% - {analyticsData.environmental.humidity.max}%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">CO2 Levels</span>
                      <span className="text-sm text-muted-foreground">
                        {analyticsData.environmental.co2.optimal}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg: {analyticsData.environmental.co2.avg} ppm</span>
                      <span>Range: {analyticsData.environmental.co2.min} - {analyticsData.environmental.co2.max} ppm</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Air Quality */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Droplets className="mr-2 h-5 w-5" />
                  Air Quality Index
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">
                      {analyticsData.environmental.airQuality.score}
                    </div>
                    <Badge variant="default" className="mt-2">
                      {analyticsData.environmental.airQuality.status}
                    </Badge>
                  </div>
                  <Progress value={analyticsData.environmental.airQuality.score} className="h-3" />
                  <div className="text-sm text-muted-foreground text-center">
                    Air quality is optimal for grain storage
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Environmental Trends Chart */}
            <Card>
              <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Environmental Trends (7 Days)
              </CardTitle>
              </CardHeader>
              <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2" />
                  <p>Real-time environmental monitoring chart</p>
                  <p className="text-sm">Temperature, humidity, and air quality trends</p>
                </div>
                </div>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}