const express = require('express');
const router = express.Router();
const SensorDevice = require('../models/SensorDevice');
const SensorReading = require('../models/SensorReading');
const Silo = require('../models/Silo');
const GrainAlert = require('../models/GrainAlert');
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const { body, validationResult, param, query } = require('express-validator');
const axios = require('axios');

/**
 * @swagger
 * tags:
 *   name: Sensors
 *   description: IoT sensor device and reading management
 */

/**
 * @swagger
 * /sensors:
 *   post:
 *     summary: Register a new sensor device
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_id
 *               - device_name
 *               - silo_id
 *               - sensor_types
 *             properties:
 *               device_id:
 *                 type: string
 *               device_name:
 *                 type: string
 *               silo_id:
 *                 type: string
 *               sensor_types:
 *                 type: array
 *                 items:
 *                   type: string
 *               mac_address:
 *                 type: string
 *               model:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sensor registered successfully
 */
router.post('/', [
    auth,
    requirePermission('sensor.manage'),
    requireTenantAccess,
    [
        body('device_id').notEmpty().withMessage('Device ID is required'),
        body('device_name').notEmpty().withMessage('Device name is required'),
        body('silo_id').isMongoId().withMessage('Valid silo ID is required'),
        body('sensor_types').isArray({ min: 1 }).withMessage('At least one sensor type is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if silo exists
        const silo = await Silo.findOne({
            _id: req.body.silo_id,
            tenant_id: req.user.tenant_id
        });

        if (!silo) {
            return res.status(404).json({ error: 'Silo not found' });
        }

        const sensor = new SensorDevice({
            ...req.body,
            tenant_id: req.user.tenant_id,
            created_by: req.user._id
        });

        await sensor.save();

        // Add sensor to silo
        silo.sensors.push({
            device_id: sensor._id,
            sensor_type: req.body.sensor_types[0], // Primary sensor type
            is_primary: silo.sensors.length === 0 // First sensor is primary
        });

        await silo.save();

        res.status(201).json({
            message: 'Sensor registered successfully',
            sensor
        });

    } catch (error) {
        console.error('Register sensor error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Device ID or MAC address already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /sensors:
 *   get:
 *     summary: Get all sensors for tenant
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', [
    auth,
    requirePermission('sensor.view'),
    requireTenantAccess
], async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { tenant_id: req.user.tenant_id };
        
        if (req.query.status) filter.status = req.query.status;
        if (req.query.silo_id) filter.silo_id = req.query.silo_id;

        const [sensors, total] = await Promise.all([
            SensorDevice.find(filter)
                .populate('silo_id', 'name silo_id')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SensorDevice.countDocuments(filter)
        ]);

        // Add virtual fields
        const sensorsWithStatus = sensors.map(sensor => ({
            ...sensor,
            health_status: getHealthStatus(sensor),
            calibration_status: getCalibrationStatus(sensor)
        }));

        res.json({
            sensors: sensorsWithStatus,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        });

    } catch (error) {
        console.error('Get sensors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /sensors/{id}:
 *   get:
 *     summary: Get sensor by ID
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', [
    auth,
    requirePermission('sensor.view'),
    requireTenantAccess,
    param('id').isMongoId().withMessage('Valid sensor ID is required')
], async (req, res) => {
    try {
        const sensor = await SensorDevice.findOne({
            _id: req.params.id,
            tenant_id: req.user.tenant_id
        }).populate('silo_id');

        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }

        // Get recent readings
        const recentReadings = await SensorReading.find({
            device_id: req.params.id
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

        res.json({
            ...sensor.toObject(),
            health_status: sensor.health_status,
            calibration_status: sensor.calibration_status,
            recent_readings: recentReadings
        });

    } catch (error) {
        console.error('Get sensor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /sensors/{id}:
 *   put:
 *     summary: Update sensor configuration
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', [
    auth,
    requirePermission('sensor.manage'),
    requireTenantAccess,
    param('id').isMongoId().withMessage('Valid sensor ID is required')
], async (req, res) => {
    try {
        const sensor = await SensorDevice.findOne({
            _id: req.params.id,
            tenant_id: req.user.tenant_id
        });

        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }

        // Update allowed fields
        const allowedUpdates = [
            'device_name', 'thresholds', 'data_transmission_interval',
            'is_enabled', 'auto_alerts', 'notes', 'tags'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                sensor[field] = req.body[field];
            }
        });

        sensor.updated_by = req.user._id;
        await sensor.save();

        res.json({
            message: 'Sensor updated successfully',
            sensor
        });

    } catch (error) {
        console.error('Update sensor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /sensors/{id}/readings:
 *   post:
 *     summary: Submit sensor reading (for IoT devices)
 *     tags: [Sensors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:id/readings', [
    param('id').isMongoId().withMessage('Valid sensor ID is required'),
    [
        body('timestamp').optional().isISO8601().withMessage('Invalid timestamp format'),
        body('temperature.value').optional().isFloat().withMessage('Invalid temperature value'),
        body('humidity.value').optional().isFloat({ min: 0, max: 100 }).withMessage('Humidity must be 0-100%'),
        body('co2.value').optional().isFloat({ min: 0 }).withMessage('CO2 must be positive'),
        body('voc.value').optional().isFloat({ min: 0 }).withMessage('VOC must be positive'),
        body('moisture.value').optional().isFloat({ min: 0, max: 100 }).withMessage('Moisture must be 0-100%')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Find sensor device
        const sensor = await SensorDevice.findById(req.params.id).populate('silo_id');
        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }

        if (!sensor.is_enabled) {
            return res.status(400).json({ error: 'Sensor is disabled' });
        }

        // Create sensor reading
        const reading = new SensorReading({
            device_id: req.params.id,
            tenant_id: sensor.tenant_id,
            silo_id: sensor.silo_id._id,
            timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
            ...req.body
        });

        // Update device heartbeat and stats
        await sensor.updateHeartbeat();
        await sensor.incrementReadingCount();

        // Check thresholds and create alerts if needed
        const thresholdViolations = checkThresholds(reading, sensor.thresholds);
        
        if (thresholdViolations.length > 0 && sensor.auto_alerts) {
            for (const violation of thresholdViolations) {
                await createAlert(sensor, reading, violation);
            }
            reading.alerts_triggered = thresholdViolations.map(v => ({
                sensor_type: v.sensor_type,
                threshold_type: v.threshold_type,
                threshold_value: v.threshold_value,
                actual_value: v.actual_value
            }));
        }

        await reading.save();

        // Update silo current conditions
        if (sensor.silo_id) {
            await updateSiloConditions(sensor.silo_id, reading);
        }

        res.status(201).json({
            message: 'Reading recorded successfully',
            reading_id: reading._id,
            alerts_triggered: thresholdViolations.length
        });

    } catch (error) {
        console.error('Submit reading error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /sensors/{id}/readings:
 *   get:
 *     summary: Get sensor readings
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/readings', [
    auth,
    requirePermission('sensor.view'),
    requireTenantAccess,
    param('id').isMongoId().withMessage('Valid sensor ID is required')
], async (req, res) => {
    try {
        const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
        const limit = parseInt(req.query.limit) || 100;

        const readings = await SensorReading.find({
            device_id: req.params.id,
            timestamp: { $gte: startDate, $lte: endDate }
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

        // Get aggregated data if requested
        let aggregatedData = null;
        if (req.query.aggregate) {
            const groupBy = req.query.group_by || 'hour';
            aggregatedData = await SensorReading.getAggregatedData({
                device_id: req.params.id,
                timestamp: { $gte: startDate, $lte: endDate }
            }, groupBy);
        }

        res.json({
            readings,
            aggregated_data: aggregatedData,
            total_readings: readings.length,
            date_range: {
                start: startDate,
                end: endDate
            }
        });

    } catch (error) {
        console.error('Get readings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /sensors/{id}/calibrate:
 *   post:
 *     summary: Calibrate sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/calibrate', [
    auth,
    requirePermission('sensor.calibrate'),
    requireTenantAccess,
    param('id').isMongoId().withMessage('Valid sensor ID is required')
], async (req, res) => {
    try {
        const sensor = await SensorDevice.findOne({
            _id: req.params.id,
            tenant_id: req.user.tenant_id
        });

        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found' });
        }

        // Update calibration dates
        sensor.last_calibration_date = new Date();
        sensor.calibration_due_date = new Date(Date.now() + sensor.calibration_interval_days * 24 * 60 * 60 * 1000);
        sensor.updated_by = req.user._id;

        await sensor.save();

        res.json({
            message: 'Sensor calibrated successfully',
            last_calibration_date: sensor.last_calibration_date,
            next_calibration_due: sensor.calibration_due_date
        });

    } catch (error) {
        console.error('Calibrate sensor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions
function getHealthStatus(sensor) {
    const now = new Date();
    const lastHeartbeat = sensor.health_metrics?.last_heartbeat;
    
    if (!lastHeartbeat) return 'unknown';
    
    const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
    const expectedInterval = sensor.data_transmission_interval / 60;
    
    if (minutesSinceHeartbeat > expectedInterval * 3) return 'offline';
    if (sensor.battery_level && sensor.battery_level < 20) return 'low_battery';
    if (sensor.health_metrics.error_count > 10) return 'error';
    
    return 'healthy';
}

function getCalibrationStatus(sensor) {
    if (!sensor.calibration_due_date) return 'unknown';
    
    const now = new Date();
    const daysUntilDue = (sensor.calibration_due_date - now) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue < 7) return 'due_soon';
    
    return 'current';
}

function checkThresholds(reading, thresholds) {
    const violations = [];
    const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
    
    sensorTypes.forEach(type => {
        const value = reading[type]?.value;
        const threshold = thresholds[type];
        
        if (value !== undefined && threshold) {
            if (threshold.critical_min !== undefined && value < threshold.critical_min) {
                violations.push({
                    sensor_type: type,
                    threshold_type: 'critical_min',
                    threshold_value: threshold.critical_min,
                    actual_value: value,
                    severity: 'critical'
                });
            } else if (threshold.critical_max !== undefined && value > threshold.critical_max) {
                violations.push({
                    sensor_type: type,
                    threshold_type: 'critical_max',
                    threshold_value: threshold.critical_max,
                    actual_value: value,
                    severity: 'critical'
                });
            } else if (threshold.min !== undefined && value < threshold.min) {
                violations.push({
                    sensor_type: type,
                    threshold_type: 'min',
                    threshold_value: threshold.min,
                    actual_value: value,
                    severity: 'warning'
                });
            } else if (threshold.max !== undefined && value > threshold.max) {
                violations.push({
                    sensor_type: type,
                    threshold_type: 'max',
                    threshold_value: threshold.max,
                    actual_value: value,
                    severity: 'warning'
                });
            }
        }
    });
    
    return violations;
}

async function createAlert(sensor, reading, violation) {
    try {
        const alert = new GrainAlert({
            tenant_id: sensor.tenant_id,
            silo_id: sensor.silo_id,
            device_id: sensor._id,
            title: `${violation.sensor_type.toUpperCase()} ${violation.severity.toUpperCase()}`,
            message: `${violation.sensor_type} ${violation.threshold_type.replace('_', ' ')}: ${violation.actual_value} (threshold: ${violation.threshold_value})`,
            alert_type: 'in-app',
            priority: violation.severity === 'critical' ? 'critical' : 'high',
            source: 'sensor',
            sensor_type: violation.sensor_type,
            trigger_conditions: {
                sensor_reading_id: reading._id,
                threshold_type: violation.threshold_type,
                threshold_value: violation.threshold_value,
                actual_value: violation.actual_value
            }
        });

        await alert.save();
        return alert;
    } catch (error) {
        console.error('Create alert error:', error);
    }
}

async function updateSiloConditions(silo, reading) {
    try {
        const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
        
        for (const type of sensorTypes) {
            if (reading[type]?.value !== undefined) {
                await silo.updateCurrentConditions(type, reading[type].value, reading.device_id);
            }
        }
    } catch (error) {
        console.error('Update silo conditions error:', error);
    }
}

// ============= ENVIRONMENTAL DATA FEED LAYER =============

/**
 * @swagger
 * /sensors/weather-data:
 *   get:
 *     summary: Get weather data from PMD (Pakistan Meteorological Department)
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/weather-data', [
    auth,
    requirePermission('environmental.monitor'),
    requireTenantAccess
], async (req, res) => {
    try {
        const { latitude, longitude, days = 3 } = req.query;
        
        // Default coordinates for major Pakistani cities if not provided
        const coords = {
            lat: latitude || '31.5497', // Lahore default
            lon: longitude || '74.3436'
        };
        
        // Simulate PMD weather API call (replace with actual PMD API when available)
        const weatherData = await getWeatherData(coords.lat, coords.lon, days);
        
        // Get AQI data (Air Quality Index)
        const aqiData = await getAirQualityData(coords.lat, coords.lon);
        
        // Generate storage recommendations based on weather
        const storageRecommendations = generateWeatherBasedRecommendations(weatherData, aqiData);
        
        res.json({
            location: {
                latitude: coords.lat,
                longitude: coords.lon,
                city: await getCityName(coords.lat, coords.lon)
            },
            timestamp: new Date().toISOString(),
            weather_forecast: weatherData,
            air_quality: aqiData,
            storage_recommendations: storageRecommendations,
            data_source: 'PMD Pakistan',
            forecast_period_days: parseInt(days)
        });
        
    } catch (error) {
        console.error('Weather data error:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

/**
 * @swagger
 * /sensors/regional-adaptation:
 *   get:
 *     summary: Get regional storage adaptation recommendations
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/regional-adaptation', [
    auth,
    requirePermission('environmental.monitor'),
    requireTenantAccess
], async (req, res) => {
    try {
        const { region = 'punjab', season } = req.query;
        const currentSeason = season || getCurrentSeason();
        
        // Regional adaptation data for Pakistan
        const adaptationData = getRegionalAdaptation(region, currentSeason);
        
        // Get current weather conditions
        const weatherData = await getWeatherData('31.5497', '74.3436', 1); // Default to Lahore
        
        // Monsoon-specific recommendations
        const monsoonRecommendations = generateMonsoonRecommendations(weatherData[0], region);
        
        // Smog season adaptations (Oct-Feb in Punjab)
        const smogAdaptations = generateSmogAdaptations(currentSeason, region);
        
        res.json({
            region: region,
            current_season: currentSeason,
            timestamp: new Date().toISOString(),
            regional_parameters: adaptationData,
            monsoon_preparations: monsoonRecommendations,
            smog_adaptations: smogAdaptations,
            climate_risk_factors: getClimateRiskFactors(region, currentSeason),
            recommended_actions: adaptationData.actions
        });
        
    } catch (error) {
        console.error('Regional adaptation error:', error);
        res.status(500).json({ error: 'Failed to get regional adaptation data' });
    }
});

/**
 * @swagger
 * /sensors/ai-weather-sync:
 *   post:
 *     summary: Sync environmental data with AI predictions
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 */
router.post('/ai-weather-sync', [
    auth,
    requirePermission('ai.enable'),
    requireTenantAccess
], async (req, res) => {
    try {
        const { silo_id, weather_data } = req.body;
        
        // Get current sensor readings for the silo
        const latestReading = await SensorReading.findOne({ silo_id })
            .sort({ timestamp: -1 });
            
        if (!latestReading) {
            return res.status(404).json({ error: 'No sensor data found for silo' });
        }
        
        // Combine sensor data with weather data for AI prediction
        const enhancedFeatures = {
            // Sensor data
            temperature: latestReading.temperature?.value,
            humidity: latestReading.humidity?.value,
            co2: latestReading.co2?.value,
            voc: latestReading.voc?.value,
            moisture: latestReading.moisture?.value,
            
            // Weather data enhancement
            external_temperature: weather_data?.temperature,
            external_humidity: weather_data?.humidity,
            atmospheric_pressure: weather_data?.pressure,
            wind_speed: weather_data?.wind_speed,
            precipitation_forecast: weather_data?.rain_probability,
            
            // Time-based features
            hour_of_day: new Date().getHours(),
            day_of_year: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)),
            season: getCurrentSeason()
        };
        
        // Calculate weather-adjusted risk score
        const weatherRiskFactors = calculateWeatherRiskFactors(enhancedFeatures);
        
        // Get all batches in this silo
        const batches = await require('../models/GrainBatch').find({ silo_id });
        
        const updatedBatches = [];
        for (const batch of batches) {
            // Adjust batch risk score based on weather conditions
            const adjustedRiskScore = adjustBatchRiskWithWeather(
                batch.risk_score || 0,
                weatherRiskFactors,
                batch.grain_type
            );
            
            if (Math.abs(adjustedRiskScore - (batch.risk_score || 0)) > 5) {
                await batch.updateRiskScore(adjustedRiskScore, 0.85);
                updatedBatches.push({
                    batch_id: batch.batch_id,
                    old_risk_score: batch.risk_score,
                    new_risk_score: adjustedRiskScore,
                    adjustment_reason: weatherRiskFactors.primary_factor
                });
            }
        }
        
        res.json({
            message: 'AI-weather sync completed',
            silo_id,
            enhanced_features: enhancedFeatures,
            weather_risk_factors: weatherRiskFactors,
            batches_updated: updatedBatches.length,
            updated_batches: updatedBatches,
            sync_timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('AI weather sync error:', error);
        res.status(500).json({ error: 'Failed to sync weather data with AI' });
    }
});

// Environmental data helper functions
async function getWeatherData(lat, lon, days) {
    try {
        // Simulate PMD API call - replace with actual PMD API when available
        // For now, using OpenWeatherMap as example (replace API key)
        const apiKey = process.env.WEATHER_API_KEY || 'demo_key';
        
        if (apiKey === 'demo_key') {
            // Return mock data for demonstration
            return Array.from({ length: days }, (_, i) => ({
                date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                temperature: {
                    max: 25 + Math.random() * 10,
                    min: 15 + Math.random() * 8,
                    avg: 20 + Math.random() * 8
                },
                humidity: 60 + Math.random() * 30,
                pressure: 1010 + Math.random() * 20,
                wind_speed: Math.random() * 15,
                rain_probability: Math.random() * 100,
                weather_condition: ['clear', 'partly_cloudy', 'cloudy', 'rainy'][Math.floor(Math.random() * 4)]
            }));
        }
        
        // Actual API call would go here
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );
        
        return response.data.list.slice(0, days * 8).map(item => ({
            date: item.dt_txt.split(' ')[0],
            temperature: {
                max: item.main.temp_max,
                min: item.main.temp_min,
                avg: item.main.temp
            },
            humidity: item.main.humidity,
            pressure: item.main.pressure,
            wind_speed: item.wind.speed,
            rain_probability: item.pop * 100,
            weather_condition: item.weather[0].main.toLowerCase()
        }));
        
    } catch (error) {
        console.error('Weather data fetch error:', error);
        return [];
    }
}

async function getAirQualityData(lat, lon) {
    try {
        // Mock AQI data - replace with actual AQI API
        return {
            aqi: Math.floor(50 + Math.random() * 150), // AQI 50-200
            pm25: Math.floor(10 + Math.random() * 90),
            pm10: Math.floor(20 + Math.random() * 180),
            no2: Math.floor(10 + Math.random() * 40),
            so2: Math.floor(5 + Math.random() * 25),
            co: Math.random() * 2,
            quality_level: getAQILevel(Math.floor(50 + Math.random() * 150)),
            health_recommendations: getHealthRecommendations(Math.floor(50 + Math.random() * 150))
        };
    } catch (error) {
        console.error('AQI data fetch error:', error);
        return null;
    }
}

function generateWeatherBasedRecommendations(weatherData, aqiData) {
    const recommendations = [];
    
    if (weatherData.length > 0) {
        const avgHumidity = weatherData.reduce((sum, day) => sum + day.humidity, 0) / weatherData.length;
        const maxTemp = Math.max(...weatherData.map(day => day.temperature.max));
        const rainProbability = Math.max(...weatherData.map(day => day.rain_probability));
        
        if (avgHumidity > 70) {
            recommendations.push({
                type: 'ventilation',
                priority: 'high',
                message: 'High humidity forecast - increase ventilation in storage areas',
                action: 'Activate additional fans and vents'
            });
        }
        
        if (maxTemp > 35) {
            recommendations.push({
                type: 'cooling',
                priority: 'medium',
                message: 'High temperature expected - monitor cooling systems',
                action: 'Check cooling system functionality'
            });
        }
        
        if (rainProbability > 70) {
            recommendations.push({
                type: 'moisture_control',
                priority: 'high',
                message: 'Heavy rain expected - secure moisture barriers',
                action: 'Inspect and seal storage areas against moisture'
            });
        }
    }
    
    if (aqiData && aqiData.aqi > 150) {
        recommendations.push({
            type: 'air_filtration',
            priority: 'medium',
            message: 'Poor air quality - consider air filtration',
            action: 'Activate air filtration systems if available'
        });
    }
    
    return recommendations;
}

function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
}

function getRegionalAdaptation(region, season) {
    const adaptations = {
        punjab: {
            summer: {
                temperature_threshold: { max: 35, critical_max: 40 },
                humidity_threshold: { max: 65, critical_max: 75 },
                ventilation_frequency: 'continuous',
                actions: ['Increase cooling', 'Monitor moisture levels', 'Prepare for monsoon']
            },
            monsoon: {
                humidity_threshold: { max: 60, critical_max: 70 },
                moisture_control: 'critical',
                actions: ['Enhanced dehumidification', 'Seal storage areas', 'Increase inspections']
            },
            winter: {
                temperature_threshold: { min: 10, critical_min: 5 },
                smog_precautions: 'active',
                actions: ['Monitor air quality', 'Reduce ventilation during smog', 'Heating if needed']
            }
        },
        sindh: {
            summer: {
                temperature_threshold: { max: 38, critical_max: 45 },
                humidity_threshold: { max: 70, critical_max: 80 },
                actions: ['Enhanced cooling', 'Coastal humidity control', 'Salt air protection']
            }
        }
    };
    
    return adaptations[region]?.[season] || adaptations.punjab.summer;
}

function generateMonsoonRecommendations(weatherData, region) {
    if (weatherData?.rain_probability > 50) {
        return {
            immediate_actions: [
                'Seal all storage entry points',
                'Check drainage systems around silos',
                'Increase moisture monitoring frequency',
                'Prepare emergency drying equipment'
            ],
            monitoring_frequency: 'every_2_hours',
            alert_thresholds: {
                humidity: 65,
                moisture_content: 13
            }
        };
    }
    return null;
}

function generateSmogAdaptations(season, region) {
    if ((season === 'winter' || season === 'autumn') && region === 'punjab') {
        return {
            air_quality_monitoring: 'enhanced',
            ventilation_strategy: 'filtered_only',
            recommendations: [
                'Use air filtration systems during high AQI periods',
                'Minimize external air intake during smog alerts',
                'Monitor grain quality more frequently',
                'Consider indoor air purification'
            ]
        };
    }
    return null;
}

function getClimateRiskFactors(region, season) {
    return {
        high_humidity_risk: season === 'monsoon' || season === 'summer',
        extreme_heat_risk: season === 'summer',
        air_pollution_risk: season === 'winter' && region === 'punjab',
        flood_risk: season === 'monsoon',
        drought_risk: season === 'summer' && region !== 'punjab'
    };
}

function calculateWeatherRiskFactors(features) {
    let riskMultiplier = 1.0;
    let primaryFactor = 'stable';
    
    // High external humidity increases internal risk
    if (features.external_humidity > 75) {
        riskMultiplier *= 1.3;
        primaryFactor = 'high_external_humidity';
    }
    
    // Large temperature difference between inside and outside
    if (Math.abs(features.temperature - features.external_temperature) > 15) {
        riskMultiplier *= 1.2;
        primaryFactor = 'temperature_gradient';
    }
    
    // High precipitation forecast
    if (features.precipitation_forecast > 70) {
        riskMultiplier *= 1.4;
        primaryFactor = 'monsoon_conditions';
    }
    
    // Low atmospheric pressure (weather change)
    if (features.atmospheric_pressure < 1000) {
        riskMultiplier *= 1.1;
    }
    
    return {
        risk_multiplier: riskMultiplier,
        primary_factor: primaryFactor,
        weather_stability: riskMultiplier < 1.2 ? 'stable' : 'unstable'
    };
}

function adjustBatchRiskWithWeather(currentRisk, weatherFactors, grainType) {
    let adjustedRisk = currentRisk * weatherFactors.risk_multiplier;
    
    // Grain-specific adjustments
    if (grainType === 'Rice' && weatherFactors.primary_factor === 'high_external_humidity') {
        adjustedRisk *= 1.2; // Rice is more sensitive to humidity
    }
    
    if (grainType === 'Wheat' && weatherFactors.primary_factor === 'monsoon_conditions') {
        adjustedRisk *= 1.15;
    }
    
    return Math.min(100, Math.max(0, Math.round(adjustedRisk)));
}

function getAQILevel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

function getHealthRecommendations(aqi) {
    if (aqi <= 50) return ['Normal outdoor activities'];
    if (aqi <= 100) return ['Acceptable air quality', 'Sensitive individuals should limit outdoor activities'];
    if (aqi <= 150) return ['Reduce outdoor activities', 'Use air filtration systems'];
    return ['Minimize outdoor exposure', 'Use high-quality air filtration', 'Consider masks for outdoor work'];
}

async function getCityName(lat, lon) {
    // Simple city mapping for major Pakistani cities
    const cities = {
        '31.5497,74.3436': 'Lahore',
        '24.8607,67.0011': 'Karachi',
        '33.6844,73.0479': 'Islamabad',
        '31.4504,73.1350': 'Faisalabad',
        '30.1575,71.5249': 'Multan'
    };
    
    const key = `${parseFloat(lat).toFixed(4)},${parseFloat(lon).toFixed(4)}`;
    return cities[key] || 'Unknown City';
}

module.exports = router;
