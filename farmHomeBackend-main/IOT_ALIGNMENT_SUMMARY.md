# IoT Spec Alignment - Complete Summary

## 🎯 What We Changed & Why

This document explains all changes made to align GrainHero with the IoT hardware specification.

---

## 📋 **1. SensorReading Model Updates**

### **What Changed:**
- Added `fan_rpm` field to track fan speed
- Changed `fan_duty_cycle` from 0-1 to 0-100% (matches IoT spec)
- Added `fan_state` as numeric (0=OFF, 1=ON) for CSV export compatibility
- Added `VOC_relative` (primary metric) in addition to `voc_relative_5min/30min`
- Added `voc_rate_30min` for 30-minute rate calculation
- Added `last_state_change` timestamp for hysteresis tracking

### **Why:**
- IoT spec CSV format requires `fan_state` as 0/1, not strings
- Fan duty cycle stored as percentage (0-100) matches hardware PWM values
- VOC_relative is the primary metric for spoilage detection

---

## 🌡️ **2. Fan Control Logic (Hysteresis + Min Durations)**

### **What Changed:**
- Created `fanControlService.js` - state machine with hysteresis
- Fan ON threshold: RH > 65% AND Moisture > 14%
- Fan OFF threshold: RH < 62% AND Moisture < 13.5% (hysteresis prevents short-cycling)
- Min ON duration: 5 minutes (prevents rapid cycling)
- Min OFF duration: 5 minutes (prevents rapid cycling)

### **Why:**
- **Hysteresis** = Different thresholds for ON vs OFF (65% vs 62%) prevents fan from rapidly turning on/off
- **Min durations** = Prevents wear and tear from short-cycling
- Matches IoT spec exactly: "Hysteresis & min on/off times to avoid short-cycling"

### **Example:**
- If RH is 64%, fan stays OFF (below 65% threshold)
- If RH rises to 66%, fan turns ON
- If RH drops to 63%, fan stays ON (above 62% threshold) ← **This is hysteresis!**
- Only turns OFF when RH drops below 62%

---

## 🌫️ **3. VOC Thresholds (Yellow/Red Alerts)**

### **What Changed:**
- **Yellow (Early Risk):** VOC_relative_5min > 150 AND VOC_rate_5min > 20
- **Red (High Risk):** VOC_relative_5min > 300 OR (VOC_relative_30min > 100 AND Grain_Moisture > 14%)

### **Why:**
- Yellow = Early warning (VOC starting to rise)
- Red = Critical (sustained VOC spike + high moisture = spoilage)
- Matches IoT spec thresholds exactly

---

## 📊 **4. Data Aggregation (30s → 5min)**

### **What Changed:**
- Created `dataAggregationService.js`
- Buffers raw 30-second readings
- Every 5 minutes, calculates averages and stores to database
- Keeps raw 30s data in memory buffer for ML expansion

### **Why:**
- IoT spec: "Raw sampling: every 30 seconds, 5-minute averages stored to CSV"
- Reduces database size (288 readings/day instead of 2,880)
- Still preserves raw data for advanced ML models

### **How It Works:**
1. ESP32 sends reading every 30 seconds → stored in buffer
2. Every 5 minutes → service calculates average of last 10 readings
3. Average stored to database → matches IoT spec CSV format

---

## 📁 **5. CSV Export (Exact IoT Format)**

### **What Changed:**
- New endpoint: `GET /api/sensors/export/iot-csv`
- Exact field order: `timestamp, silo_id, batch_id, T_core, RH_core, T_amb, RH_amb, Grain_Moisture, fan_state, fan_duty, VOC_index, VOC_relative, dew_point_core, rainfall_last_hour, spoilage_label`

### **Why:**
- Matches IoT spec CSV format exactly
- Can be imported directly into ML training pipelines
- Compatible with ESP32 SD card logging format

---

## 🤖 **6. ML Feature Pipeline Updates**

### **What Changed:**
- Added VOC-first features: `VOC_index`, `VOC_relative`, `VOC_rate_5min`, `VOC_rate_30min`
- Added fan telemetry: `fan_state`, `fan_duty`, `fan_rpm`
- Added delta calculations: `delta_temp`, `delta_rh`, `moisture_trend_6h`
- Updated comments to match IoT spec calibration zones

### **Why:**
- ML model needs VOC metrics as primary inputs (VOC-first detection)
- Fan telemetry helps model learn ventilation effectiveness
- Rolling features (5m/30m/6h) improve prediction accuracy

---

## 🚫 **7. Guardrails (Never Ventilate If...)**

### **What Changed:**
- Enhanced guardrail logic with exact IoT spec conditions:
  1. Rainfall > 0 → Block fan
  2. Ambient RH > 80% → Block fan
  3. T_core - Dew_Point < 1°C → Block fan (condensation risk)

### **Why:**
- Prevents condensation (water forms on grain surface)
- Prevents introducing high-humidity air during rain
- Protects grain quality

---

## 🐛 **8. Pest Presence Detection**

### **What Changed:**
- Updated pest score calculation to match IoT spec:
  - Yellow pattern (VOC_rel_5m > 150 AND rate > 20) → +0.5 score
  - Red pattern (VOC_rel_30m > 100 AND Moisture > 14%) → +0.4 score
  - High humidity (>70%) → +0.1 score
  - Threshold: score >= 0.5 = pest detected

### **Why:**
- Pest presence inferred from VOC patterns (no separate sensor needed)
- ML learns pest activity from VOC + environmental signals
- Early detection = better grain protection

---

## 📈 **9. Grain Moisture Calibration Zones**

### **What Changed:**
- Added comments documenting calibration zones:
  - 0-10% = dry (safe)
  - 13-14% = risk (monitor)
  - >=15% = spoilage (critical)

### **Why:**
- Clear documentation for hardware calibration
- Matches IoT spec calibration requirements
- Helps users understand moisture thresholds

---

## 🔄 **10. Integration Points**

### **Sensor Reading Endpoint:**
- Now buffers raw 30s readings to aggregation service
- Uses fan control service for recommendations
- Normalizes fan_duty_cycle (0-1 → 0-100%)

### **Server Startup:**
- Starts data aggregation service automatically
- Runs every 5 minutes to create averaged readings

---

## ✅ **What's Now Aligned:**

1. ✅ **Sensor fields** match IoT spec exactly
2. ✅ **Fan control** has hysteresis + min durations
3. ✅ **VOC thresholds** match Yellow/Red spec
4. ✅ **Data aggregation** implements 30s → 5min pipeline
5. ✅ **CSV export** matches exact IoT format
6. ✅ **ML features** include all VOC-first metrics
7. ✅ **Guardrails** block ventilation correctly
8. ✅ **Pest detection** uses VOC patterns
9. ✅ **Moisture zones** documented

---

## 🚀 **Next Steps (When Ready):**

1. **ESP32 Integration:** Update firmware to send readings every 30s
2. **UI Updates:** Show VOC-first metrics prominently
3. **Alert System:** Suppress VOC alerts when guardrails active
4. **Rolling Features:** Add 6h window calculations
5. **Testing:** Validate with real hardware

---

## 📝 **Key Files Modified:**

- `models/SensorReading.js` - Schema updates
- `services/dataAggregationService.js` - NEW: 30s → 5min pipeline
- `services/fanControlService.js` - NEW: Hysteresis state machine
- `routes/sensors.js` - CSV export + integration
- `services/aiSpoilageService.js` - ML feature updates
- `server.js` - Service startup

---

**All changes maintain backward compatibility while adding IoT spec alignment!**

