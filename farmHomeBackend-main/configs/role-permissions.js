// configs/role-permissions.js
const { USER_ROLES } = require('./enum');

// Define permissions for each role
const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: [
    // System Administration
    'system.manage',
    'system.monitor',
    'system.configure',
    
    // Plan Management (Super Admin manages all plans)
    'plan.create',
    'plan.read',
    'plan.update',
    'plan.delete',
    
    // User Management (Global - can see all admins and their teams)
    'user.create',
    'user.read',
    'user.update',
    'user.delete',
    'user.manage',
    
    // Revenue Management
    'revenue.read',
    'revenue.manage',
    
    // Analytics (Global)
    'analytics.global',
    'analytics.read',
    
    // Security
    'security.manage',
    'security.audit',
    
    // All other permissions
    'admin.all',
    'manager.all',
    'technician.all'
  ],
  
  [USER_ROLES.ADMIN]: [
    // Plan Management (Admin buys and manages their plan)
    'plan.read.own',
    'plan.manage.own',
    
    // User Management (Admin manages their team - managers and technicians)
    'user.create.team',
    'user.read.team',
    'user.update.team',
    'user.delete.team',
    
    // Grain Management
    'grain.create',
    'grain.read',
    'grain.update',
    'grain.delete',
    'grain.manage',
    
    // Batch Management
    'batch.create',
    'batch.read',
    'batch.update',
    'batch.delete',
    'batch.manage',
    
    // Silo Management
    'silo.create',
    'silo.read',
    'silo.update',
    'silo.delete',
    'silo.manage',
    
    // Buyer Management
    'buyer.create',
    'buyer.read',
    'buyer.update',
    'buyer.delete',
    'buyer.manage',
    
    // IoT Management
    'sensor.create',
    'sensor.read',
    'sensor.update',
    'sensor.delete',
    'sensor.manage',
    
    // Actuator Management
    'actuator.create',
    'actuator.read',
    'actuator.update',
    'actuator.delete',
    'actuator.manage',
    
    // Analytics (Admin level)
    'analytics.read',
    'analytics.admin',
    
    // Reports
    'report.create',
    'report.read',
    'report.update',
    'report.delete',
    
    // Insurance
    'insurance.create',
    'insurance.read',
    'insurance.update',
    'insurance.delete',
    
    // Payments
    'payment.create',
    'payment.read',
    'payment.update',
    'payment.delete',
    
    // Settings
    'settings.read',
    'settings.update',
    
    // All manager and technician permissions
    'manager.all',
    'technician.all'
  ],
  
  [USER_ROLES.MANAGER]: [
    // Grain Management (Read/Update only)
    'grain.read',
    'grain.update',
    
    // Batch Management (Read/Update only)
    'batch.read',
    'batch.update',
    
    // Silo Management (Read only)
    'silo.read',
    
    // Buyer Management (Read/Update only)
    'buyer.read',
    'buyer.update',
    
    // IoT Monitoring
    'sensor.read',
    'sensor.monitor',
    
    // Actuator Control
    'actuator.read',
    'actuator.control',
    
    // Analytics (Read only)
    'analytics.read',
    
    // Reports (Read/Create)
    'report.read',
    'report.create',
    
    // Quality Management
    'quality.read',
    'quality.update',
    
    // Dispatch Management
    'dispatch.create',
    'dispatch.read',
    'dispatch.update',
    
    // Team Management (Technicians only)
    'technician.read',
    'technician.assign',
    
    // All technician permissions
    'technician.all'
  ],
  
  [USER_ROLES.TECHNICIAN]: [
    // Grain Operations
    'grain.read',
    'grain.operate',
    
    // Batch Operations
    'batch.read',
    'batch.operate',
    
    // Silo Operations
    'silo.read',
    'silo.operate',
    
    // IoT Monitoring
    'sensor.read',
    'sensor.monitor',
    
    // Actuator Operations
    'actuator.read',
    'actuator.operate',
    
    // Quality Checks
    'quality.read',
    'quality.check',
    
    // Basic Reports
    'report.read.basic',
    
    // Environmental Data
    'environmental.read',
    'environmental.monitor'
  ]
};

// Permission inheritance system
const PERMISSION_INHERITANCE = {
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN],
  [USER_ROLES.ADMIN]: [USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN],
  [USER_ROLES.MANAGER]: [USER_ROLES.TECHNICIAN],
  [USER_ROLES.TECHNICIAN]: []
};

// Helper function to check if a role has a specific permission
function hasPermission(userRole, permission) {
  if (!userRole || !permission) return false;
  
  // Get direct permissions for the role
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  
  // Check direct permission
  if (rolePermissions.includes(permission)) {
    return true;
  }
  
  // Check inherited permissions
  const inheritedRoles = PERMISSION_INHERITANCE[userRole] || [];
  for (const inheritedRole of inheritedRoles) {
    const inheritedPermissions = ROLE_PERMISSIONS[inheritedRole] || [];
    if (inheritedPermissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
}

// Helper function to get all permissions for a role
function getRolePermissions(userRole) {
  if (!userRole) return [];
  
  const allPermissions = new Set();
  
  // Add direct permissions
  const directPermissions = ROLE_PERMISSIONS[userRole] || [];
  directPermissions.forEach(permission => allPermissions.add(permission));
  
  // Add inherited permissions
  const inheritedRoles = PERMISSION_INHERITANCE[userRole] || [];
  inheritedRoles.forEach(role => {
    const inheritedPermissions = ROLE_PERMISSIONS[role] || [];
    inheritedPermissions.forEach(permission => allPermissions.add(permission));
  });
  
  return Array.from(allPermissions);
}

// Helper function to check if user can manage another user
function canManageUser(managerRole, targetUserRole) {
  const roleHierarchy = {
    [USER_ROLES.SUPER_ADMIN]: 4,
    [USER_ROLES.ADMIN]: 3,
    [USER_ROLES.MANAGER]: 2,
    [USER_ROLES.TECHNICIAN]: 1
  };
  
  const managerLevel = roleHierarchy[managerRole] || 0;
  const targetLevel = roleHierarchy[targetUserRole] || 0;
  
  return managerLevel > targetLevel;
}

// Helper function to check tenant access
function canAccessTenant(userRole, userTenantId, targetTenantId) {
  // Super admin can access all tenants
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return true;
  }
  
  // Other roles can only access their own tenant
  return userTenantId && userTenantId.toString() === targetTenantId.toString();
}

module.exports = {
  ROLE_PERMISSIONS,
  PERMISSION_INHERITANCE,
  hasPermission,
  getRolePermissions,
  canManageUser,
  canAccessTenant
};