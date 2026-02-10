const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Silo = require('../models/Silo');
const GrainBatch = require('../models/GrainBatch');
const SensorDevice = require('../models/SensorDevice');

async function migrateTenantToAdmin() {
  try {
    // Connect to MongoDB Atlas
    const mongoUri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    console.log('🔄 Starting migration from tenant_id to admin_id...');

    // Migrate Silos
    console.log('📦 Migrating Silos...');
    const siloResult = await Silo.updateMany(
      { tenant_id: { $exists: true } },
      [{ $set: { admin_id: '$tenant_id' } }, { $unset: 'tenant_id' }]
    );
    console.log(`✅ Updated ${siloResult.modifiedCount} silos`);

    // Migrate Grain Batches
    console.log('🌾 Migrating Grain Batches...');
    const batchResult = await GrainBatch.updateMany(
      { tenant_id: { $exists: true } },
      [{ $set: { admin_id: '$tenant_id' } }, { $unset: 'tenant_id' }]
    );
    console.log(`✅ Updated ${batchResult.modifiedCount} grain batches`);

    // Migrate Sensor Devices
    console.log('📡 Migrating Sensor Devices...');
    const sensorResult = await SensorDevice.updateMany(
      { tenant_id: { $exists: true } },
      [{ $set: { admin_id: '$tenant_id' } }, { $unset: 'tenant_id' }]
    );
    console.log(`✅ Updated ${sensorResult.modifiedCount} sensor devices`);

    console.log('🎉 Migration completed successfully!');
    console.log('All records now use admin_id instead of tenant_id.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

migrateTenantToAdmin();
