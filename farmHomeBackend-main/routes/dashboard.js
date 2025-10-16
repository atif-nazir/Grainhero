const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const { body } = require('express-validator');
const GrainBatch = require('../models/GrainBatch');
const Silo = require('../models/Silo');
const Incident = require('../models/Incident');
const User = require('../models/User');
const SensorReading = require('../models/SensorReading');
const SensorDevice = require('../models/SensorDevice');
const Alert = require('../models/Alert');
const PDFKit = require('pdfkit');
const json2csv = require('json2csv').parse;
const fs = require('fs');

// Helper: Storage status calculation
function getStorageStatus(capacity, currentQuantity) {
  const utilization = (currentQuantity / capacity) * 100;
  if (utilization >= 90) return 'Critical';
  if (utilization >= 75) return 'High';
  if (utilization >= 50) return 'Medium';
  return 'Low';
}

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get real-time dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       value:
 *                         type: string
 *                 ageDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ageGroup:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 sexDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sex:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 breedDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       breed:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 breeding:
 *                   type: object
 *                   properties:
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     inProgress:
 *                       type: integer
 *                     successRate:
 *                       type: integer
 *                 suggestions:
 *                   type: object
 *                   properties:
 *                     culling:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tagId:
 *                             type: string
 *                           reason:
 *                             type: string
 *                     breeding:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tagId:
 *                             type: string
 *                           reason:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Grain batch stats
    const grainBatches = await GrainBatch.find();
    const totalBatches = grainBatches.length;
    
    // Silo stats
    const silos = await Silo.find();
    const totalSilos = silos.length;
    let totalCapacity = 0;
    let totalCurrentQuantity = 0;
    const storageStatus = { 'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0 };
    const grainTypes = {};
    
    silos.forEach(silo => {
      totalCapacity += silo.capacity || 0;
      totalCurrentQuantity += silo.currentQuantity || 0;
      
      // Storage status
      const status = getStorageStatus(silo.capacity, silo.currentQuantity);
      storageStatus[status] = (storageStatus[status] || 0) + 1;
    });
    
    // Grain type distribution
    grainBatches.forEach(batch => {
      if (batch.grainType) {
        grainTypes[batch.grainType] = (grainTypes[batch.grainType] || 0) + 1;
      }
    });

    // Storage utilization percentage
    const storageUtilization = totalCapacity > 0 ? Math.round((totalCurrentQuantity / totalCapacity) * 100) : 0;

    // Recent incidents (last month)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const recentIncidents = await Incident.countDocuments({ incidentDate: { $gte: oneMonthAgo } });

    // Active users (not blocked)
    const activeUsers = await User.countDocuments({ blocked: false });
    
    // Active alerts
    const activeAlerts = await Alert.countDocuments({ status: 'active' });

    // Storage recommendations
    const criticalSilos = silos.filter(s => {
      const utilization = (s.currentQuantity / s.capacity) * 100;
      return utilization >= 90;
    }).map(s => ({ siloId: s._id, name: s.name, reason: 'Near capacity - consider offloading' }));

    const lowUtilizationSilos = silos.filter(s => {
      const utilization = (s.currentQuantity / s.capacity) * 100;
      return utilization < 25;
    }).map(s => ({ siloId: s._id, name: s.name, reason: 'Low utilization - optimize storage' }));

    res.json({
      stats: [
        {
          title: 'Total Grain Batches',
          value: totalBatches,
        },
        {
          title: 'Storage Utilization',
          value: `${storageUtilization}%`,
        },
        {
          title: 'Recent Incidents (last month)',
          value: recentIncidents,
        },
        {
          title: 'Active Users',
          value: activeUsers,
        },
        {
          title: 'Active Alerts',
          value: activeAlerts,
        },
      ],
      storageDistribution: Object.entries(storageStatus).map(([status, count]) => ({ status, count })),
      grainTypeDistribution: Object.entries(grainTypes).map(([grainType, count]) => ({ grainType, count })),
      capacityStats: {
        totalCapacity,
        totalCurrentQuantity,
        utilizationPercentage: storageUtilization,
      },
      suggestions: {
        criticalStorage: criticalSilos,
        optimization: lowUtilizationSilos,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============= ENHANCED DASHBOARD & REPORTING =============

/**
 * @swagger
 * /dashboard/live-sensors:
 *   get:
 *     summary: Get live sensor data for all silos
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/live-sensors', [
    auth,
    requirePermission('sensor.view'),
    requireTenantAccess
], async (req, res) => {
    try {
        const { language = 'en' } = req.query;
        
        // Get all silos with their latest sensor readings
        const silos = await Silo.find({ tenant_id: req.user.tenant_id })
            .populate({
                path: 'sensor_devices',
                model: 'SensorDevice',
                match: { status: 'active' }
            });

        const sensorData = [];
        
        for (const silo of silos) {
            // Get latest readings for each silo
            const latestReading = await SensorReading.findOne({ silo_id: silo._id })
                .sort({ timestamp: -1 });
                
            const deviceCount = silo.sensor_devices?.length || 0;
            const activeDevices = silo.sensor_devices?.filter(d => d.status === 'active').length || 0;
            
            sensorData.push({
                silo_id: silo._id,
                silo_name: silo.name,
                location: silo.location,
                capacity_kg: silo.capacity_kg,
                current_quantity_kg: silo.current_quantity_kg,
                utilization_percentage: Math.round((silo.current_quantity_kg / silo.capacity_kg) * 100),
                device_count: deviceCount,
                active_devices: activeDevices,
                device_health: deviceCount > 0 ? Math.round((activeDevices / deviceCount) * 100) : 0,
                latest_reading: latestReading ? {
                    timestamp: latestReading.timestamp,
                    temperature: latestReading.temperature?.value,
                    humidity: latestReading.humidity?.value,
                    co2: latestReading.co2?.value,
                    voc: latestReading.voc?.value,
                    moisture: latestReading.moisture?.value,
                    light: latestReading.light?.value,
                    data_age_minutes: Math.round((Date.now() - new Date(latestReading.timestamp)) / (1000 * 60))
                } : null,
                status: getStorageStatus(silo.capacity_kg, silo.current_quantity_kg),
                alerts_count: await Alert.countDocuments({ silo_id: silo._id, status: 'active' })
            });
        }

        // Localization for Urdu interface
        const labels = language === 'ur' ? {
            temperature: 'درجہ حرارت',
            humidity: 'نمی',
            storage_status: 'اسٹوریج کی حالت',
            capacity: 'گنجائش',
            utilization: 'استعمال'
        } : {
            temperature: 'Temperature',
            humidity: 'Humidity', 
            storage_status: 'Storage Status',
            capacity: 'Capacity',
            utilization: 'Utilization'
        };

        res.json({
            timestamp: new Date().toISOString(),
            language,
            labels,
            silo_count: sensorData.length,
            total_capacity: sensorData.reduce((sum, s) => sum + s.capacity_kg, 0),
            total_utilization: sensorData.reduce((sum, s) => sum + s.current_quantity_kg, 0),
            average_temperature: sensorData.reduce((sum, s) => sum + (s.latest_reading?.temperature || 0), 0) / sensorData.length,
            average_humidity: sensorData.reduce((sum, s) => sum + (s.latest_reading?.humidity || 0), 0) / sensorData.length,
            silos: sensorData
        });

    } catch (error) {
        console.error('Live sensors dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dashboard/silo-comparison:
 *   get:
 *     summary: Compare multiple silos performance
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/silo-comparison', [
    auth,
    requirePermission('silo.view'),
    requireTenantAccess
], async (req, res) => {
    try {
        const { silo_ids, days = 7 } = req.query;
        const siloIds = silo_ids ? silo_ids.split(',') : [];
        
        if (siloIds.length === 0) {
            return res.status(400).json({ error: 'Please provide silo IDs to compare' });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const comparisonData = [];
        
        for (const siloId of siloIds) {
            const silo = await Silo.findOne({ _id: siloId, tenant_id: req.user.tenant_id });
            if (!silo) continue;

            // Get historical sensor data
            const sensorReadings = await SensorReading.find({
                silo_id: siloId,
                timestamp: { $gte: startDate }
            }).sort({ timestamp: 1 });

            // Get batches in this silo
            const batches = await GrainBatch.find({ silo_id: siloId });
            const avgRiskScore = batches.reduce((sum, b) => sum + (b.risk_score || 0), 0) / (batches.length || 1);
            const highRiskBatches = batches.filter(b => (b.risk_score || 0) >= 70).length;

            // Calculate averages
            const avgTemperature = sensorReadings.reduce((sum, r) => sum + (r.temperature?.value || 0), 0) / (sensorReadings.length || 1);
            const avgHumidity = sensorReadings.reduce((sum, r) => sum + (r.humidity?.value || 0), 0) / (sensorReadings.length || 1);
            const avgCO2 = sensorReadings.reduce((sum, r) => sum + (r.co2?.value || 0), 0) / (sensorReadings.length || 1);

            // Environmental stability (lower is better)
            const tempVariance = calculateVariance(sensorReadings.map(r => r.temperature?.value || 0));
            const humidityVariance = calculateVariance(sensorReadings.map(r => r.humidity?.value || 0));
            const stabilityScore = Math.max(0, 100 - (tempVariance + humidityVariance));

            comparisonData.push({
                silo_id: siloId,
                silo_name: silo.name,
                capacity_kg: silo.capacity_kg,
                utilization_percentage: Math.round((silo.current_quantity_kg / silo.capacity_kg) * 100),
                batch_count: batches.length,
                avg_risk_score: Math.round(avgRiskScore * 10) / 10,
                high_risk_batches: highRiskBatches,
                environmental_data: {
                    avg_temperature: Math.round(avgTemperature * 10) / 10,
                    avg_humidity: Math.round(avgHumidity * 10) / 10,
                    avg_co2: Math.round(avgCO2),
                    stability_score: Math.round(stabilityScore),
                    readings_count: sensorReadings.length
                },
                performance_rating: calculatePerformanceRating(avgRiskScore, stabilityScore, silo.current_quantity_kg / silo.capacity_kg),
                alerts_count: await Alert.countDocuments({ silo_id: siloId, status: 'active' })
            });
        }

        // Sort by performance rating
        comparisonData.sort((a, b) => b.performance_rating - a.performance_rating);

        res.json({
            comparison_period_days: parseInt(days),
            start_date: startDate.toISOString(),
            end_date: new Date().toISOString(),
            silos_compared: comparisonData.length,
            best_performing: comparisonData[0]?.silo_name || 'N/A',
            worst_performing: comparisonData[comparisonData.length - 1]?.silo_name || 'N/A',
            comparison_data: comparisonData
        });

    } catch (error) {
        console.error('Silo comparison error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dashboard/export-report:
 *   get:
 *     summary: Export dashboard data as PDF or CSV
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/export-report', [
    auth,
    requirePermission('reports.generate'),
    requireTenantAccess
], async (req, res) => {
    try {
        const { format = 'pdf', type = 'summary', language = 'en' } = req.query;
        
        // Get comprehensive dashboard data
        const [batches, silos, alerts, devices] = await Promise.all([
            GrainBatch.find({ tenant_id: req.user.tenant_id }).populate('silo_id'),
            Silo.find({ tenant_id: req.user.tenant_id }),
            Alert.find({ tenant_id: req.user.tenant_id, status: 'active' }),
            SensorDevice.find({ tenant_id: req.user.tenant_id })
        ]);

        const reportData = {
            generated_at: new Date(),
            tenant_id: req.user.tenant_id,
            report_type: type,
            summary: {
                total_batches: batches.length,
                total_silos: silos.length,
                total_capacity: silos.reduce((sum, s) => sum + (s.capacity_kg || 0), 0),
                total_stored: silos.reduce((sum, s) => sum + (s.current_quantity_kg || 0), 0),
                avg_utilization: silos.length > 0 ? Math.round(silos.reduce((sum, s) => sum + ((s.current_quantity_kg || 0) / (s.capacity_kg || 1) * 100), 0) / silos.length) : 0,
                high_risk_batches: batches.filter(b => (b.risk_score || 0) >= 70).length,
                active_alerts: alerts.length,
                active_devices: devices.filter(d => d.status === 'active').length
            },
            batches: batches.map(b => ({
                batch_id: b.batch_id,
                grain_type: b.grain_type,
                quantity_kg: b.quantity_kg,
                risk_score: b.risk_score,
                spoilage_label: b.spoilage_label,
                silo_name: b.silo_id?.name,
                intake_date: b.intake_date,
                storage_duration_days: b.storage_duration_days
            })),
            silos: silos.map(s => ({
                name: s.name,
                capacity_kg: s.capacity_kg,
                current_quantity_kg: s.current_quantity_kg,
                utilization_percentage: Math.round((s.current_quantity_kg / s.capacity_kg) * 100),
                location: s.location
            }))
        };

        if (format === 'csv') {
            // Generate CSV
            const csvData = type === 'batches' ? reportData.batches : 
                           type === 'silos' ? reportData.silos : 
                           [reportData.summary];
            
            const csv = json2csv(csvData);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="dashboard-report-${Date.now()}.csv"`);
            res.send(csv);
            
        } else {
            // Generate PDF
            const doc = new PDFKit();
            const filename = `dashboard-report-${Date.now()}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            doc.pipe(res);

            // PDF Header
            const title = language === 'ur' ? 'گرین ہیرو ڈیش بورڈ رپورٹ' : 'GrainHero Dashboard Report';
            doc.fontSize(20).text(title, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Generated: ${reportData.generated_at.toLocaleDateString()}`, { align: 'right' });
            doc.moveDown(2);

            // Summary Section
            const summaryTitle = language === 'ur' ? 'خلاصہ' : 'Summary';
            doc.fontSize(16).text(summaryTitle, { underline: true });
            doc.fontSize(12);
            doc.text(`Total Batches: ${reportData.summary.total_batches}`);
            doc.text(`Total Silos: ${reportData.summary.total_silos}`);
            doc.text(`Storage Utilization: ${reportData.summary.avg_utilization}%`);
            doc.text(`High Risk Batches: ${reportData.summary.high_risk_batches}`);
            doc.text(`Active Alerts: ${reportData.summary.active_alerts}`);
            doc.moveDown();

            // Detailed data based on type
            if (type === 'batches') {
                doc.fontSize(16).text('Batch Details', { underline: true });
                doc.fontSize(10);
                reportData.batches.forEach((batch, index) => {
                    if (index > 0 && index % 20 === 0) doc.addPage();
                    doc.text(`${batch.batch_id} | ${batch.grain_type} | ${batch.quantity_kg}kg | Risk: ${batch.risk_score || 'N/A'}%`);
                });
            }

            doc.end();
        }

    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============= ADMIN & CONTROL CONSOLE =============

/**
 * @swagger
 * /dashboard/admin/threshold-config:
 *   get:
 *     summary: Get current system threshold configurations
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/admin/threshold-config', [
    auth,
    requirePermission('thresholds.configure'),
    requireTenantAccess
], async (req, res) => {
    try {
        // Get all sensor devices with their thresholds
        const devices = await SensorDevice.find({ tenant_id: req.user.tenant_id })
            .populate('silo_id', 'name');
        
        // Get global threshold settings (could be stored in a separate collection)
        const globalThresholds = {
            temperature: { min: 10, max: 35, critical_min: 5, critical_max: 40 },
            humidity: { min: 40, max: 70, critical_min: 30, critical_max: 80 },
            co2: { max: 1000, critical_max: 5000 },
            voc: { max: 500, critical_max: 1000 },
            moisture: { max: 14, critical_max: 18 }
        };
        
        const deviceThresholds = devices.map(device => ({
            device_id: device._id,
            device_name: device.device_name,
            silo_name: device.silo_id?.name,
            current_thresholds: device.thresholds,
            status: device.status,
            last_calibration: device.last_calibration_date
        }));
        
        res.json({
            global_thresholds: globalThresholds,
            device_count: devices.length,
            device_thresholds: deviceThresholds,
            last_updated: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Threshold config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dashboard/admin/threshold-config:
 *   post:
 *     summary: Update threshold configurations
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.post('/dashboard/admin/threshold-config', [
    auth,
    requirePermission('thresholds.configure'),
    requireTenantAccess,
    [
        body('device_id').optional().isMongoId().withMessage('Valid device ID required'),
        body('thresholds').isObject().withMessage('Thresholds object is required')
    ]
], async (req, res) => {
    try {
        const { device_id, thresholds, apply_globally } = req.body;
        
        if (apply_globally) {
            // Apply to all devices in tenant
            const updateResult = await SensorDevice.updateMany(
                { tenant_id: req.user.tenant_id },
                { 
                    $set: { 
                        thresholds: thresholds,
                        updated_by: req.user._id 
                    } 
                }
            );
            
            res.json({
                message: 'Global thresholds updated successfully',
                devices_updated: updateResult.modifiedCount,
                thresholds: thresholds
            });
            
        } else if (device_id) {
            // Apply to specific device
            const device = await SensorDevice.findOneAndUpdate(
                { _id: device_id, tenant_id: req.user.tenant_id },
                { 
                    thresholds: thresholds,
                    updated_by: req.user._id 
                },
                { new: true }
            );
            
            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }
            
            res.json({
                message: 'Device thresholds updated successfully',
                device_id: device._id,
                device_name: device.device_name,
                thresholds: device.thresholds
            });
            
        } else {
            return res.status(400).json({ error: 'Either device_id or apply_globally must be specified' });
        }
        
    } catch (error) {
        console.error('Update threshold config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dashboard/admin/user-management:
 *   get:
 *     summary: Get user management overview
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/admin/user-management', [
    auth,
    requirePermission('users.manage'),
    requireTenantAccess
], async (req, res) => {
    try {
        const { role, status, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        // Build filter for tenant users
        const filter = {
            $or: [
                { tenant_id: req.user.tenant_id },
                { owned_tenant_id: req.user.tenant_id }
            ]
        };
        
        if (role) filter.role = role;
        if (status) filter.status = status;
        
        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password -resetPasswordToken -two_factor_secret')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(filter)
        ]);
        
        // Get user activity stats
        const userStats = {
            total_users: total,
            active_users: users.filter(u => u.status === 'active').length,
            blocked_users: users.filter(u => u.blocked).length,
            role_distribution: {
                technician: users.filter(u => u.role === 'technician').length,
                manager: users.filter(u => u.role === 'manager').length,
                admin: users.filter(u => u.role === 'admin').length
            }
        };
        
        // Add session info and last activity
        const usersWithActivity = users.map(user => ({
            ...user,
            active_sessions: user.active_sessions?.filter(s => s.is_active).length || 0,
            days_since_login: user.lastLogin ? Math.floor((Date.now() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24)) : 'Never'
        }));
        
        res.json({
            user_stats: userStats,
            users: usersWithActivity,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('User management error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dashboard/admin/device-management:
 *   get:
 *     summary: Get device management overview
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/admin/device-management', [
    auth,
    requirePermission('sensor.manage'),
    requireTenantAccess
], async (req, res) => {
    try {
        const devices = await SensorDevice.find({ tenant_id: req.user.tenant_id })
            .populate('silo_id', 'name location')
            .sort({ created_at: -1 });
        
        // Device health analysis
        const deviceHealth = devices.map(device => {
            const now = new Date();
            const lastHeartbeat = device.health_metrics?.last_heartbeat;
            const minutesSinceHeartbeat = lastHeartbeat ? (now - lastHeartbeat) / (1000 * 60) : null;
            
            return {
                device_id: device._id,
                device_name: device.device_name,
                silo_name: device.silo_id?.name,
                status: device.status,
                health_status: getDeviceHealthStatus(device),
                battery_level: device.battery_level,
                last_heartbeat: lastHeartbeat,
                minutes_since_heartbeat: minutesSinceHeartbeat ? Math.round(minutesSinceHeartbeat) : null,
                error_count: device.health_metrics?.error_count || 0,
                calibration_due: device.isCalibrationDue?.() || false,
                readings_today: device.data_stats?.readings_today || 0,
                uptime_percentage: device.health_metrics?.uptime_percentage || 0
            };
        });
        
        // Device statistics
        const deviceStats = {
            total_devices: devices.length,
            active_devices: devices.filter(d => d.status === 'active').length,
            offline_devices: devices.filter(d => getDeviceHealthStatus(d) === 'offline').length,
            low_battery_devices: devices.filter(d => d.battery_level && d.battery_level < 20).length,
            calibration_due: devices.filter(d => d.isCalibrationDue?.()).length,
            avg_uptime: devices.reduce((sum, d) => sum + (d.health_metrics?.uptime_percentage || 0), 0) / (devices.length || 1)
        };
        
        res.json({
            device_stats: deviceStats,
            device_health: deviceHealth,
            maintenance_alerts: deviceHealth.filter(d => 
                d.health_status === 'offline' || 
                d.calibration_due || 
                (d.battery_level && d.battery_level < 20)
            )
        });
        
    } catch (error) {
        console.error('Device management error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dashboard/admin/system-override:
 *   post:
 *     summary: Execute manual system override
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.post('/dashboard/admin/system-override', [
    auth,
    requirePermission('system.override'),
    requireTenantAccess,
    [
        body('override_type').isIn(['risk_score', 'device_status', 'alert_silence', 'batch_status']).withMessage('Invalid override type'),
        body('target_id').notEmpty().withMessage('Target ID is required'),
        body('override_value').notEmpty().withMessage('Override value is required'),
        body('reason').notEmpty().withMessage('Override reason is required')
    ]
], async (req, res) => {
    try {
        const { override_type, target_id, override_value, reason, duration_hours = 24 } = req.body;
        
        const override = {
            id: `OVR-${Date.now()}`,
            type: override_type,
            target_id,
            original_value: null,
            override_value,
            reason,
            created_by: req.user._id,
            created_at: new Date(),
            expires_at: new Date(Date.now() + duration_hours * 60 * 60 * 1000),
            is_active: true
        };
        
        let result = {};
        
        switch (override_type) {
            case 'risk_score':
                const batch = await GrainBatch.findOne({ _id: target_id, tenant_id: req.user.tenant_id });
                if (!batch) return res.status(404).json({ error: 'Batch not found' });
                
                override.original_value = batch.risk_score;
                await batch.updateRiskScore(override_value, 0.99); // High confidence for manual override
                result = { batch_id: batch.batch_id, old_risk: override.original_value, new_risk: override_value };
                break;
                
            case 'device_status':
                const device = await SensorDevice.findOne({ _id: target_id, tenant_id: req.user.tenant_id });
                if (!device) return res.status(404).json({ error: 'Device not found' });
                
                override.original_value = device.status;
                device.status = override_value;
                device.updated_by = req.user._id;
                await device.save();
                result = { device_name: device.device_name, old_status: override.original_value, new_status: override_value };
                break;
                
            case 'alert_silence':
                await Alert.updateMany(
                    { _id: { $in: target_id.split(',') }, tenant_id: req.user.tenant_id },
                    { status: 'silenced', silenced_until: override.expires_at, silenced_by: req.user._id }
                );
                result = { alerts_silenced: target_id.split(',').length, silenced_until: override.expires_at };
                break;
                
            case 'batch_status':
                const targetBatch = await GrainBatch.findOne({ _id: target_id, tenant_id: req.user.tenant_id });
                if (!targetBatch) return res.status(404).json({ error: 'Batch not found' });
                
                override.original_value = targetBatch.status;
                targetBatch.status = override_value;
                targetBatch.updated_by = req.user._id;
                await targetBatch.save();
                result = { batch_id: targetBatch.batch_id, old_status: override.original_value, new_status: override_value };
                break;
        }
        
        // Log the override (you could create a separate Override collection)
        console.log('System Override:', override);
        
        res.json({
            message: 'System override executed successfully',
            override_id: override.id,
            override_type,
            expires_at: override.expires_at,
            result
        });
        
    } catch (error) {
        console.error('System override error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dashboard/admin/batch-history:
 *   get:
 *     summary: Get comprehensive batch and storage history
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/admin/batch-history', [
    auth,
    requirePermission('batch.view'),
    requireTenantAccess
], async (req, res) => {
    try {
        const { days = 30, include_deleted = false } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        
        // Build aggregation pipeline
        const matchStage = {
            tenant_id: req.user.tenant_id,
            created_at: { $gte: startDate }
        };
        
        if (!include_deleted) {
            matchStage.deleted_at = null;
        }
        
        const batchHistory = await GrainBatch.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'silos',
                    localField: 'silo_id',
                    foreignField: '_id',
                    as: 'silo_info'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'created_by',
                    foreignField: '_id',
                    as: 'creator_info'
                }
            },
            {
                $project: {
                    batch_id: 1,
                    grain_type: 1,
                    quantity_kg: 1,
                    status: 1,
                    risk_score: 1,
                    spoilage_label: 1,
                    intake_date: 1,
                    actual_dispatch_date: 1,
                    storage_duration: {
                        $cond: {
                            if: '$actual_dispatch_date',
                            then: { $divide: [{ $subtract: ['$actual_dispatch_date', '$intake_date'] }, 1000 * 60 * 60 * 24] },
                            else: { $divide: [{ $subtract: [new Date(), '$intake_date'] }, 1000 * 60 * 60 * 24] }
                        }
                    },
                    silo_name: { $arrayElemAt: ['$silo_info.name', 0] },
                    created_by_name: { $arrayElemAt: ['$creator_info.name', 0] },
                    spoilage_events_count: { $size: { $ifNull: ['$spoilage_events', []] } },
                    last_risk_assessment: 1,
                    created_at: 1
                }
            },
            { $sort: { created_at: -1 } }
        ]);
        
        // Generate summary statistics
        const summary = {
            total_batches: batchHistory.length,
            avg_storage_duration: batchHistory.reduce((sum, b) => sum + (b.storage_duration || 0), 0) / (batchHistory.length || 1),
            batches_by_status: {
                stored: batchHistory.filter(b => b.status === 'stored').length,
                dispatched: batchHistory.filter(b => b.status === 'dispatched').length,
                damaged: batchHistory.filter(b => b.status === 'damaged').length
            },
            avg_risk_score: batchHistory.reduce((sum, b) => sum + (b.risk_score || 0), 0) / (batchHistory.length || 1),
            spoilage_incidents: batchHistory.reduce((sum, b) => sum + (b.spoilage_events_count || 0), 0),
            grain_type_distribution: {},
            monthly_intake_trend: {}
        };
        
        // Calculate grain type distribution
        batchHistory.forEach(batch => {
            summary.grain_type_distribution[batch.grain_type] = 
                (summary.grain_type_distribution[batch.grain_type] || 0) + 1;
        });
        
        res.json({
            period_days: parseInt(days),
            start_date: startDate.toISOString(),
            summary: summary,
            batch_history: batchHistory.slice(0, 100), // Limit to first 100 for performance
            total_records: batchHistory.length
        });
        
    } catch (error) {
        console.error('Batch history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions
function calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

function calculatePerformanceRating(avgRiskScore, stabilityScore, utilizationRatio) {
    const riskFactor = Math.max(0, 100 - (avgRiskScore || 0));
    const utilizationFactor = Math.min(100, utilizationRatio * 100);
    return Math.round((riskFactor * 0.4 + stabilityScore * 0.3 + utilizationFactor * 0.3));
}

function getDeviceHealthStatus(device) {
    const now = new Date();
    const lastHeartbeat = device.health_metrics?.last_heartbeat;
    
    if (!lastHeartbeat) return 'unknown';
    
    const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
    const expectedInterval = device.data_transmission_interval / 60;
    
    if (minutesSinceHeartbeat > expectedInterval * 3) return 'offline';
    if (device.battery_level && device.battery_level < 20) return 'low_battery';
    if (device.health_metrics.error_count > 10) return 'error';
    
    return 'healthy';
}

module.exports = router;
