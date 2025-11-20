const mongoose = require('mongoose');
const { SENSOR_TYPES } = require('../configs/enum');

const sensorReadingSchema = new mongoose.Schema({
  // Device and location references
  device_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SensorDevice',
    required: [true, "Device ID is required"]
  },
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, "Tenant ID is required"]
  },
  silo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Silo',
    required: [true, "Silo ID is required"]
  },
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GrainBatch'
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    required: [true, "Timestamp is required"],
    default: Date.now
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
    },
    // Enhanced VOC metrics for spoilage detection
    baseline_24h: Number,
    relative_5min: Number,
    relative_30min: Number,
    rate_5min: Number
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

  ambient: {
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
        min: [0, "Ambient humidity cannot be negative"],
        max: [100, "Ambient humidity cannot exceed 100%"]
      },
      unit: {
        type: String,
        default: 'percent'
      }
    },
    light: {
      value: {
        type: Number,
        min: [0, "Ambient light cannot be negative"]
      },
      unit: {
        type: String,
        default: 'lux'
      }
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

  // Actuation telemetry captured with reading
  actuation_state: {
    fan_status: {
      type: String,
      enum: ['on', 'off', 'auto', 'unknown'],
      default: 'unknown'
    },
    fan_speed_factor: {
      type: Number,
      min: 0,
      max: 1
    },
    fan_duty_cycle: {
      type: Number,
      min: 0,
      max: 1
    },
    last_command_source: String
  },

  // Derived metrics and risk flags (enhanced for VOC-first detection)
  derived_metrics: {
    dew_point: Number,
    dew_point_gap: Number,
    condensation_risk: {
      type: Boolean,
      default: false
    },
    airflow: Number,
    voc_baseline_24h: Number,
    voc_relative_5min: Number,
    voc_relative_30min: Number,
    voc_rate_5min: Number,
    pest_presence_score: Number,
    pest_presence_flag: {
      type: Boolean,
      default: false
    },
    guardrails: {
      venting_blocked: {
        type: Boolean,
        default: false
      },
      reasons: [String]
    },
    ml_risk_class: {
      type: String,
      enum: ['safe', 'risky', 'spoiled', 'unknown'],
      default: 'unknown'
    },
    ml_risk_score: Number,
    ml_confidence: Number,
    
    // Enhanced spoilage detection metrics
    spoilage_risk_factors: {
      high_voc_relative: Boolean,
      high_voc_rate: Boolean,
      high_moisture: Boolean,
      condensation_risk: Boolean,
      pest_presence: Boolean
    },
    
    // Smart control logic metrics
    fan_recommendation: {
      type: String,
      enum: ['run', 'stop', 'hold', 'unknown'],
      default: 'unknown'
    },
    fan_guardrails_active: Boolean,
    dew_point_risk: Number, // 0-1 scale
    condensation_proximity: Number // degrees from dew point
  },

  // Manual / AI labels and metadata
  metadata: {
    spoilage_label: {
      type: String,
      enum: ['safe', 'at_risk', 'spoiled', 'unknown'],
      default: 'unknown'
    },
    grain_type: {
      type: String,
      trim: true
    },
    storage_days: Number,
    notes: String
  },
  
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
sensorReadingSchema.index({ 
  'derived_metrics.ml_risk_class': 1,
  timestamp: -1
});
sensorReadingSchema.index({ 
  'derived_metrics.voc_relative_5min': 1,
  timestamp: -1
});

// Exclude deleted readings by default
sensorReadingSchema.pre(/^find/, function() {
  this.where({ deleted_at: null });
});

// Compute derived metrics before saving (enhanced for VOC-first detection)
sensorReadingSchema.pre('save', async function(next) {
  try {
    const reading = this;
    const SensorReadingModel = reading.constructor;
    const timestamp = reading.timestamp || new Date();

    // Prepare initial derived metrics container
    const derived = reading.derived_metrics || {};

    const coreTemp = reading.temperature?.value;
    const coreHumidity = reading.humidity?.value;
    const vocValue = reading.voc?.value;
    const grainMoisture = reading.moisture?.value;

    // --- Dew point & condensation risk (Magnus formula) ---
    if (coreTemp !== undefined && coreHumidity !== undefined && coreHumidity > 0) {
      const magnusConstantA = 17.62;
      const magnusConstantB = 243.12;
      const gamma = (magnusConstantA * coreTemp) / (magnusConstantB + coreTemp) + Math.log(coreHumidity / 100);
      const dewPoint = (magnusConstantB * gamma) / (magnusConstantA - gamma);
      derived.dew_point = Number(dewPoint.toFixed(2));

      if (dewPoint !== undefined) {
        const dewGap = coreTemp - dewPoint;
        derived.dew_point_gap = Number(dewGap.toFixed(2));
        if (dewGap < 1) {
          derived.condensation_risk = true;
        }
      }
    }

    // --- Airflow calculation from actuation telemetry ---
    if (reading.actuation_state?.fan_speed_factor !== undefined && reading.actuation_state?.fan_duty_cycle !== undefined) {
      const airflow =
        reading.actuation_state.fan_speed_factor * reading.actuation_state.fan_duty_cycle;
      derived.airflow = Number((airflow * 100).toFixed(2)); // store as %
    } else if (derived.airflow === undefined) {
      derived.airflow = null;
    }

    // --- VOC relative metrics ---
    if (vocValue !== undefined) {
      const windowEnd = timestamp;
      const minutes = (ms) => new Date(windowEnd.getTime() - ms);

      const vocMatchQuery = {
        silo_id: reading.silo_id,
        timestamp: { $lt: windowEnd },
        'voc.value': { $gt: 0 }
      };

      // Baseline 24h average
      const baselineWindow = minutes(24 * 60 * 60 * 1000);
      const [baselineAgg] = await SensorReadingModel.aggregate([
        { $match: { ...vocMatchQuery, timestamp: { $gte: baselineWindow, $lt: windowEnd } } },
        { $group: { _id: null, avg_voc: { $avg: '$voc.value' } } }
      ]);
      const vocBaseline = baselineAgg?.avg_voc || vocValue;
      derived.voc_baseline_24h = Number(vocBaseline.toFixed(2));

      const fiveMinWindow = minutes(5 * 60 * 1000);
      const [fiveAgg] = await SensorReadingModel.aggregate([
        { $match: { ...vocMatchQuery, timestamp: { $gte: fiveMinWindow, $lt: windowEnd } } },
        { $group: { _id: null, avg_voc: { $avg: '$voc.value' } } }
      ]);
      const vocAvg5 = fiveAgg?.avg_voc ?? vocValue;

      const thirtyMinWindow = minutes(30 * 60 * 1000);
      const [thirtyAgg] = await SensorReadingModel.aggregate([
        { $match: { ...vocMatchQuery, timestamp: { $gte: thirtyMinWindow, $lt: windowEnd } } },
        { $group: { _id: null, avg_voc: { $avg: '$voc.value' } } }
      ]);
      const vocAvg30 = thirtyAgg?.avg_voc ?? vocValue;

      derived.voc_relative_5min = Number(((vocAvg5 / (vocBaseline || 1)) * 100).toFixed(1));
      derived.voc_relative_30min = Number(((vocAvg30 / (vocBaseline || 1)) * 100).toFixed(1));

      const minutesElapsed = Math.max(1, (windowEnd - fiveMinWindow) / (1000 * 60));
      derived.voc_rate_5min = Number(((vocValue - vocAvg5) / minutesElapsed).toFixed(1));
    }

    // --- Pest presence heuristic ---
    if (derived.voc_relative_5min !== undefined) {
      let pestScore = 0.05;
      if (derived.voc_relative_5min > 150 && derived.voc_rate_5min > 20) {
        pestScore += 0.45;
      }
      if (derived.voc_relative_30min > 100 && (grainMoisture || 0) > 14) {
        pestScore += 0.35;
      }
      if ((coreHumidity || 0) > 70) {
        pestScore += 0.1;
      }
      derived.pest_presence_score = Number(Math.min(1, pestScore).toFixed(2));
      derived.pest_presence_flag = derived.pest_presence_score >= 0.5;
    }

    // --- Guardrails evaluation ---
    const guardrailReasons = [];
    if (derived.condensation_risk) {
      guardrailReasons.push('Dew point within 1°C of core temperature (condensation risk)');
    }
    const rainfall = reading.environmental_context?.weather?.precipitation;
    if (rainfall !== undefined && rainfall > 0) {
      guardrailReasons.push('External rainfall detected');
    }
    const ambientHumidity = reading.ambient?.humidity?.value ?? reading.environmental_context?.weather?.humidity;
    if (ambientHumidity !== undefined && ambientHumidity > 80) {
      guardrailReasons.push('Ambient humidity above 80%');
    }
    if (!derived.guardrails) derived.guardrails = {};
    derived.guardrails.venting_blocked = guardrailReasons.length > 0;
    derived.guardrails.reasons = guardrailReasons;

    // --- ML style risk scoring ---
    if (derived.voc_relative_30min !== undefined) {
      let riskScore = 0;
      if (derived.voc_relative_30min > 300 || (derived.voc_relative_30min > 100 && (grainMoisture || 0) > 14)) {
        riskScore = 85;
        derived.ml_risk_class = 'spoiled';
      } else if (derived.voc_relative_5min > 150 && derived.voc_rate_5min > 20) {
        riskScore = 65;
        derived.ml_risk_class = 'risky';
      } else {
        riskScore = 25;
        derived.ml_risk_class = 'safe';
      }
      derived.ml_risk_score = riskScore;
      derived.ml_confidence = derived.ml_risk_class === 'safe' ? 0.75 : 0.88;
    }

    // --- Enhanced spoilage detection metrics ---
    derived.spoilage_risk_factors = {
      high_voc_relative: derived.voc_relative_5min > 150,
      high_voc_rate: derived.voc_rate_5min > 20,
      high_moisture: (grainMoisture || 0) > 14,
      condensation_risk: derived.condensation_risk || false,
      pest_presence: derived.pest_presence_flag || false
    };

    // --- Smart fan control logic ---
    const coreRH = coreHumidity;
    if (coreRH !== undefined && grainMoisture !== undefined) {
      // Fan ON conditions
      if ((coreRH > 65 && grainMoisture > 14) || 
          derived.ml_risk_class === 'risky' || 
          derived.ml_risk_class === 'spoiled') {
        derived.fan_recommendation = 'run';
      }
      // Fan OFF conditions
      else if (coreRH < 62 && grainMoisture < 13.5) {
        derived.fan_recommendation = 'stop';
      }
      // Hold conditions (guardrails active)
      else if (derived.guardrails.venting_blocked) {
        derived.fan_recommendation = 'hold';
      } else {
        derived.fan_recommendation = 'unknown';
      }
    }

    derived.fan_guardrails_active = derived.guardrails.venting_blocked || false;

    // Dew point risk metrics
    if (derived.dew_point !== undefined && coreTemp !== undefined) {
      derived.dew_point_risk = Math.max(0, Math.min(1, (1 - (coreTemp - derived.dew_point) / 10)));
      derived.condensation_proximity = coreTemp - derived.dew_point;
    }

    reading.derived_metrics = derived;

    // Ensure metadata storage days fallback
    if (!reading.metadata) reading.metadata = {};
    if (reading.metadata.storage_days === undefined && reading.batch_id) {
      // Attempt to infer storage days based on batch creation date
      try {
        const GrainBatch = require('./GrainBatch');
        const batch = await GrainBatch.findById(reading.batch_id).select('harvest_date created_at');
        const referenceDate = batch?.harvest_date || batch?.created_at;
        if (referenceDate) {
          const days = Math.round((timestamp - referenceDate) / (1000 * 60 * 60 * 24));
          reading.metadata.storage_days = Math.max(0, days);
        }
      } catch (batchError) {
        // Non fatal – simply skip if batch lookup fails
      }
    }

    next();
  } catch (error) {
    console.error('SensorReading pre-save derived metric error:', error);
    next(error);
  }
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