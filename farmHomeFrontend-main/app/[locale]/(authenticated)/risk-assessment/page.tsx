"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, RefreshCcw } from "lucide-react"
import { useEnvironmentalHistory, useEnvironmentalLocations, LocationOption } from "@/lib/useEnvironmentalData"
import { api } from "@/lib/api"
import { toast } from "sonner"

type RiskLevel = "LOW" | "MEDIUM" | "HIGH"

interface PredictionResult {
  type: "prediction"
  riskScore: number
  riskLevel: RiskLevel
  confidence: number
  timeToSpoilage: number
  dewPoint: number
  dewGap: number
  vocRelative: number
  vocRate: number
  pestScore: number
  guardrails: {
    active: boolean
    reasons: string[]
  }
}

// interface ValidationResult {
//   type: "validation"
//   trainingAccuracy: number
//   testAccuracy: number
//   precision: number
//   recall: number
//   f1Score: number
//   crossValidation: number
//   crossValidationStd: number
// }

// interface DatasetResult {
//   type: "dataset"
//   totalSamples: number
//   trainingSamples: number
//   testSamples: number
//   features: number
//   dataQuality: number
//   outliers: number
//   classBalance: string
// }

type Result =
  | (PredictionResult & {
      advisories?: Array<{ title?: string; message?: string }>
      detailed_risks?: Record<string, unknown>
    })
  | null

type BatchOption = { _id: string; batch_id?: string; grain_type?: string }

const DEFAULT_INPUTS = {
  temperature: 28.5,
  humidity: 65,
  ambientHumidity: 68,
  vocIndex: 145,
  baselineVoc24h: 95,
  moisture: 14.2,
  storageDays: 45,
  airflow: 1.2,
  rainfall: 0,
}

const RISK_DESCRIPTIONS: Record<RiskLevel, string> = {
  LOW: "Conditions are stable. Maintain current ventilation and monitoring cadence.",
  MEDIUM: "Monitor closely. Consider increasing aeration and scheduling a manual inspection.",
  HIGH: "Immediate action required. Activate cooling/aeration and inspect grain layers for hotspots.",
}

const riskBadgeColor = (risk: RiskLevel) => {
  if (risk === "HIGH") return "bg-red-500 text-white"
  if (risk === "MEDIUM") return "bg-yellow-500 text-white"
  return "bg-green-500 text-white"
}

