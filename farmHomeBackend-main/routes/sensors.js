const express = require('express');
const router = express.Router();
const SensorDevice = require('../models/SensorDevice');
const SensorReading = require('../models/SensorReading');
const Silo = require('../models/Silo');
const GrainAlert = require('../models/GrainAlert');
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const { body, validationResult, param, query } = require('express-validator');

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

module.exports = router;
