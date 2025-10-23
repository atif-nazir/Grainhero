const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');
const SensorReading = require('../models/SensorReading');
const { body, validationResult } = require('express-validator');

// Get current environmental data for a location
router.get('/current/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const environmentalData = await weatherService.getEnvironmentalData(latitude, longitude);
    
    res.json({
      success: true,
      data: environmentalData
    });
  } catch (error) {
    console.error('Error fetching environmental data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch environmental data',
      message: error.message 
    });
  }
});

// Get environmental data with impact assessment
router.get('/impact/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const environmentalData = await weatherService.getEnvironmentalData(latitude, longitude);
    const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);
    const aqiLevel = weatherService.getAQILevel(environmentalData.airQuality.aqi);

    res.json({
      success: true,
      data: {
        ...environmentalData,
        impact_assessment: impactAssessment,
        aqi_level: aqiLevel
      }
    });
  } catch (error) {
    console.error('Error fetching environmental impact data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch environmental impact data',
      message: error.message 
    });
  }
});

// Store environmental data in database
router.post('/store', [
  body('tenant_id').isMongoId().withMessage('Valid tenant ID required'),
  body('silo_id').isMongoId().withMessage('Valid silo ID required'),
  body('device_id').isMongoId().withMessage('Valid device ID required'),
  body('lat').isFloat().withMessage('Valid latitude required'),
  body('lon').isFloat().withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { tenant_id, silo_id, device_id, lat, lon } = req.body;

    // Fetch environmental data
    const environmentalData = await weatherService.getEnvironmentalData(lat, lon);
    const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);
    const aqiLevel = weatherService.getAQILevel(environmentalData.airQuality.aqi);

    // Create sensor reading with environmental context
    const sensorReading = new SensorReading({
      tenant_id,
      silo_id,
      device_id,
      timestamp: new Date(),
      environmental_context: {
        weather: environmentalData.weather,
        air_quality_index: environmentalData.airQuality.aqi,
        pmd_data: {
          pm25: environmentalData.airQuality.pm2_5,
          pm10: environmentalData.airQuality.pm10,
          ozone: environmentalData.airQuality.o3
        }
      },
      quality_indicators: {
        is_valid: true,
        confidence_score: 0.9,
        anomaly_detected: false
      }
    });

    await sensorReading.save();

    res.json({
      success: true,
      message: 'Environmental data stored successfully',
      data: {
        reading_id: sensorReading._id,
        environmental_data: environmentalData,
        impact_assessment: impactAssessment,
        aqi_level: aqiLevel
      }
    });
  } catch (error) {
    console.error('Error storing environmental data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to store environmental data',
      message: error.message 
    });
  }
});

// Get environmental data history
router.get('/history/:tenant_id', async (req, res) => {
  try {
    const { tenant_id } = req.params;
    const { limit = 100, start_date, end_date } = req.query;

    let query = { 
      tenant_id,
      'environmental_context.weather': { $exists: true }
    };

    if (start_date && end_date) {
      query.timestamp = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const readings = await SensorReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('silo_id', 'silo_id name location')
      .populate('device_id', 'device_id name type')
      .select('timestamp environmental_context silo_id device_id');

    res.json({
      success: true,
      data: readings
    });
  } catch (error) {
    console.error('Error fetching environmental history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch environmental history',
      message: error.message 
    });
  }
});

// Get environmental data statistics
router.get('/stats/:tenant_id', async (req, res) => {
  try {
    const { tenant_id } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await SensorReading.aggregate([
      {
        $match: {
          tenant_id: new require('mongoose').Types.ObjectId(tenant_id),
          timestamp: { $gte: startDate },
          'environmental_context.weather': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avg_temperature: { $avg: '$environmental_context.weather.temperature' },
          avg_humidity: { $avg: '$environmental_context.weather.humidity' },
          avg_pressure: { $avg: '$environmental_context.weather.pressure' },
          avg_wind_speed: { $avg: '$environmental_context.weather.wind_speed' },
          total_precipitation: { $sum: '$environmental_context.weather.precipitation' },
          avg_aqi: { $avg: '$environmental_context.air_quality_index' },
          max_temperature: { $max: '$environmental_context.weather.temperature' },
          min_temperature: { $min: '$environmental_context.weather.temperature' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    console.error('Error fetching environmental statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch environmental statistics',
      message: error.message 
    });
  }
});

// Get weather forecast for a location
router.get('/forecast/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const forecast = await weatherService.getWeatherForecast(latitude, longitude);
    
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch weather forecast',
      message: error.message 
    });
  }
});

// Get air quality data for a location
router.get('/air-quality/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const airQuality = await weatherService.getAirQuality(latitude, longitude);
    const aqiLevel = weatherService.getAQILevel(airQuality.aqi);
    
    res.json({
      success: true,
      data: {
        ...airQuality,
        level_info: aqiLevel
      }
    });
  } catch (error) {
    console.error('Error fetching air quality:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch air quality data',
      message: error.message 
    });
  }
});

// Manual data collection trigger
router.post('/collect/:lat/:lon', [
  body('tenant_id').isMongoId().withMessage('Valid tenant ID required'),
  body('silo_id').optional().isMongoId().withMessage('Valid silo ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { lat, lon } = req.params;
    const { tenant_id, silo_id } = req.body;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const environmentalDataService = require('../services/environmentalDataService');
    const result = await environmentalDataService.collectDataForLocation(
      latitude, 
      longitude, 
      tenant_id, 
      silo_id
    );

    res.json({
      success: true,
      message: 'Environmental data collected successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in manual data collection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to collect environmental data',
      message: error.message 
    });
  }
});

// Get service status
router.get('/service/status', (req, res) => {
  try {
    const environmentalDataService = require('../services/environmentalDataService');
    const status = environmentalDataService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get service status',
      message: error.message 
    });
  }
});

module.exports = router;
