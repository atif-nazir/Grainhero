const admin = require('firebase-admin')
const SensorDevice = require('../models/SensorDevice')
const realTimeDataService = require('./realTimeDataService')

let initialized = false
let database = null
let subscribed = new Set()
let listeners = []

function init() {
  if (initialized) return
  let url = process.env.FIREBASE_DATABASE_URL
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!url) throw new Error('FIREBASE_DATABASE_URL missing')
  if (!url.includes('://')) {
    url = `https://${url}`
  }
  let credential
  if (saJson) {
    credential = admin.credential.cert(JSON.parse(saJson))
  } else if (saPath) {
    credential = admin.credential.cert(require(saPath))
  } else {
    throw new Error('Service account not configured')
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential, databaseURL: url })
  }
  database = admin.database()
  initialized = true
}

async function handleLatest(deviceId, snapshot, io) {
  try {
    const payload = snapshot.val() || {}
    const device = await SensorDevice.findOne({ device_id: deviceId })
    // Use DB record if available, otherwise fallback to raw deviceId
    const effectiveDeviceId = device ? device._id : deviceId
    const tenantId = device ? device.admin_id : null
    const siloId = device ? device.silo_id : null
    const reading = {
      device_id: effectiveDeviceId,
      tenant_id: tenantId,
      silo_id: siloId,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date()
    }
    if (payload.temperature !== undefined) {
      reading.temperature = { value: Number(payload.temperature), unit: 'celsius' }
    }
    if (payload.humidity !== undefined) {
      reading.humidity = { value: Number(payload.humidity), unit: 'percent' }
    }
    if (payload.voc !== undefined || payload.tvoc !== undefined) {
      reading.voc = { value: Number(payload.voc ?? payload.tvoc ?? 0), unit: 'ppb' }
    }
    if (payload.moisture !== undefined) {
      reading.moisture = { value: Number(payload.moisture), unit: 'percent' }
    }
    if (payload.light !== undefined) {
      reading.light = { value: Number(payload.light), unit: 'lux' }
    }
    if (payload.pressure !== undefined) {
      reading.pressure = { value: Number(payload.pressure), unit: 'hPa' }
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
    // Add actuator states
    reading.fanState = payload.fanState !== undefined ? (payload.fanState ? 'on' : 'off') : ((payload.pwm_speed && Number(payload.pwm_speed) > 0) ? 'on' : 'off')
    reading.lidState = payload.lidState !== undefined ? (payload.lidState ? 'open' : 'closed') : ((payload.servo_state ? Number(payload.servo_state) : 0) ? 'open' : 'closed')
    reading.mlDecision = payload.mlDecision || 'idle'
    reading.humanOverride = !!payload.humanOverride || !!payload.human_override
    reading.pwm_speed = payload.pwm_speed
    reading.servo_state = payload.servo_state

    try {
      await realTimeDataService.processSensorReading(reading)
    } catch (procErr) {
      // Don't let processing failures block event emission
      console.warn('realTimeDataService.processSensorReading error:', procErr.message)
    }
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
  const onAdded = snap => subscribeDevice(snap.key, io)
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
    const ref = database.ref(`control/${deviceId}`)
    const updates = {
      lastControlUpdate: admin.database.ServerValue.TIMESTAMP
    }
    // Only include fan-related keys if they were explicitly provided
    if (state.human_requested_fan !== undefined) updates.humanRequestedFan = !!state.human_requested_fan
    if (state.ml_requested_fan !== undefined) updates.mlRequestedFan = !!state.ml_requested_fan
    if (state.target_fan_speed !== undefined) updates.targetFanSpeed = state.target_fan_speed || 0
    if (state.ml_decision !== undefined) updates.mlDecision = state.ml_decision || 'idle'
    // LED states (Arduino reads led2/led3/led4 booleans)
    if (state.led2 !== undefined) updates.led2 = !!state.led2
    if (state.led3 !== undefined) updates.led3 = !!state.led3
    if (state.led4 !== undefined) updates.led4 = !!state.led4
    // Alarm state
    if (state.alarm !== undefined) updates.alarm = !!state.alarm
    // Servo (lid)
    if (state.servo !== undefined) updates.servo = !!state.servo

    await ref.update(updates)
    console.log(`✅ Firebase control state updated for ${deviceId}:`, JSON.stringify(updates))
  } catch (err) {
    console.error(`❌ Firebase write error for ${deviceId}:`, err.message)
  }
}

async function getLatestReadings() {
  if (!initialized) {
    if (process.env.FIREBASE_ENABLED !== 'true') return {}
    init()
  }
  try {
    const snapshot = await database.ref('sensor_data').once('value')
    const val = snapshot.val()
    if (!val || typeof val !== 'object') return {}

    const result = {}
    for (const deviceId of Object.keys(val)) {
      const latest = val[deviceId]?.latest || val[deviceId]
      if (latest && typeof latest === 'object') {
        result[deviceId] = {
          temperature: latest.temperature ?? null,
          humidity: latest.humidity ?? null,
          tvoc_ppb: latest.tvoc_ppb ?? latest.voc ?? null,
          timestamp: latest.timestamp || null,
        }
      }
    }
    return result
  } catch (err) {
    console.error('Firebase getLatestReadings error:', err.message)
    return {}
  }
}

module.exports = { start, stop, writeControlState, getLatestReadings }
async function readTelemetry(deviceId) {
  if (!initialized) init()
  try {
    const ref = database.ref(`sensor_data/${deviceId}/latest`)
    const snapshot = await ref.once('value')
    return snapshot.val() || null
  } catch (err) {
    console.error(`Firebase readTelemetry error for ${deviceId}:`, err.message)
    return null
  }
}

module.exports = { start, stop, writeControlState, readTelemetry }
