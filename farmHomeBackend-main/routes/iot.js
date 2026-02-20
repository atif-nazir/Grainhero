const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const SensorDevice = require('../models/SensorDevice');
const SensorReading = require('../models/SensorReading');
const mqtt = require('mqtt'); // Added for MQTT support
const Silo = require('../models/Silo');
const firebaseRealtimeService = require('../services/firebaseRealtimeService');
const fanControlService = require('../services/fanControlService');
const realTimeDataService = require('../services/realTimeDataService');
const admin = require('firebase-admin');
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
    // console.log(`🔄 Cache synced for ${deviceId} via internal event`);
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

// Initialize Firebase eagerly so diagnostics/telemetry work from first request
try { ensureFirebase(); } catch (e) { console.warn('Firebase eager init skipped:', e.message); }

// MQTT client initialization
let mqttClient = null;
try {
  // Only initialize if MQTT broker is configured
  if (process.env.MQTT_BROKER_URL) {
    let brokerUrl = process.env.MQTT_BROKER_URL;
    if (!brokerUrl.includes('://')) {
      const port = process.env.MQTT_PORT || '1883';
      brokerUrl = `mqtt://${brokerUrl}${brokerUrl.includes(':') ? '' : `:${port}`}`;
    }

    console.log(`📡 Connecting to MQTT broker at: ${brokerUrl}`);

    const opts = { reconnectPeriod: 5000 };
    if (process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD) {
      opts.username = process.env.MQTT_USERNAME;
      opts.password = process.env.MQTT_PASSWORD;
    }
    mqttClient = mqtt.connect(brokerUrl, opts);

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

    if (!device) {
    }

    if (!device) {
      // Allow direct control by device_id even if not in DB
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
        console.log(`📡 MQTT request sent to ${controlTopic}`);
      }
      // Always mirror control intent to Firebase so ESP32 polling can act
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
      const pct = typeof value === 'number' ? Math.max(0, Math.min(100, Number(value))) : (action === 'turn_on' ? 60 : 0);
      const pwm255 = Math.round(pct / 100 * 255);
      const controlMessage = {
        action, // Arduino still expects these keys for backward compatibility
        value: pct,
        pwm: pwm255,
        pwm_speed: pct,
        duration,
        timestamp: new Date().toISOString(),
        user: req.user._id,
        // New explicit state requests
        human_requested_fan: action === 'turn_on' ? true : (action === 'turn_off' ? false : undefined),
        target_fan_speed: pct
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

        // Sync with Firebase for ESP32 polling
        if (device.device_id) {
          await firebaseRealtimeService.writeControlState(device.device_id, device);
        }
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

// PUBLIC device control — no auth required (dev/demo)
router.post('/devices/:id/control-public', [noCache], async (req, res) => {
  try {
    const { id } = req.params;
    const { action, value, duration, led, ledState } = req.body;

    const pct = typeof value === 'number' ? Math.max(0, Math.min(100, Number(value))) : (action === 'turn_on' ? 80 : 0);
    const pwm255 = Math.round(pct / 100 * 255);

    // Build MQTT control message
    const controlMessage = {
      action,
      value: pct,
      pwm: pwm255,
      pwm_speed: pct,
      duration,
      timestamp: new Date().toISOString()
    };

    // LED control keys (Arduino expects led2/led3/led4)
    if (led) controlMessage[led] = ledState !== undefined ? ledState : true;

    // Alarm actions
    if (action === 'alarm_on') controlMessage.action = 'alarm_on';
    if (action === 'alarm_off') controlMessage.action = 'alarm_off';

    // Fan state requests
    if (action === 'turn_on') {
      controlMessage.human_requested_fan = true;
      controlMessage.target_fan_speed = pct;
    } else if (action === 'turn_off') {
      controlMessage.human_requested_fan = false;
      controlMessage.target_fan_speed = 0;
    }

    // Publish to MQTT
    const controlTopic = `grainhero/actuators/${id}/control`;
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
      console.log(`📡 MQTT public control sent to ${controlTopic}:`, JSON.stringify(controlMessage));
    } else {
      console.warn('MQTT not connected, relying on Firebase mirror');
    }

    // Mirror to Firebase so ESP32 polling picks it up
    try {
      const fbState = {};

      // Only include fan state for fan-related actions (not LED/alarm)
      const isFanAction = action === 'turn_on' || action === 'turn_off' || (action === 'set_value' && !led);
      if (isFanAction) {
        fbState.human_requested_fan = action === 'turn_on' || (action === 'set_value' && pct > 0);
        fbState.ml_requested_fan = false;
        fbState.target_fan_speed = pct;
        fbState.ml_decision = action === 'turn_on' ? 'fan_on' : (action === 'turn_off' ? 'idle' : 'manual_set');
      }

      // LED state mirroring
      if (led) fbState[led] = ledState !== undefined ? ledState : true;
      // Alarm mirroring
      if (action === 'alarm_on') fbState.alarm = true;
      if (action === 'alarm_off') fbState.alarm = false;

      await firebaseRealtimeService.writeControlState(id, fbState);
    } catch (e) {
      console.warn('Firebase control mirror failed:', e.message);
    }

    res.json({
      message: 'Control request processed',
      device_id: id,
      action_performed: action,
      led: led || null,
      new_value: value ?? pct,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Public control error:', error);
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
    console.log(`[telemetry] request siloId=${siloId} token=${req.headers?.authorization ? 'yes' : 'no'} admin=${req.user?.admin_id || '-'}`);
    // Accept direct device_id without requiring DB records
    ensureFirebase();
    if (!firebaseDb) {
      console.warn(`[telemetry] firebase not initialized`);
      const cached = lastTelemetry.get(siloId);
      if (cached) {
        console.log(`[telemetry] serving cached payload for ${siloId}`);
        return res.json(cached);
      }
      console.warn(`Telemetry unavailable: Firebase not initialized and no cache for ${siloId}`);
      return res.status(503).json({ error: 'Silo offline' });
    }
    try {
      const snapshot = await firebaseDb.ref(`sensor_data/${siloId}/latest`).get();
      if (!snapshot || snapshot.val() === null) {
        console.warn(`[telemetry] snapshot missing at sensor_data/${siloId}/latest`);
        const cached = lastTelemetry.get(siloId);
        if (cached) {
          console.log(`[telemetry] serving cached payload for ${siloId}`);
          return res.json(cached);
        }
        console.warn(`Telemetry missing: No Firebase value at sensor_data/${siloId}/latest`);
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
      // Convert timestamp: Arduino sends seconds since epoch, JS needs milliseconds
      let ts = payload.timestamp || payload.timestamp_unix;
      if (ts && ts < 2000000000) ts = ts * 1000;
      if (!ts || ts < 1600000000000) ts = Date.now();
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
      console.error(`Firebase read error for ${siloId}: ${e.message}`);
      const cached = lastTelemetry.get(siloId);
      if (cached) {
        console.log(`[telemetry] serving cached payload after error for ${siloId}`);
        return res.json(cached);
      }
      return res.status(503).json({ error: 'Silo offline' });
    }
  } catch (error) {
    console.error(`Telemetry route error for ${req.params?.siloId}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

// PUBLIC telemetry endpoint — no auth required (for dev/demo)
router.get('/silos/:siloId/telemetry-public', async (req, res) => {
  try {
    const { siloId } = req.params;
    ensureFirebase();
    if (!firebaseDb) {
      const cached = lastTelemetry.get(siloId);
      if (cached) return res.json(cached);
      return res.status(503).json({ error: 'Firebase not initialized and no cache' });
    }
    try {
      const snapshot = await firebaseDb.ref(`sensor_data/${siloId}/latest`).get();
      if (!snapshot || snapshot.val() === null) {
        const cached = lastTelemetry.get(siloId);
        if (cached) return res.json(cached);
        return res.status(503).json({ error: 'No data at sensor_data/' + siloId + '/latest' });
      }
      const payload = snapshot.val() || {};
      const temperature = payload.temperature !== undefined ? Number(payload.temperature) : 0;
      const humidity = payload.humidity !== undefined ? Number(payload.humidity) : 0;
      const tvocRaw = payload.tvoc !== undefined ? Number(payload.tvoc) : (payload.voc !== undefined ? Number(payload.voc) : 0);
      const fanState = payload.fanState !== undefined ? (payload.fanState ? 'on' : 'off') : ((payload.pwm_speed && Number(payload.pwm_speed) > 0) ? 'on' : 'off');
      const lidState = payload.lidState !== undefined ? (payload.lidState ? 'open' : 'closed') : ((payload.servo_state ? Number(payload.servo_state) : 0) ? 'open' : 'closed');
      const alarmState = payload.alarmState === 'on' || payload.alarm_state === 'on' ? 'on' : 'off';
      const mlDecision = payload.mlDecision || ((humidity > 75 || tvocRaw > 600) ? 'fan_on' : 'idle');
      const humanOverride = payload.humanOverride !== undefined ? !!payload.humanOverride : !!payload.human_override;
      const guardrails = [];
      if (temperature > 60) guardrails.push('high_temperature');
      if (tvocRaw > 1000) guardrails.push('high_tvoc');
      const pressure = payload.pressure !== undefined ? Number(payload.pressure) : null;
      const light = payload.light !== undefined ? Number(payload.light) : null;
      const dewPoint = payload.dewPoint !== undefined ? Number(payload.dewPoint) : (humidity > 0 ? Math.round((temperature - ((100 - humidity) / 5)) * 10) / 10 : null);
      const soilMoisture = payload.soilMoisture !== undefined ? Number(payload.soilMoisture) : null;
      const pestRiskScore = payload.pestRiskScore !== undefined ? Number(payload.pestRiskScore) : null;
      // Risk index: weighted composite
      const riskIndex = Math.min(100, Math.round(
        (humidity > 70 ? 30 : humidity * 0.3) +
        (temperature > 35 ? 25 : temperature * 0.5) +
        (tvocRaw > 500 ? 25 : tvocRaw * 0.03) +
        (pestRiskScore || 0) * 0.2
      ));
      // Convert timestamp: Arduino sends seconds since epoch, JS needs milliseconds
      let ts = payload.timestamp || payload.timestamp_unix;
      if (ts && ts < 2000000000) ts = ts * 1000; // seconds → milliseconds
      if (!ts || ts < 1600000000000) ts = Date.now();

      res.json({
        temperature,
        humidity,
        tvoc: tvocRaw,
        fanState,
        lidState,
        alarmState,
        mlDecision,
        humanOverride,
        guardrails,
        pressure,
        light,
        dewPoint,
        soilMoisture,
        pestRiskScore,
        riskIndex,
        pwm_speed: payload.pwm_speed !== undefined ? Number(payload.pwm_speed) : 0,
        led2State: !!payload.led2_state,
        led3State: !!payload.led3_state,
        led4State: !!payload.led4_state,
        timestamp: ts
      });
    } catch (e) {
      console.error(`Firebase read error for ${siloId}: ${e.message}`);
      const cached = lastTelemetry.get(siloId);
      if (cached) return res.json(cached);
      return res.status(503).json({ error: 'Firebase read error' });
    }
  } catch (error) {
    console.error(`Public telemetry error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

// Diagnostics: MQTT/Firebase status and last telemetry snapshot for a device
router.get('/diagnostics/:deviceId', [
  auth,
  requirePermission('sensor.view'),
  requireTenantAccess
], async (req, res) => {
  try {
    const { deviceId } = req.params;
    res.json({
      mqtt_connected: !!(mqttClient && mqttClient.connected),
      firebase_enabled: !!firebaseDb || !!(admin.apps && admin.apps.length),
      last_telemetry: lastTelemetry.get(deviceId) || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get diagnostics' });
  }
});

// Public diagnostics (limited) — useful for quick connectivity checks without auth
router.get('/diagnostics-public/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    res.json({
      mqtt_connected: !!(mqttClient && mqttClient.connected),
      firebase_enabled: !!firebaseDb || !!(admin.apps && admin.apps.length),
      last_telemetry: lastTelemetry.get(deviceId) || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get diagnostics' });
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

      if (!device) {
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

            // Sync with Firebase
            if (device.device_id) {
              await firebaseRealtimeService.writeControlState(device.device_id, device);
            }
          } catch (saveError) {
            console.warn('Failed to save device state:', saveError.message);
          }
        } else {
          results.push({
            device_id: deviceId,
            success: false,
            error: 'Device not controllable'
          });
          continue;
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
      const mongoose = require('mongoose');
      const adminId = new mongoose.Types.ObjectId();
      const siloId = new mongoose.Types.ObjectId();
      const newDevice = new SensorDevice({
        device_id,
        device_name: `Auto-Registered ${device_id}`,
        device_type: 'sensor',
        category: 'environmental',
        status: 'active',
        communication_protocol: 'mqtt',
        admin_id: adminId,
        silo_id: siloId,
        sensor_types: ['temperature', 'humidity', 'voc'],
        data_transmission_interval: 10
      });
      await newDevice.save();
      const normalized = { ...(readings || {}) };
      const vocVal = normalized.tvoc ?? normalized.voc;
      if (vocVal !== undefined && normalized.voc === undefined) {
        normalized.voc = vocVal;
      }
      const sensorReading = new SensorReading({
        device_id: newDevice._id,
        tenant_id: adminId,
        silo_id: siloId,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        temperature: normalized.temperature !== undefined ? { value: Number(normalized.temperature), unit: 'celsius' } : undefined,
        humidity: normalized.humidity !== undefined ? { value: Number(normalized.humidity), unit: 'percent' } : undefined,
        voc: normalized.voc !== undefined ? { value: Number(normalized.voc), unit: 'ppb' } : undefined,
        device_metrics: {},
        quality_indicators: { is_valid: true, confidence_score: 0.95, anomaly_detected: false }
      });
      await sensorReading.save();
      const temperature = normalized.temperature ?? 0;
      const humidity = normalized.humidity ?? 0;
      const tvocRaw = normalized.voc ?? 0;
      const fanState = normalized.pwm_speed && Number(normalized.pwm_speed) > 0 ? 'on' : 'off';
      const lidState = normalized.servo_state ? 'open' : 'closed';
      const mlDecision = (humidity > 75 || tvocRaw > 600) ? 'fan_on' : 'idle';
      lastTelemetry.set(device_id, {
        temperature: Number(temperature),
        humidity: Number(humidity),
        tvoc: Number(tvocRaw),
        fanState,
        lidState,
        mlDecision,
        humanOverride: false,
        guardrails: [],
        timestamp: timestamp ? Number(timestamp) : Date.now()
      });
      return res.status(201).json({ message: 'Ingest stored and cached', device_id, reading_id: sensorReading._id });
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

    // Cache telemetry for polling fallback (was missing for existing devices)
    const tempVal = readings?.temperature ?? 0;
    const humVal = readings?.humidity ?? 0;
    const vocVal = readings?.tvoc ?? readings?.voc ?? 0;
    const fState = (readings?.pwm_speed && Number(readings.pwm_speed) > 0) ? 'on' : 'off';
    const lState = readings?.servo_state ? 'open' : 'closed';
    const aState = (readings?.alarm_state === 'on') ? 'on' : 'off';
    const mlDec = (humVal > 75 || vocVal > 600) ? 'fan_on' : 'idle';
    lastTelemetry.set(device_id, {
      temperature: Number(tempVal),
      humidity: Number(humVal),
      tvoc: Number(vocVal),
      fanState: fState,
      lidState: lState,
      alarmState: aState,
      mlDecision: mlDec,
      humanOverride: false,
      guardrails: [],
      timestamp: (Number(timestamp) > 1600000000000) ? Number(timestamp) : Date.now()
    });

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

        // Cache last telemetry for direct serving
        const temperature = payload.readings?.temperature ?? payload.temperature ?? 0;
        const humidity = payload.readings?.humidity ?? payload.humidity ?? 0;
        const tvocRaw = payload.readings?.tvoc ?? payload.tvoc ?? payload.voc ?? 0;
        const fanState = payload.fanState !== undefined ? (payload.fanState ? 'on' : 'off') :
          ((payload.pwm_speed && Number(payload.pwm_speed) > 0) ? 'on' : 'off');
        const lidState = payload.lidState !== undefined ? (payload.lidState ? 'open' : 'closed') :
          ((payload.servo_state ? Number(payload.servo_state) : 0) ? 'open' : 'closed');
        const alarmState = payload.alarm_state === 'on' ? 'on' : 'off';
        const mlDecision = payload.mlDecision || ((humidity > 75 || tvocRaw > 600) ? 'fan_on' : 'idle');
        const humanOverride = payload.humanOverride !== undefined ? !!payload.humanOverride : !!payload.human_override;
        const guardrails = [];
        if (temperature > 60) guardrails.push('high_temperature');
        if (tvocRaw > 1000) guardrails.push('high_tvoc');
        lastTelemetry.set(deviceId, {
          temperature: Number(temperature),
          humidity: Number(humidity),
          tvoc: Number(tvocRaw),
          fanState,
          lidState,
          alarmState,
          mlDecision,
          humanOverride,
          guardrails,
          timestamp: (Number(payload.timestamp) > 1600000000000) ? Number(payload.timestamp) : Date.now()
        });

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

        // Automated Fan Control Logic (IoT Spec)
        if (device.device_type === 'sensor' && device.silo_id) {
          try {
            const recommendation = fanControlService.calculateFanRecommendation(sensorReading);

            if (recommendation.should_change) {
              console.log(`🤖 ML Recommendation for Silo ${device.silo_id}: ${recommendation.recommendation} (${recommendation.reason})`);

              // Find associated fan for this silo
              const Actuator = require('../models/Actuator');
              const fan = await Actuator.findOne({ silo_id: device.silo_id, actuator_type: 'fan' });

              if (fan) {
                if (recommendation.fan_state === 1) {
                  await fan.startOperation('AI', 'ai_prediction', { reason: recommendation.reason });
                } else {
                  await fan.stopOperation();
                }

                // Sync with Firebase
                if (fan.actuator_id) {
                  await firebaseRealtimeService.writeControlState(fan.actuator_id, fan);
                }

                // Internal state sync
                fanControlService.updateFanState(device.silo_id, recommendation.fan_state, recommendation.reason);
              } else {
                // No actuator in DB — publish direct MQTT control to device_id
                if (mqttClient && mqttClient.connected) {
                  const controlTopic = `grainhero/actuators/${device.device_id}/control`;
                  const action = recommendation.fan_state === 1 ? 'turn_on' : 'turn_off';
                  const pct = recommendation.fan_state === 1 ? 80 : 0;
                  const pwm255 = Math.round(pct / 100 * 255);
                  const controlMessage = {
                    action,
                    value: pct,
                    pwm: pwm255,
                    pwm_speed: pct,
                    timestamp: new Date().toISOString(),
                    source: 'ml_recommendation',
                    reason: recommendation.reason
                  };
                  mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
                  fanControlService.updateFanState(device.silo_id, recommendation.fan_state, recommendation.reason);
                  console.log(`📡 ML MQTT control sent to ${controlTopic}`);
                }
              }
            }
          } catch (fanError) {
            console.error('Fan recommendation error:', fanError.message);
          }
        }

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
