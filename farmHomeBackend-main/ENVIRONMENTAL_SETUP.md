# Environmental Data Integration Setup

This document explains how to set up the OpenWeather API integration for real-time environmental data collection in GrainHero.

## Overview

The environmental data system provides:
- Real-time weather data (temperature, humidity, pressure, wind, precipitation)
- Air quality index (AQI) and pollutant levels
- Automated data collection every 15 minutes, 1 hour, and 6 hours
- Impact assessment for grain storage conditions
- Historical data tracking and analytics

## Setup Instructions

### 1. Get OpenWeather API Key

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to the API keys section
4. Generate a new API key
5. Note: Free tier allows 1,000 calls/day, 60 calls/minute

### 2. Configure Environment Variables

Add your OpenWeather API key to the `.env` file:

```bash
# OpenWeather API Configuration
OPENWEATHER_API_KEY=your_actual_api_key_here
```

### 3. Database Schema

The system uses the existing `SensorReading` model with the `environmental_context` field:

```javascript
environmental_context: {
  weather: {
    temperature: Number,
    humidity: Number,
    pressure: Number,
    wind_speed: Number,
    precipitation: Number
  },
  air_quality_index: Number,
  pmd_data: {
    pm25: Number,
    pm10: Number,
    ozone: Number
  }
}
```

### 4. API Endpoints

#### Get Current Environmental Data
```
GET /api/environmental/current/{lat}/{lon}
```

#### Get Environmental Data with Impact Assessment
```
GET /api/environmental/impact/{lat}/{lon}
```

#### Store Environmental Data
```
POST /api/environmental/store
Body: {
  "tenant_id": "ObjectId",
  "silo_id": "ObjectId", 
  "device_id": "ObjectId",
  "lat": 31.5204,
  "lon": 74.3587
}
```

#### Get Environmental History
```
GET /api/environmental/history/{tenant_id}?limit=100&start_date=2024-01-01&end_date=2024-12-31
```

#### Get Environmental Statistics
```
GET /api/environmental/stats/{tenant_id}?days=30
```

#### Manual Data Collection
```
POST /api/environmental/collect/{lat}/{lon}
Body: {
  "tenant_id": "ObjectId",
  "silo_id": "ObjectId" // optional
}
```

#### Get Service Status
```
GET /api/environmental/service/status
```

### 5. Automated Data Collection

The system automatically collects environmental data:
- **Every 15 minutes**: For real-time monitoring
- **Every hour**: For detailed tracking
- **Every 6 hours**: For comprehensive analysis

Data is collected for all silos that have location coordinates.

### 6. Frontend Integration

The environmental data page is available at `/environmental` and includes:
- Real-time weather display
- Air quality monitoring
- Risk assessment
- Historical data visualization
- Animated charts and metrics

### 7. Data Structure

#### Weather Data
```javascript
{
  temperature: 25.5,        // Celsius
  humidity: 65,             // Percentage
  pressure: 1013.25,        // hPa
  wind_speed: 3.2,          // m/s
  wind_direction: 180,      // degrees
  precipitation: 0,          // mm
  visibility: 10,           // km
  uv_index: 5,             // 0-11 scale
  cloudiness: 20,          // percentage
  weather_condition: "Clear",
  weather_description: "clear sky",
  sunrise: "2024-01-01T06:30:00Z",
  sunset: "2024-01-01T18:30:00Z"
}
```

#### Air Quality Data
```javascript
{
  aqi: 2,                   // 1-5 scale
  co: 0.2,                  // μg/m³
  no: 0.1,                  // μg/m³
  no2: 15.5,                // μg/m³
  o3: 45.2,                 // μg/m³
  so2: 2.1,                 // μg/m³
  pm2_5: 8.5,               // μg/m³
  pm10: 12.3,               // μg/m³
  nh3: 0.5                  // μg/m³
}
```

#### Impact Assessment
```javascript
{
  temperature_risk: "low",     // low, medium, high
  humidity_risk: "medium",     // low, medium, high
  precipitation_risk: "low",    // low, medium, high
  overall_risk: "medium",      // low, medium, high
  recommendations: [
    "Moderate humidity - monitor grain moisture",
    "Consider ventilation for optimal conditions"
  ]
}
```

### 8. Error Handling

The system includes comprehensive error handling:
- API rate limiting protection
- Network timeout handling
- Invalid location data validation
- Database connection error recovery
- Service status monitoring

### 9. Monitoring and Logs

Monitor the service through:
- Console logs for data collection status
- Service status endpoint for health checks
- Database queries for data verification
- Error logs for troubleshooting

### 10. Cost Optimization

To minimize API costs:
- Data is cached and reused when possible
- Collection intervals are optimized
- Failed requests are retried with exponential backoff
- Unnecessary API calls are avoided

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify the API key in `.env`
   - Check if the key is active on OpenWeatherMap

2. **No Data Collection**
   - Ensure silos have location coordinates
   - Check service status endpoint
   - Verify database connection

3. **High API Usage**
   - Check collection intervals
   - Monitor API usage on OpenWeatherMap dashboard
   - Consider upgrading to paid plan

4. **Missing Environmental Data**
   - Verify location coordinates are valid
   - Check network connectivity
   - Review error logs for specific issues

### Support

For technical support:
- Check the console logs for detailed error messages
- Use the service status endpoint to verify system health
- Review the OpenWeatherMap API documentation
- Contact the development team for assistance

## Future Enhancements

Planned improvements:
- Weather forecast integration
- Historical weather data analysis
- Machine learning for weather impact prediction
- Integration with local weather stations
- Advanced alerting based on weather conditions
