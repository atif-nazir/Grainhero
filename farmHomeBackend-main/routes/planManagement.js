const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/roleAuth');
const User = require('../models/User');
const { getPlanFeatures, hasFeatureAccess, isWithinLimits, getUsagePercentage, getUpgradeSuggestions } = require('../configs/plan-features');
const { USER_ROLES } = require('../configs/enum');

/**
 * @swagger
 * /api/plan-info:
 *   get:
 *     summary: Get current user's plan information and usage
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plan information and usage stats
 *       401:
 *         description: Unauthorized
 */
router.get('/plan-info', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Get user's plan (only admins have plans)
    let planName = 'basic';
    if (user.role === USER_ROLES.ADMIN && user.subscription_plan) {
      planName = user.subscription_plan;
    } else if (user.role === USER_ROLES.SUPER_ADMIN) {
      planName = 'enterprise'; // Super admin gets all features
    } else if (user.role === USER_ROLES.MANAGER || user.role === USER_ROLES.TECHNICIAN) {
      // Team members inherit their admin's plan
      const admin = await User.findById(user.admin_id);
      if (admin && admin.subscription_plan) {
        planName = admin.subscription_plan;
      }
    }
    
    const planInfo = getPlanFeatures(planName);
    
    // Calculate usage stats
    const usageStats = await calculateUsageStats(user);
    
    res.json({
      plan: planInfo,
      usage: usageStats,
      upgradeSuggestions: getUpgradeSuggestions(planName, usageStats)
    });
  } catch (err) {
    console.error('Error fetching plan info:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * @swagger
 * /api/plan-management/plans:
 *   get:
 *     summary: Get all available plans (super admin only)
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all available plans
 *       403:
 *         description: Forbidden
 */
router.get('/plans', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { PLAN_FEATURES } = require('../configs/plan-features');
    res.json({ plans: PLAN_FEATURES });
  } catch (err) {
    console.error('Error fetching plans:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * @swagger
 * /api/plan-management/update-plan:
 *   patch:
 *     summary: Update user's subscription plan (super admin only)
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - planName
 *             properties:
 *               userId:
 *                 type: string
 *               planName:
 *                 type: string
 *                 enum: [basic, standard, professional, enterprise]
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 */
router.patch('/update-plan', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { userId, planName } = req.body;
    
    if (!userId || !planName) {
      return res.status(400).json({ error: 'userId and planName are required' });
    }
    
    const validPlans = ['basic', 'standard', 'professional', 'enterprise'];
    if (!validPlans.includes(planName)) {
      return res.status(400).json({ error: 'Invalid plan name' });
    }
    
    // Validate userId format
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Only admins can have plans
    if (user.role !== USER_ROLES.ADMIN) {
      return res.status(400).json({ error: 'Only admin users can have subscription plans' });
    }
    
    // Update the plan
    user.subscription_plan = planName;
    await user.save();
    
    res.json({
      message: 'Plan updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription_plan: user.subscription_plan
      }
    });
  } catch (err) {
    console.error('Error updating plan:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * @swagger
 * /api/plan-management/check-limits:
 *   post:
 *     summary: Check if user can perform an action within plan limits
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - resourceType
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [create_user, create_batch, add_sensor, create_report]
 *               resourceType:
 *                 type: string
 *                 enum: [user, grain_batch, sensor, report]
 *     responses:
 *       200:
 *         description: Limit check result
 *       400:
 *         description: Bad request
 */
router.post('/check-limits', auth, async (req, res) => {
  try {
    const { action, resourceType } = req.body;
    const user = req.user;
    
    if (!action || !resourceType) {
      return res.status(400).json({ error: 'action and resourceType are required' });
    }
    
    // Get user's plan
    let planName = 'basic';
    if (user.role === USER_ROLES.ADMIN && user.subscription_plan) {
      planName = user.subscription_plan;
    } else if (user.role === USER_ROLES.SUPER_ADMIN) {
      planName = 'enterprise';
    } else if (user.role === USER_ROLES.MANAGER || user.role === USER_ROLES.TECHNICIAN) {
      const admin = await User.findById(user.admin_id);
      if (admin && admin.subscription_plan) {
        planName = admin.subscription_plan;
      }
    }
    
    const planInfo = getPlanFeatures(planName);
    const usageStats = await calculateUsageStats(user);
    
    let canPerform = false;
    let limitType = '';
    let currentCount = 0;
    let limit = 0;
    
    switch (action) {
      case 'create_user':
        if (resourceType === 'user') {
          limitType = 'users.total';
          currentCount = usageStats.users.total;
          limit = planInfo.limits.users.total;
          canPerform = isWithinLimits(planName, limitType, currentCount + 1);
        }
        break;
      case 'create_batch':
        if (resourceType === 'grain_batch') {
          limitType = 'grain_batches';
          currentCount = usageStats.grain_batches;
          limit = planInfo.limits.grain_batches;
          canPerform = isWithinLimits(planName, limitType, currentCount + 1);
        }
        break;
      case 'add_sensor':
        if (resourceType === 'sensor') {
          limitType = 'sensors';
          currentCount = usageStats.sensors;
          limit = planInfo.limits.sensors;
          canPerform = isWithinLimits(planName, limitType, currentCount + 1);
        }
        break;
      case 'create_report':
        if (resourceType === 'report') {
          limitType = 'reports_per_month';
          currentCount = usageStats.reports_this_month;
          limit = planInfo.limits.reports_per_month;
          canPerform = isWithinLimits(planName, limitType, currentCount + 1);
        }
        break;
    }
    
    res.json({
      canPerform,
      limitType,
      currentCount,
      limit: limit === -1 ? 'unlimited' : limit,
      usagePercentage: limit === -1 ? 0 : getUsagePercentage(planName, limitType, currentCount),
      planName,
      upgradeSuggestions: !canPerform ? getUpgradeSuggestions(planName, usageStats) : []
    });
  } catch (err) {
    console.error('Error checking limits:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Helper function to calculate usage stats for a user
async function calculateUsageStats(user) {
  try {
    let adminId = user._id;
    
    // If user is manager/technician, use their admin's ID
    if (user.role === USER_ROLES.MANAGER || user.role === USER_ROLES.TECHNICIAN) {
      adminId = user.admin_id;
    }
    
    // Count team members
    const teamMembers = await User.find({ admin_id: adminId });
    const managers = teamMembers.filter(u => u.role === USER_ROLES.MANAGER).length;
    const technicians = teamMembers.filter(u => u.role === USER_ROLES.TECHNICIAN).length;
    const total = managers + technicians;
    
    // Mock data for other resources (replace with actual queries when available)
    const usageStats = {
      users: {
        managers,
        technicians,
        total
      },
      grain_batches: 0, // TODO: Count from grain batches collection
      sensors: 0, // TODO: Count from sensors collection
      silos: 0, // TODO: Count from silos collection
      storage_gb: 0, // TODO: Calculate from file storage
      api_calls_this_month: 0, // TODO: Count from API logs
      reports_this_month: 0 // TODO: Count from reports collection
    };
    
    return usageStats;
  } catch (err) {
    console.error('Error calculating usage stats:', err);
    return {
      users: { managers: 0, technicians: 0, total: 0 },
      grain_batches: 0,
      sensors: 0,
      silos: 0,
      storage_gb: 0,
      api_calls_this_month: 0,
      reports_this_month: 0
    };
  }
}

module.exports = router;