"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, TrendingUp, AlertTriangle, Brain, Target, Zap } from 'lucide-react'

interface AIPrediction {
  batch_id: string
  grain_type: string
  risk_score: number
  confidence: number
  spoilage_prediction: string
  days_until_spoilage: number
  contributing_factors: string[]
  recommendations: string[]
  silo_name: string
  last_updated: string
}

export default function AIPredictionsPage() {
  const t = useTranslations('AIPredictions')
  const [predictions, setPredictions] = useState<AIPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Mock data for now - replace with actual API call
  useEffect(() => {
    setTimeout(() => {
      const mockPredictions: AIPrediction[] = [
        {
          batch_id: 'GH-2024-001',
          grain_type: 'Wheat',
          risk_score: 25,
          confidence: 0.87,
          spoilage_prediction: 'Low Risk',
          days_until_spoilage: 45,
          contributing_factors: ['Optimal temperature', 'Low humidity', 'Good ventilation'],
          recommendations: ['Continue current storage conditions', 'Monitor humidity levels'],
          silo_name: 'Silo A',
          last_updated: '2024-01-25T10:30:00Z'
        },
        {
          batch_id: 'GH-2024-002',
          grain_type: 'Rice',
          risk_score: 68,
          confidence: 0.92,
          spoilage_prediction: 'High Risk',
          days_until_spoilage: 12,
          contributing_factors: ['High humidity', 'Temperature fluctuations', 'Poor ventilation'],
          recommendations: ['Increase ventilation', 'Reduce humidity', 'Consider early dispatch'],
          silo_name: 'Silo B',
          last_updated: '2024-01-25T10:28:00Z'
        },
        {
          batch_id: 'GH-2024-003',
          grain_type: 'Maize',
          risk_score: 42,
          confidence: 0.78,
          spoilage_prediction: 'Medium Risk',
          days_until_spoilage: 28,
          contributing_factors: ['Moderate moisture content', 'Stable temperature'],
          recommendations: ['Monitor CO2 levels', 'Check for pest activity'],
          silo_name: 'Silo A',
          last_updated: '2024-01-25T10:25:00Z'
        }
      ]
      setPredictions(mockPredictions)
      setLoading(false)
    }, 1000)
  }, [])

  const getRiskColor = (riskScore: number) => {
    if (riskScore < 30) return 'text-green-600'
    if (riskScore < 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskBadge = (prediction: string) => {
    const riskColors = {
      'Low Risk': 'bg-green-100 text-green-800',
      'Medium Risk': 'bg-yellow-100 text-yellow-800',
      'High Risk': 'bg-red-100 text-red-800'
    }
    return riskColors[prediction as keyof typeof riskColors] || 'bg-gray-100 text-gray-800'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600'
    if (confidence > 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading AI predictions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            AI Predictions
          </h1>
          <p className="text-muted-foreground">
            Machine learning powered grain quality and spoilage predictions
          </p>
        </div>
        <Button className="gap-2">
          <Zap className="h-4 w-4" />
          Retrain Model
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Predictions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{predictions.length}</div>
            <p className="text-xs text-muted-foreground">
              Batches analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Batches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictions.filter(p => p.risk_score >= 60).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Model accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(predictions.reduce((sum, p) => sum + p.risk_score, 0) / predictions.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall risk level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Predictions Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {predictions.map((prediction, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{prediction.batch_id}</CardTitle>
                    <Badge className={getRiskBadge(prediction.spoilage_prediction)}>
                      {prediction.spoilage_prediction}
                    </Badge>
                  </div>
                  <CardDescription>
                    {prediction.grain_type} • {prediction.silo_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Risk Score */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Risk Score</span>
                      <span className={`font-medium ${getRiskColor(prediction.risk_score)}`}>
                        {prediction.risk_score}%
                      </span>
                    </div>
                    <Progress value={prediction.risk_score} className="h-2" />
                  </div>

                  {/* Confidence */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>AI Confidence</span>
                      <span className={`font-medium ${getConfidenceColor(prediction.confidence)}`}>
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                    </div>
                    <Progress value={prediction.confidence * 100} className="h-2" />
                  </div>

                  {/* Days Until Spoilage */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">Predicted Timeline</div>
                    <div className="text-lg font-bold text-blue-700">
                      {prediction.days_until_spoilage} days
                    </div>
                    <div className="text-xs text-blue-600">Until quality degradation</div>
                  </div>

                  {/* Top Contributing Factor */}
                  <div>
                    <div className="text-sm font-medium mb-1">Key Factor</div>
                    <div className="text-sm text-muted-foreground">
                      {prediction.contributing_factors[0]}
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="text-xs text-muted-foreground">
                    Updated: {new Date(prediction.last_updated).toLocaleString()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Take Action
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {predictions.map((prediction, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{prediction.batch_id} - Detailed Analysis</CardTitle>
                <CardDescription>
                  {prediction.grain_type} stored in {prediction.silo_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Risk Metrics */}
                  <div>
                    <h4 className="font-medium mb-2">Risk Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Risk Score</span>
                        <span className={`font-medium ${getRiskColor(prediction.risk_score)}`}>
                          {prediction.risk_score}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Confidence</span>
                        <span className={`font-medium ${getConfidenceColor(prediction.confidence)}`}>
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Days to Spoilage</span>
                        <span className="font-medium">{prediction.days_until_spoilage}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contributing Factors */}
                  <div>
                    <h4 className="font-medium mb-2">Contributing Factors</h4>
                    <div className="space-y-1">
                      {prediction.contributing_factors.map((factor, i) => (
                        <div key={i} className="text-sm text-muted-foreground">
                          • {factor}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {predictions.map((prediction, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>Recommendations for {prediction.batch_id}</CardTitle>
                <CardDescription>
                  AI-generated action items to optimize storage conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prediction.recommendations.map((recommendation, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <Target className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-green-900">{recommendation}</div>
                        <div className="text-sm text-green-700 mt-1">
                          Priority: {i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
