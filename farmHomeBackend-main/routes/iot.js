const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const SensorDevice = require('../models/SensorDevice');
const SensorReading = require('../models/SensorReading');
const mqtt = require('mqtt'); // Added for MQTT support
const Silo = require('../models/Silo');
const firebaseRealtimeService = require('../services/firebaseRealtimeService');
const realTimeDataService = require('../services/realTimeDataService');
const admin = require('firebase-admin');
const noCache = require('../middleware/noCache');

let firebaseDb = null;

// Global in-memory cache for last telemetry
const lastTelemetry = new Map();

// Sync cache with real-time data service events (e.g. from Firebase)
realTimeDataService.on('sensorReadingProcessed', (reading) => {
  try {
    const deviceId = reading.device_id.toString(); // Ensure string key
    // Map reading to lastTelemetry format
    const tempVal = reading.temperature?.value ?? 0;
    const humVal = reading.humidity?.value ?? 0;
    const vocVal = reading.tvoc?.value ?? reading.voc?.value ?? 0;
    const fState = reading.fanState ? (reading.fanState === 'on' ? 'on' : 'off') : ((reading.pwm_speed && Number(reading.pwm_speed) > 0) ? 'on' : 'off');
    const lState = reading.lidState ? (reading.lidState === 'open' ? 'open' : 'closed') : ((reading.servo_state) ? 'open' : 'closed');
    const mlDec = reading.mlDecision || ((humVal > 75 || vocVal > 600) ? 'fan_on' : 'idle');

    lastTelemetry.set(deviceId, {
      temperature: Number(tempVal),
      humidity: Number(humVal),
      tvoc: Number(vocVal),
      fanState: fState,
      lidState: lState,
      alarmState: reading.alarm_state === 'on' ? 'on' : 'off',
      mlDecision: mlDec,
      humanOverride: !!reading.humanOverride,
      guardrails: [],
      timestamp: reading.timestamp ? new Date(reading.timestamp).getTime() : Date.now()
    });
  } catch (err) {
    console.error('Cache sync error:', err.message);
  }
});

function ensureFirebase() {
  if (!admin.apps.length) {
    let url = process.env.FIREBASE_DATABASE_URL;
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!url) {
      firebaseDb = null;
      return;
    }
    if (!url.includes('://')) {
      url = `https://${url}`;
    }
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

// Initialize Firebase eagerly
try { ensureFirebase(); } catch (e) { console.warn('Firebase eager init skipped:', e.message); }

// MQTT client initialization
let mqttClient = null;
try {
  if (process.env.MQTT_BROKER_URL) {
    let brokerUrl = process.env.MQTT_BROKER_URL;
    if (!brokerUrl.includes('://')) {
      const port = process.env.MQTT_PORT || '1883';
      brokerUrl = `mqtt://${brokerUrl}${brokerUrl.includes(':') ? '' : `:${port}`}`;
    }

    console.log(`📡 Connecting to MQTT broker at: ${brokerUrl}`);

    const opts = {
      reconnectPeriod: 10000,
      connectTimeout: 8000,
      keepalive: 30,
    };
    if (process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD) {
      opts.username = process.env.MQTT_USERNAME;
      opts.password = process.env.MQTT_PASSWORD;
    }
    mqttClient = mqtt.connect(brokerUrl, opts);

    mqttClient.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      mqttClient.subscribe('grainhero/sensors/+/readings');
      mqttClient.subscribe('grainhero/sensors/+/status');
      mqttClient.subscribe('grainhero/actuators/+/feedback');
    });

    // ━━━ CRITICAL: Process incoming MQTT messages from ESP32 ━━━
    mqttClient.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        const parts = topic.split('/');
        const deviceId = parts[2];
        const action = parts[3];

        if (action === 'readings') {
          const r = payload.readings || payload;
          const temperature = Number(r.temperature ?? 0);
          const humidity = Number(r.humidity ?? 0);
          const tvoc = Number(r.tvoc ?? 0);
          const mlDecision = payload.mlDecision || ((humidity > 75 || tvoc > 600) ? 'fan_on' : 'idle');
          const existing = lastTelemetry.get(deviceId) || {};
          const update = {
            ...existing,
            temperature, humidity, tvoc,
            pressure: Number(r.pressure ?? existing.pressure ?? 0),
            mlDecision: payload.control_authority === 'FAILSAFE' ? 'failsafe' : mlDecision,
            controlAuthority: payload.control_authority || existing.controlAuthority || 'UNKNOWN',
            timestamp: Date.now()
          };
          if (payload.fanState) update.fanState = payload.fanState;
          if (payload.lidState) update.lidState = payload.lidState;
          if (payload.pwm_speed !== undefined) update.pwm_speed = Number(payload.pwm_speed);
          lastTelemetry.set(deviceId, update);
          console.log(`📡 MQTT readings cached for ${deviceId} [${payload.control_authority || 'N/A'}] fan=${update.fanState || '?'} lid=${update.lidState || '?'}`);
        }

        if (action === 'feedback') {
          const existing = lastTelemetry.get(deviceId) || {};
          lastTelemetry.set(deviceId, {
            ...existing,
            fanState: (payload.pwm > 0) ? 'on' : 'off',
            lidState: payload.servo ? 'open' : 'closed',
            pwm_speed: Number(payload.pwm ?? 0),
            led2State: !!payload.led2,
            led3State: !!payload.led3,
            led4State: !!payload.led4,
            humanOverride: !!payload.humanOverride,
            controlAuthority: payload.control_authority || existing.controlAuthority || 'UNKNOWN',
            timestamp: Date.now()
          });
        }
      } catch (e) { /* silently ignore parse errors */ }
    });

    mqttClient.on('error', (error) => {
      console.warn('⚠️ MQTT error (non-fatal):', error.code || error.message);
    });

    mqttClient.on('close', () => {
      console.warn('⚠️ MQTT connection closed — will retry in 10s');
    });

    mqttClient.on('offline', () => {
      console.warn('⚠️ MQTT offline — broker unreachable, continuing with Firebase');
    });
  }
} catch (error) {
  console.error('Failed to initialize MQTT client:', error);
}

