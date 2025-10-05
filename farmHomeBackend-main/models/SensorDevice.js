const mongoose = require('mongoose');
const { DEVICE_STATUSES, POWER_SOURCE, SENSOR_TYPES } = require('../configs/enum');

const sensorDeviceSchema = new mongoose.Schema({
  // Basic identification
  device_id: {
    type: String,
    required: [true, "Device ID is required"],
    unique: true,
    trim: true
  },
  device_name: {
    type: String,
    required: [true, "Device name is required"],
    trim: true
  },
  mac_address: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address format']
  },
  
  // Tenant and location
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, "Tenant ID is required"],
    index: true
  },
  silo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Silo',
    required: [true, "Silo ID is required"]
  },
  
  // Device specifications
  model: String,
  manufacturer: String,
  firmware_version: String,
  hardware_version: String,
  
  // Sensor capabilities
  sensor_types: [{
    type: String,
    enum: Object.values(SENSOR_TYPES)
  }],
  
  // Status and health
  status: {
    type: String,
    enum: {
      values: Object.values(DEVICE_STATUSES),
      message: `Status must be one of: ${Object.values(DEVICE_STATUSES).join(", ")}`
    },
    default: DEVICE_STATUSES.ACTIVE
  },
  
  // Power and connectivity
  power_source: {
    type: String,
    enum: Object.values(POWER_SOURCE),
    default: POWER_SOURCE.BATTERY
  },
  battery_level: {
    type: Number,
    min: 0,
    max: 100
  },
  signal_strength: {
    type: Number,
    min: -100,
    max: 0
  },
  
  // Network configuration
  ip_address: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  wifi_ssid: String,
  
  // Physical installation
  installation_location: {
    description: String,
    height_from_ground: Number, // in meters
    coordinates: {
      x: Number,
      y: Number,
      z: Number
    }
  },
  
  // Calibration and maintenance
  last_calibration_date: Date,
  calibration_due_date: Date,
  calibration_interval_days: {
    type: Number,
    default: 90
  },
  
  // Communication settings
  data_transmission_interval: {
    type: Number,
    default: 300, // seconds
    min: 60
  },
  mqtt_topic: String,
  api_endpoint: String,
  
  // Thresholds and alerts
  thresholds: {
    temperature: {
      min: { type: Number, default: 10 },
      max: { type: Number, default: 35 },
      critical_min: { type: Number, default: 5 },
      critical_max: { type: Number, default: 40 }
    },
    humidity: {
      min: { type: Number, default: 40 },
      max: { type: Number, default: 70 },
      critical_min: { type: Number, default: 30 },
      critical_max: { type: Number, default: 80 }
    },
    co2: {
      max: { type: Number, default: 1000 },
      critical_max: { type: Number, default: 5000 }
    },
    voc: {
      max: { type: Number, default: 500 },
      critical_max: { type: Number, default: 1000 }
    },
    moisture: {
      max: { type: Number, default: 14 },
      critical_max: { type: Number, default: 18 }
    }
  },
  
  // Health monitoring
  health_metrics: {
    uptime_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    last_heartbeat: Date,
    error_count: {
      type: Number,
      default: 0
    },
    last_error: {
      timestamp: Date,
      error_code: String,
      error_message: String
    }
  },
  
  // Data statistics
  data_stats: {
    total_readings: {
      type: Number,
      default: 0
    },
    last_reading_date: Date,
    readings_today: {
      type: Number,
      default: 0
    }
  },
  
  // Maintenance and warranty
  purchase_date: Date,
  warranty_expiry: Date,
  last_maintenance_date: Date,
  next_maintenance_date: Date,
  maintenance_notes: String,
  
  // Configuration
  is_enabled: {
    type: Boolean,
    default: true
  },
  auto_alerts: {
    type: Boolean,
    default: true
  },
  data_retention_days: {
    type: Number,
    default: 365
  },
  
  // Metadata
  notes: String,
  tags: [String],
  
  // Audit trail
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Creator is required"]
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Soft delete
  deleted_at: {
    type: Date,
    default: null,
    select: false
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false 
});

// Indexes for better query performance
sensorDeviceSchema.index({ tenant_id: 1, status: 1 });
sensorDeviceSchema.index({ device_id: 1 });
sensorDeviceSchema.index({ silo_id: 1 });
sensorDeviceSchema.index({ status: 1 });
sensorDeviceSchema.index({ 'health_metrics.last_heartbeat': 1 });
sensorDeviceSchema.index({ last_calibration_date: 1 });

// Exclude deleted devices by default
sensorDeviceSchema.pre(/^find/, function() {
  this.where({ deleted_at: null });
});

// Virtual for device health status
sensorDeviceSchema.virtual('health_status').get(function() {
  const now = new Date();
  const lastHeartbeat = this.health_metrics?.last_heartbeat;
  
  if (!lastHeartbeat) return 'unknown';
  
  const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
  const expectedInterval = this.data_transmission_interval / 60; // Convert to minutes
  
  if (minutesSinceHeartbeat > expectedInterval * 3) return 'offline';
  if (this.battery_level && this.battery_level < 20) return 'low_battery';
  if (this.health_metrics.error_count > 10) return 'error';
  
  return 'healthy';
});

// Virtual for calibration status
sensorDeviceSchema.virtual('calibration_status').get(function() {
  if (!this.calibration_due_date) return 'unknown';
  
  const now = new Date();
  const daysUntilDue = (this.calibration_due_date - now) / (1000 * 60 * 60 * 24);
  
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue < 7) return 'due_soon';
  
  return 'current';
});

// Method to update heartbeat
sensorDeviceSchema.methods.updateHeartbeat = function() {
  this.health_metrics.last_heartbeat = new Date();
  return this.save({ validateBeforeSave: false });
};

// Method to record error
sensorDeviceSchema.methods.recordError = function(errorCode, errorMessage) {
  this.health_metrics.error_count += 1;
  this.health_metrics.last_error = {
    timestamp: new Date(),
    error_code: errorCode,
    error_message: errorMessage
  };
  return this.save();
};

// Method to reset daily readings count
sensorDeviceSchema.methods.resetDailyReadings = function() {
  this.data_stats.readings_today = 0;
  return this.save({ validateBeforeSave: false });
};

// Method to increment reading count
sensorDeviceSchema.methods.incrementReadingCount = function() {
  this.data_stats.total_readings += 1;
  this.data_stats.readings_today += 1;
  this.data_stats.last_reading_date = new Date();
  return this.save({ validateBeforeSave: false });
};

// Method to check if calibration is due
sensorDeviceSchema.methods.isCalibrationDue = function() {
  if (!this.calibration_due_date) return false;
  return new Date() >= this.calibration_due_date;
};

module.exports = mongoose.model('SensorDevice', sensorDeviceSchema);
