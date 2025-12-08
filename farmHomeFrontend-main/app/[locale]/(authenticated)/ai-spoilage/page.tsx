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

