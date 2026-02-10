"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Brain,
  Target,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { formatAccuracy, formatF1Score, formatPrecision, formatTrend } from '@/lib/percentageUtils';

interface ModelPerformance {
  performance_summary: {
    total_training_sessions: number
    latest_metrics: {
      accuracy: number
      precision: number
      recall: number
      f1_score: number
      cv_mean: number
      cv_std: number
    }
    overall_improvement: {
      accuracy_improvement?: number
      f1_score_improvement?: number
      accuracy_improvement_pct?: number
      f1_score_improvement_pct?: number
    }
    accuracy_trend: number[]
    f1_trend: number[]
    best_performance: {
      best_accuracy: { value: number, timestamp: string }
      best_f1: { value: number, timestamp: string }
    }
  }
  training_insights: {
    insights: string[]
  }
  recommendations: string[]
  model_info: {
    name: string
    version: string
    algorithm: string
    features: string[]
    target_classes: string[]
  }
}

interface TrainingSession {
  timestamp: string
  metrics: {
    accuracy: number
    precision: number
    recall: number
    f1_score: number
    cv_mean?: number
    cv_std?: number
  }
  training_data_size?: number
  hyperparameters?: Record<string, unknown>
  improvement?: Record<string, number>
}

interface TrainingHistory {
  training_sessions: TrainingSession[]
  total_sessions: number
  performance_trends?: Record<string, number[]>
}

