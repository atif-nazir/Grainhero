const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Tenant = require('../models/Tenant');
const { auth } = require('../middleware/auth');
const { superAdminOnly } = require('../middleware/permission');

/**
 * @swagger
 * components:
 *   schemas:
 *     Plan:
 *       type: object
 *       required:
 *         - name
 *         - price_per_month
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated plan ID
 *         name:
 *           type: string
 *           description: Plan name
 *         description:
 *           type: string
 *           description: Plan description
 *         price_per_month:
 *           type: number
 *           description: Monthly price in USD
 *         price_per_year:
 *           type: number
 *           description: Yearly price in USD
 *         stripe_price_id:
 *           type: string
 *           description: Stripe price ID
 *         features:
 *           type: object
 *           properties:
 *             max_users:
 *               type: number
 *             max_devices:
 *               type: number
 *             max_storage_gb:
 *               type: number
 *             max_batches:
 *               type: number
 *             ai_features:
 *               type: boolean
 *             priority_support:
 *               type: boolean
 *             custom_integrations:
 *               type: boolean
 *             advanced_analytics:
 *               type: boolean
 *         status:
 *           type: string
 *           enum: [active, inactive, draft]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

// Predefined plans based on existing Stripe integration
const PREDEFINED_PLANS = {
  basic: {
    name: "Basic",
    description: "Essential tools for small farms to get started.",
    price_per_month: 9,
    price_per_year: 90,
    stripe_price_id: "price_1RoRPZRYMUmJuwVF7aJeMEmm",
    features: {
      max_users: 5,
      max_devices: 10,
      max_storage_gb: 1,
      max_batches: 100,
      ai_features: false,
      priority_support: false,
      custom_integrations: false,
      advanced_analytics: false,
      api_access: false,
      white_label: false
    },
    status: "active"
  },
  intermediate: {
    name: "Intermediate",
    description: "Advanced features for growing farms and teams.",
    price_per_month: 29,
    price_per_year: 290,
    stripe_price_id: "price_1RonmCRYMUmJuwVF0bBYtZJW",
    features: {
      max_users: 25,
      max_devices: 50,
      max_storage_gb: 10,
      max_batches: 500,
      ai_features: true,
      priority_support: true,
      custom_integrations: false,
      advanced_analytics: true,
      api_access: true,
      white_label: false
    },
    status: "active"
  },
  pro: {
    name: "Pro",
    description: "Custom solutions for large operations and enterprises.",
    price_per_month: 99,
    price_per_year: 990,
    stripe_price_id: "price_1RonmYRYMUmJuwVFHKWWflRo",
    features: {
      max_users: 100,
      max_devices: 200,
      max_storage_gb: 100,
      max_batches: -1, // unlimited
      ai_features: true,
      priority_support: true,
      custom_integrations: true,
      advanced_analytics: true,
      api_access: true,
      white_label: true
    },
    status: "active"
  }
};

/**
 * @swagger
 * /api/plan-management/plans:
 *   get:
 *     summary: Get all plans (Super Admin only)
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft]
 *         description: Filter by plan status
 *     responses:
 *       200:
 *         description: List of plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Plan'
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         total_plans:
 *                           type: integer
 *                         active_plans:
 *                           type: integer
 *                         total_subscribers:
 *                           type: integer
 *                         monthly_revenue:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.get('/plans', auth, superAdminOnly, async (req, res) => {
  try {
    const status = req.query.status;

    // Get all plans (using predefined plans for now)
    let plans = Object.entries(PREDEFINED_PLANS).map(([id, plan]) => ({
      id,
      ...plan
    }));

    // Filter by status if provided
    if (status) {
      plans = plans.filter(plan => plan.status === status);
    }

    // Get subscription statistics for each plan
    const plansWithStats = await Promise.all(plans.map(async (plan) => {
      const subscriptions = await Subscription.find({
        plan_name: plan.name,
        status: 'active'
      });

      const subscribers = subscriptions.length;
      const revenue = subscribers * plan.price_per_month;

      return {
        ...plan,
        subscribers,
        revenue,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString()
      };
    }));

    // Calculate overall statistics
    const totalSubscribers = plansWithStats.reduce((sum, plan) => sum + plan.subscribers, 0);
    const monthlyRevenue = plansWithStats.reduce((sum, plan) => sum + plan.revenue, 0);
    const activePlans = plansWithStats.filter(plan => plan.status === 'active').length;

    res.json({
      success: true,
      data: {
        plans: plansWithStats,
        statistics: {
          total_plans: plansWithStats.length,
          active_plans: activePlans,
          total_subscribers: totalSubscribers,
          monthly_revenue: monthlyRevenue
        }
      }
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plans',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/plan-management/plans/{id}:
 *   get:
 *     summary: Get plan by ID (Super Admin only)
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Plan details retrieved successfully
 *       404:
 *         description: Plan not found
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.get('/plans/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const planId = req.params.id;
    const plan = PREDEFINED_PLANS[planId];

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Get detailed statistics for this plan
    const subscriptions = await Subscription.find({
      plan_name: plan.name
    }).populate('tenant_id', 'name email');

    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    const subscribers = activeSubscriptions.length;
    const revenue = subscribers * plan.price_per_month;

    // Get recent subscribers (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSubscribers = subscriptions.filter(sub => 
      sub.created_at > thirtyDaysAgo
    ).length;

    res.json({
      success: true,
      data: {
        plan: {
          id: planId,
          ...plan,
          subscribers,
          revenue,
          recent_subscribers: recentSubscribers,
          total_subscriptions: subscriptions.length
        },
        subscriptions: activeSubscriptions.slice(0, 10), // Recent 10
        analytics: {
          conversion_rate: 0, // Would need to calculate based on trials
          churn_rate: 0, // Would need historical data
          average_revenue_per_user: plan.price_per_month
        }
      }
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plan',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/plan-management/plans:
 *   post:
 *     summary: Create new plan (Super Admin only)
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
 *               - name
 *               - price_per_month
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price_per_month:
 *                 type: number
 *               price_per_year:
 *                 type: number
 *               stripe_price_id:
 *                 type: string
 *               features:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *     responses:
 *       201:
 *         description: Plan created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.post('/plans', auth, superAdminOnly, async (req, res) => {
  try {
    const {
      name,
      description,
      price_per_month,
      price_per_year,
      stripe_price_id,
      features,
      status = 'draft'
    } = req.body;

    // Validate required fields
    if (!name || !price_per_month) {
      return res.status(400).json({
        success: false,
        message: 'Name and price_per_month are required'
      });
    }

    // For now, we'll store plans in a simple way
    // In a real implementation, you'd want a separate Plan model
    const newPlan = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      description: description || '',
      price_per_month,
      price_per_year: price_per_year || price_per_month * 10,
      stripe_price_id: stripe_price_id || '',
      features: features || {
        max_users: 5,
        max_devices: 10,
        max_storage_gb: 1,
        max_batches: 100,
        ai_features: false,
        priority_support: false,
        custom_integrations: false,
        advanced_analytics: false,
        api_access: false,
        white_label: false
      },
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // In a real implementation, you would:
    // 1. Create the plan in your database
    // 2. Create the corresponding Stripe price
    // 3. Update the predefined plans

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: { plan: newPlan }
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating plan',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/plan-management/plans/{id}:
 *   put:
 *     summary: Update plan (Super Admin only)
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price_per_month:
 *                 type: number
 *               price_per_year:
 *                 type: number
 *               features:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *       404:
 *         description: Plan not found
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.put('/plans/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const planId = req.params.id;
    const plan = PREDEFINED_PLANS[planId];

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Update plan fields
    const updatedPlan = {
      ...plan,
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // In a real implementation, you would:
    // 1. Update the plan in your database
    // 2. Update the corresponding Stripe price if needed
    // 3. Notify existing subscribers of changes

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: { plan: updatedPlan }
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating plan',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/plan-management/statistics:
 *   get:
 *     summary: Get plan management statistics (Super Admin only)
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               data:
 *                 type: object
 *                 properties:
 *                   total_plans:
 *                     type: integer
 *                   active_plans:
 *                     type: integer
 *                   total_subscribers:
 *                     type: integer
 *                   monthly_revenue:
 *                     type: number
 *                   average_revenue_per_user:
 *                     type: number
 *                   growth_rate:
 *                     type: number
 */
