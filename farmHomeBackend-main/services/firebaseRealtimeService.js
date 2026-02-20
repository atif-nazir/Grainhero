const admin = require('firebase-admin')
const SensorDevice = require('../models/SensorDevice')
const Silo = require('../models/Silo')
const realTimeDataService = require('./realTimeDataService')

let initialized = false
let database = null
let subscribed = new Set()
let listeners = []

function init() {
  if (initialized) return
  const url = process.env.FIREBASE_DATABASE_URL
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!url) throw new Error('FIREBASE_DATABASE_URL missing')
  let credential
  if (saJson) {
    credential = admin.credential.cert(JSON.parse(saJson))
  } else if (saPath) {
    credential = admin.credential.cert(require(saPath))
  } else {
    throw new Error('Service account not configured')
  }
  admin.initializeApp({ credential, databaseURL: url })
  database = admin.database()
  initialized = true
}

async function handleLatest(deviceId, snapshot, io) {
  try {
    const payload = snapshot.val() || {}
    console.log(`[Firebase] Received data for ${deviceId}:`, JSON.stringify(payload));

    const device = await SensorDevice.findOne({ device_id: deviceId })
    if (!device) {
      console.log(`[Firebase] Device ${deviceId} not found in MongoDB. Skipping.`);
      return
    }
    console.log(`[Firebase] Found device ${deviceId} in MongoDB (Silo: ${device.silo_id})`);

    const reading = {
      device_id: device._id,
      tenant_id: device.admin_id,
      silo_id: device.silo_id,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date()
    }
    if (payload.temperature !== undefined) {
      reading.temperature = { value: Number(payload.temperature), unit: 'celsius' }
    }
    if (payload.humidity !== undefined) {
      reading.humidity = { value: Number(payload.humidity), unit: 'percent' }
    }
    // Handle VOC/TVOC mapping
    if (payload.tvoc_ppb !== undefined) {
      reading.voc = { value: Number(payload.tvoc_ppb), unit: 'ppb' }
    } else if (payload.voc !== undefined) {
      reading.voc = { value: Number(payload.voc), unit: 'ppb' }
    }

    if (payload.moisture !== undefined) {
      reading.moisture = { value: Number(payload.moisture), unit: 'percent' }
    }
    if (payload.light !== undefined) {
      reading.light = { value: Number(payload.light), unit: 'lux' }
    }
    if (payload.ambient && typeof payload.ambient === 'object') {
      reading.ambient = {}
      if (payload.ambient.humidity !== undefined) {
        reading.ambient.humidity = { value: Number(payload.ambient.humidity), unit: 'percent' }
      }
      if (payload.ambient.temperature !== undefined) {
        reading.ambient.temperature = { value: Number(payload.ambient.temperature), unit: 'celsius' }
      }
      if (payload.ambient.light !== undefined) {
        reading.ambient.light = { value: Number(payload.ambient.light), unit: 'lux' }
      }
    }

    console.log(`[Firebase] Processing reading for ${deviceId}...`);

    // *** DIRECT Silo update — guarantee current_conditions are persisted ***
    try {
      const mongoose = require('mongoose');
      const siloIdStr = device.silo_id.toString();
      console.log(`[Firebase] Looking up silo with ID: ${siloIdStr}`);

      let silo = await Silo.findById(siloIdStr);
      if (!silo) {
        // SensorDevice has a stale silo_id — find the correct silo and fix the reference
        console.log(`[Firebase] Silo ${siloIdStr} not found. Looking for available silos...`);
        const allSilos = await Silo.find({}).lean();
        if (allSilos.length > 0) {
          // Use the first silo (or the one matching the admin)
          const matchingSilo = allSilos.find(s => s.admin_id?.toString() === device.admin_id?.toString()) || allSilos[0];
          console.log(`[Firebase] Auto-fixing SensorDevice ${deviceId}: silo_id ${siloIdStr} → ${matchingSilo._id}`);

          // Fix the SensorDevice so future lookups work
          await SensorDevice.updateOne({ _id: device._id }, { $set: { silo_id: matchingSilo._id } });

          // Now load the silo properly
          silo = await Silo.findById(matchingSilo._id);
        } else {
          console.log(`[Firebase] ⚠️ No silos exist in DB at all.`);
        }
      }

      if (silo) {
        // Also update reading.silo_id to the correct one
        reading.silo_id = silo._id;

        const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
        for (const type of sensorTypes) {
          if (reading[type]?.value !== undefined) {
            if (!silo.current_conditions) silo.current_conditions = {};
            silo.current_conditions[type] = {
              value: reading[type].value,
              timestamp: new Date(),
              sensor_id: device._id
            };
          }
        }
        silo.current_conditions.last_updated = new Date();
        await silo.save({ validateBeforeSave: false });
        console.log(`[Firebase] ✅ Silo ${silo._id} (${silo.name}) updated: temp=${reading.temperature?.value}, hum=${reading.humidity?.value}, voc=${reading.voc?.value}`);
      }
    } catch (siloErr) {
      console.error(`[Firebase] ❌ Direct silo update failed:`, siloErr.message);
    }

    // Also queue for full processing (historical readings, alerts, anomaly detection)
    await realTimeDataService.processSensorReading(reading)
    console.log(`[Firebase] Reading processed for ${deviceId}.`);

    if (io) {
      io.emit('sensor_reading', { type: 'sensor_reading', data: reading, timestamp: new Date() })
    }
  } catch (err) {
    console.error('Firebase latest handler error:', err.message)
  }
}

function subscribeDevice(deviceId, io) {
  if (subscribed.has(deviceId)) return
  const ref = database.ref(`sensor_data/${deviceId}/latest`)
  const cb = snapshot => handleLatest(deviceId, snapshot, io)
  ref.on('value', cb)
  listeners.push({ ref, cb })
  subscribed.add(deviceId)
}

function discoverDevices(io) {
  const ref = database.ref('sensor_data')
  const onAdded = snap => {
    console.log(`[Firebase] Discovered device: ${snap.key}`);
    subscribeDevice(snap.key, io)
  }
  const onChanged = snap => subscribeDevice(snap.key, io)
  ref.on('child_added', onAdded)
  ref.on('child_changed', onChanged)
  listeners.push({ ref, cb: onAdded })
  listeners.push({ ref, cb: onChanged })
}

function start(io) {
  if (process.env.FIREBASE_ENABLED !== 'true') return
  init()
  discoverDevices(io)
}

function stop() {
  listeners.forEach(({ ref, cb }) => {
    try { ref.off('value', cb) } catch { }
    try { ref.off('child_added', cb) } catch { }
    try { ref.off('child_changed', cb) } catch { }
  })
  listeners = []
  subscribed.clear()
}

async function writeControlState(deviceId, state) {
  if (!initialized) init()
  try {
    const ref = database.ref(`sensor_data/${deviceId}/latest`)
    await ref.update({
      humanRequestedFan: !!state.human_requested_fan,
      mlRequestedFan: !!state.ml_requested_fan,
      targetFanSpeed: state.target_fan_speed || 0,
      mlDecision: state.ml_decision || 'idle',
      lastControlUpdate: admin.database.ServerValue.TIMESTAMP
    })
    console.log(`✅ Firebase control state updated for ${deviceId}`)
  } catch (err) {
    console.error(`❌ Firebase write error for ${deviceId}:`, err.message)
  }
}

module.exports = { start, stop, writeControlState }
