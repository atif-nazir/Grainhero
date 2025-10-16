'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  Thermometer, 
  Droplets, 
  Wind, 
  Gauge, 
  Activity,
  Zap,
  Fan,
  Droplet,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  BarChart3,
  TrendingUp,
  Eye,
  Settings
} from 'lucide-react';

interface SiloData {
  id: string;
  name: string;
  grainType: string;
  capacity: number;
  currentLevel: number;
  fillPercentage: number;
  temperature: number;
  humidity: number;
  moisture: number;
  airflow: number;
  co2: number;
  pressure: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  actuators: {
    fan: { status: 'ON' | 'OFF'; speed: number; lastActive: string };
    aeration: { status: 'ON' | 'OFF'; pressure: number; lastActive: string };
    cooling: { status: 'ON' | 'OFF'; temperature: number; lastActive: string };
  };
  sensors: {
    temperature: { value: number; status: 'NORMAL' | 'WARNING' | 'CRITICAL' };
    humidity: { value: number; status: 'NORMAL' | 'WARNING' | 'CRITICAL' };
    moisture: { value: number; status: 'NORMAL' | 'WARNING' | 'CRITICAL' };
    airflow: { value: number; status: 'NORMAL' | 'WARNING' | 'CRITICAL' };
    co2: { value: number; status: 'NORMAL' | 'WARNING' | 'CRITICAL' };
  };
  lastUpdated: string;
  storageDays: number;
  qualityScore: number;
}

interface SiloVisualizationProps {
  siloId: string;
  onClose: () => void;
}