export default function RiskAssessmentPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [result, setResult] = useState<Result>(null)
  const [predicting, setPredicting] = useState(false)
  const [batchPredicting, setBatchPredicting] = useState(false)
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const { locations } = useEnvironmentalLocations()
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null)
  const { latest: latestRecord } = useEnvironmentalHistory({
    limit: 120,
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
  })

  useEffect(() => {
    if (!selectedLocation && locations.length > 0) {
      setSelectedLocation(locations[0])
    }
  }, [locations, selectedLocation])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await api.get<{ batches: BatchOption[] }>("/grain-batches?limit=50")
      if (!mounted) return
      if (res.ok && res.data?.batches?.length) {
        setBatches(res.data.batches)
        setSelectedBatchId(res.data.batches[0]._id)
      } else if (!res.ok) {
        toast.error(res.error || "Unable to load batches for risk predictions")
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleInputChange = (key: keyof typeof DEFAULT_INPUTS, value: string) => {
    const parsed = value === "" ? "" : Number(value)
    setInputs((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : prev[key],
    }))
  }

  const computeRiskLevel = useMemo(
    () => (riskScore: number): RiskLevel => {
      if (riskScore >= 70) return "HIGH"
      if (riskScore >= 40) return "MEDIUM"
      return "LOW"
    },
    []
  )

  const runPrediction = async () => {
    setPredicting(true)
    setPredictionError(null)
    try {
      const payload = {
        temperature: inputs.temperature,
        humidity: inputs.humidity,
        ambient_humidity: inputs.ambientHumidity,
        voc: inputs.vocIndex,
        voc_baseline: inputs.baselineVoc24h,
        moisture_content: inputs.moisture,
        days_in_storage: inputs.storageDays,
        airflow: inputs.airflow,
        rainfall: inputs.rainfall,
      }
      const res = await api.post<{
        risk_score: number
        confidence: number
        time_to_spoilage_hours?: number
        advisories?: Array<{ title?: string; message?: string }>
        guardrails?: { reasons: string[] }
      }>("/ai/predict", payload)
      if (res.ok && res.data) {
        const riskScore = res.data.risk_score ?? 0
        const riskLevel = computeRiskLevel(riskScore)
        setResult({
          type: "prediction",
          riskScore,
          riskLevel,
          confidence: (res.data.confidence || 0) * 100,
          timeToSpoilage: Math.max(
            1,
            Math.round((res.data.time_to_spoilage_hours || 24) / 24)
          ),
          dewPoint: inputs.temperature - 1,
          dewGap: 1,
          vocRelative: inputs.vocIndex,
          vocRate: inputs.vocIndex - inputs.baselineVoc24h,
          pestScore: inputs.moisture * 2,
          guardrails: {
            active: Boolean(res.data.guardrails?.reasons?.length),
            reasons: res.data.guardrails?.reasons || [],
          },
          advisories: res.data.advisories,
        })
        toast.success("Prediction updated from backend")
      } else {
        throw new Error(res.error || "Prediction failed")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Prediction failed";
      setPredictionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPredicting(false)
    }
  }

  const runBatchPrediction = async () => {
    if (!selectedBatchId) {
      toast.error("Select a batch first")
      return
    }
    setBatchPredicting(true)
    setPredictionError(null)
    try {
      const res = await api.post<{
        result: { risk_score: number; confidence: number }
        advisories?: Array<{ title?: string; message?: string }>
        updated_batch?: { last_risk_assessment?: string }
      }>(`/ai/predict-batch/${selectedBatchId}`)
      if (res.ok && res.data?.result) {
        const riskScore = res.data.result.risk_score ?? 0
        const riskLevel = computeRiskLevel(riskScore)
        setResult({
          type: "prediction",
          riskScore,
          riskLevel,
          confidence: (res.data.result.confidence || 0) * 100,
          timeToSpoilage:  Math.max(1, Math.round((res.data.result.confidence || 0.5) * 10)),
          dewPoint: inputs.temperature - 1,
          dewGap: 1,
          vocRelative: inputs.vocIndex,
          vocRate: inputs.vocIndex - inputs.baselineVoc24h,
          pestScore: inputs.moisture * 2,
          guardrails: {
            active: false,
            reasons: [],
          },
          advisories: res.data.advisories,
        })
        toast.success("Batch risk assessment saved")
      } else {
        throw new Error(res.error || "Batch prediction failed")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Batch prediction failed";
      setPredictionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setBatchPredicting(false)
    }
  }

  const renderResult = () => {
    if (!result) {
      return (
        <div className="p-4 bg-muted rounded-lg border text-sm text-muted-foreground">
          Enter your current storage conditions and choose an action to generate insights.
        </div>
      )
    }

    if (result.type === "prediction") {
      return (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Risk Level</span>
              <Badge className={`${riskBadgeColor(result.riskLevel)} px-3 py-1`}>
                {result.riskLevel}
              </Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Risk Score</span>
                <span className="font-mono">{result.riskScore.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Confidence</span>
                <span className="font-mono">{result.confidence.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time to Spoilage</span>
                <span className="font-mono">{result.timeToSpoilage} days</span>
              </div>
            <div className="flex justify-between">
              <span>VOC Relative (vs 24h baseline)</span>
              <span className="font-mono">{result.vocRelative.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>VOC Rate Change (vs baseline)</span>
              <span className="font-mono">{result.vocRate.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Dew Point</span>
              <span className="font-mono">{result.dewPoint.toFixed(2)}°C</span>
            </div>
            <div className="flex justify-between">
              <span>Dew Point Gap</span>
              <span className="font-mono">{result.dewGap.toFixed(2)}°C</span>
            </div>
            <div className="flex justify-between">
              <span>Pest Presence Score</span>
              <span className="font-mono">{result.pestScore.toFixed(1)}%</span>
            </div>
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-slate-50 text-sm leading-6">
          <div className="font-semibold text-slate-900">Operational Guidance</div>
          <p className="text-slate-700 mb-3">{RISK_DESCRIPTIONS[result.riskLevel]}</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Guardrails Active</span>
              <span className="font-mono">
                {result.guardrails.active ? "Yes – Hold Venting" : "No – Venting Permitted"}
              </span>
            </div>
            {result.guardrails.reasons.length > 0 && (
              <ul className="list-disc list-inside text-slate-600 text-xs space-y-1">
                {result.guardrails.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Risk Assessment</h1>
        <p className="text-muted-foreground">
          Run live spoilage predictions, validate the model, and inspect dataset quality for your storage
          conditions.
        </p>
        {locations.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Location:</span>
            <select
              className="border rounded-md px-3 py-1 text-sm"
              value={selectedLocation?.city || ""}
              onChange={(event) => {
                const loc = locations.find((l) => l.city === event.target.value)
                if (loc) setSelectedLocation(loc)
              }}
            >
              {locations.map((loc) => (
                <option key={`${loc.city}-${loc.latitude}`} value={loc.city}>
                  {loc.city} ({loc.silo_count} silos)
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!latestRecord) return
                setInputs({
                  temperature:
                    latestRecord.temperature?.value ??
                    latestRecord.environmental_context?.weather?.temperature ??
                    DEFAULT_INPUTS.temperature,
                  humidity:
                    latestRecord.humidity?.value ??
                    latestRecord.environmental_context?.weather?.humidity ??
                    DEFAULT_INPUTS.humidity,
                  ambientHumidity:
                    latestRecord.ambient?.humidity?.value ??
                    latestRecord.environmental_context?.weather?.humidity ??
                    DEFAULT_INPUTS.ambientHumidity,
                  vocIndex: (latestRecord as unknown as { voc?: { value: number } }).voc?.value ?? DEFAULT_INPUTS.vocIndex,
                  baselineVoc24h:
                    latestRecord.derived_metrics?.voc_baseline_24h ??
                    DEFAULT_INPUTS.baselineVoc24h,
                  moisture:
                    (latestRecord as unknown as { moisture?: { value: number } }).moisture?.value ?? DEFAULT_INPUTS.moisture,
                  storageDays:
                    (latestRecord as unknown as { metadata?: { storage_days: number } }).metadata?.storage_days ??
                    DEFAULT_INPUTS.storageDays,
                  airflow:
                    latestRecord.derived_metrics?.airflow ??
                    DEFAULT_INPUTS.airflow,
                  rainfall:
                    latestRecord.environmental_context?.weather?.precipitation ??
                    DEFAULT_INPUTS.rainfall,
                })
              }}
              disabled={!latestRecord}
            >
              Use Latest Reading
            </Button>
          </div>
        )}
        {predictionError && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-700">
            {predictionError}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environmental Snapshot</CardTitle>
          <CardDescription>
            {latestRecord
              ? `Latest reading at ${new Date(latestRecord.timestamp).toLocaleString()}`
              : "No environmental data yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">T_core</div>
            <div className="text-lg font-medium">
              {(latestRecord?.temperature?.value ??
                latestRecord?.environmental_context?.weather?.temperature ??
                "--") + "°C"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">RH_core</div>
            <div className="text-lg font-medium">
              {(latestRecord?.humidity?.value ??
                latestRecord?.environmental_context?.weather?.humidity ??
                "--") + "%"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Rainfall</div>
            <div className="text-lg font-medium">
              {latestRecord?.environmental_context?.weather?.precipitation ?? 0} mm
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              VOC Relative
            </div>
            <div className="text-lg font-medium">
              {latestRecord?.derived_metrics?.voc_relative?.toFixed(1) ?? "0"}%
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Model Testing</CardTitle>
          <CardDescription>
            Adjust the environmental parameters to see how the spoilage risk responds in real time.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="temperature">
                Temperature (°C)
              </label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={inputs.temperature}
                onChange={(event) => handleInputChange("temperature", event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="humidity">
                Humidity (%)
              </label>
              <Input
                id="humidity"
                type="number"
                step="0.1"
                value={inputs.humidity}
                onChange={(event) => handleInputChange("humidity", event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="ambientHumidity">
                Ambient Humidity (%)
              </label>
              <Input
                id="ambientHumidity"
                type="number"
                step="0.1"
                value={inputs.ambientHumidity}
                onChange={(event) => handleInputChange("ambientHumidity", event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="vocIndex">
                VOC Index (BME680)
              </label>
              <Input
                id="vocIndex"
                type="number"
                step="0.1"
                value={inputs.vocIndex}
                onChange={(event) => handleInputChange("vocIndex", event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="baselineVoc24h">
                Baseline VOC (24h clean air)
              </label>
              <Input
                id="baselineVoc24h"
                type="number"
                step="0.1"
                value={inputs.baselineVoc24h}
                onChange={(event) => handleInputChange("baselineVoc24h", event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="moisture">
                Grain Moisture (%)
              </label>
              <Input
                id="moisture"
                type="number"
                step="0.1"
                value={inputs.moisture}
                onChange={(event) => handleInputChange("moisture", event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="storageDays">
                Storage Days
              </label>
              <Input
                id="storageDays"
                type="number"
                value={inputs.storageDays}
                onChange={(event) => handleInputChange("storageDays", event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="airflow">
                Airflow (m/s)
              </label>
              <Input
                id="airflow"
                type="number"
                step="0.1"
                value={inputs.airflow}
                onChange={(event) => handleInputChange("airflow", event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="rainfall">
                External Rainfall (mm/hr)
              </label>
              <Input
                id="rainfall"
                type="number"
                step="0.1"
                value={inputs.rainfall}
                onChange={(event) => handleInputChange("rainfall", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {renderResult()}
            <div className="flex flex-wrap gap-3">
              <Button className="flex-1 min-w-[180px]" onClick={runPrediction} disabled={predicting}>
                <Brain className="h-4 w-4 mr-2" />
                {predicting ? "Running..." : "Run Live Prediction"}
              </Button>
              <div className="flex-1 min-w-[220px] flex gap-2">
                <Select value={selectedBatchId || ""} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch._id} value={batch._id}>
                        {batch.batch_id || batch._id} {batch.grain_type ? `• ${batch.grain_type}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={runBatchPrediction}
                  disabled={batchPredicting}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  {batchPredicting ? "Saving..." : "Sync Batch"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

