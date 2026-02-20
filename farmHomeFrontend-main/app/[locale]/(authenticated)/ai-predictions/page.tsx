"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  Activity,
  BarChart3,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Eye,
  Settings,
  CheckCircle,
  RefreshCw,
  CloudRain,
  Timer,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

/* ─── Types ─── */
interface LivePrediction {
  prediction_id: string
  device_id: string
  classification: string
  risk_score: number
  confidence: number
  risk_level: string
  time_to_spoilage_hours: number
  days_until_spoilage: number
  key_risk_factors: string[]
  model_used: string
  input_features: Record<string, number>
  live_sensor_data: Record<string, number>
  recommendations: string[]
  grain_type: string
  storage_days: number
  timestamp: string
  is_live?: boolean
}

interface StoredPrediction {
  prediction_id?: string
  batch_id?: string | { batch_id?: string }
  grain_factors?: { grain_type?: string }
  grain_type?: string
  risk_score?: number
  confidence_score?: number
  risk_level?: string
  prediction_details?: {
    time_to_spoilage?: number
    key_risk_factors?: string[]
    recommended_actions?: string[]
  }
  silo_id?: { name?: string }
  updated_at?: string
  environmental_factors?: Record<string, { current?: number }>
  [key: string]: unknown
}

interface PredictionHistory {
  timestamp: string
  risk_score: number
  confidence: number
  classification: string
}

