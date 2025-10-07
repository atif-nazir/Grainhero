/*
  Seed script to populate grain operations demo data:
  - Tenant (if none exists)
  - Admin user (if none exists)
  - Silos (3 examples)
  - Grain Batches (3 examples, linked to silos)
  - Sensors (3 examples, linked to silos)
*/

require('dotenv').config();
const mongoose = require('mongoose');

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Silo = require('../models/Silo');
const GrainBatch = require('../models/GrainBatch');
const SensorDevice = require('../models/SensorDevice');
const Subscription = require('../models/Subscription');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceClaim = require('../models/InsuranceClaim');

async function connect() {
  const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}`;
  await mongoose.connect(uri, { useNewUrlParser: true });
}

async function ensureTenantAndAdmin() {
  let tenant = await Tenant.findOne().sort({ created_at: 1 });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Demo Farm',
      email: 'demo@farmhome.local',
      business_type: 'farm',
    });
  }

  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = new User({
      name: 'Demo Admin',
      email: 'admin@farmhome.local',
      phone: '+920000000000',
      role: 'admin',
      password: 'Admin123!',
      // Ensure required tenant ownership fields are set for admin
      owned_tenant_id: tenant._id,
      tenant_id: tenant._id,
    });
    await admin.save();
  } else {
    // Backfill missing fields if schema requires
    let needsSave = false;
    if (!admin.owned_tenant_id) { admin.owned_tenant_id = tenant._id; needsSave = true; }
    if (!admin.tenant_id) { admin.tenant_id = tenant._id; needsSave = true; }
    if (needsSave) await admin.save();
  }

  if (!tenant.created_by) {
    tenant.created_by = admin._id;
    await tenant.save();
  }

  return { tenant, admin };
}

async function seedSilos(tenant, admin) {
  const existing = await Silo.find({ tenant_id: tenant._id });
  if (existing.length > 0) return existing;

  const now = new Date();
  const silos = await Silo.insertMany([
    {
      silo_id: 'SILO-A-001',
      name: 'Silo A - Main Storage',
      tenant_id: tenant._id,
      capacity_kg: 10000,
      current_occupancy_kg: 7500,
      status: 'active',
      current_conditions: {
        temperature: { value: 22.5, timestamp: now },
        humidity: { value: 45.2, timestamp: now },
        co2: { value: 850, timestamp: now },
        last_updated: now,
      },
      created_by: admin._id,
    },
    {
      silo_id: 'SILO-B-001',
      name: 'Silo B - Secondary',
      tenant_id: tenant._id,
      capacity_kg: 8000,
      current_occupancy_kg: 5200,
      status: 'active',
      current_conditions: {
        temperature: { value: 24.1, timestamp: now },
        humidity: { value: 52.8, timestamp: now },
        co2: { value: 920, timestamp: now },
        last_updated: now,
      },
      created_by: admin._id,
    },
    {
      silo_id: 'SILO-C-001',
      name: 'Silo C - Reserve',
      tenant_id: tenant._id,
      capacity_kg: 6000,
      current_occupancy_kg: 0,
      status: 'maintenance',
      created_by: admin._id,
    },
  ]);

  return silos;
}

async function seedBatches(tenant, admin, silos) {
  const existing = await GrainBatch.find({ tenant_id: tenant._id });
  if (existing.length > 0) return existing;

  const [siloA, siloB, siloC] = silos;
  const batches = await GrainBatch.insertMany([
    {
      batch_id: 'GH-2024-001',
      tenant_id: tenant._id,
      silo_id: siloA._id,
      grain_type: 'Wheat',
      quantity_kg: 5000,
      status: 'stored',
      risk_score: 15,
      spoilage_label: 'Safe',
      intake_date: new Date('2024-01-15'),
      farmer_name: 'Ahmed Khan',
      created_by: admin._id,
    },
    {
      batch_id: 'GH-2024-002',
      tenant_id: tenant._id,
      silo_id: siloB._id,
      grain_type: 'Rice',
      quantity_kg: 3500,
      status: 'stored',
      risk_score: 45,
      spoilage_label: 'Risky',
      intake_date: new Date('2024-01-20'),
      farmer_name: 'Fatima Ali',
      created_by: admin._id,
    },
    {
      batch_id: 'GH-2024-003',
      tenant_id: tenant._id,
      silo_id: siloC._id,
      grain_type: 'Maize',
      quantity_kg: 2000,
      status: 'dispatched',
      risk_score: 8,
      spoilage_label: 'Safe',
      intake_date: new Date('2024-01-10'),
      farmer_name: 'Muhammad Hassan',
      created_by: admin._id,
    },
  ]);

  // Link current batches to silos where appropriate
  await Silo.findByIdAndUpdate(siloA._id, { current_batch_id: batches[0]._id });
  await Silo.findByIdAndUpdate(siloB._id, { current_batch_id: batches[1]._id });

  return batches;
}

async function seedSensors(tenant, admin, silos) {
  const existing = await SensorDevice.find({ tenant_id: tenant._id });
  if (existing.length > 0) return existing;

  const devices = await SensorDevice.insertMany([
    {
      device_id: 'SENS-001',
      device_name: 'Silo A - Environmental Sensor',
      tenant_id: tenant._id,
      silo_id: silos[0]._id,
      sensor_types: ['temperature', 'humidity', 'co2'],
      battery_level: 85,
      signal_strength: -45,
      status: 'active',
      created_by: admin._id,
      health_metrics: {
        uptime_percentage: 99.2,
        error_count: 2,
        last_heartbeat: new Date(),
      },
    },
    {
      device_id: 'SENS-002',
      device_name: 'Silo B - Multi Sensor',
      tenant_id: tenant._id,
      silo_id: silos[1]._id,
      sensor_types: ['temperature', 'humidity', 'co2', 'voc', 'moisture'],
      battery_level: 92,
      signal_strength: -38,
      status: 'active',
      created_by: admin._id,
      health_metrics: {
        uptime_percentage: 98.7,
        error_count: 0,
        last_heartbeat: new Date(),
      },
    },
    {
      device_id: 'SENS-003',
      device_name: 'Silo C - Basic Sensor',
      tenant_id: tenant._id,
      silo_id: silos[2]._id,
      sensor_types: ['temperature', 'humidity'],
      battery_level: 15,
      signal_strength: -78,
      status: 'offline',
      created_by: admin._id,
      health_metrics: {
        uptime_percentage: 45.2,
        error_count: 15,
        last_heartbeat: new Date(Date.now() - 1000 * 60 * 60),
      },
    },
  ]);

  return devices;
}

async function main() {
  try {
    await connect();
    console.log('Connected to MongoDB');
    const { tenant, admin } = await ensureTenantAndAdmin();
    console.log('Using tenant:', tenant._id.toString());
    console.log('Using admin:', admin._id.toString());

    const silos = await seedSilos(tenant, admin);
    console.log(`Silos seeded: ${silos.length}`);

    const batches = await seedBatches(tenant, admin, silos);
    console.log(`Grain batches seeded: ${batches.length}`);

    const sensors = await seedSensors(tenant, admin, silos);
    console.log(`Sensors seeded: ${sensors.length}`);

    // Seed super admin and a few tenants for Super Admin dashboard
    let superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      superAdmin = new User({
        name: 'Super Admin',
        email: 'superadmin@example.com',
        phone: '+920000000001',
        role: 'super_admin',
        password: 'SuperAdmin123!'
      });
      await superAdmin.save();
    }

    const existingTenants = await Subscription.countDocuments();
    if (existingTenants < 3) {
      const plans = [
        { name: 'Basic', price: 99, users: 5, devices: 10, storage: 1 },
        { name: 'Pro', price: 299, users: 25, devices: 50, storage: 10 },
        { name: 'Enterprise', price: 999, users: 100, devices: 200, storage: 100 },
      ];
      for (let i = 1; i <= 3; i++) {
        const t = new Tenant({
          name: `Tenant ${i}`,
          email: `tenant${i}@example.com`,
          business_type: 'farm',
          created_by: superAdmin._id,
          is_active: true,
        });
        await t.save();
        const plan = plans[i - 1];
        const sub = new Subscription({
          tenant_id: t._id,
          plan_name: plan.name,
          price_per_month: plan.price,
          price_per_year: plan.price * 10,
          billing_cycle: 'monthly',
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          features: {
            max_users: plan.users,
            max_devices: plan.devices,
            max_storage_gb: plan.storage,
            max_batches: -1,
            ai_features: plan.name !== 'Basic',
            priority_support: plan.name === 'Enterprise',
            custom_integrations: plan.name === 'Enterprise',
            advanced_analytics: plan.name !== 'Basic'
          },
          created_by: superAdmin._id
        });
        await sub.save();
        t.subscription_id = sub._id;
        await t.save();
      }
      console.log('Super Admin and sample tenants seeded');
    }

    // Seed insurance policies and claims
    const existingPolicies = await InsurancePolicy.countDocuments();
    if (existingPolicies < 2) {
      const policies = await InsurancePolicy.insertMany([
        {
          policy_number: 'POL-2024-001',
          tenant_id: tenant._id,
          provider_name: 'AgriShield Insurance',
          coverage_type: 'Comprehensive',
          coverage_amount: 500000,
          premium_amount: 15000,
          deductible: 5000,
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          renewal_date: new Date('2024-12-15'),
          status: 'active',
          covered_batches: [
            {
              batch_id: batches[0]._id,
              grain_type: 'Wheat',
              quantity_kg: 5000,
              coverage_value: 150000
            },
            {
              batch_id: batches[1]._id,
              grain_type: 'Rice',
              quantity_kg: 3500,
              coverage_value: 175000
            }
          ],
          risk_factors: {
            fire_risk: 15,
            theft_risk: 8,
            spoilage_risk: 25,
            weather_risk: 12
          },
          created_by: admin._id
        },
        {
          policy_number: 'POL-2024-002',
          tenant_id: tenant._id,
          provider_name: 'GrainGuard Ltd',
          coverage_type: 'Fire & Theft',
          coverage_amount: 300000,
          premium_amount: 8000,
          deductible: 3000,
          start_date: new Date('2024-02-01'),
          end_date: new Date('2025-01-31'),
          renewal_date: new Date('2025-01-15'),
          status: 'active',
          covered_batches: [
            {
              batch_id: batches[2]._id,
              grain_type: 'Maize',
              quantity_kg: 2000,
              coverage_value: 80000
            }
          ],
          risk_factors: {
            fire_risk: 20,
            theft_risk: 15,
            spoilage_risk: 30,
            weather_risk: 18
          },
          created_by: admin._id
        }
      ]);

      // Seed sample claim
      await InsuranceClaim.create({
        claim_number: 'CLM-2024-001',
        policy_id: policies[1]._id,
        tenant_id: tenant._id,
        claim_type: 'Spoilage',
        description: 'Grain spoilage due to moisture damage in storage',
        amount_claimed: 30000,
        amount_approved: 25000,
        status: 'approved',
        incident_date: new Date('2024-01-15'),
        filed_date: new Date('2024-01-20'),
        approved_date: new Date('2024-02-05'),
        batch_affected: {
          batch_id: batches[2]._id,
          grain_type: 'Maize',
          quantity_affected: 500,
          estimated_value: 30000
        },
        created_by: admin._id
      });

      console.log('Insurance policies and claims seeded');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  }
}

main();


