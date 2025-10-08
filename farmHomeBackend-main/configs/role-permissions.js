// configs/role-permissions.js
// Role-to-permission gates. These are high-level permissions that map to feature keys.
// SuperAdmin bypasses guards in middleware.

const { USER_ROLES } = require("./enum");

// Map role to allowed feature keys (coarse-grained authorization)
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // Tenant Management (Admin owns the tenant)
    "tenant.manage",
    "users.manage",

    // Full Grain Management
    "batch.manage",
    "batch.create",
    "batch.update",
    "batch.delete",
    "batch.view",
    "batch.dispatch",
    "silo.manage",
    "silo.create",
    "silo.update",
    "silo.delete",
    "silo.view",
    "silo.configure",

    // Sensor & IoT Management
    "sensor.manage",
    "sensor.bulk_ingest",
    "sensor.configure",

    // AI & Analytics
    "ai.enable",
    "ai.configure",
    "advisories.create",
    "advisories.manage",

    // Alerts & Notifications
    "alerts.view",
    "alerts.manage",
    "notifications.manage",

    // Business Operations
    "buyers.manage",
    "insurance.view",
    "insurance.manage",
    "payment.manage",

    // System Control
    "actuator.control",
    "actuator.autoFanOn.enable",
    "thresholds.configure",
    "system.override",

    // Reporting
    "reports.generate",
    "reports.view",
    "pdf.generate",
  ],

  [USER_ROLES.MANAGER]: [
    // Grain Operations Management
    "batch.view",
    "batch.manage",
    "batch.create",
    "batch.dispatch",
    "silo.view",
    "silo.monitor",

    // Quality & Traceability
    "traceability.manage",
    "quality.assess",

    // Sensor Monitoring
    "sensor.view",
    "sensor.bulk_ingest",

    // Alerts & Advisory
    "alerts.view",
    "alerts.acknowledge",
    "advisories.view",
    "advisories.create",

    // Business Operations
    "buyers.view",
    "buyers.manage",
    "insurance.view",
    "insurance.create",
    "payment.view",

    // Reporting
    "reports.view",
    "reports.generate",
    "pdf.generate",

    // Dashboard
    "dashboard.view",
    "analytics.view",
  ],

  [USER_ROLES.TECHNICIAN]: [
    // IoT & Sensor Management
    "sensor.view",
    "sensor.calibrate",
    "sensor.maintain",
    "sensor.bulk_ingest",

    // Equipment & Infrastructure
    "actuator.control",
    "actuator.maintain",
    "silo.inspect",
    "silo.maintain",

    // Monitoring & Alerts
    "alerts.view",
    "alerts.acknowledge",
    "environmental.monitor",
    "iot.troubleshoot",

    // Basic Operations
    "batch.view",
    "maintenance.view",
    "maintenance.create",
    "incidents.view",
    "incidents.create",

    // Mobile & Field Work
    "mobile.access",
    "field.inspect",
    "notifications.view",
  ],
};

// Feature categories that different roles can access
const ROLE_FEATURE_ACCESS = {
  [USER_ROLES.SUPER_ADMIN]: "*", // Full access to everything

  [USER_ROLES.ADMIN]: [
    "user_management",
    "system_configuration",
    "advanced_analytics",
    "ai_predictions",
    "insurance_management",
    "payment_processing",
    "subscription_management",
    "feature_toggles",
    "bulk_operations",
    "data_export",
    "system_overrides",
  ],

  [USER_ROLES.MANAGER]: [
    "grain_intake",
    "batch_management",
    "traceability",
    "basic_analytics",
    "reporting",
    "buyer_management",
    "dispatch_management",
    "insurance_claims",
    "mobile_access",
  ],

  [USER_ROLES.TECHNICIAN]: [
    "iot_monitoring",
    "sensor_management",
    "environmental_control",
    "maintenance_logs",
    "field_inspections",
    "alert_handling",
    "mobile_access",
    "basic_reporting",
  ],
};

// Hierarchical permissions - higher roles inherit lower role permissions
const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: [
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.TECHNICIAN,
  ],
  [USER_ROLES.ADMIN]: [USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN],
  [USER_ROLES.MANAGER]: [USER_ROLES.TECHNICIAN],
  [USER_ROLES.TECHNICIAN]: [],
};

// Get all permissions for a role including inherited ones
const getAllPermissions = (role) => {
  let permissions = [...(ROLE_PERMISSIONS[role] || [])];

  // Add inherited permissions
  const inheritsFrom = ROLE_HIERARCHY[role] || [];
  inheritsFrom.forEach((inheritedRole) => {
    permissions = [...permissions, ...(ROLE_PERMISSIONS[inheritedRole] || [])];
  });

  // Remove duplicates
  return [...new Set(permissions)];
};

// Check if role has specific permission
const hasPermission = (role, permission) => {
  if (role === USER_ROLES.SUPER_ADMIN) return true;

  const allPermissions = getAllPermissions(role);
  return allPermissions.includes(permission);
};

module.exports = {
  ROLE_PERMISSIONS,
  ROLE_FEATURE_ACCESS,
  ROLE_HIERARCHY,
  getAllPermissions,
  hasPermission,
};
