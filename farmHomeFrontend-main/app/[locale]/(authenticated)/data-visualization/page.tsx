'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  FileText, 
  Database, 
  Smartphone, 
  Monitor,
  Calendar,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Droplets,
  Wind,
  Eye,
  BarChart,
  PieChart,
  LineChart
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';

interface SensorData {
  timestamp: string;
  temperature: number;
  humidity: number;
  moisture: number;
  airflow: number;
  co2: number;
  pressure: number;
}

interface SiloData {
  id: string;
  name: string;
  capacity: number;
  currentLevel: number;
  grainType: string;
  storageDays: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  temperature: number;
  humidity: number;
  lastUpdated: string;
}

interface BatchReport {
  batchId: string;
  grainType: string;
  quantity: number;
  storageDays: number;
  qualityScore: number;
  riskFactors: string[];
  recommendations: string[];
  siloId: string;
  startDate: string;
  endDate: string;
}

export default function DataVisualizationPage() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [siloData, setSiloData] = useState<SiloData[]>([]);
  const [batchReports, setBatchReports] = useState<BatchReport[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedSilos, setSelectedSilos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data generation
  const generateMockSensorData = (hours: number) => {
    const data: SensorData[] = [];
    const now = new Date();
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        timestamp: timestamp.toISOString(),
        temperature: 20 + Math.sin(i * 0.1) * 5 + Math.random() * 2,
        humidity: 50 + Math.sin(i * 0.05) * 10 + Math.random() * 5,
        moisture: 12 + Math.sin(i * 0.08) * 2 + Math.random() * 1,
        airflow: 1.5 + Math.sin(i * 0.12) * 0.5 + Math.random() * 0.3,
        co2: 400 + Math.sin(i * 0.06) * 50 + Math.random() * 20,
        pressure: 1013 + Math.sin(i * 0.04) * 5 + Math.random() * 2
      });
    }
    return data;
  };

  const generateMockSiloData = () => [
    {
      id: 'silo-1',
      name: 'Silo A - Rice Storage',
      capacity: 1000,
      currentLevel: 750,
      grainType: 'Basmati Rice',
      storageDays: 45,
      riskLevel: 'LOW' as const,
      temperature: 22.5,
      humidity: 55,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'silo-2',
      name: 'Silo B - Wheat Storage',
      capacity: 1200,
      currentLevel: 900,
      grainType: 'Durum Wheat',
      storageDays: 30,
      riskLevel: 'MEDIUM' as const,
      temperature: 25.2,
      humidity: 65,
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'silo-3',
      name: 'Silo C - Corn Storage',
      capacity: 800,
      currentLevel: 600,
      grainType: 'Yellow Corn',
      storageDays: 60,
      riskLevel: 'HIGH' as const,
      temperature: 28.1,
      humidity: 70,
      lastUpdated: new Date().toISOString()
    }
  ];

  const generateMockBatchReports = () => [
    {
      batchId: 'BATCH-001',
      grainType: 'Basmati Rice',
      quantity: 750,
      storageDays: 45,
      qualityScore: 92,
      riskFactors: ['High humidity', 'Temperature fluctuation'],
      recommendations: ['Increase ventilation', 'Monitor moisture levels'],
      siloId: 'silo-1',
      startDate: '2024-01-15',
      endDate: '2024-03-01'
    },
    {
      batchId: 'BATCH-002',
      grainType: 'Durum Wheat',
      quantity: 900,
      storageDays: 30,
      qualityScore: 85,
      riskFactors: ['Elevated CO2 levels'],
      recommendations: ['Check ventilation system', 'Reduce storage density'],
      siloId: 'silo-2',
      startDate: '2024-02-01',
      endDate: '2024-03-02'
    },
    {
      batchId: 'BATCH-003',
      grainType: 'Yellow Corn',
      quantity: 600,
      storageDays: 60,
      qualityScore: 78,
      riskFactors: ['High temperature', 'Moisture content above threshold'],
      recommendations: ['Immediate cooling required', 'Quality inspection needed'],
      siloId: 'silo-3',
      startDate: '2024-01-01',
      endDate: '2024-03-01'
    }
  ];

  useEffect(() => {
    loadData();
  }, [selectedTimeRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch data from API endpoints
      const [sensorResponse, siloResponse, batchResponse, overviewResponse] = await Promise.all([
        fetch(`http://localhost:5000/data-viz/sensor-data?timeRange=${selectedTimeRange}`),
        fetch('http://localhost:5000/data-viz/silo-data'),
        fetch('http://localhost:5000/data-viz/batch-reports'),
        fetch('http://localhost:5000/data-viz/overview')
      ]);

      if (sensorResponse.ok) {
        const sensorData = await sensorResponse.json();
        setSensorData(sensorData.data || []);
      } else {
        // Fallback to mock data
        const hours = selectedTimeRange === '24h' ? 24 : selectedTimeRange === '7d' ? 168 : 720;
        setSensorData(generateMockSensorData(hours));
      }

      if (siloResponse.ok) {
        const siloData = await siloResponse.json();
        setSiloData(siloData.data || []);
      } else {
        setSiloData(generateMockSiloData());
      }

      if (batchResponse.ok) {
        const batchData = await batchResponse.json();
        setBatchReports(batchData.data || []);
      } else {
        setBatchReports(generateMockBatchReports());
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to mock data on error
      const hours = selectedTimeRange === '24h' ? 24 : selectedTimeRange === '7d' ? 168 : 720;
      setSensorData(generateMockSensorData(hours));
      setSiloData(generateMockSiloData());
      setBatchReports(generateMockBatchReports());
    } finally {
      setIsLoading(false);
    }
  };

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
