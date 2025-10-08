// lib/auth-utils.ts

import { User } from "@/app/[locale]/providers"

export interface RoleHierarchy {
  [key: string]: number
}

export const ROLE_HIERARCHY: RoleHierarchy = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  technician: 1
}

/**
 * Check if a user can manage another user based on role hierarchy
 */
export function canManageUser(managerRole: string, targetRole: string): boolean {
  const managerLevel = ROLE_HIERARCHY[managerRole] || 0
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0
  return managerLevel > targetLevel
}

/**
 * Check if user has access to a specific role-based route
 */
export function hasRouteAccess(userRole: string, route: string): boolean {
  const routePermissions: { [key: string]: string[] } = {
    // Super Admin only routes
    '/tenant-management': ['super_admin'],
    '/plan-management': ['super_admin'],
    '/system-health': ['super_admin'],
    '/global-analytics': ['super_admin'],
    '/security-center': ['super_admin'],
    '/revenue-management': ['super_admin'],
    '/system-logs': ['super_admin'],
    '/server-monitoring': ['super_admin'],
    
    // Admin and Super Admin routes
    '/users': ['super_admin', 'admin'],
    '/settings': ['super_admin', 'admin'],
    '/insurance': ['super_admin', 'admin'],
    
    // Manager, Admin, and Super Admin routes
    '/grain-batches': ['super_admin', 'admin', 'manager'],
    '/buyers': ['super_admin', 'admin', 'manager'],
    '/traceability': ['super_admin', 'admin', 'manager'],
    '/ai-predictions': ['super_admin', 'admin', 'manager'],
    '/risk-assessment': ['super_admin', 'admin', 'manager'],
    '/spoilage-analysis': ['super_admin', 'admin', 'manager'],
    '/reports': ['super_admin', 'admin', 'manager'],
    '/payments': ['super_admin', 'admin', 'manager'],
    
    // All authenticated users
    '/dashboard': ['super_admin', 'admin', 'manager', 'technician'],
    '/sensors': ['super_admin', 'admin', 'technician'],
    '/environmental-data': ['super_admin', 'admin', 'manager', 'technician'],
    '/grain-alerts': ['super_admin', 'admin', 'manager', 'technician'],
    '/silos': ['super_admin', 'admin', 'manager', 'technician'],
    '/profile': ['super_admin', 'admin', 'manager', 'technician'],
    '/notifications': ['super_admin', 'admin', 'manager', 'technician']
  }
  
  const allowedRoles = routePermissions[route] || []
  return allowedRoles.includes(userRole)
}

/**
 * Get the appropriate dashboard redirect based on user role
 */
export function getDashboardRedirect(userRole: string): string {
  switch (userRole) {
    case 'super_admin':
      return '/dashboard' // Super admin sees their own dashboard
    case 'admin':
      return '/dashboard' // Admin sees tenant dashboard
    case 'manager':
      return '/dashboard' // Manager sees manager dashboard
    case 'technician':
      return '/dashboard' // Technician sees technician dashboard
    default:
      return '/dashboard'
  }
}

/**
 * Get available roles that the current user can create/manage
 */
export function getAvailableRolesForCreation(userRole: string): string[] {
  switch (userRole) {
    case 'super_admin':
      return ['admin', 'manager', 'technician']
    case 'admin':
      return ['manager', 'technician']
    case 'manager':
      return [] // Managers cannot create users
    case 'technician':
      return [] // Technicians cannot create users
    default:
      return []
  }
}

/**
 * Check if user can access tenant data
 */
export function canAccessTenant(userRole: string, userTenantId?: string, targetTenantId?: string): boolean {
  // Super admin can access all tenants
  if (userRole === 'super_admin') {
    return true
  }
  
  // Other roles can only access their own tenant
  if (!userTenantId || !targetTenantId) {
    return false
  }
  
  return userTenantId === targetTenantId
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: { [key: string]: string } = {
    'super_admin': 'Super Admin',
    'admin': 'Admin',
    'manager': 'Manager',
    'technician': 'Technician'
  }
  
  return roleNames[role] || role
}

