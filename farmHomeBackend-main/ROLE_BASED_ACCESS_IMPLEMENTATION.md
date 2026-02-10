# Role-Based Access Control Implementation

## Overview
This document describes the complete role-based access control (RBAC) implementation with warehouse-based data isolation.

## Roles and Access Levels

### 1. Super Admin
**See:**
- All tenants, admins, managers, technicians, warehouses, silos, devices, alerts, reports globally
- System health, usage limits, billing/revenue, feature flags

**Do:**
- Add and manage admins; control their access and features
- Full CRUD across grain/batches/silos/sensors/actuators/alerts/reports
- Configure global thresholds and AI features
- Manage all warehouses globally

### 2. Admin
**See:**
- All warehouses under their tenant
- All silos, technicians, and managers in their warehouses
- All data related to their tenant

**Do:**
- Create and manage warehouses
- Assign managers to warehouses
- Add technicians to warehouses
- Full CRUD for grain/batches/silos/sensors/actuators within their warehouses
- Manage team members (managers and technicians)

### 3. Manager
**See:**
- Exactly one assigned warehouse
- All silos within their assigned warehouse
- All technicians assigned to their warehouse
- Monetary data and projections relevant to their warehouse
- Warehouse performance trends

**Do:**
- Add technicians to their warehouse team
- Operate actuators (within policy)
- Acknowledge alerts
- Create maintenance and incident records
- Monitor sensors and thresholds
- Limited configuration if permitted by admin

### 4. Technician
**See:**
- Silos in their assigned warehouse/team
- Per-silo telemetry and status
- Monetary outputs relevant to silo operations (throughput contribution, spoilage risk impact)
- Alerts relevant to their silos

**Do:**
- Sensor operations: view, calibrate, maintain, bulk ingest
- Actuator control for their silos
- Acknowledge alerts
- Create maintenance and incident records
- Field inspections and IoT troubleshooting

## Database Models

### Warehouse Model
- `warehouse_id`: Unique identifier
- `name`: Warehouse name
- `admin_id`: Reference to Admin user
- `manager_id`: Reference to Manager user (exactly one)
- `technician_ids`: Array of Technician user references
- `location`: Location information
- `statistics`: Operational statistics

### WarehouseFinancials Model
- `warehouse_id`: Reference to Warehouse
- `revenue`: Revenue metrics (total, monthly, yearly)
- `expenses`: Expense metrics
- `profit`: Profit calculations
- `throughput`: Throughput metrics
- `spoilage`: Spoilage and loss data
- `projections`: Revenue/profit projections
- `trends`: Performance trends

### SiloFinancials Model
- `silo_id`: Reference to Silo
- `revenue`: Revenue contribution
- `throughput`: Throughput contribution
- `spoilage_risk`: Spoilage risk impact
- `efficiency`: Operational efficiency metrics

### Updated Models

#### User Model
- Added `warehouse_id` field (required for Manager and Technician roles)

#### Silo Model
- Added `warehouse_id` field (required, links silo to warehouse)

## Middleware

### warehouseAccess.js
Provides middleware functions:
- `requireWarehouseAccess()`: Ensures user has access to warehouse data
- `validateWarehouseParam()`: Validates warehouse_id parameter matches user's access
- `getWarehouseFilter()`: Returns appropriate filter based on user role
- `getAccessibleWarehouseIds()`: Returns array of accessible warehouse IDs

## Routes Updated

### /api/warehouses
- GET `/`: List warehouses (filtered by role)
- GET `/:id`: Get warehouse details
- POST `/`: Create warehouse (Admin only)
- PUT `/:id`: Update warehouse (Admin only)
- POST `/:id/technicians`: Add technician to warehouse
- DELETE `/:id/technicians/:technician_id`: Remove technician
- GET `/:id/financials`: Get warehouse financials
- GET `/:id/statistics`: Get warehouse statistics

### Updated Routes
- `/api/silos`: Now filters by warehouse_id based on role
- Additional routes will be updated to use warehouse filtering

## Migration

### migrateWarehouses.js
Migration script that:
1. Groups existing silos by admin_id and location to create warehouses
2. Assigns warehouse_id to silos
3. Assigns warehouses to managers
4. Assigns warehouses to technicians
5. Updates warehouse statistics

**To run migration:**
```bash
node scripts/migrateWarehouses.js
```

## Frontend Updates

### auth-utils.ts
- Updated `hasRouteAccess()` to include warehouse routes
- Updated `hasPermission()` to include warehouse permissions
- Updated `getSidebarNavigation()` to include warehouse navigation

### Route Permissions
- `/warehouses`: Super Admin, Admin, Manager, Technician (view only for Manager/Technician)
- `/team-management`: Super Admin, Admin, Manager

## Permission Configuration

### Manager Permissions
- `warehouse.view`, `warehouse.read`
- `technician.view`, `technician.assign`, `technician.read`
- `actuator.control`, `actuator.read`
- `maintenance.create`, `maintenance.view`
- `incidents.create`, `incidents.view`
- `thresholds.view` (limited)

### Technician Permissions
- `warehouse.view`, `warehouse.read`
- `sensor.view`, `sensor.calibrate`, `sensor.maintain`, `sensor.bulk_ingest`
- `actuator.control`, `actuator.maintain`
- `silo.inspect`, `silo.maintain`, `silo.view`
- `alerts.view`, `alerts.acknowledge`
- `maintenance.create`, `maintenance.view`
- `incidents.create`, `incidents.view`

## Data Isolation

### Super Admin
- No filters applied (sees everything)

### Admin
- Filters by `admin_id` (sees all their warehouses and related data)

### Manager
- Filters by `warehouse_id` (sees only their assigned warehouse)

### Technician
- Filters by `warehouse_id` (sees only their assigned warehouse)

## Next Steps

1. Update remaining routes (grainBatches, sensors, actuators, alerts, etc.) to use warehouse filtering
2. Create frontend pages for warehouse management
3. Update dashboard to show warehouse-specific data
4. Implement financial calculations and projections
5. Add warehouse assignment UI for Admin users
6. Add team management UI for Managers

## Testing

1. Run migration script to create warehouses from existing data
2. Test each role's access:
   - Super Admin should see all warehouses
   - Admin should see only their warehouses
   - Manager should see only their assigned warehouse
   - Technician should see only their assigned warehouse
3. Verify data isolation:
   - Managers cannot see other warehouses' data
   - Technicians cannot see other warehouses' data
   - Admins cannot see other tenants' data

