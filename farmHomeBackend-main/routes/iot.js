const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const SensorDevice = require('../models/SensorDevice');
const SensorReading = require('../models/SensorReading');
const mqtt = require('mqtt'); // Added for MQTT support

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

// Mock IoT devices data (keeping for backward compatibility)
const mockDevices = [
  {
    _id: 'sensor-temp-001',
    device_id: 'TEMP-001',
    name: 'Temperature Sensor 1',
    type: 'sensor',
    category: 'environmental',
    location: 'Silo A',
    status: 'online',
    current_value: 25.3,
    unit: '°C',
    threshold_min: 15,
    threshold_max: 35,
    last_reading: new Date(),
    tenant_id: '652a266c69576a07b18d1c5c'
  },
  {
    _id: 'sensor-humidity-001',
    device_id: 'HUM-001',
    name: 'Humidity Sensor 1',
    type: 'sensor',
    category: 'environmental',
    location: 'Silo A',
    status: 'online',
    current_value: 65.2,
    unit: '%',
    threshold_min: 30,
    threshold_max: 80,
    last_reading: new Date(),
    tenant_id: '652a266c69576a07b18d1c5c'
  },
  {
    _id: 'actuator-fan-001',
    device_id: 'FAN-001',
    name: 'Ventilation Fan 1',
    type: 'actuator',
    category: 'ventilation',
    location: 'Silo A',
    status: 'offline',
    current_value: 0,
    unit: 'RPM',
    power_consumption: 150,
    last_activity: new Date(),
    tenant_id: '652a266c69576a07b18d1c5c'
  },
  {
    _id: 'actuator-humidifier-001',
    device_id: 'HUMID-001',
    name: 'Humidifier 1',
    type: 'actuator',
    category: 'humidity_control',
    location: 'Silo A',
    status: 'offline',
    current_value: 0,
    unit: '%',
    power_consumption: 200,
    last_activity: new Date(),
    tenant_id: '652a266c69576a07b18d1c5c'
  },
  {
    _id: 'actuator-alarm-001',
    device_id: 'ALARM-001',
    name: 'Alert System 1',
    type: 'actuator',
    category: 'alert',
    location: 'Silo A',
    status: 'online',
    current_value: 0,
    unit: 'dB',
    power_consumption: 50,
    last_activity: new Date(),
    tenant_id: '652a266c69576a07b18d1c5c'
  }
];

// GET /iot/devices - Get all IoT devices
router.get('/devices', [
  auth,
  requirePermission('iot.read'),
  requireTenantAccess
], async (req, res) => {
  try {
    const { type, category, status, location } = req.query;
    
    // First try to get real devices from database
    let devices = [];
    try {
      const filter = { admin_id: req.user.admin_id };
      
      if (type) filter.type = type;
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (location) filter.location = location;
      
      devices = await SensorDevice.find(filter)
        .populate('silo_id', 'name silo_id')
        .sort({ created_at: -1 });
    } catch (dbError) {
      console.warn('Database query failed, using mock data:', dbError.message);
    }
    
    // If no real devices found, use mock data
    let filteredDevices = devices.length > 0 ? devices : mockDevices;
    
    // Apply filters for mock data
    if (devices.length === 0) {
      // Filter by type (sensor/actuator)
      if (type) {
        filteredDevices = filteredDevices.filter(d => d.type === type);
      }
      
      // Filter by category
      if (category) {
        filteredDevices = filteredDevices.filter(d => d.category === category);
      }
      
      // Filter by status
      if (status) {
        filteredDevices = filteredDevices.filter(d => d.status === status);
      }
      
      // Filter by location
      if (location) {
        filteredDevices = filteredDevices.filter(d => d.location === location);
      }
    }
    
    console.log(`📡 Serving ${filteredDevices.length} IoT devices`);
    
    res.json({
      devices: filteredDevices,
      total: filteredDevices.length,
      online: filteredDevices.filter(d => d.status === 'online').length,
      offline: filteredDevices.filter(d => d.status === 'offline').length
    });
  } catch (error) {
    console.error('Get IoT devices error:', error);
    res.status(500).json({ error: 'Failed to get IoT devices' });
  }
});

