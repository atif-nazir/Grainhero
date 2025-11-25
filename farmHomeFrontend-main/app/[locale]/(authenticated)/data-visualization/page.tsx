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
  const exportToPDF = async () => {
    try {
      const response = await fetch('http://localhost:5000/data-viz/export/pdf');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch-reports-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export PDF. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const exportToCSV = async () => {
    try {
      const response = await fetch('http://localhost:5000/data-viz/export/csv');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch-reports-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export CSV. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskTextColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-700';
      case 'MEDIUM': return 'text-yellow-700';
      case 'HIGH': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Visualization & Reporting</h1>
              <p className="text-gray-600 mt-2">Real-time insights and comprehensive analytics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button onClick={loadData} disabled={isLoading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Responsive Controls */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Time Range:</span>
                    <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">Last 24h</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <Monitor className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Responsive Design</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sensors">Sensor Trends</TabsTrigger>
            <TabsTrigger value="silos">Silo Comparison</TabsTrigger>
            <TabsTrigger value="reports">Batch Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Silos</p>
                      <p className="text-2xl font-bold text-gray-900">{siloData.length}</p>
                    </div>
                    <Database className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Batches</p>
                      <p className="text-2xl font-bold text-gray-900">{batchReports.length}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Quality Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(batchReports.reduce((acc, batch) => acc + batch.qualityScore, 0) / batchReports.length)}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">High Risk Silos</p>
                      <p className="text-2xl font-bold text-red-600">
                        {siloData.filter(silo => silo.riskLevel === 'HIGH').length}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Real-time Sensor Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Real-time Sensor Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sensorData.slice(-1).map((data, index) => (
                    <div key={index} className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium">Temperature</span>
                        </div>
                        <span className="font-mono text-lg">{data.temperature.toFixed(1)}°C</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Humidity</span>
                        </div>
                        <span className="font-mono text-lg">{data.humidity.toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Wind className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Airflow</span>
                        </div>
                        <span className="font-mono text-lg">{data.airflow.toFixed(1)} m/s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sensor Trends Tab */}
          <TabsContent value="sensors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Sensor Trends Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={sensorData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value, name) => [value.toFixed(2), name]}
                      />
                      <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Temperature (°C)" />
                      <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} name="Humidity (%)" />
                      <Line type="monotone" dataKey="moisture" stroke="#10b981" strokeWidth={2} name="Moisture (%)" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AreaChart className="h-5 w-5" />
                    Airflow & CO2 Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sensorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                        <YAxis />
                        <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                        <Area type="monotone" dataKey="airflow" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="co2" stackId="2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Pressure Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={sensorData.slice(-10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                        <YAxis />
                        <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                        <Bar dataKey="pressure" fill="#06b6d4" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Silo Comparison Tab */}
          <TabsContent value="silos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Silo Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {siloData.map((silo) => (
                    <div key={silo.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{silo.name}</h3>
                          <p className="text-sm text-gray-600">{silo.grainType} • {silo.storageDays} days stored</p>
                        </div>
                        <Badge className={`${getRiskColor(silo.riskLevel)} text-white`}>
                          {silo.riskLevel}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{silo.currentLevel}</div>
                          <div className="text-sm text-gray-600">Current Level (tons)</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(silo.currentLevel / silo.capacity) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{silo.temperature}°C</div>
                          <div className="text-sm text-gray-600">Temperature</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{silo.humidity}%</div>
                          <div className="text-sm text-gray-600">Humidity</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{silo.storageDays}</div>
                          <div className="text-sm text-gray-600">Storage Days</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Storage Capacity Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={siloData.map(silo => ({
                            name: silo.name,
                            value: silo.currentLevel,
                            fill: silo.riskLevel === 'HIGH' ? '#ef4444' : silo.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981'
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {siloData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.riskLevel === 'HIGH' ? '#ef4444' : entry.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Level Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['LOW', 'MEDIUM', 'HIGH'].map((level) => {
                      const count = siloData.filter(silo => silo.riskLevel === level).length;
                      const percentage = (count / siloData.length) * 100;
                      return (
                        <div key={level} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getRiskColor(level)}`}></div>
                            <span className="font-medium">{level} Risk</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{count} silos</span>
                            <span className="text-sm font-semibold">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Batch Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Batch-wise Storage Reports
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={exportToPDF} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button onClick={exportToCSV} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {batchReports.map((batch) => (
                    <div key={batch.batchId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{batch.batchId}</h3>
                          <p className="text-sm text-gray-600">
                            {batch.grainType} • {batch.quantity} tons • {batch.storageDays} days
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Quality: {batch.qualityScore}%
                          </Badge>
                          <Badge className={getRiskColor(batch.qualityScore > 85 ? 'LOW' : batch.qualityScore > 70 ? 'MEDIUM' : 'HIGH')}>
                            {batch.qualityScore > 85 ? 'LOW' : batch.qualityScore > 70 ? 'MEDIUM' : 'HIGH'} Risk
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Risk Factors</h4>
                          <div className="space-y-1">
                            {batch.riskFactors.map((factor, index) => (
                              <div key={index} className="text-sm text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {factor}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Recommendations</h4>
                          <div className="space-y-1">
                            {batch.recommendations.map((rec, index) => (
                              <div key={index} className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {rec}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Storage Period</h4>
                          <div className="text-sm text-gray-600">
                            <div>Start: {new Date(batch.startDate).toLocaleDateString()}</div>
                            <div>End: {new Date(batch.endDate).toLocaleDateString()}</div>
                            <div className="font-medium">Duration: {batch.storageDays} days</div>
                          </div>
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
    </div>
  );
}
