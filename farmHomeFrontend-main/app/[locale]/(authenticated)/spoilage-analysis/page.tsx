"use client"

import { useEffect, useMemo, useState } from 'react'
import { config } from '@/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, TrendingDown, TrendingUp, Brain } from "lucide-react"

interface SpoilagePrediction {
  _id: string;
  batch_id: string | {
    batch_id: string;
  };
  grain_factors?: {
    grain_type: string;
  };
  grain_type?: string;
  risk_score: number;
  risk_level: string;
  confidence_score: number;
  prediction_details?: {
    key_risk_factors: string[];
  };
  updated_at?: string;
  created_at?: string;
}

interface MappedAnalysis {
  id: string;
  batchId: string;
  grainType: string;
  riskLevel: string;
  riskScore: number;
  factors: string[];
  prediction: string;
  confidence: number;
  lastAnalysis: string;
}

export default function SpoilageAnalysisPage() {
  const [batches, setBatches] = useState<SpoilagePrediction[]>([])
  const [loading, setLoading] = useState(true)

  const mapped = useMemo(() => {
    return (batches || []).map((b) => {
      const riskScore = Math.round(b.risk_score || 0)
      const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low'
      
      // Handle batch_id which could be string or object
      const batchIdValue = typeof b.batch_id === 'object' ? b.batch_id.batch_id : b.batch_id;
      
      return {
        id: b._id,
        batchId: batchIdValue || 'Unknown',
        grainType: b.grain_factors?.grain_type || b.grain_type || 'Rice',
        riskLevel,
        riskScore,
        factors: b.prediction_details?.key_risk_factors || [],
        prediction: b.risk_level === 'critical' ? 'Immediate action required' : b.risk_level === 'high' ? 'Monitor closely' : 'Stable',
        confidence: Math.round((b.confidence_score || 0) * 100),
        lastAnalysis: new Date(b.updated_at || b.created_at || new Date()).toLocaleString()
      }
    })
  }, [batches])

  useEffect(() => {
    const run = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
        const res = await fetch(`${backendUrl}/ai-spoilage/predictions?limit=50`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        })
        if (res.ok) {
          const data = await res.json()
          setBatches(data.predictions || [])
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const runAnalysis = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      // Trigger predictions for all stored batches, sequentially with small gaps
      for (const b of batches) {
        await fetch(`${config.backendUrl}/ai/predict-batch/${b._id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({})
        })
      }
      // Reload
      const res = await fetch(`${config.backendUrl}/grain-batches?limit=50`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch {}
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Spoilage Analysis</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => window.open('/api/docs', '_blank')}>
            <Brain className="mr-2 h-4 w-4" />
            API Docs
          </Button>
          <Button onClick={runAnalysis}>Run Analysis</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mapped.filter(s => s.riskLevel === 'High').length}
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
              {mapped.filter(s => s.riskLevel === 'Medium').length}
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
              {mapped.filter(s => s.riskLevel === 'Low').length}
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
              {mapped.length ? Math.round(mapped.reduce((sum, s) => sum + s.confidence, 0) / mapped.length) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Model accuracy</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Batch Analysis Results</h3>
        <div className="grid gap-4">
          {loading && <div>Loading...</div>}
          {!loading && mapped.map((analysis) => (
            <Card key={analysis.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Batch {analysis.batchId}</CardTitle>
                    <CardDescription>{analysis.grainType} • Last analysis: {analysis.lastAnalysis}</CardDescription>
                  </div>
                  <Badge 
                    variant={
                      analysis.riskLevel === 'High' ? 'destructive' :
                      analysis.riskLevel === 'Medium' ? 'secondary' : 'default'
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
                      analysis.riskScore > 70 ? 'bg-red-100' :
                      analysis.riskScore > 40 ? 'bg-yellow-100' : 'bg-green-100'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Contributing Factors:</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.factors.map((factor: string, index: number) => (
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
                    {analysis.riskLevel === 'High' && (
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