/**
 * Get role badge color class
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'bg-red-100 text-red-800'
    case 'admin':
      return 'bg-blue-100 text-blue-800'
    case 'manager':
      return 'bg-green-100 text-green-800'
    case 'technician':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Check if user has permission for a specific action
 */
export function hasPermission(userRole: string, permission: string): boolean {
  const permissions: { [key: string]: string[] } = {
    'user.create': ['super_admin', 'admin'],
    'user.read': ['super_admin', 'admin'],
    'user.update': ['super_admin', 'admin'],
    'user.delete': ['super_admin', 'admin'],
    'tenant.manage': ['super_admin'],
    'tenant.read': ['super_admin', 'admin'],
    'tenant.update': ['super_admin', 'admin'],
    'system.manage': ['super_admin'],
    'system.monitor': ['super_admin'],
    'grain.manage': ['super_admin', 'admin'],
    'grain.read': ['super_admin', 'admin', 'manager', 'technician'],
    'grain.update': ['super_admin', 'admin', 'manager'],
    'batch.manage': ['super_admin', 'admin'],
    'batch.read': ['super_admin', 'admin', 'manager', 'technician'],
    'batch.update': ['super_admin', 'admin', 'manager'],
    'sensor.manage': ['super_admin', 'admin'],
    'sensor.read': ['super_admin', 'admin', 'technician'],
    'sensor.update': ['super_admin', 'admin'],
    'reports.create': ['super_admin', 'admin', 'manager'],
    'reports.read': ['super_admin', 'admin', 'manager', 'technician'],
    'analytics.global': ['super_admin'],
    'analytics.tenant': ['super_admin', 'admin'],
    'analytics.read': ['super_admin', 'admin', 'manager', 'technician']
  }
  
  const allowedRoles = permissions[permission] || []
  return allowedRoles.includes(userRole)
}

/**
 * Validate user session and redirect if necessary
 */
export function validateUserSession(user: User | null, currentPath: string): { isValid: boolean; redirectTo?: string } {
  if (!user) {
    return { isValid: false, redirectTo: '/auth/login' }
  }
  
  // Check if user has access to current route
  if (!hasRouteAccess(user.role, currentPath)) {
    return { isValid: false, redirectTo: '/not-allowed' }
  }
  
  return { isValid: true }
}

/**
 * Get user's tenant information for display
 */
export function getUserTenantInfo(user: User): { name: string; type: 'owned' | 'member' | 'none' } {
  // This would need to be implemented based on your data structure
  // For now, returning placeholder
  return { name: 'Default Tenant', type: 'member' }
}

/**
 * Check if user can perform administrative actions
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin' || user.role === 'super_admin'
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: User): boolean {
  return user.role === 'super_admin'
}

/**
 * Get appropriate sidebar navigation items based on user role
 */
export function getSidebarNavigation(userRole: string): any[] {
  const allNavItems = [
    { name: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', roles: ['super_admin', 'admin', 'manager', 'technician'] },
    { name: 'grain-batches', label: 'Grain Batches', href: '/grain-batches', icon: 'Package', roles: ['super_admin', 'admin', 'manager'] },
    { name: 'sensors', label: 'Sensors', href: '/sensors', icon: 'Smartphone', roles: ['super_admin', 'admin', 'technician'] },
    { name: 'users', label: 'Users', href: '/users', icon: 'Users', roles: ['super_admin', 'admin'] },
    { name: 'tenant-management', label: 'Tenant Management', href: '/tenant-management', icon: 'Building2', roles: ['super_admin'] },
    { name: 'settings', label: 'Settings', href: '/settings', icon: 'Settings', roles: ['super_admin', 'admin'] }
  ]
  
  return allNavItems.filter(item => item.roles.includes(userRole))
}
