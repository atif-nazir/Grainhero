const mongoose = require('mongoose');
const { SENSOR_TYPES } = require('../configs/enum');

const sensorReadingSchema = new mongoose.Schema({
  // Device and location references
  device_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SensorDevice',
    required: [true, "Device ID is required"],
    index: true
  },
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, "Tenant ID is required"],
    index: true
  },
  silo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Silo',
    required: [true, "Silo ID is required"],
    index: true
  },
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GrainBatch',
    index: true
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    required: [true, "Timestamp is required"],
    default: Date.now,
    index: true
  },
  
  // Sensor readings - all optional as different devices may have different sensors
  temperature: {
    value: Number,
    unit: {
      type: String,
      default: 'celsius',
      enum: ['celsius', 'fahrenheit', 'kelvin']
    }
  },
  
  humidity: {
    value: {
      type: Number,
      min: [0, "Humidity cannot be negative"],
      max: [100, "Humidity cannot exceed 100%"]
    },
    unit: {
      type: String,
      default: 'percent'
    }
  },
  
  co2: {
    value: {
      type: Number,
      min: [0, "CO2 cannot be negative"]
    },
    unit: {
      type: String,
      default: 'ppm'
    }
  },
  
  voc: {
    value: {
      type: Number,
      min: [0, "VOC cannot be negative"]
    },
    unit: {
      type: String,
      default: 'ppb'
    }
  },
  
  moisture: {
    value: {
      type: Number,
      min: [0, "Moisture cannot be negative"],
      max: [100, "Moisture cannot exceed 100%"]
    },
    unit: {
      type: String,
      default: 'percent'
    }
  },
  
  light: {
    value: {
      type: Number,
      min: [0, "Light cannot be negative"]
    },
    unit: {
      type: String,
      default: 'lux'
    }
  },
  
  pressure: {
    value: {
      type: Number,
      min: [0, "Pressure cannot be negative"]
    },
    unit: {
      type: String,
      default: 'hPa'
    }
  },
  
  ph: {
    value: {
      type: Number,
      min: [0, "pH cannot be negative"],
      max: [14, "pH cannot exceed 14"]
    },
    unit: {
      type: String,
      default: 'pH'
    }
  },
  
  // Device health metrics at time of reading
  device_metrics: {
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
    uptime: Number, // seconds since last reboot
    memory_usage: Number, // percentage
    cpu_temperature: Number
  },
  
  // Data quality indicators
  quality_indicators: {
    is_valid: {
      type: Boolean,
      default: true
    },
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },
    anomaly_detected: {
      type: Boolean,
      default: false
    },
    calibration_offset: {
      temperature: Number,
      humidity: Number,
      co2: Number,
      voc: Number,
      moisture: Number
    }
  },
  
  // Alert triggers
  alerts_triggered: [{
    sensor_type: {
      type: String,
      enum: Object.values(SENSOR_TYPES)
    },
    threshold_type: {
      type: String,
      enum: ['min', 'max', 'critical_min', 'critical_max']
    },
    threshold_value: Number,
    actual_value: Number,
    alert_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert'
    }
  }],
  
  // Environmental context (from external APIs)
  environmental_context: {
    weather: {
      temperature: Number,
      humidity: Number,
      pressure: Number,
      wind_speed: Number,
      precipitation: Number
    },
    air_quality_index: Number,
    pmd_data: {
      pm25: Number,
      pm10: Number,
      ozone: Number
    }
  },
  
  // Raw data for debugging
  raw_payload: mongoose.Schema.Types.Mixed,
  
  // Processing metadata
  processed_at: Date,
  processing_version: String,
  
  // Aggregation flags
  is_aggregated: {
    type: Boolean,
    default: false
  },
  aggregation_period: {
    type: String,
    enum: ['minute', 'hour', 'day']
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
sensorReadingSchema.index({ device_id: 1, timestamp: -1 });
sensorReadingSchema.index({ tenant_id: 1, timestamp: -1 });
sensorReadingSchema.index({ silo_id: 1, timestamp: -1 });
sensorReadingSchema.index({ batch_id: 1, timestamp: -1 });
sensorReadingSchema.index({ timestamp: -1 });
sensorReadingSchema.index({ 'quality_indicators.is_valid': 1 });
sensorReadingSchema.index({ 'quality_indicators.anomaly_detected': 1 });

// Compound indexes for common queries
sensorReadingSchema.index({ 
  tenant_id: 1, 
  silo_id: 1, 
  timestamp: -1 
});
sensorReadingSchema.index({ 
  device_id: 1, 
  'quality_indicators.is_valid': 1, 
  timestamp: -1 
});

// Exclude deleted readings by default
sensorReadingSchema.pre(/^find/, function() {
  this.where({ deleted_at: null });
});

// Virtual for has any sensor data
sensorReadingSchema.virtual('has_sensor_data').get(function() {
  return !!(this.temperature?.value || this.humidity?.value || this.co2?.value || 
           this.voc?.value || this.moisture?.value || this.light?.value || 
           this.pressure?.value || this.ph?.value);
});

// Method to get all sensor values as object
sensorReadingSchema.methods.getAllSensorValues = function() {
  const values = {};
  
  const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture', 'light', 'pressure', 'ph'];
  
  sensorTypes.forEach(type => {
    if (this[type]?.value !== undefined) {
      values[type] = {
        value: this[type].value,
        unit: this[type].unit
      };
    }
  });
  
  return values;
};

// Method to check if reading is within normal ranges
sensorReadingSchema.methods.isWithinNormalRanges = function(thresholds) {
  if (!thresholds) return true;
  
  const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
  
  for (const type of sensorTypes) {
    const value = this[type]?.value;
    const threshold = thresholds[type];
    
    if (value !== undefined && threshold) {
      if ((threshold.min !== undefined && value < threshold.min) ||
          (threshold.max !== undefined && value > threshold.max)) {
        return false;
      }
    }
  }
  
  return true;
};

// Method to detect anomalies based on historical data
sensorReadingSchema.methods.detectAnomalies = function(historicalStats) {
  const anomalies = [];
  const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
  
  sensorTypes.forEach(type => {
    const value = this[type]?.value;
    const stats = historicalStats[type];
    
    if (value !== undefined && stats) {
      const { mean, stdDev } = stats;
      const zScore = Math.abs((value - mean) / stdDev);
      
      // Flag as anomaly if z-score > 3 (99.7% confidence interval)
      if (zScore > 3) {
        anomalies.push({
          sensor_type: type,
          value: value,
          expected_range: {
            min: mean - (2 * stdDev),
            max: mean + (2 * stdDev)
          },
          z_score: zScore
        });
      }
    }
  });
  
  if (anomalies.length > 0) {
    this.quality_indicators.anomaly_detected = true;
    this.quality_indicators.confidence_score = Math.max(0, 1 - (anomalies.length * 0.2));
  }
  
  return anomalies;
};

// Static method to get aggregated data
sensorReadingSchema.statics.getAggregatedData = function(query, groupBy = 'hour') {
  const groupByMap = {
    'minute': { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$timestamp' } },
    'hour': { $dateToString: { format: '%Y-%m-%d %H', date: '$timestamp' } },
    'day': { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
  };
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: groupByMap[groupBy],
        avg_temperature: { $avg: '$temperature.value' },
        avg_humidity: { $avg: '$humidity.value' },
        avg_co2: { $avg: '$co2.value' },
        avg_voc: { $avg: '$voc.value' },
        avg_moisture: { $avg: '$moisture.value' },
        min_temperature: { $min: '$temperature.value' },
        max_temperature: { $max: '$temperature.value' },
        min_humidity: { $min: '$humidity.value' },
        max_humidity: { $max: '$humidity.value' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
