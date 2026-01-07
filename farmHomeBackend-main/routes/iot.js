const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const SensorDevice = require('../models/SensorDevice');
const SensorReading = require('../models/SensorReading');
const mqtt = require('mqtt'); // Added for MQTT support
const Silo = require('../models/Silo');
const admin = require('firebase-admin');
let firebaseDb = null;
function ensureFirebase() {
  if (!admin.apps.length) {
    const url = process.env.FIREBASE_DATABASE_URL;
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!url) throw new Error('FIREBASE_DATABASE_URL missing');
    let credential;
    if (saJson) {
      credential = admin.credential.cert(JSON.parse(saJson));
    } else if (saPath) {
      credential = admin.credential.cert(require(saPath));
    } else {
      credential = admin.credential.applicationDefault();
    }
    admin.initializeApp({ credential, databaseURL: url });
  }
  firebaseDb = admin.database();
}

// MQTT client initialization
let mqttClient = null;
try {
  // Only initialize if MQTT broker is configured
  if (process.env.MQTT_BROKER_URL) {
    mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
      username: process.env.MQTT_USERNAME || 'admin',
      password: process.env.MQTT_PASSWORD || 'password'
    });

    mqttClient.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      // Subscribe to sensor data topics
      mqttClient.subscribe('grainhero/sensors/+/readings');
      mqttClient.subscribe('grainhero/sensors/+/status');
      mqttClient.subscribe('grainhero/actuators/+/feedback');
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT connection error:', error);
    });
  }
} catch (error) {
  console.error('Failed to initialize MQTT client:', error);
}

// Live data only — no mock devices

// GET /iot/devices - Get all IoT devices
router.get('/devices', [
  auth,
  requirePermission('sensor.view'),
  requireTenantAccess
], async (req, res) => {
  try {
    const { type, category, status, location } = req.query;

    // First try to get real devices from database
    let devices = [];
    try {
      const filter = { admin_id: req.user.admin_id };

      if (type) filter.device_type = type;
      if (category) filter.category = category;
      if (status) filter.connection_status = status;
      // location filter not supported on SensorDevice

      devices = await SensorDevice.find(filter)
        .populate('silo_id', 'name silo_id')
        .sort({ created_at: -1 });
    } catch (dbError) {
      console.warn('Database query failed:', dbError.message);
    }

    console.log(`📡 Serving ${devices.length} IoT devices`);

    res.json({
      devices,
      total: devices.length,
      online: devices.filter(d => d.connection_status === 'online').length,
      offline: devices.filter(d => d.connection_status === 'offline').length
    });
  } catch (error) {
    console.error('Get IoT devices error:', error);
    res.status(500).json({ error: 'Failed to get IoT devices' });
  }
});

// GET /iot/devices/:id - Get specific device
router.get('/devices/:id', [
  auth,
  requirePermission('sensor.view'),
  requireTenantAccess
], async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get real device from database first
    let device = null;
    try {
      device = await SensorDevice.findOne({
        _id: id,
        admin_id: req.user.admin_id
      }).populate('silo_id');
    } catch (dbError) {
      console.warn('Database query failed:', dbError.message);
    }

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ device });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Failed to get device' });
  }
});

const noCache = require('../middleware/noCache');

