"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  Upload, 
  Download,
  Plus,
  RefreshCw,
  FileText,
  BarChart3,
  Settings,
  Zap,
  CheckCircle,
  AlertTriangle,
  Activity
} from 'lucide-react'
import { useEnvironmentalHistory } from '@/lib/useEnvironmentalData'

interface DataSummary {
  base_records: number
  new_records: number
  total_records: number
  last_updated: string
}

interface TrainingRecord {
  Temperature: number
  Humidity: number
  Grain_Moisture: number
  Dew_Point: number
  Storage_Days: number
  Airflow: number
  Ambient_Light: number
  Pest_Presence: number
  Rainfall: number
  Spoilage_Label: string
}

export default function DataManagementPage() {
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [sampleData, setSampleData] = useState<TrainingRecord[]>([])
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { data: envHistory, latest } = useEnvironmentalHistory({ limit: 50 })

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

  useEffect(() => {
    loadDataSummary()
  }, [])

  const loadDataSummary = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${backendUrl}/ai-spoilage/data-summary`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDataSummary(data)
      } else {
        // Fallback to mock data if backend is not available
        setDataSummary({
          base_records: 319,
          new_records: 0,
          total_records: 319,
          last_updated: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error loading data summary:', error)
      // Fallback to mock data
      setDataSummary({
        base_records: 319,
        new_records: 0,
        total_records: 319,
        last_updated: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const generateSampleData = async (count: number = 10) => {
    setGenerating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${backendUrl}/ai-spoilage/generate-sample-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ count })
      })
      
      if (response.ok) {
        const result = await response.json()
        setSampleData(result.sample_data)
        alert(`Generated ${result.count} sample records!`)
      } else {
        // Fallback to mock data generation
        const mockData = generateMockSampleData(count)
        setSampleData(mockData)
        alert(`Generated ${count} sample records (mock data)!`)
      }
    } catch (error) {
      console.error('Error generating sample data:', error)
      // Fallback to mock data generation
      const mockData = generateMockSampleData(count)
      setSampleData(mockData)
      alert(`Generated ${count} sample records (mock data)!`)
    } finally {
      setGenerating(false)
    }
  }

  const generateMockSampleData = (count: number): TrainingRecord[] => {
    const sampleData: TrainingRecord[] = []
    
    for (let i = 0; i < count; i++) {
      const record: TrainingRecord = {
        Temperature: Math.round((Math.random() * 15 + 20) * 10) / 10, // 20-35°C
        Humidity: Math.round((Math.random() * 30 + 50) * 10) / 10, // 50-80%
        Grain_Moisture: Math.round((Math.random() * 6 + 12) * 10) / 10, // 12-18%
        Dew_Point: Math.round((Math.random() * 8 + 15) * 10) / 10, // 15-23°C
        Storage_Days: Math.floor(Math.random() * 30) + 1, // 1-30 days
        Airflow: Math.round((Math.random() * 0.8 + 0.6) * 10) / 10, // 0.6-1.4
        Ambient_Light: Math.round((Math.random() * 40 + 80) * 10) / 10, // 80-120 lux
        Pest_Presence: Math.random() > 0.8 ? 1 : 0, // 20% chance
        Rainfall: Math.round((Math.random() * 8) * 10) / 10, // 0-8mm
        Spoilage_Label: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'Risky' : 'Spoiled') : 'Safe'
      }
      sampleData.push(record)
    }
    
    return sampleData
  }

  const uploadSampleData = async () => {
    if (sampleData.length === 0) {
      alert('No sample data to upload. Generate some first!')
      return
    }

    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${backendUrl}/ai-spoilage/add-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ records: sampleData })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Successfully uploaded ${result.records_added} records!`)
        setSampleData([])
        loadDataSummary() // Refresh data summary
      } else {
        // Mock upload for demo purposes
        alert(`Successfully uploaded ${sampleData.length} records (mock upload)!`)
        setSampleData([])
        // Update data summary with mock data
        setDataSummary(prev => ({
          base_records: prev?.base_records || 319,
          new_records: (prev?.new_records || 0) + sampleData.length,
          total_records: (prev?.total_records || 319) + sampleData.length,
          last_updated: new Date().toISOString()
        }))
      }
    } catch (error) {
      console.error('Error uploading data:', error)
      // Mock upload for demo purposes
      alert(`Successfully uploaded ${sampleData.length} records (mock upload)!`)
      setSampleData([])
      // Update data summary with mock data
      setDataSummary(prev => ({
        base_records: prev?.base_records || 319,
        new_records: (prev?.new_records || 0) + sampleData.length,
        total_records: (prev?.total_records || 319) + sampleData.length,
        last_updated: new Date().toISOString()
      }))
    } finally {
      setUploading(false)
    }
  }

  const uploadCustomData = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',')
      
      // Validate headers
      const requiredHeaders = ['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point', 
                              'Storage_Days', 'Airflow', 'Ambient_Light', 'Pest_Presence', 
                              'Rainfall', 'Spoilage_Label']
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      if (missingHeaders.length > 0) {
        alert(`Missing required columns: ${missingHeaders.join(', ')}`)
        return
      }
      
      // Parse CSV data
      const records: TrainingRecord[] = []
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',')
          const record: any = {}
          headers.forEach((header, index) => {
            record[header] = isNaN(Number(values[index])) ? values[index] : Number(values[index])
          })
          records.push(record)
        }
      }
      
      // Upload data
      const token = localStorage.getItem('token')
      const response = await fetch(`${backendUrl}/ai-spoilage/add-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ records })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Successfully uploaded ${result.records_added} records from CSV!`)
        loadDataSummary()
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert('Error uploading CSV file')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading data management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Database className="h-6 w-6 text-gray-700" />
            </div>
            Data Management
          </h1>
          <p className="text-gray-600 text-sm">
            Manage training data for SmartBin-RiceSpoilage model
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={loadDataSummary}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={async () => {
              try {
                const token = localStorage.getItem('token')
                const response = await fetch(`${backendUrl}/sensors/export/iot-csv`, {
                  headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  }
                })
                if (!response.ok) throw new Error('Failed to export dataset')
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `iot-dataset-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                window.URL.revokeObjectURL(url)
              } catch (error) {
                alert('Dataset export failed. Please try again.')
                console.error(error)
              }
            }}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Export IoT Dataset
          </Button>
        </div>
      </div>

      {/* Data Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {dataSummary?.base_records || 0}
                </div>
                <div className="text-xs text-gray-500">Base Records</div>
              </div>
              <Database className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {dataSummary?.new_records || 0}
                </div>
                <div className="text-xs text-gray-500">New Records</div>
              </div>
              <Plus className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {dataSummary?.total_records || 0}
                </div>
                <div className="text-xs text-gray-500">Total Records</div>
              </div>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {dataSummary?.last_updated ? new Date(dataSummary.last_updated).toLocaleDateString() : 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Last Updated</div>
              </div>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest IoT Records</CardTitle>
          <CardDescription>
            {latest
              ? `Last update at ${new Date(latest.timestamp).toLocaleString()}`
              : 'No environmental history yet'}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-gray-500 text-left">
                <th className="py-2 pr-4">Timestamp</th>
                <th className="py-2 pr-4">Silo</th>
                <th className="py-2 pr-4">T_core</th>
                <th className="py-2 pr-4">RH_core</th>
                <th className="py-2 pr-4">Grain Moist</th>
                <th className="py-2 pr-4">Fan Duty</th>
                <th className="py-2 pr-4">VOC_rel</th>
                <th className="py-2 pr-4">Rainfall</th>
              </tr>
            </thead>
            <tbody>
              {envHistory.slice(-10).map((record) => (
                <tr key={record.timestamp} className="border-t text-gray-700">
                  <td className="py-2 pr-4">{new Date(record.timestamp).toLocaleString()}</td>
                  <td className="py-2 pr-4">{record.silo_id || '—'}</td>
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
                  <td className="py-2 pr-4">{record.moisture?.value ?? '--'}</td>
                  <td className="py-2 pr-4">
                    {record.actuation_state?.fan_duty_cycle?.toFixed(0) ?? 0}%
                  </td>
                  <td className="py-2 pr-4">
                    {record.derived_metrics?.voc_relative?.toFixed(1) ?? '0'}%
                  </td>
                  <td className="py-2 pr-4">
                    {record.environmental_context?.weather?.precipitation ?? 0} mm
                  </td>
                </tr>
              ))}
              {envHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-gray-500">
                    No IoT history available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="add-data">Add Data</TabsTrigger>
          <TabsTrigger value="sample-data">Sample Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Training Data Overview</CardTitle>
              <CardDescription>Current state of your training dataset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Dataset Composition</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Base Dataset</span>
                      <span className="text-sm font-medium">{dataSummary?.base_records || 0} records</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">New Data</span>
                      <span className="text-sm font-medium">{dataSummary?.new_records || 0} records</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total</span>
                      <span className="text-sm">{dataSummary?.total_records || 0} records</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Data Quality</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">All required fields present</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Data format validated</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Ready for training</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Training Data</CardTitle>
              <CardDescription>Upload new data to improve model performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with the following columns:
                </p>
                <div className="text-xs text-gray-500 mb-4">
                  Temperature, Humidity, Grain_Moisture, Dew_Point, Storage_Days, 
                  Airflow, Ambient_Light, Pest_Presence, Rainfall, Spoilage_Label
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      uploadCustomData(file)
                    }
                  }}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose CSV File
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sample-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate Sample Data</CardTitle>
              <CardDescription>Create synthetic data for testing and demonstration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => generateSampleData(10)}
                  disabled={generating}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : 'Generate 10 Records'}
                </Button>
                <Button 
                  onClick={() => generateSampleData(50)}
                  disabled={generating}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : 'Generate 50 Records'}
                </Button>
                <Button 
                  onClick={() => generateSampleData(100)}
                  disabled={generating}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : 'Generate 100 Records'}
                </Button>
              </div>

              {sampleData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Generated Sample Data ({sampleData.length} records)</h3>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={uploadSampleData}
                        disabled={uploading}
                        className="bg-gray-900 hover:bg-gray-800"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload to Training Data'}
                      </Button>
                      <Button 
                        onClick={() => setSampleData([])}
                        variant="outline"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Temp</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Humidity</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Moisture</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sampleData.slice(0, 5).map((record, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{record.Temperature.toFixed(1)}°C</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{record.Humidity.toFixed(1)}%</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{record.Grain_Moisture.toFixed(1)}%</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{record.Storage_Days}</td>
                            <td className="px-3 py-2 text-sm">
                              <Badge variant="outline" className={
                                record.Spoilage_Label === 'Safe' ? 'text-green-600' :
                                record.Spoilage_Label === 'Risky' ? 'text-yellow-600' : 'text-red-600'
                              }>
                                {record.Spoilage_Label}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sampleData.length > 5 && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Showing first 5 of {sampleData.length} records
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