// GET /iot/devices/:id - Get specific device
router.get('/devices/:id', [
  auth,
  requirePermission('iot.read'),
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
    
    // If not found in database, check mock devices
    if (!device) {
      device = mockDevices.find(d => d._id === id);
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

// POST /iot/devices/:id/control - Control device (ON/OFF)
router.post('/devices/:id/control', [
  auth,
  requirePermission('iot.control'),
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
    
    // Handle real device control via MQTT
    if (device.device_id && mqttClient && mqttClient.connected) {
      const controlTopic = `grainhero/actuators/${device.device_id}/control`;
      const controlMessage = {
        action,
        value,
        duration,
        timestamp: new Date().toISOString(),
        user: req.user._id
      };
      
      mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
      console.log(`📡 MQTT command sent to ${controlTopic}`);
    }
    
    // Simulate device control for mock devices or fallback
    let newStatus = device.status;
    let newValue = device.current_value;
    let message = '';
    
    if (device.type === 'actuator') {
      switch (action) {
        case 'turn_on':
          newStatus = 'online';
          newValue = value || (device.category === 'ventilation' ? 1200 : 100);
          message = `${device.name} turned ON`;
          break;
        case 'turn_off':
          newStatus = 'offline';
          newValue = 0;
          message = `${device.name} turned OFF`;
          break;
        case 'set_value':
          newStatus = 'online';
          newValue = value;
          message = `${device.name} set to ${value}${device.unit}`;
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
      
      // Update device status for real devices
      if (device._id && device.constructor.modelName) {
        try {
          device.status = newStatus;
          device.current_value = newValue;
          device.last_activity = new Date();
          await device.save();
        } catch (saveError) {
          console.warn('Failed to save device state:', saveError.message);
        }
      } else {
        // Update mock device status
        device.status = newStatus;
        device.current_value = newValue;
        device.last_activity = new Date();
      }
      
      console.log(`🎛️ Device control: ${device.name} - ${action} - ${newValue}${device.unit}`);
      
      res.json({
        message,
        device: {
          _id: device._id,
          device_id: device.device_id,
          name: device.name,
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
    
    // If not found in database, check mock devices
    if (!device) {
      device = mockDevices.find(d => d._id === id);
    }
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Try to get real readings from database
    let readings = [];
    try {
      const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
      readings = await SensorReading.find({
        device_id: device._id || id,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: -1 }).limit(100);
    } catch (dbError) {
      console.warn('Database readings query failed:', dbError.message);
    }
    
    // If no real readings found, generate mock readings
    if (readings.length === 0) {
      const now = new Date();
      const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
      
      for (let i = 0; i < hours; i++) {
        const timestamp = new Date(startTime.getTime() + (i * 60 * 60 * 1000));
        let value = device.current_value;
        
        // Add some realistic variation
        if (device.type === 'sensor') {
          const variation = (Math.random() - 0.5) * 10;
          value = Math.max(0, device.current_value + variation);
        }
        
        readings.push({
          timestamp,
          value: parseFloat(value.toFixed(2)),
          unit: device.unit,
          quality: 'good'
        });
      }
    }
    
    res.json({
      device_id: device.device_id,
      device_name: device.name,
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
        // Handle real device control via MQTT
        if (device.device_id && mqttClient && mqttClient.connected) {
          const controlTopic = `grainhero/actuators/${device.device_id}/control`;
          const controlMessage = {
            action,
            value,
            timestamp: new Date().toISOString(),
            user: req.user._id
          };
          
          mqttClient.publish(controlTopic, JSON.stringify(controlMessage), { qos: 1 });
          console.log(`📡 MQTT command sent to ${controlTopic}`);
        }
        
        // Update device status for real devices
        if (device._id && device.constructor.modelName) {
          try {
            device.status = action === 'turn_on' ? 'online' : 'offline';
            device.current_value = action === 'turn_on' ? (value || 100) : 0;
            device.last_activity = new Date();
            await device.save();
          } catch (saveError) {
            console.warn('Failed to save device state:', saveError.message);
          }
        } else {
          // Update mock device status
          device.status = action === 'turn_on' ? 'online' : 'offline';
          device.current_value = action === 'turn_on' ? (value || 100) : 0;
          device.last_activity = new Date();
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
    
    // If no real devices found, use mock data
    const allDevices = devices.length > 0 ? devices : mockDevices;
    const sensors = allDevices.filter(d => d.type === 'sensor');
    const actuators = allDevices.filter(d => d.type === 'actuator');
    
    const status = {
      total_devices: allDevices.length,
      sensors: {
        total: sensors.length,
        online: sensors.filter(s => s.status === 'online').length,
        offline: sensors.filter(s => s.status === 'offline').length
      },
      actuators: {
        total: actuators.length,
        online: actuators.filter(a => a.status === 'online').length,
        offline: actuators.filter(a => a.status === 'offline').length
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
        type: 'actuator'
      });
    } catch (dbError) {
      console.warn('Database query failed:', dbError.message);
    }
    
    // If no real actuators found, use mock data
    const allActuators = actuators.length > 0 ? actuators : mockDevices.filter(d => d.type === 'actuator');
    let shutdownCount = 0;
    
    for (const actuator of allActuators) {
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
      
      // Update device status for real devices
      if (actuator._id && actuator.constructor.modelName) {
        try {
          actuator.status = 'offline';
          actuator.current_value = 0;
          actuator.last_activity = new Date();
          await actuator.save();
        } catch (saveError) {
          console.warn('Failed to save actuator state:', saveError.message);
        }
      } else {
        // Update mock actuator status
        actuator.status = 'offline';
        actuator.current_value = 0;
        actuator.last_activity = new Date();
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
    
    // Create sensor reading
    const sensorReading = new SensorReading({
      device_id: device._id,
      tenant_id: device.admin_id,
      silo_id: device.silo_id,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      ...readings,
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