# Fixed API Configuration for Flutter Technician App

## Problem Identified
Your `baseUrl` includes `/api`, but auth routes are at `/auth/*` (NOT `/api/auth/*`). This causes the error "Received HTML instead of JSON" because the endpoint doesn't exist.

## Solution
Create separate base URLs:
- **Auth base URL**: `http://10.0.2.2:5000` (no `/api`)
- **API base URL**: `http://10.0.2.2:5000/api` (with `/api`)

---

## Corrected ApiConfig File

Replace your `lib/config/api_config.dart` with this:

```dart
import 'dart:io';

class ApiConfig {
  // ============================================
  // BASE URLS (IMPORTANT: Auth uses NO /api prefix!)
  // ============================================
  
  /// Base URL WITHOUT /api for auth endpoints
  /// Auth routes: /auth/login, /auth/signup, etc.
  static String get authBaseUrl {
    if (Platform.isAndroid) {
      // Android emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:5000';
    } else if (Platform.isIOS) {
      // iOS simulator can use localhost directly
      return 'http://localhost:5000';
    }
    return 'http://localhost:5000';
  }

  /// Base URL WITH /api for other API endpoints
  /// API routes: /api/sensors, /api/grain-batches, etc.
  static String get apiBaseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5000/api';
    } else if (Platform.isIOS) {
      return 'http://localhost:5000/api';
    }
    return 'http://localhost:5000/api';
  }

  // ============================================
  // AUTH ENDPOINTS (NO /api PREFIX!)
  // ============================================
  
  /// POST /auth/login
  /// Body: { "email": "string", "password": "string" }
  /// Response: { "token": "string", "id": "string", "role": "string", "name": "string", "email": "string", "phone": "string", "avatar": "string", "hasAccess": "string" }
  static String get login => '$authBaseUrl/auth/login';

  /// POST /auth/signup
  /// Body: { "name": "string", "email": "string", "phone": "string", "password": "string", "confirm_password": "string", "invitation_token": "string" (optional) }
  /// Response: { "token": "string", "id": "string", "role": "string", "name": "string", "email": "string", ... }
  static String get signup => '$authBaseUrl/auth/signup';

  /// POST /auth/forget-password
  /// Body: { "email": "string" }
  /// Response: { "message": "Password reset email sent", "resetLink": "string" }
  static String get forgetPassword => '$authBaseUrl/auth/forget-password';

  /// POST /auth/reset-password
  /// Body: { "token": "string", "newPassword": "string", "confirmPassword": "string" }
  /// Response: { "message": "Password reset successful" }
  static String get resetPassword => '$authBaseUrl/auth/reset-password';

  // ============================================
  // TECHNICIAN ENDPOINTS (WITH /api PREFIX)
  // ============================================
  
  /// GET /api/user-management/users/me
  /// Get current technician profile
  static String get technicianProfile => '$apiBaseUrl/user-management/users/me';

  /// GET /dashboard
  /// Get technician dashboard stats
  static String get technicianDashboard => '$authBaseUrl/dashboard';

  // ============================================
  // ALERT ENDPOINTS
  // ============================================
  
  /// GET /api/alerts?assigned_to=me&limit=50
  /// Get alerts assigned to current technician
  static String get alerts => '$apiBaseUrl/alerts';

  /// PATCH /api/alerts/:id/acknowledge
  /// Acknowledge an alert
  static String acknowledgeAlert(String id) => '$apiBaseUrl/alerts/$id/acknowledge';

  // ============================================
  // SENSOR ENDPOINTS
  // ============================================
  
  /// GET /api/sensors?limit=100
  /// Get all sensors (tenant-scoped)
  static String get sensors => '$apiBaseUrl/sensors';

  /// GET /api/sensors/:id
  /// Get sensor details
  static String sensorDetails(String id) => '$apiBaseUrl/sensors/$id';

  // ============================================
  // GRAIN BATCH ENDPOINTS
  // ============================================
  
  /// GET /api/grain-batches?limit=50
  /// Get grain batches (tenant-scoped)
  static String get grainBatches => '$apiBaseUrl/grain-batches';

  /// GET /api/grain-batches/:id
  /// Get grain batch details
  static String grainBatchDetails(String id) => '$apiBaseUrl/grain-batches/$id';

  // ============================================
  // HEADERS HELPER
  // ============================================
  
  /// Get headers with optional authentication token
  static Map<String, String> getHeaders({String? token}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }
}
```

---

## Key Changes Made

1. **Separated base URLs**:
   - `authBaseUrl` = `http://10.0.2.2:5000` (no `/api`)
   - `apiBaseUrl` = `http://10.0.2.2:5000/api` (with `/api`)

2. **Fixed auth endpoints**:
   - `login` = `$authBaseUrl/auth/login` → `http://10.0.2.2:5000/auth/login` ✅
   - `signup` = `$authBaseUrl/auth/signup` → `http://10.0.2.2:5000/auth/signup` ✅
   - `forgetPassword` = `$authBaseUrl/auth/forget-password` → `http://10.0.2.2:5000/auth/forget-password` ✅
   - `resetPassword` = `$authBaseUrl/auth/reset-password` → `http://10.0.2.2:5000/auth/reset-password` ✅

3. **Fixed API endpoints**:
   - All other endpoints use `$apiBaseUrl` which includes `/api`

---

## Example Usage

### Login Example
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:your_app/config/api_config.dart';

Future<Map<String, dynamic>?> login(String email, String password) async {
  try {
    final response = await http.post(
      Uri.parse(ApiConfig.login), // This will be: http://10.0.2.2:5000/auth/login
      headers: ApiConfig.getHeaders(),
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      // Save token to secure storage
      // await secureStorage.write(key: 'token', value: data['token']);
      return data;
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Login failed');
    }
  } catch (e) {
    print('Login error: $e');
    rethrow;
  }
}
```

### Get Sensors Example
```dart
Future<List<dynamic>> getSensors(String token) async {
  try {
    final response = await http.get(
      Uri.parse('${ApiConfig.sensors}?limit=100'), // http://10.0.2.2:5000/api/sensors?limit=100
      headers: ApiConfig.getHeaders(token: token),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['sensors'] ?? [];
    } else {
      throw Exception('Failed to fetch sensors');
    }
  } catch (e) {
    print('Get sensors error: $e');
    rethrow;
  }
}
```

---

## Testing Checklist

After updating your `api_config.dart`:

1. ✅ **Login** should work: `POST http://10.0.2.2:5000/auth/login`
2. ✅ **Signup** should work: `POST http://10.0.2.2:5000/auth/signup`
3. ✅ **Forget Password** should work: `POST http://10.0.2.2:5000/auth/forget-password`
4. ✅ **Reset Password** should work: `POST http://10.0.2.2:5000/auth/reset-password`
5. ✅ **Get Sensors** should work: `GET http://10.0.2.2:5000/api/sensors` (with token)

---

## For Physical Devices

If testing on a physical device, replace `10.0.2.2` with your computer's IP address:

**Windows**: Run `ipconfig` and find your IPv4 address (e.g., `192.168.1.100`)
**Mac/Linux**: Run `ifconfig` and find your IP address

Then update:
```dart
static String get authBaseUrl {
  return 'http://192.168.1.100:5000'; // Your computer's IP
}

static String get apiBaseUrl {
  return 'http://192.168.1.100:5000/api';
}
```

Make sure:
- ✅ Your phone and computer are on the same WiFi network
- ✅ Your backend is running (`npm start` in `farmHomeBackend-main`)
- ✅ Port 5000 is not blocked by firewall

