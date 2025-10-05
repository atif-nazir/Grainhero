const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const GrainBatch = require('../models/GrainBatch');
const Silo = require('../models/Silo');
const Incident = require('../models/Incident');
const User = require('../models/User');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');

// Helper: Storage status calculation
function getStorageStatus(capacity, currentQuantity) {
  const utilization = (currentQuantity / capacity) * 100;
  if (utilization >= 90) return 'Critical';
  if (utilization >= 75) return 'High';
  if (utilization >= 50) return 'Medium';
  return 'Low';
}

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get real-time dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       value:
 *                         type: string
 *                 ageDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ageGroup:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 sexDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sex:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 breedDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       breed:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 breeding:
 *                   type: object
 *                   properties:
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     inProgress:
 *                       type: integer
 *                     successRate:
 *                       type: integer
 *                 suggestions:
 *                   type: object
 *                   properties:
 *                     culling:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tagId:
 *                             type: string
 *                           reason:
 *                             type: string
 *                     breeding:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tagId:
 *                             type: string
 *                           reason:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Grain batch stats
    const grainBatches = await GrainBatch.find();
    const totalBatches = grainBatches.length;
    
    // Silo stats
    const silos = await Silo.find();
    const totalSilos = silos.length;
    let totalCapacity = 0;
    let totalCurrentQuantity = 0;
    const storageStatus = { 'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0 };
    const grainTypes = {};
    
    silos.forEach(silo => {
      totalCapacity += silo.capacity || 0;
      totalCurrentQuantity += silo.currentQuantity || 0;
      
      // Storage status
      const status = getStorageStatus(silo.capacity, silo.currentQuantity);
      storageStatus[status] = (storageStatus[status] || 0) + 1;
    });
    
    // Grain type distribution
    grainBatches.forEach(batch => {
      if (batch.grainType) {
        grainTypes[batch.grainType] = (grainTypes[batch.grainType] || 0) + 1;
      }
    });

    // Storage utilization percentage
    const storageUtilization = totalCapacity > 0 ? Math.round((totalCurrentQuantity / totalCapacity) * 100) : 0;

    // Recent incidents (last month)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const recentIncidents = await Incident.countDocuments({ incidentDate: { $gte: oneMonthAgo } });

    // Active users (not blocked)
    const activeUsers = await User.countDocuments({ blocked: false });
    
    // Active alerts
    const activeAlerts = await Alert.countDocuments({ status: 'active' });

    // Storage recommendations
    const criticalSilos = silos.filter(s => {
      const utilization = (s.currentQuantity / s.capacity) * 100;
      return utilization >= 90;
    }).map(s => ({ siloId: s._id, name: s.name, reason: 'Near capacity - consider offloading' }));

    const lowUtilizationSilos = silos.filter(s => {
      const utilization = (s.currentQuantity / s.capacity) * 100;
      return utilization < 25;
    }).map(s => ({ siloId: s._id, name: s.name, reason: 'Low utilization - optimize storage' }));

    res.json({
      stats: [
        {
          title: 'Total Grain Batches',
          value: totalBatches,
        },
        {
          title: 'Storage Utilization',
          value: `${storageUtilization}%`,
        },
        {
          title: 'Recent Incidents (last month)',
          value: recentIncidents,
        },
        {
          title: 'Active Users',
          value: activeUsers,
        },
        {
          title: 'Active Alerts',
          value: activeAlerts,
        },
      ],
      storageDistribution: Object.entries(storageStatus).map(([status, count]) => ({ status, count })),
      grainTypeDistribution: Object.entries(grainTypes).map(([grainType, count]) => ({ grainType, count })),
      capacityStats: {
        totalCapacity,
        totalCurrentQuantity,
        utilizationPercentage: storageUtilization,
      },
      suggestions: {
        criticalStorage: criticalSilos,
        optimization: lowUtilizationSilos,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 