/* ─── Component ─── */
export default function AIPredictionsPage() {
  const [livePrediction, setLivePrediction] = useState<LivePrediction | null>(null)
  const [storedPredictions, setStoredPredictions] = useState<StoredPrediction[]>([])
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [activeTab, setActiveTab] = useState('live')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [telemetry, setTelemetry] = useState<Record<string, number | string> | null>(null)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  const deviceId = process.env.NEXT_PUBLIC_DEVICE_ID || '004B12387760'

  /* ── Fetch live telemetry ── */
  const fetchTelemetry = useCallback(async () => {
    try {
      const r = await fetch(`${backendUrl}/api/iot/silos/${deviceId}/telemetry-public`)
      if (r.ok) {
        const d = await r.json()
        setTelemetry(d)
      }
    } catch { /* ignore */ }
  }, [backendUrl, deviceId])

  /* ── Run live ML prediction ── */
  const runLivePrediction = useCallback(async () => {
    try {
      setPredicting(true)
      const body = { device_id: deviceId, grain_type: 'Rice', storage_days: 30 }
      const r = await fetch(`${backendUrl}/api/ai-spoilage/predict-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        const data = await r.json()
        setLivePrediction(data)
        // Append to history
        setPredictionHistory(prev => {
          const entry: PredictionHistory = {
            timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            risk_score: data.risk_score,
            confidence: Math.round(data.confidence * 100),
            classification: data.classification,
          }
          const updated = [...prev, entry].slice(-30) // Keep last 30
          return updated
        })
      }
    } catch (e) {
      console.error('Live prediction failed:', e)
    } finally {
      setPredicting(false)
    }
  }, [backendUrl, deviceId])

  /* ── Fetch stored predictions ── */
  const fetchStored = useCallback(async () => {
    try {
      const r = await fetch(`${backendUrl}/api/ai-spoilage/predictions-public?device_id=${deviceId}&include_live=false`)
      if (r.ok) {
        const data = await r.json()
        setStoredPredictions(data.predictions || [])
      }
    } catch { /* ignore */ }
  }, [backendUrl, deviceId])

  /* ── Retrain model ── */
  const retrainModel = async () => {
    try {
      setRetraining(true)
      const r = await fetch(`${backendUrl}/api/ai-spoilage/retrain-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_retrain: true }),
      })
      if (r.ok) {
        const data = await r.json()
        const acc = data.performance_metrics?.accuracy ?? 0
        const f1 = data.performance_metrics?.f1_score ?? 0
        alert(`Model retrained successfully!\nAccuracy: ${(acc * 100).toFixed(1)}%\nF1 Score: ${(f1 * 100).toFixed(1)}%`)
      } else {
        const err = await r.json().catch(() => ({}))
        alert(`Retrain failed: ${err.error || 'Unknown error'}`)
      }
    } catch (e) {
      alert(`Retrain error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setRetraining(false)
    }
  }

  /* ── Initial load ── */
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchTelemetry(), runLivePrediction(), fetchStored()])
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Auto-refresh ── */
  useEffect(() => {
    if (!autoRefresh) return
    const i = setInterval(() => {
      fetchTelemetry()
      runLivePrediction()
    }, 15000) // every 15s
    return () => clearInterval(i)
  }, [autoRefresh, fetchTelemetry, runLivePrediction])

  /* ── Helpers ── */
  const riskColor = (level: string) => {
    const map: Record<string, string> = {
      critical: 'text-red-700 bg-red-50 border-red-200',
      high: 'text-orange-700 bg-orange-50 border-orange-200',
      medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      low: 'text-green-700 bg-green-50 border-green-200',
    }
    return map[level] || map.low
  }
  const riskBadgeColor = (level: string) => {
    const map: Record<string, string> = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-green-500 text-white',
    }
    return map[level] || map.low
  }
  const classIcon = (cls: string) => {
    if (cls === 'Spoiled') return <AlertTriangle className="h-6 w-6 text-red-600" />
    if (cls === 'Risky') return <Gauge className="h-6 w-6 text-orange-600" />
    return <ShieldCheck className="h-6 w-6 text-green-600" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Brain className="h-12 w-12 mx-auto text-purple-400 animate-pulse" />
          <p className="text-gray-500">Running AI prediction on live sensor data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl">
              <Brain className="h-7 w-7 text-purple-700" />
            </div>
            AI Predictions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time ML-powered grain spoilage prediction • SmartBin Model • Device {deviceId}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto (15s)' : 'Auto Off'}
          </Button>
          <Button
            size="sm"
            onClick={runLivePrediction}
            disabled={predicting}
            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
          >
            {predicting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
            Run Prediction
          </Button>
          <Button
            size="sm"
            onClick={retrainModel}
            disabled={retraining}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
          >
            {retraining ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
            Retrain Model
          </Button>
        </div>
      </div>

      {/* ═══ Live Prediction Hero Card ═══ */}
      {livePrediction && (
        <Card className={`border-2 ${riskColor(livePrediction.risk_level)} overflow-hidden`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {classIcon(livePrediction.classification)}
                <div>
                  <CardTitle className="text-xl">Live ML Prediction</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {livePrediction.model_used} • {new Date(livePrediction.timestamp).toLocaleString()}
                  </CardDescription>
                </div>
              </div>
              <Badge className={`${riskBadgeColor(livePrediction.risk_level)} text-sm px-3 py-1`}>
                {livePrediction.classification.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Key metrics row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold">{livePrediction.risk_score}%</div>
                <div className="text-xs text-gray-500 mt-1">Risk Score</div>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold">{(livePrediction.confidence * 100).toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">Confidence</div>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold">{livePrediction.days_until_spoilage}d</div>
                <div className="text-xs text-gray-500 mt-1">Days to Spoilage</div>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold capitalize">{livePrediction.risk_level}</div>
                <div className="text-xs text-gray-500 mt-1">Risk Level</div>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold">{livePrediction.grain_type}</div>
                <div className="text-xs text-gray-500 mt-1">Grain Type</div>
              </div>
            </div>

            {/* Sensor values used by ML */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Input Features (from live sensors)</h4>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-sm">
                {Object.entries(livePrediction.input_features).map(([k, v]) => (
                  <div key={k} className="p-2 bg-white/70 rounded-lg border">
                    <div className="text-xs text-gray-500 capitalize">{k.replace(/_/g, ' ')}</div>
                    <div className="font-semibold">{typeof v === 'number' ? v.toFixed(1) : v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk factors */}
            {livePrediction.key_risk_factors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Risk Factors Detected</h4>
                <div className="flex flex-wrap gap-2">
                  {livePrediction.key_risk_factors.map((f, i) => (
                    <Badge key={i} variant="destructive" className="capitalize">{f.replace(/_/g, ' ')}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">AI Recommendations</h4>
              <div className="space-y-2">
                {livePrediction.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 bg-white/60 rounded-lg border">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Stats Cards ═══ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/40 border-blue-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Activity className="h-5 w-5 text-blue-600" /></div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-700">{predictionHistory.length}</div>
                <div className="text-xs text-blue-600/70">Predictions Run</div>
              </div>
            </div>
            <div className="w-full bg-blue-200/50 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(predictionHistory.length * 3, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${livePrediction && livePrediction.risk_score >= 60 ? 'from-red-50 to-red-100/40 border-red-200/50' : 'from-green-50 to-green-100/40 border-green-200/50'} hover:shadow-md transition-shadow`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${livePrediction && livePrediction.risk_score >= 60 ? 'bg-red-100' : 'bg-green-100'}`}>
                <AlertTriangle className={`h-5 w-5 ${livePrediction && livePrediction.risk_score >= 60 ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${livePrediction && livePrediction.risk_score >= 60 ? 'text-red-700' : 'text-green-700'}`}>
                  {livePrediction?.risk_score ?? 0}%
                </div>
                <div className="text-xs text-gray-600">Current Risk</div>
              </div>
            </div>
            <div className="w-full bg-gray-200/50 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${livePrediction && livePrediction.risk_score >= 60 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${livePrediction?.risk_score || 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/40 border-purple-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Target className="h-5 w-5 text-purple-600" /></div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-700">
                  {livePrediction ? `${(livePrediction.confidence * 100).toFixed(0)}%` : '--'}
                </div>
                <div className="text-xs text-purple-600/70">ML Confidence</div>
              </div>
            </div>
            <div className="w-full bg-purple-200/50 rounded-full h-1.5">
              <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${livePrediction ? livePrediction.confidence * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/40 border-amber-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Timer className="h-5 w-5 text-amber-600" /></div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-700">
                  {livePrediction?.days_until_spoilage ?? '--'}d
                </div>
                <div className="text-xs text-amber-600/70">Days Until Spoilage</div>
              </div>
            </div>
            <div className="w-full bg-amber-200/50 rounded-full h-1.5">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min((livePrediction?.days_until_spoilage || 0) / 30 * 100, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Tabs ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live">Live Sensors</TabsTrigger>
          <TabsTrigger value="trends">Risk Trends</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* ── Tab: Live Sensors ── */}
        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-600" /> Live Sensor Data (Firebase)
              </CardTitle>
              <CardDescription>
                Real-time readings from device {deviceId} • {telemetry ? `Updated ${new Date(telemetry.timestamp as number).toLocaleString()}` : 'Loading...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {telemetry ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Temp', value: `${Number(telemetry.temperature).toFixed(1)}°C`, icon: <Thermometer className="h-4 w-4" />, color: 'text-orange-600 bg-orange-50' },
                    { label: 'Humidity', value: `${Number(telemetry.humidity).toFixed(1)}%`, icon: <Droplets className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50' },
                    { label: 'TVOC', value: `${telemetry.tvoc ?? 0} ppb`, icon: <Wind className="h-4 w-4" />, color: 'text-violet-600 bg-violet-50' },
                    { label: 'Dew Point', value: telemetry.dewPoint ? `${telemetry.dewPoint}°C` : '--', icon: <CloudRain className="h-4 w-4" />, color: 'text-cyan-600 bg-cyan-50' },
                    { label: 'Pressure', value: telemetry.pressure ? `${telemetry.pressure} hPa` : '--', icon: <Gauge className="h-4 w-4" />, color: 'text-purple-600 bg-purple-50' },
                    { label: 'Risk Index', value: `${telemetry.riskIndex ?? 0}/100`, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600 bg-red-50' },
                    { label: 'Fan', value: String(telemetry.fanState ?? 'off').toUpperCase(), icon: <Settings className="h-4 w-4" />, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Lid', value: String(telemetry.lidState ?? 'closed').toUpperCase(), icon: <Eye className="h-4 w-4" />, color: 'text-sky-600 bg-sky-50' },
                    { label: 'ML', value: String(telemetry.mlDecision ?? 'idle'), icon: <Brain className="h-4 w-4" />, color: 'text-indigo-600 bg-indigo-50' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className={`p-3 rounded-xl border text-center ${color}`}>
                      <div className="flex justify-center mb-1">{icon}</div>
                      <div className="text-xs uppercase opacity-70">{label}</div>
                      <div className="text-lg font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Loading telemetry…</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Risk Trends ── */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" /> Prediction History
              </CardTitle>
              <CardDescription>Risk score and confidence over time (last {predictionHistory.length} predictions)</CardDescription>
            </CardHeader>
            <CardContent>
              {predictionHistory.length > 1 ? (
                <div className="space-y-6">
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={predictionHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="risk_score" stroke="#ef4444" fill="#fca5a5" fillOpacity={0.3} strokeWidth={2} name="Risk Score (%)" />
                        <Area type="monotone" dataKey="confidence" stroke="#8b5cf6" fill="#c4b5fd" fillOpacity={0.2} strokeWidth={2} name="Confidence (%)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Run more predictions to see trend data. Click &quot;Run Prediction&quot; a few times or wait for auto-refresh.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Analysis ── */}
        <TabsContent value="analysis" className="space-y-6">
          {/* Environmental factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" /> Environmental Factor Analysis
              </CardTitle>
              <CardDescription>How current sensor values influence the ML prediction</CardDescription>
            </CardHeader>
            <CardContent>
              {livePrediction ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      label: 'Temperature', value: livePrediction.input_features.temperature,
                      unit: '°C', max: 50, safe: [15, 25], icon: <Thermometer className="h-5 w-5 text-white" />,
                      gradient: 'from-orange-50 to-orange-100', border: 'border-orange-200',
                      barColor: 'from-orange-400 to-orange-600', iconBg: 'bg-orange-500'
                    },
                    {
                      label: 'Humidity', value: livePrediction.input_features.humidity,
                      unit: '%', max: 100, safe: [40, 70], icon: <Droplets className="h-5 w-5 text-white" />,
                      gradient: 'from-blue-50 to-blue-100', border: 'border-blue-200',
                      barColor: 'from-blue-400 to-blue-600', iconBg: 'bg-blue-500'
                    },
                    {
                      label: 'Grain Moisture', value: livePrediction.input_features.grain_moisture,
                      unit: '%', max: 30, safe: [10, 16], icon: <Gauge className="h-5 w-5 text-white" />,
                      gradient: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200',
                      barColor: 'from-emerald-400 to-emerald-600', iconBg: 'bg-emerald-500'
                    },
                    {
                      label: 'Dew Point', value: livePrediction.input_features.dew_point,
                      unit: '°C', max: 40, safe: [5, 20], icon: <CloudRain className="h-5 w-5 text-white" />,
                      gradient: 'from-cyan-50 to-cyan-100', border: 'border-cyan-200',
                      barColor: 'from-cyan-400 to-cyan-600', iconBg: 'bg-cyan-500'
                    },
                    {
                      label: 'Storage Days', value: livePrediction.input_features.storage_days,
                      unit: 'days', max: 180, safe: [0, 60], icon: <Timer className="h-5 w-5 text-white" />,
                      gradient: 'from-amber-50 to-amber-100', border: 'border-amber-200',
                      barColor: 'from-amber-400 to-amber-600', iconBg: 'bg-amber-500'
                    },
                    {
                      label: 'Rainfall', value: livePrediction.input_features.rainfall,
                      unit: 'mm', max: 100, safe: [0, 10], icon: <CloudRain className="h-5 w-5 text-white" />,
                      gradient: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200',
                      barColor: 'from-indigo-400 to-indigo-600', iconBg: 'bg-indigo-500'
                    },
                  ].map(({ label, value, unit, max, safe, icon, gradient, border, barColor, iconBg }) => {
                    const pct = Math.min((value / max) * 100, 100)
                    const inSafe = value >= safe[0] && value <= safe[1]
                    return (
                      <div key={label} className={`p-4 bg-gradient-to-br ${gradient} rounded-xl border ${border}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
                          <span className="font-semibold text-gray-800">{label}</span>
                          {!inSafe && <Badge variant="destructive" className="ml-auto text-[10px] px-1.5">⚠</Badge>}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">{value.toFixed(1)} <span className="text-sm font-normal text-gray-500">{unit}</span></div>
                        <div className="text-xs text-gray-500 mb-2">Safe: {safe[0]}–{safe[1]} {unit}</div>
                        <div className="w-full bg-white rounded-full h-2.5 shadow-inner">
                          <div className={`bg-gradient-to-r ${barColor} h-2.5 rounded-full shadow-sm transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4 text-center">Run a prediction to see factor analysis.</p>
              )}
            </CardContent>
          </Card>

          {/* Stored predictions */}
          {storedPredictions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historical Predictions</CardTitle>
                <CardDescription>{storedPredictions.length} stored predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {storedPredictions.slice(0, 6).map((p, i) => (
                    <div key={i} className="p-3 border rounded-xl bg-white hover:shadow-sm transition">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{typeof p.batch_id === 'object' ? p.batch_id?.batch_id : p.batch_id || `Prediction ${i + 1}`}</span>
                        <Badge className={riskBadgeColor(p.risk_level || 'low')} >{p.risk_level || 'low'}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div><div className="font-bold text-lg">{p.risk_score ?? 0}%</div><div className="text-gray-500">Risk</div></div>
                        <div><div className="font-bold text-lg">{((p.confidence_score ?? 0.8) * 100).toFixed(0)}%</div><div className="text-gray-500">Conf</div></div>
                        <div><div className="font-bold text-lg">{Math.round((p.prediction_details?.time_to_spoilage || 168) / 24)}d</div><div className="text-gray-500">Time</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Actions ── */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" /> AI-Recommended Actions
              </CardTitle>
              <CardDescription>Actions based on the latest ML prediction</CardDescription>
            </CardHeader>
            <CardContent>
              {livePrediction ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {livePrediction.recommendations.map((rec, i) => {
                    const isUrgent = rec.includes('URGENT') || rec.includes('CRITICAL')
                    const isWarning = rec.includes('Monitor') || rec.includes('approaching')
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${isUrgent ? 'bg-red-50 border-red-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {isUrgent
                            ? <AlertTriangle className="h-5 w-5 text-red-600" />
                            : isWarning
                              ? <Eye className="h-5 w-5 text-amber-600" />
                              : <CheckCircle className="h-5 w-5 text-green-600" />
                          }
                          <span className={`font-semibold text-sm ${isUrgent ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-green-800'}`}>
                            {isUrgent ? 'Critical' : isWarning ? 'Warning' : 'Info'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{rec}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Run a prediction to get actionable recommendations.</p>
              )}
            </CardContent>
          </Card>

          {/* Preventive measures */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" /> Preventive Measures
              </CardTitle>
              <CardDescription>Best practices for grain storage safety</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { title: 'Temperature Control', desc: 'Keep storage between 15–25°C. Activate ventilation when temperature exceeds 28°C.', icon: <Thermometer className="h-5 w-5 text-orange-600" /> },
                  { title: 'Humidity Management', desc: 'Maintain RH between 40–70%. Use dehumidifiers when humidity exceeds 75%.', icon: <Droplets className="h-5 w-5 text-blue-600" /> },
                  { title: 'Regular Monitoring', desc: 'Run ML predictions at least every 15 minutes for early detection of spoilage risk.', icon: <Brain className="h-5 w-5 text-purple-600" /> },
                  { title: 'Airflow Optimization', desc: 'Ensure adequate ventilation and fan operation to prevent moisture accumulation.', icon: <Wind className="h-5 w-5 text-cyan-600" /> },
                ].map(({ title, desc, icon }) => (
                  <div key={title} className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-green-100 rounded-lg mt-0.5">{icon}</div>
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">{title}</h4>
                        <p className="text-sm text-gray-700">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
