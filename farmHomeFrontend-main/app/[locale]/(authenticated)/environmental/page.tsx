"use client"

import React, { useState, useEffect } from 'react'
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
  Calendar,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  AnimatedBackground, 
  AnimatedCounter,
  AnimatedText,
  LoadingAnimation
} from '@/components/animations/MotionGraphics'
import { 
  AnimatedBarChart, 
  AnimatedLineChart, 
  AnimatedPieChart,
  AnimatedMetricCard 
} from '@/components/animations/AnimatedCharts'

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

interface EnvironmentalData {
  weather: WeatherData
  airQuality: AirQualityData
  forecast: any[]
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
}

export default function EnvironmentalPage() {
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [location, setLocation] = useState({ lat: 31.5204, lon: 74.3587 }) // Default to Lahore, Pakistan

  // Fetch environmental data
  const fetchEnvironmentalData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/environmental/impact/${location.lat}/${location.lon}`)
      const result = await response.json()
      
      if (result.success) {
        setEnvironmentalData(result.data)
        setLastUpdated(new Date())
      } else {
        setError(result.error || 'Failed to fetch environmental data')
      }
    } catch (err) {
      setError('Network error: Unable to fetch environmental data')
      console.error('Error fetching environmental data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchEnvironmentalData()
    const interval = setInterval(fetchEnvironmentalData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [location])

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

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="weather">Weather Details</TabsTrigger>
            <TabsTrigger value="air-quality">Air Quality</TabsTrigger>
            <TabsTrigger value="impact">Impact Assessment</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
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
        </Tabs>
      </div>
    </AnimatedBackground>
  )
}
