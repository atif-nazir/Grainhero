---
description: Start the full GrainHero IoT stack (Mosquitto → Backend → Frontend)
---

# GrainHero IoT Stack - Start/Restart Workflow

## Prerequisites
- Windows Mobile Hotspot enabled (SSID/PASS matching ESP32 firmware)
- Laptop hotspot controller IP: 192.168.137.1
- ESP32 device ID: 004B12387760

## Step 1: Start Mosquitto MQTT Broker
// turbo
```
"C:\Program Files\mosquitto\mosquitto.exe" -c "C:\mosquitto\mosquitto.conf" -v
```
Verify with:
// turbo
```
netstat -ano | findstr ":1883"
```
Expect: LISTENING on 0.0.0.0:1883

## Step 2: Start Backend
```
cd c:\Users\Nexgen\Downloads\FYP\Grainhero\farmHomeBackend-main
node server.js
```
Verify with:
// turbo
```
Invoke-RestMethod "http://localhost:5000/status" | ConvertTo-Json
```
Expect: `{ "status": "Up", "frontend": "http://localhost:3000" }`

## Step 3: Start Frontend
```
cd c:\Users\Nexgen\Downloads\FYP\Grainhero\farmHomeFrontend-main
npm run dev
```
Verify: http://localhost:3000 loads

## Step 4: Verify Diagnostics
// turbo
```
Invoke-RestMethod "http://localhost:5000/api/iot/diagnostics-public/004B12387760" | ConvertTo-Json -Depth 5
```
Expect:
- mqtt_connected: true
- firebase_enabled: true
- last_telemetry: non-null (after ESP32 sends data)

## Step 5: Verify Telemetry (requires auth token)
Open browser DevTools console on the frontend app:
```js
// Check token is present
localStorage.getItem('token')
// Override backend URL if needed
window.__BACKEND_URL = 'http://localhost:5000'
```

## Troubleshooting
- If backend crashes: check for Firebase double-init errors, ensure service account exists at C:\Users\Nexgen\Documents\firebase\smart-silo-service-account.json
- If last_telemetry is null: ESP32 hasn't sent data yet; check Serial Monitor and hotspot connection
- If firebase_enabled is false: check FIREBASE_DATABASE_URL and FIREBASE_SERVICE_ACCOUNT_PATH in backend .env
- If MQTT disconnected: verify Mosquitto is running and port 1883 is open