// GET /iot/devices - Get all IoT devices
router.get('/devices', [
  auth,
  requirePermission('sensor.view')
], async (req, res) => {
  try {
    const { type, category, status } = req.query;
    const adminId = req.user.admin_id || req.user._id;

    const filter = { admin_id: adminId };
    if (type) filter.device_type = type;
    if (category) filter.category = category;
    if (status) filter.connection_status = status;

    const devices = await SensorDevice.find(filter)
      .populate('silo_id', 'name silo_id')
      .sort({ created_at: -1 });

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
  requirePermission('sensor.view')
], async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.admin_id || req.user._id;

    const device = await SensorDevice.findOne({
      _id: id,
      admin_id: adminId
    }).populate('silo_id');

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ device });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Failed to get device' });
  }
});

// POST /iot/devices/:id/control - Control device (ON/OFF) - NEVER CACHE
router.post('/devices/:id/control', [
  auth,
  noCache,
  requirePermission('actuator.control')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { action, value, duration } = req.body;
    const adminId = req.user.admin_id || req.user._id;

    let device = await SensorDevice.findOne({
      _id: id,
      admin_id: adminId
    });

    if (!device) {
      // Allow direct control by device_id even if not in DB (for unprovisioned devices)
      try {
        const firebaseService = require('../services/firebaseRealtimeService');
        const fbData = await firebaseService.readTelemetry(id);
        if (fbData) {
          const t = fbData.temperature ?? fbData.temp ?? 0;
          const tv = fbData.tvoc_ppb ?? fbData.tvoc ?? 0;
          if (t > 60 || tv > 1000) {
            return res.status(200).json({
              status: 'blocked',
              reason: 'unsafe_conditions',
              details: `Safety guardrail: temp=${t}°C, tvoc=${tv}ppb`
            });
          }
        }
      } catch { /* proceed if telemetry unavailable */ }

      const controlTopic = `grainhero/actuators/${id}/control`;
      const pct = typeof value === 'number' ? Math.max(0, Math.min(100, Number(value))) : (action === 'turn_on' ? 80 : 0);
      const pwm255 = Math.round(pct / 100 * 255);
      const controlMessage = {
        action,
        value: pct,
        pwm: pwm255,
        pwm_speed: pct,
        duration,
        timestamp: new Date().toISOString()
      };

      if (mqttClient && mqttClient.connected) {
        mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
      }

      try {
        await firebaseRealtimeService.writeControlState(id, {
          human_requested_fan: action === 'turn_on' ? true : (action === 'turn_off' ? false : undefined),
          ml_requested_fan: false,
          target_fan_speed: pct,
          ml_decision: action === 'turn_on' ? 'fan_on' : (action === 'turn_off' ? 'idle' : 'manual_set')
        });
      } catch (e) {
        console.warn('Firebase control mirror failed:', e.message);
      }

      return res.status(200).json({
        message: 'Control request processed',
        device_id: id,
        action_performed: action,
        new_value: value ?? null,
        timestamp: new Date()
      });
    }

    // Real device guardrails
    let guardrailBlocked = false;
    let guardrailReason = '';
    try {
      const recentReading = await SensorReading.findOne({
        admin_id: adminId,
        device_id: device._id || id
      }).sort({ timestamp: -1 });

      if (recentReading) {
        const t = recentReading.temperature?.value || 0;
        const tv = recentReading.voc?.value || 0;
        if (t > 60 || tv > 1000) {
          guardrailBlocked = true;
          guardrailReason = 'unsafe_conditions';
        }
      }
    } catch { }

    if (guardrailBlocked) {
      return res.status(200).json({ status: 'blocked', reason: guardrailReason });
    }

    if (device.device_id && mqttClient && mqttClient.connected) {
      const controlTopic = `grainhero/actuators/${device.device_id}/control`;
      const pct = typeof value === 'number' ? Math.max(0, Math.min(100, Number(value))) : (action === 'turn_on' ? 60 : 0);
      const pwm255 = Math.round(pct / 100 * 255);
      const controlMessage = {
        action,
        value: pct,
        pwm: pwm255,
        pwm_speed: pct,
        duration,
        timestamp: new Date().toISOString(),
        user: req.user._id,
        human_requested_fan: action === 'turn_on' ? true : (action === 'turn_off' ? false : undefined),
        target_fan_speed: pct
      };

      mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
    }

    if (device.device_type === 'actuator') {
      let newStatus = device.status;
      let newValue = device.current_value;
      let message = '';

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

      device.status = newStatus;
      device.current_value = newValue;
      device.last_activity = new Date();

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

      if (device.device_id) {
        await firebaseRealtimeService.writeControlState(device.device_id, device);
      }

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

// GET /iot/silos/:siloId/telemetry - Get real-time telemetry
router.get('/silos/:siloId/telemetry', [
  auth,
  requirePermission('sensor.view')
], async (req, res) => {
  try {
    const { siloId } = req.params;
    const adminId = req.user.admin_id || req.user._id;

    // Verify silo belongs to admin (optional but recommended)
    const silo = await Silo.findOne({
      $or: [{ silo_id: siloId }, { _id: siloId }],
      admin_id: adminId
    });

    ensureFirebase();
    if (!firebaseDb) {
      const cached = lastTelemetry.get(siloId);
      if (cached) return res.json(cached);
      return res.status(503).json({ error: 'Silo offline (Firebase unreachable)' });
    }

    try {
      const snapshot = await firebaseDb.ref(`sensor_data/${siloId}/latest`).get();
      if (!snapshot || snapshot.val() === null) {
        const cached = lastTelemetry.get(siloId);
        if (cached) return res.json(cached);
        return res.status(503).json({ error: 'Silo offline (No telemetry)' });
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

      let ts = payload.timestamp || payload.timestamp_unix;
      if (ts && ts < 2000000000) ts = ts * 1000;
      if (ts && ts < 2000000000) ts = ts * 1000;
      if (!ts || ts < 1600000000000) ts = Date.now();

      const mqttActuator = cached || {};
      res.json({
        temperature,
        humidity,
        tvoc: tvocRaw,
        fanState,
        lidState,
        mlDecision,
        humanOverride,
        guardrails,
        timestamp: ts
      });
    } catch (e) {
      const cached = lastTelemetry.get(siloId);
      if (cached) return res.json(cached);
      return res.status(503).json({ error: 'Silo offline' });
    }
  } catch (error) {
    console.error(`Telemetry route error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

// POST /iot/devices/:id/readings - Get historical device readings
router.post('/devices/:id/readings', [
  auth,
  requirePermission('sensor.view')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { hours = 24 } = req.body;
    const adminId = req.user.admin_id || req.user._id;

    const device = await SensorDevice.findOne({
      _id: id,
      admin_id: adminId
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const readings = await SensorReading.find({
      admin_id: adminId,
      device_id: device._id,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 }).limit(100);

    res.json({
      device_id: device.device_id,
      device_name: device.device_name,
      readings,
      total_readings: readings.length,
      time_range: {
        start: startDate,
        end: new Date()
      }
    });
  } catch (error) {
    console.error('Get readings error:', error);
    res.status(500).json({ error: 'Failed to get readings' });
  }
});

// GET /iot/diagnostics/:deviceId - System diagnostics
router.get('/diagnostics/:deviceId', [
  auth,
  requirePermission('sensor.view')
], async (req, res) => {
  try {
    const { deviceId } = req.params;
    const adminId = req.user.admin_id || req.user._id;

    // Verify ownership
    const device = await SensorDevice.findOne({
      $or: [{ device_id: deviceId }, { _id: deviceId }],
      admin_id: adminId
    });

    res.json({
      mqtt_connected: !!(mqttClient && mqttClient.connected),
      firebase_enabled: !!firebaseDb || !!(admin.apps && admin.apps.length),
      last_telemetry: lastTelemetry.get(deviceId) || null,
      device_provisioned: !!device
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get diagnostics' });
  }
});

module.exports = router;
