"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, TrendingDown, TrendingUp, Brain } from "lucide-react"

// Mock data
const spoilageAnalysis = [
  {
    id: "SA001",
    batchId: "GH001",
    grainType: "Wheat",
    riskLevel: "Low",
    riskScore: 15,
    factors: ["Temperature: Normal", "Humidity: Optimal", "CO2: Low"],
    prediction: "Safe for 45 days",
    confidence: 92,
    lastAnalysis: "2 hours ago"
  },
  {
    id: "SA002", 
    batchId: "GH002",
    grainType: "Rice",
    riskLevel: "Medium",
    riskScore: 55,
    factors: ["Temperature: Elevated", "Humidity: High", "VOC: Moderate"],
    prediction: "Monitor closely - 20 days",
    confidence: 78,
    lastAnalysis: "1 hour ago"
  },
  {
    id: "SA003",
    batchId: "GH003", 
    grainType: "Corn",
    riskLevel: "High",
    riskScore: 85,
    factors: ["Temperature: High", "Humidity: Critical", "Moisture: Excessive"],
    prediction: "Immediate action required",
    confidence: 95,
    lastAnalysis: "30 minutes ago"
  }
]

export default function SpoilageAnalysisPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Spoilage Analysis</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Brain className="mr-2 h-4 w-4" />
            Retrain Model
          </Button>
          <Button>Run Analysis</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {spoilageAnalysis.filter(s => s.riskLevel === "High").length}
            </div>
            <p className="text-xs text-muted-foreground">Batches need attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {spoilageAnalysis.filter(s => s.riskLevel === "Medium").length}
            </div>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {spoilageAnalysis.filter(s => s.riskLevel === "Low").length}
            </div>
            <p className="text-xs text-muted-foreground">Stable condition</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(spoilageAnalysis.reduce((sum, s) => sum + s.confidence, 0) / spoilageAnalysis.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Model accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Batch Analysis Results</h3>
        <div className="grid gap-4">
          {spoilageAnalysis.map((analysis) => (
            <Card key={analysis.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Batch {analysis.batchId}</CardTitle>
                    <CardDescription>{analysis.grainType} • Last analysis: {analysis.lastAnalysis}</CardDescription>
                  </div>
                  <Badge 
                    variant={
                      analysis.riskLevel === "High" ? "destructive" :
                      analysis.riskLevel === "Medium" ? "secondary" : "default"
                    }
                  >
                    {analysis.riskLevel} Risk
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Risk Score</span>
                    <span className="font-medium">{analysis.riskScore}/100</span>
                  </div>
                  <Progress 
                    value={analysis.riskScore} 
                    className={`h-2 ${
                      analysis.riskScore > 70 ? "bg-red-100" :
                      analysis.riskScore > 40 ? "bg-yellow-100" : "bg-green-100"
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Contributing Factors:</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.factors.map((factor, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{analysis.prediction}</div>
                    <div className="text-xs text-muted-foreground">
                      {analysis.confidence}% confidence
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    {analysis.riskLevel === "High" && (
                      <Button size="sm" variant="destructive">Take Action</Button>
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
