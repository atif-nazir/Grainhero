const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const Silo = require('../models/Silo');

/**
 * @swagger
 * tags:
 *   name: Silos
 *   description: Grain storage silo management
 */

/**
 * @swagger
 * /silos:
 *   get:
 *     summary: Get all silos for tenant
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of silos
 */
router.get('/', [
  auth,
  requirePermission('batch.view'), // reuse view permission for storage
  requireTenantAccess
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { tenant_id: req.user.tenant_id };
    if (req.query.status) filter.status = req.query.status;

    const [silos, total] = await Promise.all([
      Silo.find(filter)
        .populate({ path: 'current_batch_id', select: 'batch_id grain_type' })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Silo.countDocuments(filter)
    ]);

    // Map to frontend-friendly shape for current_batch_id
    const mapped = silos.map(s => ({
      ...s,
      current_batch_id: s.current_batch_id ? {
        batch_id: s.current_batch_id.batch_id,
        grain_type: s.current_batch_id.grain_type
      } : undefined
    }));

    res.json({
      silos: mapped,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });
  } catch (error) {
    console.error('Get silos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /silos/stats:
 *   get:
 *     summary: Get silo statistics for tenant
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Silo statistics
 */
router.get('/stats', [
  auth,
  requirePermission('batch.view'),
  requireTenantAccess
], async (req, res) => {
  try {
    const silos = await Silo.find({ tenant_id: req.user.tenant_id }).lean();
    const total = silos.length;
    const totalCapacity = silos.reduce((sum, s) => sum + (s.capacity_kg || 0), 0);
    const totalCurrent = silos.reduce((sum, s) => sum + (s.current_occupancy_kg || 0), 0);
    const utilization = totalCapacity > 0 ? Math.round((totalCurrent / totalCapacity) * 100) : 0;
    const byStatus = silos.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});
    res.json({ total, totalCapacity, totalCurrent, utilization, byStatus });
  } catch (error) {
    console.error('Get silo stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


