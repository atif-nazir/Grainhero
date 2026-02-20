const admin = require('firebase-admin')
const SensorDevice = require('../models/SensorDevice')
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
    const device = await SensorDevice.findOne({ device_id: deviceId })
    if (!device) return
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
    if (payload.voc !== undefined) {
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
    await realTimeDataService.processSensorReading(reading)
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
