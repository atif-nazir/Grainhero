const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const GrainAlert = require('../models/GrainAlert');
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const LoggingService = require('../services/loggingService');
const { ALERT_PRIORITIES, ALERT_ESCALATION_STATUSES } = require('../configs/enum');
const { body, validationResult, param } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Real-time grain alerts and system notifications
 */

/**
 * GET /api/alerts
 * List all alerts for the tenant with role-based filtering
 */
router.get('/', [auth, requireTenantAccess], async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let filter = {};

        if (req.user.role === 'super_admin') {
            if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
        } else {
            filter.tenant_id = req.user.tenant_id || req.user.owned_tenant_id;

            // Technician only sees alerts assigned to them or sensor-related
            if (req.user.role === 'technician') {
                filter.$or = [
                    { assigned_to: req.user._id },
                    { source: { $in: ['sensor', 'threshold'] } }
                ];
            }
        }

        if (req.query.priority) filter.priority = req.query.priority;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.source) filter.source = req.query.source;
        if (req.query.silo_id) filter.silo_id = req.query.silo_id;
        if (req.query.batch_id) filter.batch_id = req.query.batch_id;

        const [alerts, total] = await Promise.all([
            GrainAlert.find(filter)
                .populate('silo_id', 'name location')
                .populate('batch_id', 'batch_id grain_type')
                .populate('assigned_to', 'name email')
                .sort({ triggered_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            GrainAlert.countDocuments(filter)
        ]);

        res.json({
            alerts,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total
            }
        });

    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/alerts/unread-count
 * Quick count of unresolved alerts for bell icon
 */
router.get('/unread-count', [auth, requireTenantAccess], async (req, res) => {
    try {
        let filter = {
            status: { $in: ['pending', 'acknowledged'] }
        };

        if (req.user.role === 'super_admin') {
            // Super admin sees all
        } else {
            filter.tenant_id = req.user.tenant_id || req.user.owned_tenant_id;
        }

        if (req.user.role === 'technician') {
            filter.$or = [
                { assigned_to: req.user._id },
                { source: { $in: ['sensor', 'threshold'] } }
            ];
        }

        const count = await GrainAlert.countDocuments(filter);
        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics for dashboard
 */
router.get('/stats', [auth, requireTenantAccess], async (req, res) => {
    try {
        let matchFilter = {};
        if (req.user.role !== 'super_admin') {
            const tid = req.user.tenant_id || req.user.owned_tenant_id;
            if (tid) matchFilter.tenant_id = new mongoose.Types.ObjectId(tid.toString());
        }

        const stats = await GrainAlert.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
                    high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
                    medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
                    unresolved: { $sum: { $cond: [{ $in: ['$status', ['pending', 'acknowledged', 'escalated']] }, 1, 0] } },
                    resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
                }
            }
        ]);

        const sourceStats = await GrainAlert.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$source', count: { $sum: 1 } } }
        ]);

        res.json({
            overview: stats[0] || { total: 0, critical: 0, high: 0, medium: 0, unresolved: 0, resolved: 0 },
            sources: sourceStats
        });
    } catch (error) {
        console.error('Get alert stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/alerts/all-public
 * Public alerts endpoint (backward compatibility)
 */
router.get('/all-public', async (req, res) => {
    try {
        const alerts = await GrainAlert.find({}).sort({ triggered_at: -1 }).limit(10).lean();
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/alerts/:id/acknowledge
 * Mark an alert as acknowledged
 */
router.post('/:id/acknowledge', [
    auth,
    param('id').isMongoId().withMessage('Invalid alert ID')
], async (req, res) => {
    try {
        const alert = await GrainAlert.findById(req.params.id);
        if (!alert) return res.status(404).json({ error: 'Alert not found' });

        alert.status = 'acknowledged';
        alert.acknowledged_by = req.user._id;
        alert.acknowledged_at = new Date();

        await alert.save();

        // Log the action
        try {
            await LoggingService.logAlertAcknowledged(req.user, alert, req.ip);
        } catch (logErr) { console.error('Logging error:', logErr.message); }

        res.json({ message: 'Alert acknowledged', alert });
    } catch (error) {
        console.error('Acknowledge alert error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/alerts/:id/resolve
 * Mark an alert as resolved
 */
router.post('/:id/resolve', [
    auth,
    param('id').isMongoId().withMessage('Invalid alert ID'),
    body('resolution_type').notEmpty().withMessage('Resolution type is required'),
    body('resolution_notes').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const alert = await GrainAlert.findById(req.params.id);
        if (!alert) return res.status(404).json({ error: 'Alert not found' });

        alert.status = 'resolved';
        alert.resolved_by = req.user._id;
        alert.resolved_at = new Date();
        alert.resolution_type = req.body.resolution_type;
        alert.resolution_notes = req.body.resolution_notes;

        await alert.save();

        try {
            await LoggingService.logAlertResolved(req.user, alert, req.body.resolution_type, req.ip);
        } catch (logErr) { console.error('Logging error:', logErr.message); }

        res.json({ message: 'Alert resolved', alert });
    } catch (error) {
        console.error('Resolve alert error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/alerts/:id/escalate
 * Escalate alert to a specific user or higher role
 */
router.post('/:id/escalate', [
    auth,
    param('id').isMongoId().withMessage('Invalid alert ID'),
    body('escalated_to').isMongoId().withMessage('Target user ID is required'),
    body('reason').notEmpty().withMessage('Reason for escalation is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const alert = await GrainAlert.findById(req.params.id);
        if (!alert) return res.status(404).json({ error: 'Alert not found' });

        const User = require('../models/User');
        const targetUser = await User.findById(req.body.escalated_to);
        if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

        alert.status = 'escalated';
        alert.assigned_to = targetUser._id;
        alert.escalation_reason = req.body.reason;

        await alert.save();

        try {
            await LoggingService.logAlertEscalated(req.user, alert, targetUser.name || targetUser.email, req.ip);
        } catch (logErr) { console.error('Logging error:', logErr.message); }

        res.json({ message: 'Alert escalated', alert });
    } catch (error) {
        console.error('Escalate alert error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;