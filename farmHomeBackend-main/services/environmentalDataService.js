const cron = require('node-cron');
const weatherService = require('./weatherService');
const SensorReading = require('../models/SensorReading');
const Silo = require('../models/Silo');

class EnvironmentalDataService {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
  }

  /**
   * Start the environmental data collection service
   */
  start() {
    if (this.isRunning) {
      console.log('Environmental data service is already running');
      return;
    }

    console.log('Starting environmental data collection service...');
    
    // Collect data every 15 minutes
    this.scheduleDataCollection('*/15 * * * *', '15min');
    
    // Collect data every hour
    this.scheduleDataCollection('0 * * * *', '1hour');
    
    // Collect data every 6 hours
    this.scheduleDataCollection('0 */6 * * *', '6hours');
    
    this.isRunning = true;
    console.log('Environmental data service started successfully');
  }

  /**
   * Stop the environmental data collection service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Environmental data service is not running');
      return;
    }

    console.log('Stopping environmental data collection service...');
    
    this.jobs.forEach((job, key) => {
      job.destroy();
      console.log(`Stopped job: ${key}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('Environmental data service stopped');
  }

  /**
   * Schedule data collection for a specific interval
   * @param {string} cronExpression - Cron expression for scheduling
   * @param {string} intervalName - Name of the interval for logging
   */
  scheduleDataCollection(cronExpression, intervalName) {
    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Starting ${intervalName} environmental data collection...`);
        await this.collectEnvironmentalData();
        console.log(`${intervalName} environmental data collection completed`);
      } catch (error) {
        console.error(`Error in ${intervalName} environmental data collection:`, error);
      }
    }, {
      scheduled: false
    });

    job.start();
    this.jobs.set(intervalName, job);
    console.log(`Scheduled ${intervalName} environmental data collection`);
  }

  /**
   * Collect environmental data for all silos
   */
  async collectEnvironmentalData() {
    try {
      // Get all silos with their locations
      const silos = await Silo.find({ 
        'location.latitude': { $exists: true },
        'location.longitude': { $exists: true }
      }).populate('tenant_id', '_id');

      if (silos.length === 0) {
        console.log('No silos with location data found');
        return;
      }

      console.log(`Found ${silos.length} silos with location data`);

      // Collect data for each silo
      const collectionPromises = silos.map(silo => 
        this.collectDataForSilo(silo)
      );

      const results = await Promise.allSettled(collectionPromises);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Environmental data collection completed: ${successful} successful, ${failed} failed`);
      
      if (failed > 0) {
        console.log('Failed collections:', results
          .filter(r => r.status === 'rejected')
          .map(r => r.reason.message)
        );
      }
    } catch (error) {
      console.error('Error in environmental data collection:', error);
      throw error;
    }
  }

  /**
   * Collect environmental data for a specific silo
   * @param {Object} silo - Silo object with location data
   */
  async collectDataForSilo(silo) {
    try {
      const { latitude, longitude } = silo.location;
      
      if (!latitude || !longitude) {
        throw new Error(`Silo ${silo.silo_id} has no location data`);
      }

      // Fetch environmental data
      const environmentalData = await weatherService.getEnvironmentalData(latitude, longitude);
      const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);

      // Create sensor reading with environmental context
      const sensorReading = new SensorReading({
        tenant_id: silo.tenant_id._id,
        silo_id: silo._id,
        device_id: null, // Environmental data doesn't come from a specific device
        timestamp: new Date(),
        environmental_context: {
          weather: environmentalData.weather,
          air_quality_index: environmentalData.airQuality.aqi,
          pmd_data: {
            pm25: environmentalData.airQuality.pm2_5,
            pm10: environmentalData.airQuality.pm10,
            ozone: environmentalData.airQuality.o3
          }
        },
        quality_indicators: {
          is_valid: true,
          confidence_score: 0.9,
          anomaly_detected: false
        },
        // Add impact assessment as metadata
        raw_payload: {
          impact_assessment: impactAssessment,
          aqi_level: weatherService.getAQILevel(environmentalData.airQuality.aqi),
          collection_source: 'automated_environmental_service'
        }
      });

      await sensorReading.save();
      
      console.log(`Environmental data collected for silo ${silo.silo_id} at ${latitude}, ${longitude}`);
      
      return {
        silo_id: silo.silo_id,
        reading_id: sensorReading._id,
        timestamp: sensorReading.timestamp,
        impact_assessment: impactAssessment
      };
    } catch (error) {
      console.error(`Error collecting data for silo ${silo.silo_id}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger data collection for a specific location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} tenant_id - Tenant ID
   * @param {string} silo_id - Silo ID (optional)
   */
  async collectDataForLocation(lat, lon, tenant_id, silo_id = null) {
    try {
      console.log(`Manually collecting environmental data for location ${lat}, ${lon}`);
      
      const environmentalData = await weatherService.getEnvironmentalData(lat, lon);
      const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);

      const sensorReading = new SensorReading({
        tenant_id,
        silo_id,
        device_id: null,
        timestamp: new Date(),
        environmental_context: {
          weather: environmentalData.weather,
          air_quality_index: environmentalData.airQuality.aqi,
          pmd_data: {
            pm25: environmentalData.airQuality.pm2_5,
            pm10: environmentalData.airQuality.pm10,
            ozone: environmentalData.airQuality.o3
          }
        },
        quality_indicators: {
          is_valid: true,
          confidence_score: 0.9,
          anomaly_detected: false
        },
        raw_payload: {
          impact_assessment: impactAssessment,
          aqi_level: weatherService.getAQILevel(environmentalData.airQuality.aqi),
          collection_source: 'manual_environmental_service'
        }
      });

      await sensorReading.save();
      
      console.log(`Manual environmental data collection completed for location ${lat}, ${lon}`);
      
      return {
        reading_id: sensorReading._id,
        timestamp: sensorReading.timestamp,
        environmental_data: environmentalData,
        impact_assessment: impactAssessment
      };
    } catch (error) {
      console.error(`Error in manual data collection for location ${lat}, ${lon}:`, error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }
}

// Create singleton instance
const environmentalDataService = new EnvironmentalDataService();

module.exports = environmentalDataService;
