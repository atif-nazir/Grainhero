'use client'

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  AlertTriangle,
  Target,
  Gauge,
  Zap,
  CheckCircle,
  Shield,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useEnvironmentalHistory,
  useEnvironmentalLocations,
  LocationOption,
  EnvironmentalRecord,
} from '@/lib/useEnvironmentalData';
import { ActuatorQuickActions } from '@/components/actuator-quick-actions';

interface SpoilagePrediction {
  _id: string;
  prediction_id: string;
  batch_id: { batch_id: string; grain_type: string };
  silo_id: { name: string };
  risk_score: number;
  risk_level: string;
  confidence_score: number;
  prediction_details?: { key_risk_factors?: string[]; time_to_spoilage?: number };
  created_at: string;
}

interface Advisory {
  _id: string;
  advisory_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
}

interface SpoilageStatistics {
  total_predictions: number;
  avg_risk_score: number;
  high_risk_predictions: number;
  critical_predictions: number;
  validated_predictions: number;
}

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const AISpoilagePage = () => {
  const t = useTranslations('aiSpoilage');
  const [predictions, setPredictions] = useState<SpoilagePrediction[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [statistics, setStatistics] = useState<SpoilageStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const { locations, loading: locationsLoading } = useEnvironmentalLocations();
  const [selectedLocation, setSelectedLocation] =
    useState<LocationOption | null>(null);

  useEffect(() => {
    if (!selectedLocation && locations.length > 0) {
      setSelectedLocation(locations[0]);
    }
  }, [locations, selectedLocation]);

  const {
    data: envHistory,
    latest: latestRecord,
    loading: historyLoading,
  } = useEnvironmentalHistory({
    limit: 288,
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('token')
            : null;
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const [predRes, advRes, statsRes] = await Promise.all([
          fetch(`${backendUrl}/ai-spoilage/predictions`, { headers }),
          fetch(`${backendUrl}/ai-spoilage/advisories`, { headers }),
          fetch(`${backendUrl}/ai-spoilage/statistics`, { headers }),
        ]);

        if (predRes.ok) {
          const json = await predRes.json();
          setPredictions(json.predictions || []);
        } else {
          setPredictions([]);
        }

        if (advRes.ok) {
          const json = await advRes.json();
          setAdvisories(json.advisories || []);
        } else {
          setAdvisories([]);
        }

        if (statsRes.ok) {
          const json = await statsRes.json();
          setStatistics(json.statistics || null);
        } else {
          setStatistics(null);
        }
      } catch (error) {
        console.error('Failed to load AI spoilage data', error);
        setPredictions([]);
        setAdvisories([]);
        setStatistics(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rainfallTrend = useMemo(() => {
    return envHistory.slice(-48).map((record: EnvironmentalRecord) => ({
      timestamp: new Date(record.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      rainfall: record.environmental_context?.weather?.precipitation ?? 0,
      vocRelative: record.derived_metrics?.voc_relative ?? 0,
      humidity:
        record.environmental_context?.weather?.humidity ??
        record.humidity?.value ??
        0,
    }));
  }, [envHistory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-gray-700" />
            {t('title', { default: 'AI Spoilage Intelligence' })}
          </h1>
          <p className="text-sm text-gray-600">
            {t('subtitle', {
              default:
                'Monitor VOC-first predictions, advisories, and environmental conditions.',
            })}
          </p>
        </div>
        {locations.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Location</span>
            <select
              className="border rounded-md px-3 py-1 text-sm"
              value={selectedLocation?.city || ''}
              onChange={(event) => {
                const loc = locations.find(
                  (l) => l.city === event.target.value,
                );
                if (loc) setSelectedLocation(loc);
              }}
            >
              {locations.map((loc) => (
                <option
                  key={`${loc.city}-${loc.latitude}`}
                  value={loc.city}
                >
                  {loc.city} ({loc.silo_count} silos)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>Environmental Snapshot</CardTitle>
          <CardDescription>
            {historyLoading ? 'Loading dataset...' : latestRecord ? `Latest at ${new Date(latestRecord.timestamp).toLocaleString()}` : 'No dataset yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestRecord ? (
            <div className="grid gap-4 md:grid-cols-4 text-sm">
              <div>
                <div className="text-xs uppercase text-gray-500">Temp</div>
                <div className="text-lg font-medium">
                  {(
                    latestRecord.temperature?.value ??
                    latestRecord.environmental_context?.weather?.temperature ??
                    '--'
                  )}{' '}
                  °C
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">
                  Humidity
                </div>
                <div className="text-lg font-medium">
                  {(
                    latestRecord.humidity?.value ??
                    latestRecord.environmental_context?.weather?.humidity ??
                    '--'
                  )}{' '}
                  %
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">
                  Grain Moisture
                </div>
                <div className="text-lg font-medium">
                  {latestRecord.moisture?.value ?? '--'} %
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">
                  VOC Relative
                </div>
                <div className="text-lg font-medium">
                  {latestRecord.derived_metrics?.voc_relative?.toFixed(1) ??
                    '0'}
                  %
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">
                  Fan Duty
                </div>
                <div className="text-lg font-medium">
                  {latestRecord.actuation_state?.fan_duty_cycle?.toFixed(0) ??
                    0}
                  %
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">
                  Rainfall
                </div>
                <div className="text-lg font-medium">
                  {latestRecord.environmental_context?.weather?.precipitation ??
                    0}{' '}
                  mm
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">
                  Guardrails
                </div>
                <div className="text-sm font-medium">
                  {latestRecord.derived_metrics?.guardrails?.venting_blocked
                    ? `Active (${latestRecord.derived_metrics.guardrails.reasons?.join(', ')})`
                    : 'Clear'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No environmental history available.
            </p>
          )}
          {rainfallTrend.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">
                  Rainfall / VOC Trend (last 24h)
                </h4>
                <span className="text-xs text-gray-500">
                  {rainfallTrend.length} points
                </span>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rainfallTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" minTickGap={24} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="rainfall"
                      stroke="#3b82f6"
                      name="Rainfall (mm)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="vocRelative"
                      stroke="#ef4444"
                      name="VOC Relative (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Predictions</CardTitle>
            <CardDescription>Active ML outputs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '--' : predictions.length}
            </div>
            <p className="text-xs text-gray-500">Batches evaluated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">High Risk</CardTitle>
            <CardDescription>VOC thresholds triggered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {predictions.filter((p) => p.risk_level === 'high').length}
            </div>
            <p className="text-xs text-gray-500">Requires action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Open Advisories</CardTitle>
            <CardDescription>Pending recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {advisories.filter((a) => a.status !== 'completed').length}
            </div>
            <p className="text-xs text-gray-500">To be resolved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Predictions</CardTitle>
            <CardDescription>
              VOC-first ML results per batch (live data only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {!loading && predictions.length === 0 && (
              <p className="text-sm text-gray-500">
                No predictions available yet.
              </p>
            )}
            {predictions.map((prediction) => (
              <div
                key={prediction._id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{prediction.batch_id.batch_id}</div>
                    <div className="text-xs text-gray-500">
                      {prediction.batch_id.grain_type} • {prediction.silo_id.name}
                    </div>
                  </div>
                  <Badge
                    variant={
                      prediction.risk_level === 'high'
                        ? 'destructive'
                        : prediction.risk_level === 'medium'
                        ? 'secondary'
                        : 'default'
                    }
                  >
                    {prediction.risk_level}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                  <span>
                    Risk:{' '}
                    <span className="font-medium">
                      {prediction.risk_score}%
                    </span>
                  </span>
                  <span>
                    Confidence:{' '}
                    <span className="font-medium">
                      {Math.round((prediction.confidence_score || 0) * 100)}%
                    </span>
                  </span>
                  <span>
                    Spoilage ETA:{' '}
                    <span className="font-medium">
                      {Math.round(
                        (prediction.prediction_details?.time_to_spoilage || 24) /
                          24,
                      )}
                      d
                    </span>
                  </span>
                  <span>
                    Risk factors:{' '}
                    {(prediction.prediction_details?.key_risk_factors || [])
                      .slice(0, 2)
                      .join(', ') || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {new Date(prediction.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Operational Advisories</CardTitle>
            <CardDescription>
              Actions generated by AI (auto + manual updates)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {!loading && advisories.length === 0 && (
              <p className="text-sm text-gray-500">
                No advisories open at the moment.
              </p>
            )}
            {advisories.map((advisory) => (
              <div
                key={advisory._id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{advisory.title}</div>
                  <Badge
                    variant={
                      advisory.priority === 'high'
                        ? 'destructive'
                        : advisory.priority === 'medium'
                        ? 'secondary'
                        : 'default'
                    }
                  >
                    {advisory.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{advisory.description}</p>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  Status: {advisory.status}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>Model Statistics</CardTitle>
          <CardDescription>
            Live performance summary for SmartBin-RiceSpoilage
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5 text-sm">
          <div>
            <div className="text-xs uppercase text-gray-500">Predictions</div>
            <div className="text-lg font-semibold">
              {statistics?.total_predictions ?? '--'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Avg risk</div>
            <div className="text-lg font-semibold">
              {statistics?.avg_risk_score ?? '--'}%
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">High risk</div>
            <div className="text-lg font-semibold text-red-600">
              {statistics?.high_risk_predictions ?? '--'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Critical</div>
            <div className="text-lg font-semibold text-red-700">
              {statistics?.critical_predictions ?? '--'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Validated</div>
            <div className="text-lg font-semibold text-green-600">
              {statistics?.validated_predictions ?? '--'}
            </div>
          </div>
        </CardContent>
      </Card>

      <ActuatorQuickActions compact />

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('/api/docs', '_blank')}
        >
          <Brain className="h-4 w-4 mr-2" />
          API Docs
        </Button>
        <Button
          size="sm"
          className="bg-gray-900 hover:bg-gray-800"
          onClick={() => window.open(`${backendUrl}/api/sensors/export/iot-csv`)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Dataset
        </Button>
      </div>
    </div>
  );
};

export default AISpoilagePage;
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Target, 
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Fan,
  Droplets,
  Volume2,
  Shield,
  BarChart3,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  RefreshCw,
  Calendar,
  Thermometer,
  Wind,
  Gauge
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useEnvironmentalHistory, useEnvironmentalLocations, LocationOption } from '@/lib/useEnvironmentalData';

interface SpoilagePrediction {
  _id: string;
  prediction_id: string;
  batch_id: {
    batch_id: string;
    grain_type: string;
    quantity_kg: number;
  };
  silo_id: {
    name: string;
    silo_id: string;
  };
  prediction_type: string;
  risk_score: number;
  risk_level: string;
  confidence_score: number;
  predicted_date: string;
  environmental_factors: {
    temperature: { current: number; trend: string; impact_score: number };
    humidity: { current: number; trend: string; impact_score: number };
    co2: { current: number; trend: string; impact_score: number };
    moisture: { current: number; trend: string; impact_score: number };
  };
  prediction_details: {
    key_risk_factors: string[];
    secondary_risk_factors: string[];
    time_to_spoilage: number;
    severity_indicators: string[];
  };
  validation_status: string;
  created_at: string;
}

interface Advisory {
  _id: string;
  advisory_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  advisory_type: string;
  effectiveness_score: number;
  implementation_details: {
    estimated_duration: number;
    required_skills: string[];
    required_equipment: string[];
  };
  recommended_timing: {
    start_time: string;
    completion_deadline: string;
  };
  created_at: string;
}

interface Statistics {
  total_predictions: number;
  avg_risk_score: number;
  high_risk_predictions: number;
  critical_predictions: number;
  validated_predictions: number;
  false_positives: number;
  false_negatives: number;
  total_advisories: number;
  completed_advisories: number;
  in_progress_advisories: number;
  overdue_advisories: number;
  avg_effectiveness: number;
  risk_distribution: Array<{
    _id: string;
    count: number;
    avg_risk_score: number;
  }>;
}

const AISpoilagePage = () => {
  const t = useTranslations('aiSpoilage');
  const [predictions, setPredictions] = useState<SpoilagePrediction[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('predictions');
  const [selectedPrediction, setSelectedPrediction] = useState<SpoilagePrediction | null>(null);
  const [selectedAdvisory, setSelectedAdvisory] = useState<Advisory | null>(null);
  const [showNewPrediction, setShowNewPrediction] = useState(false);
  const [showNewAdvisory, setShowNewAdvisory] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showRetrainModal, setShowRetrainModal] = useState(false);
  const [filterRiskLevel, setFilterRiskLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRetraining, setIsRetraining] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [realTimePredictions, setRealTimePredictions] = useState([]);
  const [isRealTimeMonitoring, setIsRealTimeMonitoring] = useState(false);
  const { locations } = useEnvironmentalLocations();
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  const { data: envHistory, latest: latestRecord, loading: datasetLoading } = useEnvironmentalHistory({
    limit: 288,
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
  });
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    loadData();
    loadModelStatus();
  }, []);

  useEffect(() => {
    if (!selectedLocation && locations.length > 0) {
      setSelectedLocation(locations[0]);
    }
  }, [locations, selectedLocation]);

  // Remove dynamic demo mode – rely on live backend data

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      
      console.log('Loading data with token:', token ? 'Present' : 'Missing');

      // Load predictions with better error handling
      try {
        const predictionsResponse = await fetch(`${backendUrl}/ai-spoilage/predictions`, { headers });
        if (!predictionsResponse.ok) {
          throw new Error(`HTTP ${predictionsResponse.status}: ${predictionsResponse.statusText}`);
        }
        const predictionsData = await predictionsResponse.json();
        setPredictions(predictionsData.predictions || []);
        console.log('✅ Predictions loaded:', predictionsData.predictions?.length || 0);
      } catch (error) {
        console.error('❌ Error loading predictions:', error);
        setPredictions([]);
      }

      // Load advisories with better error handling
      try {
        const advisoriesResponse = await fetch(`${backendUrl}/ai-spoilage/advisories`, { headers });
        if (!advisoriesResponse.ok) {
          throw new Error(`HTTP ${advisoriesResponse.status}: ${advisoriesResponse.statusText}`);
        }
        const advisoriesData = await advisoriesResponse.json();
        setAdvisories(advisoriesData.advisories || []);
        console.log('✅ Advisories loaded:', advisoriesData.advisories?.length || 0);
      } catch (error) {
        console.error('❌ Error loading advisories:', error);
        setAdvisories([]);
      }

      // Load statistics with better error handling
      try {
        const statsResponse = await fetch(`${backendUrl}/ai-spoilage/statistics`, { headers });
        if (!statsResponse.ok) {
          throw new Error(`HTTP ${statsResponse.status}: ${statsResponse.statusText}`);
        }
        const statsData = await statsResponse.json();
        console.log('✅ Statistics loaded:', statsData);
        setStatistics(statsData || mockStatistics);
      } catch (error) {
        console.error('❌ Error loading statistics:', error);
        setStatistics(mockStatistics);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      // Use mock data as fallback
      setPredictions(mockPredictions);
      setAdvisories(mockAdvisories);
      setStatistics(mockStatistics);
    } finally {
      setLoading(false);
    }
    prediction_type: string
    risk_score: number
    risk_level: string
    confidence_score: number
    predicted_date: string | Date
    environmental_factors: {
        temperature: { current: number }
        humidity: { current: number }
        co2?: { current: number }
        moisture: { current: number }
    }
    prediction_details: {
        key_risk_factors?: string[]
        time_to_spoilage?: number
    }
}

interface Advisory {
    _id: string
    advisory_id: string
    title: string
    description: string
    priority: string
    status: string
    effectiveness_score: number
    implementation_details?: {
        estimated_duration?: number
        required_skills?: string[]
        required_equipment?: string[]
    }
    recommended_timing?: {
        completion_deadline?: string
    }
    created_at: string
}

interface Statistics {
    total_predictions: number
    avg_risk_score: number
    high_risk_predictions: number
    critical_predictions: number
    validated_predictions: number
    false_positives: number
    false_negatives: number
    total_advisories: number
    completed_advisories: number
    in_progress_advisories: number
    overdue_advisories: number
    avg_effectiveness: number
    risk_distribution: Array<{
        _id: string
        count: number
        avg_risk_score: number
    }>
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
const widthClasses = ['w-0', 'w-1/6', 'w-1/4', 'w-1/3', 'w-1/2', 'w-2/3', 'w-3/4', 'w-5/6', 'w-full']

const getWidthClass = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value))
    const index = Math.min(widthClasses.length - 1, Math.round((clamped / 100) * (widthClasses.length - 1)))
    return widthClasses[index]
}

const getRiskBadge = (risk: string) => {
    switch (risk) {
        case 'critical':
            return 'bg-red-600 text-white'
        case 'high':
            return 'bg-orange-500 text-white'
        case 'medium':
            return 'bg-yellow-500 text-white'
        case 'low':
            return 'bg-green-500 text-white'
        default:
            return 'bg-gray-500 text-white'
    }
}

const AISpoilagePage = () => {
    const [predictions, setPredictions] = useState<SpoilagePrediction[]>([])
    const [advisories, setAdvisories] = useState<Advisory[]>([])
    const [statistics, setStatistics] = useState<Statistics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'predictions' | 'advisories' | 'analytics'>('predictions')
    const [filterRisk, setFilterRisk] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }

            const [predictionsRes, advisoriesRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/ai-spoilage/predictions`, { headers }),
                fetch(`${API_BASE}/ai-spoilage/advisories`, { headers }),
                fetch(`${API_BASE}/ai-spoilage/statistics`, { headers })
            ])

            if (!predictionsRes.ok || !advisoriesRes.ok || !statsRes.ok) {
                throw new Error('Failed to load AI spoilage data')
            }

            const predictionsData = await predictionsRes.json()
            const advisoriesData = await advisoriesRes.json()
            const statsData = await statsRes.json()

            setPredictions(predictionsData.predictions || [])
            setAdvisories(advisoriesData.advisories || [])
            setStatistics(statsData || null)
        } catch (err) {
            console.error('ai-spoilage load error', err)
            setError('Unable to load AI spoilage data right now. Please try again.')
            setPredictions([])
            setAdvisories([])
            setStatistics(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadData()
    }, [loadData])

    const filteredPredictions = useMemo(() => {
        return predictions.filter(prediction => {
            const matchesRisk = filterRisk === 'all' || prediction.risk_level === filterRisk
            const matchesSearch =
                searchTerm.trim() === '' ||
                prediction.batch_id.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                prediction.silo_id.name.toLowerCase().includes(searchTerm.toLowerCase())
            return matchesRisk && matchesSearch
        })
    }, [predictions, filterRisk, searchTerm])

    const filteredAdvisories = useMemo(() => {
        return advisories.filter(advisory => {
            const matchesStatus = filterStatus === 'all' || advisory.status === filterStatus
            const matchesSearch =
                searchTerm.trim() === '' ||
                advisory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                advisory.description.toLowerCase().includes(searchTerm.toLowerCase())
            return matchesStatus && matchesSearch
        })
    }, [advisories, filterStatus, searchTerm])

    const riskDistribution =
        statistics?.risk_distribution?.map(item => ({
            name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
            value: item.count
        })) || []

    const trendData = predictions.slice(0, 7).map((prediction, idx) => ({
        day: `D${idx + 1}`,
        temperature: prediction.environmental_factors.temperature.current,
        humidity: prediction.environmental_factors.humidity.current
    }))

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center text-gray-500">
                Loading AI spoilage insights…
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">AI Spoilage Intelligence</h1>
                    <p className="text-sm text-gray-500">
                        Real-time spoilage predictions, advisories, and model analytics
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSearchTerm('')} aria-label="Clear search filters">
                        Clear Filters
                    </Button>
                    <Button onClick={loadData} aria-label="Refresh data">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm text-gray-500">Total Predictions</p>
                            <p className="text-3xl font-bold">{statistics?.total_predictions ?? 0}</p>
                        </div>
                        <div className="rounded-full bg-blue-50 p-3">
                            <Brain className="h-6 w-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm text-gray-500">High Risk Events</p>
                            <p className="text-3xl font-bold text-orange-600">{statistics?.high_risk_predictions ?? 0}</p>
                        </div>
                        <div className="rounded-full bg-orange-50 p-3">
                            <AlertTriangle className="h-6 w-6 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm text-gray-500">Active Advisories</p>
                            <p className="text-3xl font-bold text-green-600">{statistics?.in_progress_advisories ?? 0}</p>
                        </div>
                        <div className="rounded-full bg-green-50 p-3">
                            <Target className="h-6 w-6 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm text-gray-500">Model Accuracy</p>
                            <p className="text-3xl font-bold text-purple-600">
                                {Math.round((statistics?.avg_effectiveness || 0) * 100)}%
                            </p>
                        </div>
                        <div className="rounded-full bg-purple-50 p-3">
                            <Activity className="h-6 w-6 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="predictions">Predictions</TabsTrigger>
                    <TabsTrigger value="advisories">Advisories</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="predictions" className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-1 items-center gap-2">
                            <Search className="h-4 w-4 text-gray-400" />
                            <label htmlFor="prediction-search" className="sr-only">
                                Search predictions
                            </label>
                            <input
                                id="prediction-search"
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by batch or silo"
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="risk-filter" className="text-sm font-medium text-gray-600">
                                Risk
                            </label>
                            <select
                                id="risk-filter"
                                value={filterRisk}
                                onChange={e => setFilterRisk(e.target.value)}
                                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-0"
                            >
                                <option value="all">All</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredPredictions.map(prediction => (
                            <Card key={prediction._id} className="border border-gray-100 shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base">
                                                {prediction.batch_id.batch_id} · {prediction.batch_id.grain_type}
                                            </CardTitle>
                                            <CardDescription>{prediction.silo_id.name}</CardDescription>
                                        </div>
                                        <Badge className={getRiskBadge(prediction.risk_level)}>{prediction.risk_level}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-gray-500">Risk</p>
                                            <p className="text-lg font-semibold">{Math.round(prediction.risk_score)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Confidence</p>
                                            <p className="text-lg font-semibold">
                                                {Math.round(prediction.confidence_score * 100)}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">ETA</p>
                                            <p className="text-lg font-semibold">
                                                {prediction.prediction_details.time_to_spoilage
                                                    ? Math.round(prediction.prediction_details.time_to_spoilage / 24)
                                                    : '—'}{' '}
                                                d
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <Thermometer className="h-3 w-3" />
                                                Temperature
                                            </span>
                                            <span className="font-medium">
                                                {prediction.environmental_factors.temperature.current.toFixed(1)}°C
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <Droplets className="h-3 w-3" />
                                                Humidity
                                            </span>
                                            <span className="font-medium">
                                                {prediction.environmental_factors.humidity.current.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    {prediction.prediction_details.key_risk_factors &&
                                        prediction.prediction_details.key_risk_factors.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {prediction.prediction_details.key_risk_factors.slice(0, 3).map(factor => (
                                                    <Badge key={factor} variant="secondary" className="text-xs capitalize">
                                                        {factor.replaceAll('_', ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredPredictions.length === 0 && (
                        <Card>
                            <CardContent className="py-8 text-center text-sm text-gray-500">
                                No predictions match your current filters.
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="advisories" className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-1 items-center gap-2">
                            <Search className="h-4 w-4 text-gray-400" />
                            <label htmlFor="advisory-search" className="sr-only">
                                Search advisories
                            </label>
                            <input
                                id="advisory-search"
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search advisories"
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="status-filter" className="text-sm font-medium text-gray-600">
                                Status
                            </label>
                            <select
                                id="status-filter"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-0"
                            >
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="assigned">Assigned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredAdvisories.map(advisory => (
                            <Card key={advisory._id} className="border border-gray-100 shadow-sm">
                                <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <CardTitle className="text-base">{advisory.title}</CardTitle>
                                        <CardDescription>{advisory.description}</CardDescription>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary" className="capitalize">
                                            Priority: {advisory.priority}
                                        </Badge>
                                        <Badge className="capitalize">{advisory.status.replaceAll('_', ' ')}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Effectiveness</p>
                                        <div className="mt-1 h-2 rounded-full bg-gray-100">
                                            <div
                                                className={`h-full rounded-full bg-green-500 ${getWidthClass(
                                                    (advisory.effectiveness_score || 0) * 100
                                                )}`}
                                            />
                                        </div>
                                        <p className="mt-1 text-sm font-semibold">
                                            {Math.round((advisory.effectiveness_score || 0) * 100)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Duration</p>
                                        <p className="text-sm font-semibold">
                                            {advisory.implementation_details?.estimated_duration ?? '--'} mins
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Due:{' '}
                                            {advisory.recommended_timing?.completion_deadline
                                                ? new Date(advisory.recommended_timing.completion_deadline).toLocaleDateString()
                                                : 'Not set'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Equipment</p>
                                        <div className="flex flex-wrap gap-1">
                                            {advisory.implementation_details?.required_equipment?.slice(0, 3).map(item => (
                                                <Badge key={item} variant="outline" className="text-xs capitalize">
                                                    {item.replaceAll('_', ' ')}
                                                </Badge>
                                            )) || <span className="text-sm text-gray-600">Not specified</span>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredAdvisories.length === 0 && (
                        <Card>
                            <CardContent className="py-8 text-center text-sm text-gray-500">
                                No advisories match your filters.
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Risk Distribution</CardTitle>
                                <CardDescription>Breakdown of predictions by risk level</CardDescription>
                            </CardHeader>
                            <CardContent className="h-72">
                                {riskDistribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={riskDistribution}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={90}
                                                label
                                            >
                                                {riskDistribution.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${entry.name}`}
                                                        fill={['#22c55e', '#facc15', '#fb923c', '#ef4444'][index % 4]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                        Not enough data for analytics.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Environmental Trend (Latest 7)</CardTitle>
                                <CardDescription>Temperature & humidity signals from recent predictions</CardDescription>
                            </CardHeader>
                            <CardContent className="h-72">
                                {trendData.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="day" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="temperature" stroke="#3b82f6" strokeWidth={2} />
                                            <Line type="monotone" dataKey="humidity" stroke="#10b981" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                        Need more predictions to visualise the trend.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-xs text-gray-500">Validated Predictions</p>
                                <p className="text-2xl font-semibold">{statistics?.validated_predictions ?? 0}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-xs text-gray-500">False Positives</p>
                                <p className="text-2xl font-semibold text-orange-500">{statistics?.false_positives ?? 0}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-xs text-gray-500">False Negatives</p>
                                <p className="text-2xl font-semibold text-red-500">{statistics?.false_negatives ?? 0}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-xs text-gray-500">Avg Risk Score</p>
                                <p className="text-2xl font-semibold">{Math.round(statistics?.avg_risk_score || 0)}%</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default AISpoilagePage

