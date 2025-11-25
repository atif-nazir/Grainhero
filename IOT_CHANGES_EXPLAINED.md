# 🎓 IoT Alignment Changes - Easy Explanation

## What We Did (In Simple Terms)

Your IoT setup document specified exactly how the hardware works. I've updated the entire backend to match it perfectly. Here's what changed and why:

---

## 🔧 **1. Fan Control - Now Smarter!**

### **Before:**
- Fan turned on/off instantly based on humidity
- Could cycle rapidly (bad for hardware)

### **Now:**
- **Hysteresis:** Fan turns ON at 65% humidity, but only turns OFF at 62% humidity
  - Why? Prevents rapid on/off cycling (like a thermostat)
- **Min Durations:** Fan must stay ON for at least 5 minutes, OFF for at least 5 minutes
  - Why? Prevents wear and tear from short-cycling

### **Example:**
```
Humidity rises to 66% → Fan turns ON ✅
Humidity drops to 63% → Fan stays ON (above 62% threshold) ✅
Humidity drops to 61% → Fan turns OFF ✅
```

---

## 🌫️ **2. VOC Detection - Now Primary!**

### **What is VOC?**
- Volatile Organic Compounds = gases from spoiling grain
- BME680 sensor detects these gases
- **Early warning** before you can see/smell spoilage

### **Alert Levels:**
- **🟡 Yellow (Early Risk):** VOC rises 150% above normal AND rate of change > 20
- **🔴 Red (Critical):** VOC rises 300% above normal OR (sustained rise + high moisture)

### **Why This Matters:**
- Detects spoilage **days earlier** than temperature/humidity alone
- Also detects pests (they produce VOC gases)
- One sensor (BME680) replaces multiple expensive sensors

---

## 📊 **3. Data Collection - Now Efficient!**

### **Before:**
- Every reading stored immediately
- Database fills up fast

### **Now:**
- **30-second raw readings** → buffered in memory
- **Every 5 minutes** → calculate average → store to database
- Matches your IoT spec exactly

### **Why:**
- Reduces database size by 90%
- Still keeps raw data for advanced ML
- Matches CSV export format

---

## 📁 **4. CSV Export - Now Matches Hardware!**

### **New Endpoint:**
`GET /api/sensors/export/iot-csv`

### **Format (Exact Match):**
```
timestamp, silo_id, batch_id, T_core, RH_core, T_amb, RH_amb, 
Grain_Moisture, fan_state, fan_duty, VOC_index, VOC_relative, 
dew_point_core, rainfall_last_hour, spoilage_label
```

### **Why:**
- Can import directly into ML training
- Matches ESP32 SD card format
- Compatible with your hardware logging

---

## 🚫 **5. Smart Guardrails - Never Ventilate When...**

### **Three Rules:**
1. **Rainfall > 0** → Don't run fan (wet air = bad for grain)
2. **Ambient RH > 80%** → Don't run fan (too humid outside)
3. **T_core - Dew_Point < 1°C** → Don't run fan (condensation risk)

### **Why:**
- Prevents condensation (water on grain = spoilage)
- Protects grain quality
- Saves energy

---

## 🐛 **6. Pest Detection - Now Automatic!**

### **How It Works:**
- No separate pest sensor needed!
- **VOC patterns** + **moisture** + **humidity** = pest detection
- ML learns pest activity from these signals

### **Detection Logic:**
- Yellow VOC pattern → 50% pest score
- Red VOC pattern + high moisture → 90% pest score
- Score >= 50% = pest detected

---

## 📈 **7. Grain Moisture Zones - Now Documented!**

### **Calibration Zones:**
- **0-10%** = Dry (safe) ✅
- **13-14%** = Risk (monitor) ⚠️
- **≥15%** = Spoilage (critical) 🚨

### **Why:**
- Clear thresholds for hardware calibration
- Helps users understand when to act
- Matches your IoT spec exactly

---

## 🔄 **8. How Everything Works Together**

### **Data Flow:**
```
ESP32 (every 30s) 
  → Backend receives reading
  → Buffers to aggregation service
  → Calculates VOC metrics
  → Checks fan control logic
  → Stores 5-min average to database
  → Updates ML predictions
```

### **Fan Control Flow:**
```
Sensor reading arrives
  → Check guardrails (rain? condensation? high RH?)
  → If blocked → Fan OFF (hold)
  → If clear → Check thresholds (RH > 65%? Moisture > 14%?)
  → Check hysteresis (min durations met?)
  → Update fan state
  → Log decision
```

---

## ✅ **What's Fixed:**

1. ✅ Fan control has hysteresis (no more rapid cycling)
2. ✅ VOC thresholds match spec (Yellow/Red alerts)
3. ✅ Data aggregation (30s → 5min) working
4. ✅ CSV export matches hardware format
5. ✅ Guardrails block ventilation correctly
6. ✅ Pest detection uses VOC patterns
7. ✅ All fields match IoT spec exactly

---

## 🚀 **Ready for Hardware!**

When you connect your ESP32:
1. Send readings every 30 seconds
2. Include `fan_duty_cycle` as 0-100 (not 0-1)
3. Include `fan_state` as 0 or 1
4. Backend will automatically:
   - Aggregate to 5-min averages
   - Calculate VOC metrics
   - Control fan with hysteresis
   - Export CSV in correct format

---

## 📝 **Files Changed:**

- `models/SensorReading.js` - Added IoT spec fields
- `services/dataAggregationService.js` - NEW: 30s → 5min pipeline
- `services/fanControlService.js` - NEW: Hysteresis state machine
- `routes/sensors.js` - CSV export + integration
- `services/aiSpoilageService.js` - ML features updated
- `server.js` - Starts aggregation service

---

**Everything is now aligned with your IoT spec! 🎉**