export default function ModelPerformancePage() {
  const [performance, setPerformance] = useState<ModelPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory | null>(null)
  const [error, setError] = useState<string>('')

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

  const loadPerformanceData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }

      const [performanceRes, historyRes] = await Promise.all([
        fetch(`${backendUrl}/ai-spoilage/model-performance`, { headers }),
        fetch(`${backendUrl}/ai-spoilage/training-history`, { headers })
      ])

      if (!performanceRes.ok) {
        const body = await performanceRes.json().catch(() => null)
        throw new Error(body?.error || body?.message || 'Failed to load model performance')
      }

      const performanceData = await performanceRes.json()
      setPerformance(performanceData)

      if (historyRes.ok) {
        const historyData = await historyRes.json()
        setTrainingHistory(historyData)
      } else {
        setTrainingHistory(null)
      }
    } catch (err) {
      console.error('Error loading performance data:', err)
      setPerformance(null)
      setTrainingHistory(null)
      setError((err as Error).message || 'Failed to load model performance data')
    } finally {
      setLoading(false)
    }
  }, [backendUrl])

  useEffect(() => {
    void loadPerformanceData()
  }, [loadPerformanceData])

  const retrainModel = async () => {
    setRetraining(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch(`${backendUrl}/ai-spoilage/retrain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          force_retrain: true,
          hyperparameter_tuning: true
        })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || body?.message || 'Model retraining failed')
      }

      const result = await response.json()
      alert(
        `Model retraining completed!\n\nAccuracy: ${formatAccuracy(result.performance_metrics?.accuracy ?? 0)}\nF1 Score: ${formatF1Score(result.performance_metrics?.f1_score ?? 0)}`
      )
      await loadPerformanceData()
    } catch (err) {
      console.error('Error retraining model:', err)
      alert((err as Error).message || 'Model retraining failed.')
    } finally {
      setRetraining(false)
    }
  }

  const getImprovementIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getImprovementColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const trendHeightClasses = ['h-2', 'h-3', 'h-4', 'h-5', 'h-6', 'h-7', 'h-8', 'h-9', 'h-10', 'h-12', 'h-14', 'h-16', 'h-20', 'h-24', 'h-28']
  const getTrendHeightClass = (value: number) => {
    if (!value && value !== 0) return 'h-2'
    const normalized = Math.max(0, Math.min(100, value))
    const index = Math.min(trendHeightClasses.length - 1, Math.round((normalized / 100) * (trendHeightClasses.length - 1)))
    return trendHeightClasses[index]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading model performance data...</p>
        </div>
      </div>
    )
  }

  if (error && !performance) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Unable to load model performance</h3>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
        <Button onClick={loadPerformanceData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!performance || !performance.performance_summary?.latest_metrics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
        <p className="text-gray-600 mb-4">Model performance data is not available yet.</p>
        <Button onClick={retrainModel} disabled={retraining}>
          <Zap className="h-4 w-4 mr-2" />
          {retraining ? 'Training...' : 'Start First Training'}
        </Button>
      </div>
    )
  }

  const { performance_summary, training_insights, recommendations, model_info } = performance
  const { latest_metrics, overall_improvement, accuracy_trend, f1_trend, best_performance } = performance_summary
  const accuracyTrendValues = accuracy_trend || []
  const f1TrendValues = f1_trend || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Brain className="h-6 w-6 text-gray-700" />
            </div>
            Model Performance
          </h1>
          <p className="text-gray-600 text-sm">
            {model_info.name} v{model_info.version} • {model_info.algorithm}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={loadPerformanceData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={retrainModel}
            disabled={retraining}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Zap className="h-4 w-4 mr-2" />
            {retraining ? 'Training...' : 'Retrain Model'}
          </Button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatAccuracy(latest_metrics.accuracy)}
                </div>
                <div className="text-xs text-gray-500">Accuracy</div>
                {overall_improvement.accuracy_improvement_pct && (
                  <div className={`text-xs flex items-center mt-1 ${getImprovementColor(overall_improvement.accuracy_improvement_pct)}`}>
                    {getImprovementIcon(overall_improvement.accuracy_improvement_pct)}
                    <span className="ml-1">{formatTrend(overall_improvement.accuracy_improvement_pct)}</span>
                  </div>
                )}
              </div>
              <Target className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatF1Score(latest_metrics.f1_score)}
                </div>
                <div className="text-xs text-gray-500">F1 Score</div>
                {overall_improvement.f1_score_improvement_pct && (
                  <div className={`text-xs flex items-center mt-1 ${getImprovementColor(overall_improvement.f1_score_improvement_pct)}`}>
                    {getImprovementIcon(overall_improvement.f1_score_improvement_pct)}
                    <span className="ml-1">{formatTrend(overall_improvement.f1_score_improvement_pct)}</span>
                  </div>
                )}
              </div>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {performance_summary.total_training_sessions}
                </div>
                <div className="text-xs text-gray-500">Training Sessions</div>
              </div>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatAccuracy(best_performance.best_accuracy?.value)}
                </div>
                <div className="text-xs text-gray-500">Best Accuracy</div>
              </div>
              <Award className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Performance</CardTitle>
                <CardDescription>Latest model metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Precision</span>
                    <span className="font-medium">{formatPrecision(latest_metrics.precision)}</span>
                  </div>
                  <Progress value={latest_metrics.precision} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Recall</span>
                    <span className="font-medium">{formatPrecision(latest_metrics.recall)}</span>
                  </div>
                  <Progress value={latest_metrics.recall} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Cross-Validation</span>
                    <span className="font-medium">{formatPrecision(latest_metrics.cv_mean)}</span>
                  </div>
                  <Progress value={latest_metrics.cv_mean} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Model Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Information</CardTitle>
                <CardDescription>Technical details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Algorithm</div>
                  <div className="font-medium">{model_info.algorithm}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Features</div>
                  <div className="text-sm">{model_info.features.length} features</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Target Classes</div>
                  <div className="flex gap-1 mt-1">
                    {model_info.target_classes.map((cls, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {cls}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Trends</CardTitle>
              <CardDescription>Model improvement over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Accuracy Trend</div>
                  {accuracyTrendValues.length ? (
                    <div className="flex items-end space-x-2">
                      {accuracyTrendValues.map((value, index) => (
                        <div key={`acc-${index}`} className="flex flex-col items-center">
                          <div className={`w-4 rounded bg-gray-200 ${getTrendHeightClass(value)}`} />
                          <div className="text-xs text-gray-500 mt-1">{index + 1}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Not enough data to show trends yet.</p>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">F1 Score Trend</div>
                  {f1TrendValues.length ? (
                    <div className="flex items-end space-x-2">
                      {f1TrendValues.map((value, index) => (
                        <div key={`f1-${index}`} className="flex flex-col items-center">
                          <div className={`w-4 rounded bg-gray-200 ${getTrendHeightClass(value)}`} />
                          <div className="text-xs text-gray-500 mt-1">{index + 1}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Not enough data to show trends yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Training Insights</CardTitle>
              <CardDescription>AI-generated insights about model performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {training_insights.insights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-sm text-gray-700">{insight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommendations</CardTitle>
              <CardDescription>Suggested actions to improve model performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <span className="text-sm text-gray-700">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Training History</CardTitle>
              <CardDescription>Recent training sessions and their metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainingHistory?.training_sessions?.length ? (
                trainingHistory.training_sessions
                  .slice()
                  .reverse()
                  .map((session, index) => (
                    <div key={`${session.timestamp}-${index}`} className="rounded-lg border border-gray-100 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            Session {trainingHistory.total_sessions - index}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {session.training_data_size && (
                          <Badge variant="outline" className="w-fit">
                            Dataset: {session.training_data_size.toLocaleString()} rows
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs text-gray-500">Accuracy</p>
                          <p className="font-semibold">{formatAccuracy(session.metrics.accuracy)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">F1 Score</p>
                          <p className="font-semibold">{formatF1Score(session.metrics.f1_score)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Precision</p>
                          <p className="font-semibold">{formatPrecision(session.metrics.precision)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Recall</p>
                          <p className="font-semibold">{formatPrecision(session.metrics.recall)}</p>
                        </div>
                      </div>
                      {session.improvement && session.improvement.accuracy_improvement_pct !== undefined && (
                        <div className="mt-3 rounded-md bg-gray-50 p-2 text-xs text-gray-600 flex items-center justify-between">
                          <span>Accuracy change</span>
                          <span className={getImprovementColor(session.improvement.accuracy_improvement_pct)}>
                            {formatTrend(session.improvement.accuracy_improvement_pct)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="text-sm text-gray-500">
                  {trainingHistory ? 'No training sessions recorded yet.' : 'Training history is unavailable.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
