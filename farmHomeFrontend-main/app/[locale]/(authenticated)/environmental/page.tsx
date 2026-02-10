"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Cloud, 
  Droplets, 
  Wind, 
  Thermometer, 
  Eye, 
  Gauge, 
  Sun, 
  Moon,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  MapPin,
  RefreshCw,
  CloudRain,
  Fan,
  Settings,
  Activity,
  Brain,
  Database
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  AnimatedBackground, 
  AnimatedText,
  LoadingAnimation
} from '@/components/animations/MotionGraphics'
import { 
  AnimatedMetricCard 
} from '@/components/animations/AnimatedCharts'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, Legend } from 'recharts'

interface WeatherData {
  temperature: number
  humidity: number
  pressure: number
  wind_speed: number
  wind_direction: number
  precipitation: number
  visibility: number
  uv_index: number
  cloudiness: number
  weather_condition: string
  weather_description: string
  sunrise: string
  sunset: string
  timestamp: string
}

interface AirQualityData {
  aqi: number
  co: number
  no: number
  no2: number
  o3: number
  so2: number
  pm2_5: number
  pm10: number
  nh3: number
  timestamp: string
}

interface LocationData {
  city: string
  latitude: number
  longitude: number
  address?: string
  silo_count: number
  silos: Array<{
    silo_id: string
    name: string
  }>
  weather?: WeatherData
  air_quality?: AirQualityData
  aqi_level?: {
    level: string
    color: string
    description: string
  }
  impact_assessment?: {
    temperature_risk: string
    humidity_risk: string
    precipitation_risk: string
    overall_risk: string
    recommendations: string[]
  }
  regional_analysis?: RegionalAnalysis
  error?: string
}

interface RegionalAnalysis {
  region_type: string
  is_coastal: boolean
  climate_zone: string
  monsoon_active: boolean
  monsoon_intensity: number
  monsoon_risk_level: string
  smog_season: boolean
  smog_risk: number
  smog_risk_level: string
  coastal_humidity_factor: number
  seasonal_risk: number
  seasonal_risk_level: string
  temp_trend: string
  humidity_trend: string
  rain_probability: number
  regional_recommendations: string[]
}

interface RegionalThresholds {
  region: string
  thresholds: {
    temperature: { min: number, max: number, critical_min: number, critical_max: number }
    humidity: { min: number, max: number, critical_min: number, critical_max: number }
    moisture: { max: number, critical_max: number }
  }
  adjustments: {
    coastal_factor: number
    altitude_factor: number
  }
}

interface EnvironmentalData {
  weather: WeatherData
  airQuality: AirQualityData
  forecast: WeatherData[]
  timestamp: string
  location: { lat: number, lon: number }
  impact_assessment?: {
    temperature_risk: string
    humidity_risk: string
    precipitation_risk: string
    overall_risk: string
    recommendations: string[]
  }
  aqi_level?: {
    level: string
    color: string
    description: string
  }
  regional_analysis?: RegionalAnalysis
}

// Time-series interfaces for rainfall (OpenWeather) and airflow (fan telemetry)
interface RainfallMetric {
  rainfall: number
  timestamp: string
}

interface AirflowMetric {
  airflow: number
  timestamp: string
}

export default function EnvironmentalPage() {
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null)
  const [myLocations, setMyLocations] = useState<LocationData[]>([])
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [regionalData, setRegionalData] = useState<RegionalAnalysis | null>(null)
  const [thresholds, setThresholds] = useState<RegionalThresholds | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('multi')
  const [location] = useState({ lat: 31.5204, lon: 74.3587 })
