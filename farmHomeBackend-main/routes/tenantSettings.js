const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Tenant = require('../models/Tenant');

/**
 * @swagger
 * /api/tenant/settings:
 *   get:
 *     summary: Get tenant settings
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tenant not found
 */
router.get('/settings', auth, async (req, res) => {
  try {
    // Get the user's tenant
    const tenantId = req.user.tenant_id || req.user.owned_tenant_id;
    if (!tenantId) {
      return res.status(404).json({ error: 'Tenant not found for user' });
    }

    const tenant = await Tenant.findById(tenantId).select('business_type address timezone locale currency');
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Return settings in the format expected by the frontend
    const settings = {
      business_type: tenant.business_type,
      location: {
        address: tenant.address?.street || '',
        city: tenant.address?.city || '',
        country: tenant.address?.country || 'Pakistan'
      },
      system: {
        timezone: tenant.timezone || 'UTC',
        locale: tenant.locale || 'en',
        currency: tenant.currency || 'USD',
        auto_backup: true, // default value
        data_retention_days: 365, // default value
        session_timeout_minutes: 60, // default value
        two_factor_auth: req.user.two_factor_enabled || false
      },
      notifications: {
        email_alerts: true, // default value
        sms_alerts: false, // default value
        push_notifications: true, // default value
        weekly_reports: true, // default value
        monthly_reports: true // default value
      },
      integrations: {
        weather_api: true, // default value
        market_prices: true, // default value
        government_data: false // default value
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error getting tenant settings:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/**
 * @swagger
 * /api/tenant/settings:
 *   put:
 *     summary: Update tenant settings
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Tenant settings updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tenant not found
 */
router.put('/settings', auth, async (req, res) => {
  try {
    const { business_type, location, system, notifications, integrations } = req.body;

    // Get the user's tenant
    const tenantId = req.user.tenant_id || req.user.owned_tenant_id;
    if (!tenantId) {
      return res.status(404).json({ error: 'Tenant not found for user' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Update tenant fields
    if (business_type) {
      tenant.business_type = business_type;
    }

    if (location) {
      tenant.address = {
        ...tenant.address,
        street: location.address || tenant.address?.street,
        city: location.city || tenant.address?.city,
        country: location.country || tenant.address?.country
      };
    }

    await tenant.save();

    res.json({ message: 'Tenant settings updated successfully' });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

module.exports = router;