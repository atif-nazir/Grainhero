'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Download, 
  Filter,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
} from 'lucide-react';
import { 
  LineChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
} from 'recharts';
import { useEnvironmentalHistory } from '@/lib/useEnvironmentalData';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function DataVisualizationPage() {
  const [selectedRange, setSelectedRange] = useState<'24h' | '7d' | '30d'>('24h');
  const points = selectedRange === '24h' ? 288 : selectedRange === '7d' ? 288 * 7 : 288 * 30;
  const { data: envHistory, latest } = useEnvironmentalHistory({ limit: points });

  const chartData = useMemo(() => {
    return envHistory.map((record) => ({
      timestamp: new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temperature:
        record.temperature?.value ??
        record.environmental_context?.weather?.temperature ??
        0,
      humidity:
        record.humidity?.value ??
        record.environmental_context?.weather?.humidity ??
        0,
      airflow: record.derived_metrics?.airflow ?? 0,
      rainfall: record.environmental_context?.weather?.precipitation ?? 0,
      vocRelative: record.derived_metrics?.voc_relative ?? 0,
    }));
  }, [envHistory]);

  const siloAgg = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; avgTemp: number; avgHumidity: number }
    >();
    envHistory.forEach((record) => {
      const key = record.silo_id || 'Unknown';
      const entry = map.get(key) || {
        name: key,
        count: 0,
        avgTemp: 0,
        avgHumidity: 0,
      };
      entry.count += 1;
      entry.avgTemp +=
        record.temperature?.value ??
        record.environmental_context?.weather?.temperature ??
        0;
      entry.avgHumidity +=
        record.humidity?.value ??
        record.environmental_context?.weather?.humidity ??
        0;
      map.set(key, entry);
    });
    return Array.from(map.values()).map((entry) => ({
      ...entry,
      avgTemp: entry.count ? entry.avgTemp / entry.count : 0,
      avgHumidity: entry.count ? entry.avgHumidity / entry.count : 0,
    }));
  }, [envHistory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-gray-700" />
            IoT Data Visualization
          </h1>
          <p className="text-sm text-gray-600">
            Real-time plots driven directly from 5-minute aggregated SensorReading records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={selectedRange} onValueChange={(value: '24h' | '7d' | '30d') => setSelectedRange(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase text-gray-500 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-gray-600" />
              Avg Temperature
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {chartData.length
              ? `${(
                  chartData.reduce((sum, item) => sum + item.temperature, 0) /
                  chartData.length
                ).toFixed(1)}°C`
              : '--'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase text-gray-500 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-600" />
              Avg Humidity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {chartData.length
              ? `${(
                  chartData.reduce((sum, item) => sum + item.humidity, 0) /
                  chartData.length
                ).toFixed(1)}%`
              : '--'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase text-gray-500 flex items-center gap-2">
              <Wind className="h-4 w-4 text-blue-600" />
              Avg Airflow
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {chartData.length
              ? `${(
                  chartData.reduce((sum, item) => sum + item.airflow, 0) /
                  chartData.length
                ).toFixed(2)} m³/s`
              : '--'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase text-gray-500 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-orange-600" />
              Avg VOC Relative
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {chartData.length
              ? `${(
                  chartData.reduce((sum, item) => sum + item.vocRelative, 0) /
                  chartData.length
                ).toFixed(1)}%`
              : '--'}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Temperature & Humidity Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" minTickGap={32} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                name="Temperature (°C)"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                stroke="#0ea5e9"
                name="Humidity (%)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rainfall vs Fan Strategy</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" minTickGap={24} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rainfall" fill="#3b82f6" name="Rainfall (mm)" />
                <Bar dataKey="airflow" fill="#a855f7" name="Airflow (m³/s)" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Silo Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {siloAgg.length === 0 && (
              <p className="text-sm text-gray-500">No silo readings yet.</p>
            )}
            {siloAgg.map((silo) => (
              <div
                key={silo.name}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{silo.name}</div>
                  <div className="text-xs text-gray-500">
                    {silo.count} readings
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div>{silo.avgTemp.toFixed(1)}°C</div>
                  <div>{silo.avgHumidity.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dataset">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dataset">Dataset Preview</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>
        <TabsContent value="dataset">
          <Card>
            <CardHeader>
              <CardTitle>Latest Records</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-500 text-left">
                    <th className="py-2 pr-4">Timestamp</th>
                    <th className="py-2 pr-4">Temp</th>
                    <th className="py-2 pr-4">Hum</th>
                    <th className="py-2 pr-4">Moisture</th>
                    <th className="py-2 pr-4">Airflow</th>
                    <th className="py-2 pr-4">VOC_rel</th>
                    <th className="py-2 pr-4">Rainfall</th>
                  </tr>
                </thead>
                <tbody>
                  {envHistory.slice(-15).map((record) => (
                    <tr key={record.timestamp} className="border-t">
                      <td className="py-2 pr-4">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        {record.temperature?.value ??
                          record.environmental_context?.weather?.temperature ??
                          '--'}
                      </td>
                      <td className="py-2 pr-4">
                        {record.humidity?.value ??
                          record.environmental_context?.weather?.humidity ??
                          '--'}
                      </td>
                      <td className="py-2 pr-4">
                        {record.moisture?.value ?? '--'}
                      </td>
                      <td className="py-2 pr-4">
                        {record.derived_metrics?.airflow?.toFixed(2) ?? '0'}
                      </td>
                      <td className="py-2 pr-4">
                        {record.derived_metrics?.voc_relative?.toFixed(1) ??
                          '0'}
                        %
                      </td>
                      <td className="py-2 pr-4">
                        {record.environmental_context?.weather?.precipitation ??
                          0}{' '}
                        mm
                      </td>
                    </tr>
                  ))}
                  {envHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-500">
                        Waiting for IoT readings...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Export & Integrations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(
                      `${backendUrl}/sensors/export/iot-csv`,
                      {
                        headers: {
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                      },
                    );
                    if (!response.ok) throw new Error('Failed to export CSV');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `iot-readings-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    alert('Export failed');
                  }
                }}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