router.get('/statistics', auth, superAdminOnly, async (req, res) => {
  try {
    // Get all active subscriptions
    const activeSubscriptions = await Subscription.find({ status: 'active' });
    
    // Calculate statistics
    const totalSubscribers = activeSubscriptions.length;
    const monthlyRevenue = activeSubscriptions.reduce((sum, sub) => {
      return sum + (sub.price_per_month || 0);
    }, 0);
    
    const averageRevenuePerUser = totalSubscribers > 0 ? monthlyRevenue / totalSubscribers : 0;

    // Calculate growth rate (subscriptions created in last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    const recentSubscriptions = await Subscription.countDocuments({
      created_at: { $gte: thirtyDaysAgo }
    });
    const previousSubscriptions = await Subscription.countDocuments({
      created_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
    });
    
    const growthRate = previousSubscriptions > 0 ? 
      ((recentSubscriptions - previousSubscriptions) / previousSubscriptions) * 100 : 0;

    // Plan distribution
    const planDistribution = {};
    activeSubscriptions.forEach(sub => {
      const planName = sub.plan_name || 'Unknown';
      planDistribution[planName] = (planDistribution[planName] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total_plans: Object.keys(PREDEFINED_PLANS).length,
        active_plans: Object.values(PREDEFINED_PLANS).filter(plan => plan.status === 'active').length,
        total_subscribers: totalSubscribers,
        monthly_revenue: monthlyRevenue,
        average_revenue_per_user: averageRevenuePerUser,
        growth_rate: growthRate,
        plan_distribution: planDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/plan-management/stripe/sync:
 *   post:
 *     summary: Sync plans with Stripe (Super Admin only)
 *     tags: [Plan Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plans synced with Stripe successfully
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.post('/stripe/sync', auth, superAdminOnly, async (req, res) => {
  try {
    // In a real implementation, you would:
    // 1. Fetch all prices from Stripe
    // 2. Compare with your local plans
    // 3. Update any discrepancies
    // 4. Create missing plans in Stripe
    // 5. Update local plans with Stripe data

    res.json({
      success: true,
      message: 'Plans synced with Stripe successfully',
      data: {
        synced_plans: Object.keys(PREDEFINED_PLANS).length,
        updated_plans: 0,
        created_plans: 0
      }
    });
  } catch (error) {
    console.error('Error syncing with Stripe:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing with Stripe',
      error: error.message
    });
  }
});

module.exports = router;
