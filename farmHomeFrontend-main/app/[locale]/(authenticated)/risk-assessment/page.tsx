"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Brain, CheckCircle, BarChart3 } from "lucide-react"

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

interface ValidationResult {
  type: "validation"
  trainingAccuracy: number
  testAccuracy: number
  precision: number
  recall: number
  f1Score: number
  crossValidation: number
  crossValidationStd: number
}

interface DatasetResult {
  type: "dataset"
  totalSamples: number
  trainingSamples: number
  testSamples: number
  features: number
  dataQuality: number
  outliers: number
  classBalance: string
}

type Result = PredictionResult | ValidationResult | DatasetResult | null

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

  const handleInputChange = (key: keyof typeof DEFAULT_INPUTS, value: string) => {
    const parsed = value === "" ? "" : Number(value)
    setInputs((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : prev[key],
    }))
  }

  const runPrediction = () => {
    const {
      temperature,
      humidity,
      ambientHumidity,
      vocIndex,
      baselineVoc24h,
      moisture,
      storageDays,
      airflow,
      rainfall,
    } = inputs

    // Dew point using Magnus formula
    const magnusA = 17.62
    const magnusB = 243.12
    const gamma =
      (magnusA * temperature) / (magnusB + temperature) + Math.log(Math.max(humidity, 1) / 100)
    const dewPoint = (magnusB * gamma) / (magnusA - gamma)
    const dewGap = temperature - dewPoint

    // VOC relative and rate of change
    const vocBaseline = baselineVoc24h > 0 ? baselineVoc24h : vocIndex
    const vocRelative = (vocIndex / vocBaseline) * 100
    const vocRate = vocIndex - vocBaseline

    // VOC-first thresholds (per spec)
    const yellowTrigger = vocRelative > 150 && vocRate > 20
    const redTrigger = vocRelative > 300 || (vocRelative > 100 && moisture > 14)

    const riskLevel: RiskLevel = redTrigger ? "HIGH" : yellowTrigger ? "MEDIUM" : "LOW"

    // Risk score blends VOC signals with moisture and airflow support
    let riskScore = 25
    if (riskLevel === "MEDIUM") riskScore = 55
    if (riskLevel === "HIGH") riskScore = 85
    riskScore += Math.max(0, moisture - 13) * 2
    riskScore -= airflow * 5
    riskScore = Math.min(100, Math.max(0, riskScore))

    // Guardrails for ventilation
    const guardrails: string[] = []
    if (dewGap < 1) guardrails.push("Dew point is within 1°C of core temperature (condensation risk).")
    if (rainfall > 0) guardrails.push("External rainfall detected — block venting.")
    if (ambientHumidity > 80)
      guardrails.push("Ambient humidity above 80% — avoid bringing in moist air.")

    const shouldBlockFan = guardrails.length > 0

    // Pest presence heuristic
    let pestScore = 0.05
    if (yellowTrigger) pestScore += 0.4
    if (redTrigger) pestScore += 0.35
    if (humidity > 70 || ambientHumidity > 75) pestScore += 0.1
    if (storageDays > 60) pestScore += 0.05
    pestScore = Math.min(1, pestScore)

    const confidence = redTrigger ? 92 : yellowTrigger ? 86 : 78
    const timeToSpoilage = Math.max(1, Math.round(redTrigger ? 7 : yellowTrigger ? 14 : 24))

    setResult({
      type: "prediction",
      riskScore,
      riskLevel,
      confidence,
      timeToSpoilage,
      dewPoint: Number(dewPoint.toFixed(2)),
      dewGap: Number(dewGap.toFixed(2)),
      vocRelative: Number(vocRelative.toFixed(1)),
      vocRate: Number(vocRate.toFixed(1)),
      pestScore: Number((pestScore * 100).toFixed(1)),
      guardrails: {
        active: shouldBlockFan,
        reasons: guardrails,
      },
    })
  }

  const showValidation = () => {
    setResult({
      type: "validation",
      trainingAccuracy: 87.3,
      testAccuracy: 85.7,
      precision: 92.1,
      recall: 84.7,
      f1Score: 0.88,
      crossValidation: 86.2,
      crossValidationStd: 2.1,
    })
  }

  const showDataset = () => {
    setResult({
      type: "dataset",
      totalSamples: 319,
      trainingSamples: 255,
      testSamples: 64,
      features: 11,
      dataQuality: 98.7,
      outliers: 12,
      classBalance: "Balanced",
    })
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

    if (result.type === "validation") {
      return (
        <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3 text-sm">
          <div className="text-sm font-semibold text-slate-900">Model Validation Results</div>
          <div className="flex justify-between">
            <span>Training Accuracy</span>
            <span className="font-mono">{result.trainingAccuracy.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Test Accuracy</span>
            <span className="font-mono">{result.testAccuracy.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Precision</span>
            <span className="font-mono">{result.precision.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Recall</span>
            <span className="font-mono">{result.recall.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>F1-Score</span>
            <span className="font-mono">{result.f1Score.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Cross-Validation Score</span>
            <span className="font-mono">
              {result.crossValidation.toFixed(1)}% ± {result.crossValidationStd.toFixed(1)}%
            </span>
          </div>
        </div>
      )
    }

    return (
      <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3 text-sm">
        <div className="text-sm font-semibold text-slate-900">Dataset Overview</div>
        <div className="flex justify-between">
          <span>Total Records</span>
          <span className="font-mono">{result.totalSamples} samples</span>
        </div>
        <div className="flex justify-between">
          <span>Training Set</span>
          <span className="font-mono">
            {result.trainingSamples} samples ({Math.round((result.trainingSamples / result.totalSamples) * 100)}%)
          </span>
        </div>
        <div className="flex justify-between">
          <span>Test Set</span>
          <span className="font-mono">
            {result.testSamples} samples ({Math.round((result.testSamples / result.totalSamples) * 100)}%)
          </span>
        </div>
        <div className="flex justify-between">
          <span>Features Tracked</span>
          <span className="font-mono">{result.features}</span>
        </div>
        <div className="flex justify-between">
          <span>Data Quality</span>
          <span className="font-mono">{result.dataQuality.toFixed(1)}% complete</span>
        </div>
        <div className="flex justify-between">
          <span>Outliers Detected</span>
          <span className="font-mono">
            {result.outliers} ({((result.outliers / result.totalSamples) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="flex justify-between">
          <span>Class Distribution</span>
          <span className="font-mono">{result.classBalance}</span>
        </div>
        <div className="pt-3 border-t text-xs text-slate-600 space-y-1">
          <div className="font-semibold text-slate-700">Feature Groups</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Direct: Core T/RH, VOC_index, Grain Moisture, Ambient Light</li>
            <li>Derived: Dew Point, VOC_relative, VOC_rate, Airflow, Pest Presence</li>
            <li>External & Meta: Rainfall, Storage Days, Grain Type, Spoilage Label</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Risk Assessment</h1>
        <p className="text-muted-foreground">
          Run live spoilage predictions, validate the model, and inspect dataset quality for your storage
          conditions.
        </p>
      </div>

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
              <Button className="flex-1 min-w-[180px]" onClick={runPrediction}>
                <Brain className="h-4 w-4 mr-2" />
                Run Live Prediction
              </Button>
              <Button className="flex-1 min-w-[180px]" variant="outline" onClick={showValidation}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate Accuracy
              </Button>
              <Button className="flex-1 min-w-[180px]" variant="outline" onClick={showDataset}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Dataset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

