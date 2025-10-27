const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');

// Mock IoT devices data
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
    
    let filteredDevices = mockDevices;
    
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
    const device = mockDevices.find(d => d._id === id);
    
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
    
    const device = mockDevices.find(d => d._id === id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Simulate device control
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
      
      // Update device status
      device.status = newStatus;
      device.current_value = newValue;
      device.last_activity = new Date();
      
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
    
    const device = mockDevices.find(d => d._id === id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Generate mock readings for the specified time period
    const readings = [];
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
    
    res.json({
      device_id: device.device_id,
      device_name: device.name,
      readings,
      total_readings: readings.length,
      time_range: {
        start: startTime,
        end: now
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
      const device = mockDevices.find(d => d._id === deviceId);
      if (device && device.type === 'actuator') {
        // Simulate control
        device.status = action === 'turn_on' ? 'online' : 'offline';
        device.current_value = action === 'turn_on' ? (value || 100) : 0;
        device.last_activity = new Date();
        
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
    const sensors = mockDevices.filter(d => d.type === 'sensor');
    const actuators = mockDevices.filter(d => d.type === 'actuator');
    
    const status = {
      total_devices: mockDevices.length,
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
    const actuators = mockDevices.filter(d => d.type === 'actuator');
    let shutdownCount = 0;
    
    actuators.forEach(actuator => {
      actuator.status = 'offline';
      actuator.current_value = 0;
      actuator.last_activity = new Date();
      shutdownCount++;
    });
    
    console.log(`🚨 Emergency shutdown: ${shutdownCount} actuators turned off`);
    
    res.json({
      message: 'Emergency shutdown completed',
      devices_shutdown: shutdownCount,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Emergency shutdown error:', error);
    res.status(500).json({ error: 'Failed to perform emergency shutdown' });
  }
});

module.exports = router;