// POST /iot/devices/:id/control - Control device (ON/OFF) - NEVER CACHE
router.post('/devices/:id/control', [
  auth,
  noCache, // Critical: Real-time control must never be cached
  requirePermission('actuator.control'),
  requireTenantAccess
], async (req, res) => {
  try {
    const { id } = req.params;
    const { action, value, duration } = req.body;

    // Try to get real device from database first
    let device = null;
    try {
      device = await SensorDevice.findOne({
        _id: id,
        admin_id: req.user.admin_id
      });
    } catch (dbError) {
      console.warn('Database query failed:', dbError.message);
    }

    // If not found in database, check mock devices
    if (!device) {
      device = mockDevices.find(d => d._id === id);
    }

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    let guardrailBlocked = false;
    let guardrailReason = '';
    try {
      const recentReading = await SensorReading.findOne({ device_id: device._id || id }).sort({ timestamp: -1 });
      if (recentReading) {
        const t = recentReading.temperature || recentReading.readings?.temperature || 0;
        const h = recentReading.humidity || recentReading.readings?.humidity || 0;
        const tv = recentReading.tvoc_ppb || recentReading.readings?.tvoc || 0;
        if (t > 60 || tv > 1000) {
          guardrailBlocked = true;
          guardrailReason = 'unsafe_conditions';
        }
      }
    } catch { }
    if (guardrailBlocked) {
      return res.status(200).json({ status: 'blocked', reason: guardrailReason });
    }
    // Handle real device control via MQTT (REQUEST ONLY - authority is on ESP32 state machine)
    if (device.device_id && mqttClient && mqttClient.connected) {
      const controlTopic = `grainhero/actuators/${device.device_id}/control`;
      const controlMessage = {
        action, // Arduino still expects these keys for backward compatibility
        value,
        duration,
        timestamp: new Date().toISOString(),
        user: req.user._id,
        // New explicit state requests
        human_requested_fan: action === 'turn_on' ? true : (action === 'turn_off' ? false : undefined),
        target_fan_speed: value !== undefined ? value : (action === 'turn_on' ? 60 : 0)
      };

      mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
      console.log(`📡 MQTT request sent to ${controlTopic} - centralized control active`);
    }

    let newStatus = device.status;
    let newValue = device.current_value;
    let message = '';

    if (device.device_type === 'actuator') {
      switch (action) {
        case 'turn_on':
          newStatus = 'active';
          newValue = value || 100;
          message = `${device.device_name} turned ON`;
          break;
        case 'turn_off':
          newStatus = 'inactive';
          newValue = 0;
          message = `${device.device_name} turned OFF`;
          break;
        case 'set_value':
          newStatus = 'active';
          newValue = value;
          message = `${device.device_name} set to ${value}`;
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      try {
        device.status = newStatus;
        device.current_value = newValue;
        device.last_activity = new Date();

        // Update centralized state variables
        if (action === 'turn_on') {
          device.human_requested_fan = true;
          device.target_fan_speed = value || 60;
        } else if (action === 'turn_off') {
          device.human_requested_fan = false;
          device.target_fan_speed = 0;
        } else if (action === 'set_value') {
          device.human_requested_fan = value > 0;
          device.target_fan_speed = value;
        }

        await device.save();
      } catch (saveError) {
        console.warn('Failed to save device state:', saveError.message);
      }

      console.log(`🎛️ Device control: ${device.device_name} - ${action} - ${newValue}`);

      res.json({
        message,
        device: {
          _id: device._id,
          device_id: device.device_id,
          name: device.device_name,
          status: device.status,
          current_value: device.current_value,
          last_activity: device.last_activity
        },
        action_performed: action,
        new_value: newValue,
        timestamp: new Date()
      });
    } else {
      res.status(400).json({ error: 'Cannot control sensor devices' });
    }
  } catch (error) {
    console.error('Control device error:', error);
    res.status(500).json({ error: 'Failed to control device' });
  }
});

router.get('/silos/:siloId/telemetry', [
  auth,
  requirePermission('sensor.view'),
  requireTenantAccess
], async (req, res) => {
  try {
    const { siloId } = req.params;
    let device = null;
    try {
      device = await SensorDevice.findOne({ device_id: siloId, admin_id: req.user.admin_id });
    } catch { }
    if (!device) {
      const silo = await Silo.findById(siloId);
      if (!silo) {
        return res.status(404).json({ error: 'Silo not found' });
      }
    }
    ensureFirebase();
    let snapshot;
    try {
      snapshot = await firebaseDb.ref(`sensor_data/${siloId}/latest`).get();
    } catch (e) {
      console.error('Firebase read error:', e.message);
      return res.status(503).json({ error: 'Silo offline' });
    }
    if (!snapshot || snapshot.val() === null) {
      console.warn(`Firebase node missing for siloId ${siloId}`);
      return res.status(503).json({ error: 'Silo offline' });
    }
    const payload = snapshot.val() || {};
    const temperature = payload.temperature !== undefined ? Number(payload.temperature) : 0;
    const humidity = payload.humidity !== undefined ? Number(payload.humidity) : 0;
    const tvocRaw = payload.tvoc !== undefined ? Number(payload.tvoc) : (payload.voc !== undefined ? Number(payload.voc) : 0);
    const fanState = payload.fanState !== undefined ? (payload.fanState ? 'on' : 'off') : ((payload.pwm_speed && Number(payload.pwm_speed) > 0) ? 'on' : 'off');
    const lidState = payload.lidState !== undefined ? (payload.lidState ? 'open' : 'closed') : ((payload.servo_state ? Number(payload.servo_state) : 0) ? 'open' : 'closed');
    const mlDecision = payload.mlDecision || ((humidity > 75 || tvocRaw > 600) ? 'fan_on' : 'idle');
    const humanOverride = payload.humanOverride !== undefined ? !!payload.humanOverride : !!payload.human_override;
    const guardrails = [];
    if (temperature > 60) guardrails.push('high_temperature');
    if (tvocRaw > 1000) guardrails.push('high_tvoc');
    console.log(`Firebase read success for ${siloId}`);
    res.json({
      temperature,
      humidity,
      tvoc: tvocRaw,
      fanState,
      lidState,
      mlDecision,
      humanOverride,
      guardrails,
      timestamp: payload.timestamp || Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

// POST /iot/devices/:id/readings - Get device readings
router.post('/devices/:id/readings', [
  auth,
  requirePermission('iot.read'),
  requireTenantAccess
], async (req, res) => {
  try {
    const { id } = req.params;
    const { hours = 24 } = req.body;

    // Try to get real device from database first
    let device = null;
    try {
      device = await SensorDevice.findOne({
        _id: id,
        admin_id: req.user.admin_id
      });
    } catch (dbError) {
      console.warn('Database query failed:', dbError.message);
    }

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Try to get real readings from database
    let readings = [];
    try {
      const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
      readings = await SensorReading.find({
        device_id: device._id,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: -1 }).limit(100);
    } catch (dbError) {
      console.warn('Database readings query failed:', dbError.message);
    }

    res.json({
      device_id: device.device_id,
      device_name: device.device_name,
      readings,
      total_readings: readings.length,
      time_range: {
        start: new Date(Date.now() - (hours * 60 * 60 * 1000)),
        end: new Date()
      }
    });
  } catch (error) {
    console.error('Get readings error:', error);
    res.status(500).json({ error: 'Failed to get readings' });
  }
});

// POST /iot/bulk-control - Control multiple devices
router.post('/bulk-control', [
  auth,
  requirePermission('iot.control'),
  requireTenantAccess
], async (req, res) => {
  try {
    const { devices, action, value } = req.body;

    if (!devices || !Array.isArray(devices)) {
      return res.status(400).json({ error: 'Devices array is required' });
    }

    const results = [];

    for (const deviceId of devices) {
      // Try to get real device from database first
      let device = null;
      try {
        device = await SensorDevice.findOne({
          _id: deviceId,
          admin_id: req.user.admin_id
        });
      } catch (dbError) {
        console.warn('Database query failed:', dbError.message);
      }

      // If not found in database, check mock devices
      if (!device) {
        device = mockDevices.find(d => d._id === deviceId);
      }

      if (device && device.type === 'actuator') {
        // Handle real device control via MQTT (REQUEST ONLY)
        if (device.device_id && mqttClient && mqttClient.connected) {
          const controlTopic = `grainhero/actuators/${device.device_id}/control`;
          const controlMessage = {
            action,
            value,
            timestamp: new Date().toISOString(),
            user: req.user._id,
            human_requested_fan: action === 'turn_on' ? true : (action === 'turn_off' ? false : undefined),
            target_fan_speed: value !== undefined ? value : (action === 'turn_on' ? 60 : 0)
          };

          mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
          console.log(`📡 MQTT request sent to ${controlTopic}`);
        }

        // Update device status for real devices
        if (device._id && device.constructor.modelName) {
          try {
            device.status = action === 'turn_on' ? 'online' : 'offline';
            device.current_value = action === 'turn_on' ? (value || 100) : 0;
            device.last_activity = new Date();

            // Update centralized state variables
            device.human_requested_fan = action === 'turn_on';
            device.target_fan_speed = action === 'turn_on' ? (value || 60) : 0;

            await device.save();
          } catch (saveError) {
            console.warn('Failed to save device state:', saveError.message);
          }
        } else {
          // Update mock device status
          device.status = action === 'turn_on' ? 'online' : 'offline';
          device.current_value = action === 'turn_on' ? (value || 100) : 0;
          device.last_activity = new Date();
          device.human_requested_fan = action === 'turn_on';
          device.target_fan_speed = action === 'turn_on' ? (value || 60) : 0;
        }

        results.push({
          device_id: device.device_id,
          name: device.name,
          status: device.status,
          value: device.current_value,
          success: true
        });
      } else {
        results.push({
          device_id: deviceId,
          success: false,
          error: 'Device not found or not controllable'
        });
      }
    }

    console.log(`🎛️ Bulk control: ${action} on ${devices.length} devices`);

    res.json({
      message: `Bulk ${action} completed`,
      results,
      total_devices: devices.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Bulk control error:', error);
    res.status(500).json({ error: 'Failed to perform bulk control' });
  }
});

// GET /iot/status - Get overall IoT system status
router.get('/status', [
  auth,
  requirePermission('iot.read'),
  requireTenantAccess
], async (req, res) => {
  try {
    // Try to get real devices from database
    let devices = [];
    try {
      devices = await SensorDevice.find({ admin_id: req.user.admin_id });
    } catch (dbError) {
      console.warn('Database query failed:', dbError.message);
    }

    const sensors = devices.filter(d => d.device_type === 'sensor');
    const actuators = devices.filter(d => d.device_type === 'actuator');

    const status = {
      total_devices: devices.length,
      sensors: {
        total: sensors.length,
        online: sensors.filter(s => s.connection_status === 'online').length,
        offline: sensors.filter(s => s.connection_status === 'offline').length
      },
      actuators: {
        total: actuators.length,
        online: actuators.filter(a => a.connection_status === 'online').length,
        offline: actuators.filter(a => a.connection_status === 'offline').length
      },
      system_health: 'good',
      mqtt_connected: mqttClient ? mqttClient.connected : false,
      last_updated: new Date()
    };

    res.json(status);
  } catch (error) {
    console.error('Get IoT status error:', error);
    res.status(500).json({ error: 'Failed to get IoT status' });
  }
});

// POST /iot/emergency-shutdown - Emergency shutdown all actuators
router.post('/emergency-shutdown', [
  auth,
  requirePermission('iot.control'),
  requireTenantAccess
], async (req, res) => {
  try {
    // Try to get real actuators from database
    let actuators = [];
    try {
      actuators = await SensorDevice.find({
        admin_id: req.user.admin_id,
        device_type: 'actuator'
      });
    } catch (dbError) {
      console.warn('Database query failed:', dbError.message);
    }

    let shutdownCount = 0;

    for (const actuator of actuators) {
      // Handle real device control via MQTT
      if (actuator.device_id && mqttClient && mqttClient.connected) {
        const controlTopic = `grainhero/actuators/${actuator.device_id}/control`;
        const controlMessage = {
          action: 'turn_off',
          timestamp: new Date().toISOString(),
          user: req.user._id,
          emergency: true
        };

        mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
        console.log(`📡 Emergency shutdown command sent to ${controlTopic}`);
      }

      try {
        actuator.status = 'inactive';
        actuator.current_value = 0;
        actuator.last_activity = new Date();

        // Clear centralized state requests
        actuator.human_requested_fan = false;
        actuator.ml_requested_fan = false;
        actuator.target_fan_speed = 0;

        await actuator.save();
      } catch (saveError) {
        console.warn('Failed to save actuator state:', saveError.message);
      }

      shutdownCount++;
    }

    console.log(`🚨 Emergency shutdown: ${shutdownCount} actuators turned off`);

    res.json({
      message: 'Emergency shutdown completed',
      devices_shutdown: shutdownCount,
      mqtt_commands_sent: mqttClient && mqttClient.connected ? shutdownCount : 0,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Emergency shutdown error:', error);
    res.status(500).json({ error: 'Failed to perform emergency shutdown' });
  }
});

// POST /iot/mqtt-ingest - Ingest data from MQTT (for real devices)
router.post('/mqtt-ingest', async (req, res) => {
  try {
    const { device_id, readings, timestamp } = req.body;

    // Find the device in database
    const device = await SensorDevice.findOne({ device_id });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Normalize readings: tvoc -> voc, include actuator fields
    const normalized = { ...(readings || {}) };
    if (normalized.tvoc !== undefined && normalized.voc === undefined) {
      normalized.voc = normalized.tvoc;
      delete normalized.tvoc;
    }
    if (normalized.pwm_speed !== undefined && typeof normalized.pwm_speed === 'number') {
      normalized.pwm_speed = { value: normalized.pwm_speed, unit: 'percent' };
    }
    if (normalized.servo_state !== undefined) {
      const val = typeof normalized.servo_state === 'boolean' ? (normalized.servo_state ? 1 : 0) : normalized.servo_state;
      normalized.servo_state = { value: val, unit: 'boolean' };
    }

    // Create sensor reading
    const sensorReading = new SensorReading({
      device_id: device._id,
      tenant_id: device.admin_id,
      silo_id: device.silo_id,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      ...normalized,
      quality_indicators: {
        is_valid: true,
        confidence_score: 0.95,
        anomaly_detected: false
      },
      device_metrics: {
        battery_level: device.battery_level,
        signal_strength: device.signal_strength
      }
    });

    await sensorReading.save();

    // Update device heartbeat
    await device.updateHeartbeat();
    await device.incrementReadingCount();

    console.log(`📥 MQTT data ingested for device ${device_id}`);

    res.status(201).json({
      message: 'Data ingested successfully',
      reading_id: sensorReading._id
    });
  } catch (error) {
    console.error('MQTT data ingest error:', error);
    res.status(500).json({ error: 'Failed to ingest data' });
  }
});

// MQTT message handler
if (mqttClient) {
  mqttClient.on('message', async (topic, message) => {
    try {
      console.log(`📥 MQTT message received on ${topic}`);

      // Handle sensor readings
      if (topic.endsWith('/readings')) {
        const deviceId = topic.split('/')[2];
        const payload = JSON.parse(message.toString());

        // Find the device in database
        const device = await SensorDevice.findOne({ device_id: deviceId });
        if (!device) {
          console.warn(`Device ${deviceId} not found in database`);
          return;
        }

        // Create sensor reading
        const sensorReading = new SensorReading({
          device_id: device._id,
          tenant_id: device.admin_id,
          silo_id: device.silo_id,
          timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
          ...payload.readings,
          quality_indicators: {
            is_valid: payload.quality?.is_valid !== false,
            confidence_score: payload.quality?.confidence_score || 0.95,
            anomaly_detected: payload.quality?.anomaly_detected || false
          },
          device_metrics: {
            battery_level: payload.battery_level || device.battery_level,
            signal_strength: payload.signal_strength || device.signal_strength
          },
          raw_payload: payload
        });

        await sensorReading.save();

        // Update device heartbeat and stats
        await device.updateHeartbeat();
        await device.incrementReadingCount();

        console.log(`📥 Sensor data saved for device ${deviceId}`);
      }

      // Handle device status updates
      else if (topic.endsWith('/status')) {
        const deviceId = topic.split('/')[2];
        const payload = JSON.parse(message.toString());

        // Update device status
        await SensorDevice.updateOne(
          { device_id: deviceId },
          {
            status: payload.status || 'unknown',
            health_metrics: {
              ...payload.health_metrics,
              last_heartbeat: new Date()
            }
          }
        );

        console.log(`🔄 Device status updated for ${deviceId}`);
      }

      // Handle actuator feedback
      else if (topic.endsWith('/feedback')) {
        const actuatorId = topic.split('/')[2];
        const payload = JSON.parse(message.toString());

        // Update actuator status
        await SensorDevice.updateOne(
          { device_id: actuatorId },
          {
            status: payload.status || 'unknown',
            current_value: payload.current_value,
            last_activity: new Date()
          }
        );

        console.log(`🔄 Actuator feedback received for ${actuatorId}`);
      }
    } catch (error) {
      console.error('MQTT message processing error:', error);
    }
  });
}

module.exports = router;