export default function SiloVisualization({ siloId, onClose }: SiloVisualizationProps) {
  const [siloData, setSiloData] = useState<SiloData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actuatorControls, setActuatorControls] = useState({
    fan: false,
    aeration: false,
    cooling: false
  });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [autoRotation, setAutoRotation] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);

  useEffect(() => {
    loadSiloData();
    const interval = setInterval(loadSiloData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [siloId]);

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotation || isDragging) return;
    
    const interval = setInterval(() => {
      setRotation(prev => ({
        ...prev,
        y: prev.y + rotationSpeed
      }));
    }, 50);
    
    return () => clearInterval(interval);
  }, [autoRotation, isDragging, rotationSpeed]);

  const loadSiloData = async () => {
    try {
      // Try to fetch from API first
      const response = await fetch(`http://localhost:5000/silos/${siloId}`);
      if (response.ok) {
        const data = await response.json();
        setSiloData(data);
      } else {
        // Fallback to mock data
        generateMockSiloData();
      }
    } catch (error) {
      console.error('Error loading silo data:', error);
      generateMockSiloData();
    } finally {
      setLoading(false);
    }
  };

  const generateMockSiloData = () => {
    // Generate varied fill levels based on silo ID
    const fillPercentages = {
      'RICE001': 65,
      'RICE002': 85,
      'RICE003': 45,
      'RICE004': 92,
      'RICE005': 78,
      'RICE006': 33
    };
    
    const fillPercentage = fillPercentages[siloId as keyof typeof fillPercentages] || 75;
    const currentLevel = Math.round((fillPercentage / 100) * 1000);
    
    const mockData: SiloData = {
      id: siloId,
      name: `Silo ${siloId}`,
      grainType: 'Rice',
      capacity: 1000,
      currentLevel: currentLevel,
      fillPercentage: fillPercentage,
      temperature: 22.5 + Math.random() * 2,
      humidity: 55 + Math.random() * 10,
      moisture: 14.2 + Math.random() * 1,
      airflow: 1.5 + Math.random() * 0.5,
      co2: 400 + Math.random() * 50,
      pressure: 1013 + Math.random() * 5,
      riskLevel: 'LOW',
      actuators: {
        fan: { 
          status: Math.random() > 0.5 ? 'ON' : 'OFF', 
          speed: Math.floor(Math.random() * 100), 
          lastActive: new Date().toISOString() 
        },
        aeration: { 
          status: Math.random() > 0.7 ? 'ON' : 'OFF', 
          pressure: Math.floor(Math.random() * 50), 
          lastActive: new Date().toISOString() 
        },
        cooling: { 
          status: Math.random() > 0.8 ? 'ON' : 'OFF', 
          temperature: 18 + Math.random() * 5, 
          lastActive: new Date().toISOString() 
        }
      },
      sensors: {
        temperature: { value: 22.5, status: 'NORMAL' },
        humidity: { value: 55, status: 'NORMAL' },
        moisture: { value: 14.2, status: 'NORMAL' },
        airflow: { value: 1.5, status: 'NORMAL' },
        co2: { value: 400, status: 'NORMAL' }
      },
      lastUpdated: new Date().toISOString(),
      storageDays: 45,
      qualityScore: 92
    };
    setSiloData(mockData);
  };

  const toggleActuator = (actuator: 'fan' | 'aeration' | 'cooling') => {
    setActuatorControls(prev => ({
      ...prev,
      [actuator]: !prev[actuator]
    }));
    // Here you would send the command to the backend
    console.log(`Toggling ${actuator} actuator`);
  };

  // Mouse interaction handlers for 3D rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setAutoRotation(false);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setRotation(prev => ({
      x: Math.max(-30, Math.min(30, prev.x - deltaY * 0.5)),
      y: prev.y + deltaX * 0.5
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Resume auto-rotation after a delay
    setTimeout(() => {
      setAutoRotation(true);
    }, 2000);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Zoom functionality could be added here
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'text-green-600';
      case 'WARNING': return 'text-yellow-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4">Loading silo data...</p>
        </div>
      </div>
    );
  }

  if (!siloData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-center">Silo data not found</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{siloData.name}</h2>
            <p className="text-gray-600">{siloData.grainType} • {siloData.capacity} tons capacity</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={`${getRiskColor(siloData.riskLevel)} text-white`}>
              {siloData.riskLevel} Risk
            </Badge>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3D Silo Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  3D Silo Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="relative bg-gradient-to-b from-blue-50 to-gray-100 rounded-lg p-6 h-96">
                  {/* True Cylindrical Silo - Like Your Inspiration */}
                  <div className="relative mx-auto w-80 h-80 flex items-center justify-center">
                    <div 
                      id="silo-3d-container"
                      className="relative w-48 h-80 transform-gpu cursor-grab active:cursor-grabbing"
                      style={{ 
                        transform: `rotateY(${rotation.y}deg) rotateX(${rotation.x}deg)`
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                    >
                      {/* Main Cylindrical Silo Body - Truly Round */}
                      <div className="relative w-48 h-80 mx-auto">
                        {/* Silo Body - White Cylinder with Round Shape */}
                        <div 
                          className="absolute inset-0 bg-white rounded-full shadow-2xl border-2 border-gray-200"
                          style={{
                            background: 'radial-gradient(ellipse at 30% 20%, #ffffff, #f8f9fa, #e9ecef)',
                            boxShadow: 'inset -8px -8px 25px rgba(0,0,0,0.1), 0 12px 35px rgba(0,0,0,0.2)'
                          }}
                        >
                          {/* Silo Fill Level - Grain with Curved Surface */}
                          <div 
                            className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-2000"
                            style={{ 
                              height: `${siloData.fillPercentage}%`,
                              background: 'radial-gradient(ellipse at center, #f59e0b, #d97706, #b45309)',
                              boxShadow: 'inset 0 5px 15px rgba(0,0,0,0.2)'
                            }}
                          >
                            {/* Grain Texture Animation - Curved Surface */}
                            <div className="absolute inset-0 rounded-b-full overflow-hidden">
                              {Array.from({ length: 50 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className="absolute w-1 h-1 bg-amber-800 rounded-full animate-pulse"
                                  style={{ 
                                    left: `${Math.random() * 100}%`, 
                                    bottom: `${Math.random() * 25}%`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    animationDuration: `${2 + Math.random() * 2}s`
                                  }}
                                ></div>
                              ))}
                            </div>
                          </div>

                          {/* Internal Sensor Probes - Curved to Silo Shape */}
                          <div className="absolute top-4 left-8 w-0.5 h-16 bg-blue-500 opacity-80 rounded-full"></div>
                          <div className="absolute top-4 right-8 w-0.5 h-16 bg-blue-500 opacity-80 rounded-full"></div>
                          <div className="absolute top-4 left-1/2 w-0.5 h-16 bg-blue-500 opacity-80 rounded-full transform -translate-x-1/2"></div>

                          {/* Sensor Points - Following Curved Surface */}
                          <div className="absolute top-6 left-8 w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                          <div className="absolute top-12 left-8 w-2 h-2 bg-blue-600 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                          <div className="absolute top-18 left-8 w-2 h-2 bg-blue-600 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                          <div className="absolute top-6 right-8 w-2 h-2 bg-blue-600 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                          <div className="absolute top-12 right-8 w-2 h-2 bg-blue-600 rounded-full animate-ping" style={{ animationDelay: '0.8s' }}></div>
                          <div className="absolute top-18 right-8 w-2 h-2 bg-blue-600 rounded-full animate-ping" style={{ animationDelay: '1.3s' }}></div>
                          <div className="absolute top-6 left-1/2 w-2 h-2 bg-blue-600 rounded-full animate-ping transform -translate-x-1/2" style={{ animationDelay: '0.2s' }}></div>
                          <div className="absolute top-12 left-1/2 w-2 h-2 bg-blue-600 rounded-full animate-ping transform -translate-x-1/2" style={{ animationDelay: '0.7s' }}></div>
                          <div className="absolute top-18 left-1/2 w-2 h-2 bg-blue-600 rounded-full animate-ping transform -translate-x-1/2" style={{ animationDelay: '1.2s' }}></div>

                          {/* Airflow Indicators - Curved Surface */}
                          {siloData.actuators?.fan?.status === 'ON' && (
                            <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                              </div>
                            </div>
                          )}

                          {/* Aeration System - Curved Surface */}
                          {siloData.actuators?.aeration?.status === 'ON' && (
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Silo Top Cap - Truly Circular */}
                        <div 
                          className="absolute top-0 left-1/2 w-48 h-6 bg-gradient-to-b from-gray-200 to-gray-300 rounded-full transform -translate-x-1/2 shadow-lg"
                          style={{
                            background: 'radial-gradient(circle at center, #f5f5f5, #e0e0e0)',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
                          }}
                        ></div>

                        {/* Silo Base - Truly Circular */}
                        <div 
                          className="absolute bottom-0 left-1/2 w-52 h-6 bg-gradient-to-t from-gray-300 to-gray-400 rounded-full transform -translate-x-1/2 shadow-lg"
                          style={{
                            background: 'radial-gradient(circle at center, #d0d0d0, #a0a0a0)',
                            boxShadow: '0 -5px 15px rgba(0,0,0,0.2)'
                          }}
                        ></div>

                        {/* External Sensors - Positioned on Curved Surface */}
                        <div className="absolute top-4 left-2 w-3 h-3 bg-blue-500 rounded-full shadow-md animate-pulse"></div>
                        <div className="absolute top-4 right-2 w-3 h-3 bg-blue-500 rounded-full shadow-md animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute top-8 left-2 w-3 h-3 bg-green-500 rounded-full shadow-md animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute top-8 right-2 w-3 h-3 bg-green-500 rounded-full shadow-md animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                      </div>
                    </div>

                    {/* Rotation Control Overlay */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-8 h-8 p-0 bg-white/90 backdrop-blur-sm"
                        onClick={() => setAutoRotation(!autoRotation)}
                      >
                        {autoRotation ? '⏸️' : '▶️'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-8 h-8 p-0 bg-white/90 backdrop-blur-sm"
                        onClick={() => setRotationSpeed(prev => Math.min(2, prev + 0.2))}
                      >
                        ⚡
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-8 h-8 p-0 bg-white/90 backdrop-blur-sm"
                        onClick={() => setRotationSpeed(prev => Math.max(0.1, prev - 0.2))}
                      >
                        🐌
                      </Button>
                    </div>

                    {/* Control Instructions */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg">
                      <div className="text-xs text-gray-600 text-center">
                        {isDragging ? 'Dragging to rotate' : 'Auto-rotating • Drag to control'}
                      </div>
                    </div>
                  </div>

                  {/* Fill Level Indicator */}
                  <div className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-lg">
                    <div className="text-sm font-semibold text-gray-700">Fill Level</div>
                    <div className="text-2xl font-bold text-blue-600">{siloData.fillPercentage}%</div>
                    <div className="text-xs text-gray-500">{siloData.currentLevel} / {siloData.capacity} tons</div>
                  </div>

                  {/* Real-time Data Overlay */}
                  <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg">
                    <div className="text-xs text-gray-600 mb-1">Real-time Data</div>
                    <div className="flex items-center gap-2 text-sm">
                      <Thermometer className="h-3 w-3 text-red-500" />
                      <span>{(siloData.temperature || 0).toFixed(1)}°C</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Droplets className="h-3 w-3 text-blue-500" />
                      <span>{(siloData.humidity || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Wind className="h-3 w-3 text-green-500" />
                      <span>{(siloData.airflow || 0).toFixed(1)} m/s</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sensor Data & Actuators */}
            <div className="space-y-6">
              {/* Sensor Readings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Sensor Readings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Temperature</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{(siloData.temperature || 0).toFixed(1)}°C</div>
                        <div className={`text-xs ${getSensorStatusColor(siloData.sensors?.temperature?.status || 'NORMAL')}`}>
                          {siloData.sensors?.temperature?.status || 'NORMAL'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Humidity</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{(siloData.humidity || 0).toFixed(1)}%</div>
                        <div className={`text-xs ${getSensorStatusColor(siloData.sensors?.humidity?.status || 'NORMAL')}`}>
                          {siloData.sensors?.humidity?.status || 'NORMAL'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Moisture</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{(siloData.moisture || 0).toFixed(1)}%</div>
                        <div className={`text-xs ${getSensorStatusColor(siloData.sensors?.moisture?.status || 'NORMAL')}`}>
                          {siloData.sensors?.moisture?.status || 'NORMAL'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Wind className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Airflow</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{(siloData.airflow || 0).toFixed(1)} m/s</div>
                        <div className={`text-xs ${getSensorStatusColor(siloData.sensors?.airflow?.status || 'NORMAL')}`}>
                          {siloData.sensors?.airflow?.status || 'NORMAL'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actuator Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Actuator Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Fan Control */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Fan className={`h-5 w-5 ${siloData.actuators?.fan?.status === 'ON' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium">Aeration Fan</div>
                        <div className="text-sm text-gray-600">
                          Status: {siloData.actuators?.fan?.status || 'N/A'} • Speed: {siloData.actuators?.fan?.speed || 0}%
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={siloData.actuators?.fan?.status === 'ON' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleActuator('fan')}
                    >
                      {siloData.actuators?.fan?.status === 'ON' ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Aeration Control */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Droplet className={`h-5 w-5 ${siloData.actuators?.aeration?.status === 'ON' ? 'text-green-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium">Aeration System</div>
                        <div className="text-sm text-gray-600">
                          Status: {siloData.actuators?.aeration?.status || 'N/A'} • Pressure: {siloData.actuators?.aeration?.pressure || 0} kPa
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={siloData.actuators?.aeration?.status === 'ON' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleActuator('aeration')}
                    >
                      {siloData.actuators?.aeration?.status === 'ON' ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Cooling Control */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className={`h-5 w-5 ${siloData.actuators?.cooling?.status === 'ON' ? 'text-yellow-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium">Cooling System</div>
                        <div className="text-sm text-gray-600">
                          Status: {siloData.actuators?.cooling?.status || 'N/A'} • Temp: {(siloData.actuators?.cooling?.temperature || 0).toFixed(1)}°C
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={siloData.actuators?.cooling?.status === 'ON' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleActuator('cooling')}
                    >
                      {siloData.actuators?.cooling?.status === 'ON' ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Storage Days</div>
                    <div className="text-2xl font-bold">{siloData.storageDays}</div>
                  </div>
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Quality Score</div>
                    <div className="text-2xl font-bold text-green-600">{siloData.qualityScore}%</div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Last Updated</div>
                    <div className="text-sm font-medium">
                      {new Date(siloData.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>
                  <Database className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}