const [rainfallHistory, setRainfallHistory] = useState<RainfallMetric[]>([])
const [airflowHistory, setAirflowHistory] = useState<AirflowMetric[]>([])
const [historyIsFallback, setHistoryIsFallback] = useState(false)
const [forecastSeries, setForecastSeries] = useState<WeatherData[]>([])

  // Helper function to fetch forecast data
  const fetchForecastData = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/environmental/forecast/${lat}/${lon}`)
      const result = await response.json()
      if (result.success) {
        setForecastSeries(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching forecast data:', error)
    }
  }

  // Helper function to calculate dew point
  const calculateDewPoint = (temp: number, humidity: number) => {
    if (temp === undefined || humidity === undefined || humidity <= 0) return null
    const a = 17.27
    const b = 237.7
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100)
    return Number(((b * alpha) / (a - alpha)).toFixed(2))
  }

  // Helper function to calculate heat index
  const calculateHeatIndex = (temp: number, humidity: number) => {
    if (temp === undefined || humidity === undefined) return null
    const tempF = (temp * 9) / 5 + 32
    const hi =
      -42.379 +
      2.04901523 * tempF +
      10.14333127 * humidity -
      0.22475541 * tempF * humidity -
      6.83783e-3 * tempF * tempF -
      5.481717e-2 * humidity * humidity +
      1.22874e-3 * tempF * tempF * humidity +
      8.5282e-4 * tempF * humidity * humidity -
      1.99e-6 * tempF * tempF * humidity * humidity
    const hiC = ((hi - 32) * 5) / 9
    return Number(hiC.toFixed(2))
  }

  // Derived climate metrics
  const derivedClimate = useMemo(() => {
    if (!environmentalData) return null
    const { weather } = environmentalData
    return {
      dewPoint: calculateDewPoint(weather.temperature, weather.humidity),
      heatIndex: calculateHeatIndex(weather.temperature, weather.humidity),
      pressure: weather.pressure,
      visibility: weather.visibility,
      uvIndex: weather.uv_index,
      cloudiness: weather.cloudiness,
      windSpeed: weather.wind_speed
    }
  }, [environmentalData])

  // Forecast chart data
  const forecastChartData = useMemo(() => {
    return forecastSeries.map((entry) => ({
      timestamp: entry.timestamp,
      temperature: entry.temperature,
      humidity: entry.humidity,
      precipitation: entry.precipitation,
      pressure: entry.pressure
    }))
  }, [forecastSeries])
  
  // Fetch environmental data for all user's locations
  const fetchEnvironmentalData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      
      // Fetch all locations for current user (role-based)
      const locationsResponse = await fetch('/api/environmental/my-locations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const locationsResult = await locationsResponse.json()
      
      if (locationsResult.success && locationsResult.data.locations.length > 0) {
        setMyLocations(locationsResult.data.locations)
        
        // Set first location as selected by default
        const firstLocation = locationsResult.data.locations[0]
        setSelectedLocation(firstLocation)
        
        if (firstLocation.weather && firstLocation.air_quality) {
          // Set environmental data from first location
          setEnvironmentalData({
            weather: firstLocation.weather,
            airQuality: firstLocation.air_quality,
            forecast: [],
            timestamp: new Date().toISOString(),
            location: {
              lat: firstLocation.latitude,
              lon: firstLocation.longitude
            },
            impact_assessment: firstLocation.impact_assessment,
            aqi_level: firstLocation.aqi_level,
            regional_analysis: firstLocation.regional_analysis
          })
          
          setRegionalData(firstLocation.regional_analysis || null)
          
          // Fetch thresholds for first location
          const thresholdResponse = await fetch(
            `/api/environmental/thresholds/${firstLocation.latitude}/${firstLocation.longitude}`
          )
          const thresholdResult = await thresholdResponse.json()
          if (thresholdResult.success) {
            setThresholds(thresholdResult.data)
          }
          
          // Fetch environmental metrics (Rainfall and Airflow)
          fetchEnvironmentalMetrics(firstLocation.latitude, firstLocation.longitude)
          fetchForecastData(firstLocation.latitude, firstLocation.longitude)
        }
        
        setLastUpdated(new Date())
      } else {
        setError('No locations with environmental data found')
      }
    } catch (err) {
      setError('Network error: Unable to fetch environmental data')
      console.error('Error fetching environmental data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Rainfall and Airflow data
  const fetchEnvironmentalMetrics = async (latOverride?: number, lonOverride?: number) => {
    try {
      const token = localStorage.getItem('token')
      const historyLat = latOverride ?? selectedLocation?.latitude ?? location.lat
      const historyLon = lonOverride ?? selectedLocation?.longitude ?? location.lon
      
      // Fetch historical environmental data to extract Rainfall and Airflow
      const response = await fetch(`/api/environmental/history/${localStorage.getItem('tenantId') || 'default'}?limit=24&lat=${historyLat}&lon=${historyLon}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const result = await response.json()
      if (result.success) {
        const rainfallMetrics: RainfallMetric[] = result.data.map((reading: { 
          environmental_context?: { weather?: { precipitation?: number } },
          timestamp: string 
        }) => ({
          rainfall: reading.environmental_context?.weather?.precipitation || 0,
          timestamp: reading.timestamp
        }))
        
        const airflowMetrics: AirflowMetric[] = result.data.map((reading: { 
          derived_metrics?: { airflow?: number },
          timestamp: string 
        }) => ({
          airflow: reading.derived_metrics?.airflow ?? 0,
          timestamp: reading.timestamp
        }))

        // API returns newest first, reverse for chronological charts
        setRainfallHistory(rainfallMetrics.reverse())
        setAirflowHistory(airflowMetrics.reverse())
        setHistoryIsFallback(Boolean(result.fallback))
      }
    } catch (error) {
      console.error('Error fetching environmental metrics:', error)
    }
  }

  // Switch to a different location
  const switchLocation = async (location: LocationData) => {
    setSelectedLocation(location)
    setViewMode('single')
    
    if (location.weather && location.air_quality) {
      setEnvironmentalData({
        weather: location.weather,
        airQuality: location.air_quality,
        forecast: [],
        timestamp: new Date().toISOString(),
        location: {
          lat: location.latitude,
          lon: location.longitude
        },
        impact_assessment: location.impact_assessment,
        aqi_level: location.aqi_level,
        regional_analysis: location.regional_analysis
      })
      
      setRegionalData(location.regional_analysis || null)
      
      // Fetch thresholds
      try {
        const thresholdResponse = await fetch(
          `/api/environmental/thresholds/${location.latitude}/${location.longitude}`
        )
        const thresholdResult = await thresholdResponse.json()
        if (thresholdResult.success) {
          setThresholds(thresholdResult.data)
        }
      } catch (error) {
        console.error('Error fetching thresholds:', error)
      }
      
      // Fetch environmental metrics for this location
      fetchEnvironmentalMetrics(location.latitude, location.longitude)
      fetchForecastData(location.latitude, location.longitude)
    }
  }

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchEnvironmentalData()
    const interval = setInterval(fetchEnvironmentalData, 5 * 60 * 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Get risk color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  // Get AQI color
  const getAQIColor = (aqi: number) => {
    if (aqi <= 1) return 'text-green-600'
    if (aqi <= 2) return 'text-yellow-600'
    if (aqi <= 3) return 'text-orange-600'
    if (aqi <= 4) return 'text-red-600'
    return 'text-purple-600'
  }

  if (loading && !environmentalData) {
    return (
      <AnimatedBackground className="min-h-screen">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-center h-64">
            <LoadingAnimation size="lg" />
          </div>
        </div>

        {derivedClimate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gauge className="w-5 h-5 mr-2" />
                Climate Diagnostics
              </CardTitle>
              <CardDescription>
                Derived in real-time from OpenWeather measurements for the selected location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Dew Point</p>
                  <p className="text-2xl font-semibold mt-1">{derivedClimate.dewPoint ?? '--'}°C</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Condensation risk increases as dew point approaches grain temperature.
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Heat Index</p>
                  <p className="text-2xl font-semibold mt-1">{derivedClimate.heatIndex ?? '--'}°C</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apparent feel when humidity and temperature combine.
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Barometric Pressure</p>
                  <p className="text-2xl font-semibold mt-1">{derivedClimate.pressure} hPa</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Falling pressure often precedes storm activity.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Visibility</p>
                  <p className="text-2xl font-semibold mt-1">{derivedClimate.visibility?.toFixed(1)} km</p>
                  <p className="text-xs text-muted-foreground mt-1">Smog or dust can lower values quickly.</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Cloud Cover</p>
                  <p className="text-2xl font-semibold mt-1">{derivedClimate.cloudiness}%</p>
                  <p className="text-xs text-muted-foreground mt-1">High cloudiness correlates with cooler daytime temps.</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Wind Speed</p>
                  <p className="text-2xl font-semibold mt-1">{derivedClimate.windSpeed} m/s</p>
                  <p className="text-xs text-muted-foreground mt-1">Use cross-ventilation when winds are favorable.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {forecastChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                24h Environmental Outlook
              </CardTitle>
              <CardDescription>
                Fetched live from OpenWeather forecast API (3‑hour resolution).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit' })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                      formatter={(value, name) => {
                        if (name === 'Rainfall (mm)') return [`${value} mm`, name]
                        if (name === 'Temperature (°C)') return [`${value} °C`, name]
                        if (name === 'Humidity (%)') return [`${value}%`, name]
                        return [value, name]
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="precipitation"
                      stroke="#60a5fa"
                      fill="#60a5fa"
                      fillOpacity={0.3}
                      name="Rainfall (mm)"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Temperature (°C)"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="humidity"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Humidity (%)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </AnimatedBackground>
    )
  }

  if (error) {
    return (
      <AnimatedBackground className="min-h-screen">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Error Loading Environmental Data</span>
              </div>
              <p className="text-red-600 mt-2">{error}</p>
              <Button 
                onClick={fetchEnvironmentalData} 
                className="mt-4"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </AnimatedBackground>
    )
  }

  if (!environmentalData) return null

  const { weather, airQuality, impact_assessment, aqi_level } = environmentalData

  return (
    <AnimatedBackground className="min-h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <AnimatedText 
              text="Environmental Data" 
              className="text-3xl font-bold"
            />
            <p className="text-muted-foreground mt-2">
              Real-time weather and air quality monitoring for grain storage optimization
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Location Selector */}
            {myLocations.length > 1 && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <select 
                  className="px-3 py-2 border rounded-md bg-white text-sm"
                  value={selectedLocation?.city || ''}
                  onChange={(e) => {
                    const location = myLocations.find(l => l.city === e.target.value)
                    if (location) switchLocation(location)
                  }}
                >
                  {myLocations.map((loc) => (
                    <option key={`${loc.city}_${loc.latitude}`} value={loc.city}>
                      {loc.city} ({loc.silo_count} silos)
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* View Mode Toggle */}
            {myLocations.length > 1 && (
              <div className="flex items-center space-x-2 border rounded-md p-1">
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'multi' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                  }`}
                  onClick={() => setViewMode('multi')}
                >
                  All Locations
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'single' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                  }`}
                  onClick={() => setViewMode('single')}
                >
                  Single View
                </button>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              Last updated: {lastUpdated?.toLocaleTimeString()}
            </div>
            <Button 
              onClick={fetchEnvironmentalData} 
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AnimatedMetricCard
            title="Temperature"
            value={`${weather.temperature.toFixed(1)}°C`}
            change={weather.temperature > 25 ? 5 : -2}
            icon={Thermometer}
            color="blue"
          />

          <AnimatedMetricCard
            title="Humidity"
            value={`${weather.humidity}%`}
            change={weather.humidity > 70 ? 3 : -1}
            icon={Droplets}
            color="green"
          />

          <AnimatedMetricCard
            title="Air Quality"
            value={aqi_level?.level || 'Unknown'}
            change={airQuality.aqi <= 2 ? -1 : 2}
            icon={Eye}
            color={airQuality.aqi <= 2 ? "green" : airQuality.aqi <= 3 ? "yellow" : "red"}
          />

          <AnimatedMetricCard
            title="Wind Speed"
            value={`${weather.wind_speed} m/s`}
            change={weather.wind_speed > 5 ? 1 : -1}
            icon={Wind}
            color="purple"
          />
        </div>

        {/* Rainfall and Airflow Visualization */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CloudRain className="w-5 h-5 mr-2" />
                Rainfall (OpenWeather)
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  API Source
                </Badge>
                {historyIsFallback && (
                  <Badge variant="secondary" className="ml-2 text-xs font-normal">
                    Live API Feed
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Direct precipitation feed from OpenWeather. Rainfall is the only environmental input sent to spoilage AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rainfallHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} mm`, 'Rainfall']}
                      labelFormatter={(label) => `Time: ${new Date(label).toLocaleString()}`}
                    />
                    <Bar dataKey="rainfall" fill="#3b82f6" name="Rainfall (mm)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {weather.precipitation} mm
                </div>
                <div className="text-sm text-muted-foreground">
                  Current rainfall in last hour
                </div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">24h Rainfall Trend</div>
                  <Progress value={Math.min(100, (weather.precipitation / 10) * 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0mm</span>
                    <span className="font-medium">{weather.precipitation}mm</span>
                    <span>10mm+</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-center text-blue-800">
                    <Database className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">OpenWeather API • Rainfall ingested into AI predictions</span>
                  </div>
                </div>
                <div className="mt-2 flex justify-center space-x-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh Data
                  </Button>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    View Forecast
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Fan className="w-5 h-5 mr-2" />
                Fan Airflow (IoT)
                <Badge variant="secondary" className="ml-2 text-xs font-normal">
                  Fan Telemetry
                </Badge>
              </CardTitle>
              <CardDescription>
                Derived from silo fan speed + duty cycle. Not used for rainfall-based AI predictions but vital for live ventilation control.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={airflowHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Airflow']}
                      labelFormatter={(label) => `Time: ${new Date(label).toLocaleString()}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="airflow" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      name="Airflow (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {airflowHistory.length > 0 ? airflowHistory[airflowHistory.length - 1].airflow.toFixed(1) : '0'}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Current airflow efficiency
                </div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">Ventilation Effectiveness</div>
                  <Progress value={airflowHistory.length > 0 ? airflowHistory[airflowHistory.length - 1].airflow || 0 : 0} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Poor</span>
                    <span className="font-medium">{airflowHistory.length > 0 ? airflowHistory[airflowHistory.length - 1].airflow.toFixed(1) : '0'}%</span>
                    <span>Optimal</span>
                  </div>
                </div>
                <div className="mt-2 flex justify-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Adjust Fan Speed
                  </Button>
                  <Button variant="outline" size="sm">
                    <Activity className="w-4 h-4 mr-1" />
                    Optimize Ventilation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prediction Integration Banner */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                <Brain className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">AI Prediction Integration</h3>
                <p className="text-sm text-green-800">
                  Only rainfall from OpenWeather is ingested into the spoilage ML models. Airflow remains a live fan telemetry
                  signal for control loops, while temperature, humidity, and other sensor streams stay available for dashboards
                  and alerts. All labels now match these sources so data stays consistent across the platform.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="ml-auto" 
                size="sm"
                onClick={() => {
                  const locale = window.location.pathname.split('/')[1] || 'en'
                  window.location.href = `/${locale}/ai-spoilage`
                }}
              >
                View Predictions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="regional">Regional Climate</TabsTrigger>
            <TabsTrigger value="weather">Weather Details</TabsTrigger>
            <TabsTrigger value="air-quality">Air Quality</TabsTrigger>
            <TabsTrigger value="impact">Impact Assessment</TabsTrigger>
            <TabsTrigger value="thresholds">Regional Thresholds</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Regional Climate Summary Banner */}
            {regionalData && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">
                          {regionalData.region_type} - {regionalData.climate_zone}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {regionalData.monsoon_active && (
                          <Badge className="bg-blue-600 text-white">
                            🌧️ Monsoon Season Active
                          </Badge>
                        )}
                        {regionalData.smog_season && (
                          <Badge className="bg-orange-600 text-white">
                            🌫️ Smog Season
                          </Badge>
                        )}
                        {regionalData.is_coastal && (
                          <Badge className="bg-cyan-600 text-white">
                            🌊 Coastal Region
                          </Badge>
                        )}
                        <Badge variant="outline">
                          Rain Probability: {regionalData.rain_probability}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Current Weather */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Cloud className="w-5 h-5 mr-2" />
                    Current Weather
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{weather.temperature.toFixed(1)}°C</div>
                    <div className="text-lg text-muted-foreground capitalize">
                      {weather.weather_description}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Humidity</span>
                      <span className="font-medium">{weather.humidity}%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Gauge className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Pressure</span>
                      <span className="font-medium">{weather.pressure} hPa</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wind className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Wind</span>
                      <span className="font-medium">{weather.wind_speed} m/s</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Visibility</span>
                      <span className="font-medium">{weather.visibility} km</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Air Quality */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Air Quality Index
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getAQIColor(airQuality.aqi)}`}>
                      {airQuality.aqi}
                    </div>
                    <div className="text-lg font-medium">
                      {aqi_level?.level || 'Unknown'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {aqi_level?.description}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>PM2.5</span>
                      <span>{airQuality.pm2_5} μg/m³</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>PM10</span>
                      <span>{airQuality.pm10} μg/m³</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ozone</span>
                      <span>{airQuality.o3} μg/m³</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Assessment */}
            {impact_assessment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getRiskColor(impact_assessment.temperature_risk)}`}>
                        Temperature: {impact_assessment.temperature_risk}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getRiskColor(impact_assessment.humidity_risk)}`}>
                        Humidity: {impact_assessment.humidity_risk}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getRiskColor(impact_assessment.precipitation_risk)}`}>
                        Precipitation: {impact_assessment.precipitation_risk}
                      </div>
                    </div>
                  </div>
                  
                  {impact_assessment.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations:</h4>
                      <ul className="space-y-1">
                        {impact_assessment.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Regional Climate Tab */}
          <TabsContent value="regional" className="space-y-4">
            {regionalData ? (
              <>
                {/* Region Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="w-5 h-5 mr-2" />
                      Regional Climate Analysis
                    </CardTitle>
                    <CardDescription>
                      Climate patterns and seasonal factors for {regionalData.region_type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Region Type</div>
                        <div className="text-lg font-medium">{regionalData.region_type}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Climate Zone</div>
                        <div className="text-lg font-medium">{regionalData.climate_zone}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Coastal Region</div>
                        <div className="text-lg font-medium">{regionalData.is_coastal ? 'Yes' : 'No'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Seasonal Risk</div>
                        <Badge className={getRiskColor(regionalData.seasonal_risk_level) + ' text-white'}>
                          {regionalData.seasonal_risk_level} ({regionalData.seasonal_risk}%)
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monsoon Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Cloud className="w-5 h-5 mr-2" />
                      Monsoon Season Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Monsoon Active</span>
                      <Badge className={regionalData.monsoon_active ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'}>
                        {regionalData.monsoon_active ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {regionalData.monsoon_active && (
                      <>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Monsoon Intensity</span>
                            <span>{regionalData.monsoon_intensity}%</span>
                          </div>
                          <Progress value={regionalData.monsoon_intensity} className="h-3" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Risk Level</span>
                          <Badge className={getRiskColor(regionalData.monsoon_risk_level) + ' text-white'}>
                            {regionalData.monsoon_risk_level}
                          </Badge>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Smog Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="w-5 h-5 mr-2" />
                      Smog Season Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Smog Season</span>
                      <Badge className={regionalData.smog_season ? 'bg-orange-600 text-white' : 'bg-gray-400 text-white'}>
                        {regionalData.smog_season ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {regionalData.smog_season && (
                      <>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Smog Risk</span>
                            <span>{regionalData.smog_risk}%</span>
                          </div>
                          <Progress value={regionalData.smog_risk} className="h-3 bg-orange-200" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Risk Level</span>
                          <Badge className={getRiskColor(regionalData.smog_risk_level) + ' text-white'}>
                            {regionalData.smog_risk_level}
                          </Badge>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Weather Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Forecast Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">Temperature Trend</div>
                        <div className="flex items-center justify-center space-x-2">
                          {regionalData.temp_trend === 'increasing' && <TrendingUp className="w-5 h-5 text-red-500" />}
                          {regionalData.temp_trend === 'decreasing' && <TrendingDown className="w-5 h-5 text-blue-500" />}
                          {regionalData.temp_trend === 'stable' && <span className="w-5 h-5">→</span>}
                          <span className="font-medium capitalize">{regionalData.temp_trend}</span>
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">Humidity Trend</div>
                        <div className="flex items-center justify-center space-x-2">
                          {regionalData.humidity_trend === 'increasing' && <TrendingUp className="w-5 h-5 text-blue-500" />}
                          {regionalData.humidity_trend === 'decreasing' && <TrendingDown className="w-5 h-5 text-orange-500" />}
                          {regionalData.humidity_trend === 'stable' && <span className="w-5 h-5">→</span>}
                          <span className="font-medium capitalize">{regionalData.humidity_trend}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <div className="text-sm text-muted-foreground mb-2">Rain Probability (Next 24h)</div>
                      <div className="text-3xl font-bold text-blue-600">{regionalData.rain_probability}%</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Regional Recommendations */}
                {regionalData.regional_recommendations && regionalData.regional_recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Regional Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {regionalData.regional_recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Coastal Factors */}
                {regionalData.is_coastal && (
                  <Card className="border-cyan-200 bg-cyan-50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-cyan-900">
                        <Wind className="w-5 h-5 mr-2" />
                        Coastal Climate Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cyan-900">Coastal Humidity Factor</span>
                          <span className="font-medium text-cyan-900">
                            {regionalData.coastal_humidity_factor.toFixed(2)}x
                          </span>
                        </div>
                        <p className="text-sm text-cyan-800">
                          Coastal regions experience higher humidity due to sea breeze and moisture from the ocean.
                          Storage thresholds are adjusted accordingly.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Loading regional climate analysis...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Weather Details Tab */}
          <TabsContent value="weather" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Weather Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">UV Index</div>
                      <div className="text-2xl font-bold">{weather.uv_index}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Cloudiness</div>
                      <div className="text-2xl font-bold">{weather.cloudiness}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Precipitation</div>
                      <div className="text-2xl font-bold">{weather.precipitation} mm</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Wind Direction</div>
                      <div className="text-2xl font-bold">{weather.wind_direction}°</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sun Times</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sun className="w-5 h-5 text-yellow-500" />
                      <span>Sunrise</span>
                    </div>
                    <span className="font-medium">{new Date(weather.sunrise).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Moon className="w-5 h-5 text-blue-500" />
                      <span>Sunset</span>
                    </div>
                    <span className="font-medium">{new Date(weather.sunset).toLocaleTimeString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Air Quality Tab */}
          <TabsContent value="air-quality" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pollutant Levels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>PM2.5</span>
                        <span>{airQuality.pm2_5} μg/m³</span>
                      </div>
                      <Progress value={(airQuality.pm2_5 / 50) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>PM10</span>
                        <span>{airQuality.pm10} μg/m³</span>
                      </div>
                      <Progress value={(airQuality.pm10 / 100) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Ozone (O₃)</span>
                        <span>{airQuality.o3} μg/m³</span>
                      </div>
                      <Progress value={(airQuality.o3 / 200) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Nitrogen Dioxide (NO₂)</span>
                        <span>{airQuality.no2} μg/m³</span>
                      </div>
                      <Progress value={(airQuality.no2 / 200) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Pollutants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Carbon Monoxide</div>
                      <div className="text-lg font-bold">{airQuality.co} μg/m³</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sulfur Dioxide</div>
                      <div className="text-lg font-bold">{airQuality.so2} μg/m³</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Nitric Oxide</div>
                      <div className="text-lg font-bold">{airQuality.no} μg/m³</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Ammonia</div>
                      <div className="text-lg font-bold">{airQuality.nh3} μg/m³</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Impact Assessment Tab */}
          <TabsContent value="impact" className="space-y-4">
            {impact_assessment && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Levels</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Overall Risk</span>
                        <Badge 
                          className={`${getRiskColor(impact_assessment.overall_risk)} text-white`}
                        >
                          {impact_assessment.overall_risk}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Temperature Risk</span>
                        <Badge 
                          className={`${getRiskColor(impact_assessment.temperature_risk)} text-white`}
                        >
                          {impact_assessment.temperature_risk}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Humidity Risk</span>
                        <Badge 
                          className={`${getRiskColor(impact_assessment.humidity_risk)} text-white`}
                        >
                          {impact_assessment.humidity_risk}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Precipitation Risk</span>
                        <Badge 
                          className={`${getRiskColor(impact_assessment.precipitation_risk)} text-white`}
                        >
                          {impact_assessment.precipitation_risk}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {impact_assessment.recommendations.length > 0 ? (
                      <ul className="space-y-2">
                        {impact_assessment.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p>All conditions are optimal for grain storage</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Regional Thresholds Tab */}
          <TabsContent value="thresholds" className="space-y-4">
            {thresholds ? (
              <>
                {/* Threshold Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Gauge className="w-5 h-5 mr-2" />
                      Regional Threshold Settings
                    </CardTitle>
                    <CardDescription>
                      Adjusted thresholds for {thresholds.region}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Coastal Adjustment</div>
                        <div className="text-lg font-medium">{thresholds.adjustments.coastal_factor}x</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Altitude Adjustment</div>
                        <div className="text-lg font-medium">{thresholds.adjustments.altitude_factor}x</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Temperature Thresholds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Thermometer className="w-5 h-5 mr-2" />
                      Temperature Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg bg-green-50">
                          <div className="text-xs text-muted-foreground mb-1">Optimal Range</div>
                          <div className="text-lg font-bold text-green-700">
                            {thresholds.thresholds.temperature.min}°C - {thresholds.thresholds.temperature.max}°C
                          </div>
                        </div>
                        <div className="p-3 border rounded-lg bg-red-50">
                          <div className="text-xs text-muted-foreground mb-1">Critical Range</div>
                          <div className="text-lg font-bold text-red-700">
                            &lt;{thresholds.thresholds.temperature.critical_min}°C or &gt;{thresholds.thresholds.temperature.critical_max}°C
                          </div>
                        </div>
                      </div>
                      <div className="relative pt-4">
                        <div className="h-8 rounded-lg overflow-hidden flex">
                          <div className="bg-red-500 flex-1" title="Critical Low"></div>
                          <div className="bg-yellow-500 flex-1" title="Warning Low"></div>
                          <div className="bg-green-500 flex-[2]" title="Optimal"></div>
                          <div className="bg-yellow-500 flex-1" title="Warning High"></div>
                          <div className="bg-red-500 flex-1" title="Critical High"></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{thresholds.thresholds.temperature.critical_min}°C</span>
                          <span>{thresholds.thresholds.temperature.min}°C</span>
                          <span>{thresholds.thresholds.temperature.max}°C</span>
                          <span>{thresholds.thresholds.temperature.critical_max}°C</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Humidity Thresholds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Droplets className="w-5 h-5 mr-2" />
                      Humidity Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg bg-green-50">
                          <div className="text-xs text-muted-foreground mb-1">Optimal Range</div>
                          <div className="text-lg font-bold text-green-700">
                            {thresholds.thresholds.humidity.min}% - {thresholds.thresholds.humidity.max}%
                          </div>
                        </div>
                        <div className="p-3 border rounded-lg bg-red-50">
                          <div className="text-xs text-muted-foreground mb-1">Critical Range</div>
                          <div className="text-lg font-bold text-red-700">
                            &lt;{thresholds.thresholds.humidity.critical_min}% or &gt;{thresholds.thresholds.humidity.critical_max}%
                          </div>
                        </div>
                      </div>
                      <div className="relative pt-4">
                        <div className="h-8 rounded-lg overflow-hidden flex">
                          <div className="bg-red-500 flex-1" title="Critical Low"></div>
                          <div className="bg-yellow-500 flex-1" title="Warning Low"></div>
                          <div className="bg-green-500 flex-[2]" title="Optimal"></div>
                          <div className="bg-yellow-500 flex-1" title="Warning High"></div>
                          <div className="bg-red-500 flex-1" title="Critical High"></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{thresholds.thresholds.humidity.critical_min}%</span>
                          <span>{thresholds.thresholds.humidity.min}%</span>
                          <span>{thresholds.thresholds.humidity.max}%</span>
                          <span>{thresholds.thresholds.humidity.critical_max}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Moisture Thresholds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Droplets className="w-5 h-5 mr-2" />
                      Grain Moisture Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg bg-green-50">
                          <div className="text-xs text-muted-foreground mb-1">Safe Maximum</div>
                          <div className="text-lg font-bold text-green-700">
                            {thresholds.thresholds.moisture.max}%
                          </div>
                        </div>
                        <div className="p-3 border rounded-lg bg-red-50">
                          <div className="text-xs text-muted-foreground mb-1">Critical Maximum</div>
                          <div className="text-lg font-bold text-red-700">
                            {thresholds.thresholds.moisture.critical_max}%
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg bg-blue-50">
                        <p className="text-sm text-blue-900">
                          <strong>Note:</strong> Moisture content above {thresholds.thresholds.moisture.max}% 
                          increases risk of mold growth and grain spoilage. Critical levels above {thresholds.thresholds.moisture.critical_max}% 
                          require immediate action.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Regional Adjustment Info */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Regional Adjustments Applied</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-blue-900">
                      {thresholds.adjustments.coastal_factor > 1 && (
                        <li className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>
                            Coastal region adjustment applied: Humidity and moisture thresholds increased by {((thresholds.adjustments.coastal_factor - 1) * 100).toFixed(0)}%
                          </span>
                        </li>
                      )}
                      {thresholds.adjustments.altitude_factor < 1 && (
                        <li className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>
                            Mountain region adjustment applied: Temperature thresholds decreased by {((1 - thresholds.adjustments.altitude_factor) * 100).toFixed(0)}%
                          </span>
                        </li>
                      )}
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>
                          These thresholds are optimized for {thresholds.region} based on historical climate data and grain storage best practices.
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Gauge className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Loading regional thresholds...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedBackground>
  )
}