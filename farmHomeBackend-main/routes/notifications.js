const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireTenantAccess } = require('../middleware/permission');
const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Get notifications for the current user
 */
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { recipient_id: req.user._id };
        if (req.query.read !== undefined) filter.read = req.query.read === 'true';
        if (req.query.category) filter.category = req.query.category;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ recipient_id: req.user._id, read: false })
        ]);

        res.json({
            notifications,
            unread_count: unreadCount,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/notifications/unread-count
 * Quick unread count for badge
 */
router.get('/unread-count', auth, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient_id: req.user._id,
            read: false
        });
        res.json({ unread_count: count });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient_id: req.user._id },
            { read: true, read_at: new Date() },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ message: 'Marked as read', notification });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch('/mark-all-read', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient_id: req.user._id, read: false },
            { read: true, read_at: new Date() }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
