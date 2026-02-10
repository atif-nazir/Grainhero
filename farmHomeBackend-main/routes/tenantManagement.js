const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const { auth } = require('../middleware/auth');
const { superAdminOnly } = require('../middleware/permission');

/**
 * @swagger
 * components:
 *   schemas:
 *     Tenant:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated tenant ID
 *         name:
 *           type: string
 *           description: Tenant organization name
 *         email:
 *           type: string
 *           description: Primary contact email
 *         phone:
 *           type: string
 *           description: Contact phone number
 *         business_type:
 *           type: string
 *           enum: [farm, warehouse, mill, distributor, cooperative]
 *         plan:
 *           type: string
 *           enum: [Basic, Pro, Enterprise]
 *         status:
 *           type: string
 *           enum: [active, trial, suspended, cancelled]
 *         location:
 *           type: object
 *           properties:
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/tenant-management/tenants:
 *   get:
 *     summary: Get all tenants (Super Admin only)
 *     tags: [Tenant Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of tenants per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, trial, suspended, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: plan
 *         schema:
 *           type: string
 *           enum: [Basic, Pro, Enterprise]
 *         description: Filter by plan
 *     responses:
 *       200:
 *         description: List of tenants retrieved successfully
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
 *                     tenants:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tenant'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalTenants:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       500:
 *         description: Server error
 */
router.get('/tenants', auth, superAdminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const plan = req.query.plan || '';

    // Build filter object
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.is_active = status === 'active';
      if (status === 'trial') {
        filter.is_active = true;
        // Add trial logic based on subscription
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalTenants = await Tenant.countDocuments(filter);
    const totalPages = Math.ceil(totalTenants / limit);

    // Get tenants with pagination
    const tenants = await Tenant.find(filter)
      .populate('subscription_id', 'plan_name price_per_month status end_date')
      .populate('created_by', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enhance tenant data with subscription info
    const enhancedTenants = await Promise.all(tenants.map(async (tenant) => {
      const subscription = await Subscription.findOne({ tenant_id: tenant._id });
      const userCount = await User.countDocuments({
        $or: [
          { tenant_id: tenant._id },
          { owned_tenant_id: tenant._id }
        ]
      });

      return {
        ...tenant,
        plan: subscription?.plan_name || 'Basic',
        subscription_status: subscription?.status || 'inactive',
        user_count: userCount,
        revenue: subscription?.price_per_month || 0,
        subscription_end: subscription?.end_date,
        is_trial: subscription?.is_trial || false
      };
    }));

    res.json({
      success: true,
      data: {
        tenants: enhancedTenants,
        pagination: {
          currentPage: page,
          totalPages,
          totalTenants,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenants',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tenant-management/tenants/{id}:
 *   get:
 *     summary: Get tenant by ID (Super Admin only)
 *     tags: [Tenant Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Tenant details retrieved successfully
 *       404:
 *         description: Tenant not found
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.get('/tenants/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('subscription_id')
      .populate('created_by', 'name email');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Get additional tenant statistics
    const userCount = await User.countDocuments({
      $or: [
        { tenant_id: tenant._id },
        { owned_tenant_id: tenant._id }
      ]
    });

    const subscription = await Subscription.findOne({ tenant_id: tenant._id });
    const recentActivity = await User.find({
      $or: [
        { tenant_id: tenant._id },
        { owned_tenant_id: tenant._id }
      ]
    })
      .sort({ lastLogin: -1 })
      .limit(5)
      .select('name email lastLogin role');

    res.json({
      success: true,
      data: {
        tenant,
        statistics: {
          user_count: userCount,
          subscription: subscription,
          recent_activity: recentActivity
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenant',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tenant-management/tenants:
 *   post:
 *     summary: Create new tenant (Super Admin only)
 *     tags: [Tenant Management]
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
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               business_type:
 *                 type: string
 *                 enum: [farm, warehouse, mill, distributor, cooperative]
 *               plan_name:
 *                 type: string
 *                 enum: [Basic, Pro, Enterprise]
 *               address:
 *                 type: object
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.post('/tenants', auth, superAdminOnly, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password, // Password is now required to create the admin user
      business_type,
      plan_name,
      address,
      notes
    } = req.body;

    // Check if user with email already exists (User determines tenant uniqueness mostly)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if tenant with email already exists (though above check covers commonly)
    const existingTenant = await Tenant.findOne({ email });
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant with this email already exists'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to create the tenant admin account'
      });
    }

    // 1. Create the Admin User first (so we have ID for created_by)
    // Actually, auth.js creates user then tenant. But to link `created_by` and `owned_tenant_id` properly we need somewhat circular or update.
    // Auth.js logic:
    // 1. Create Tenant (without created_by)
    // 2. Create User (with owned_tenant_id)
    // 3. Update Tenant (set created_by)

    // Create Tenant
    const tenant = new Tenant({
      email,
      phone,
      business_type: business_type || 'warehouse',
      address,
      notes,
      created_by: null, // Will set below
      is_active: true,
      is_verified: true // Super admin created, so verified
    });

    await tenant.save();

    // Create User (Admin)
    const user = new User({
      name,
      email,
      phone,
      password,
      role: 'admin',
      owned_tenant_id: tenant._id,
      // hasAccess is for subscription permissions, usually mapped from plan
      hasAccess: plan_name ? (plan_name === 'Basic' ? 'basic' : plan_name === 'Pro' ? 'pro' : 'enterprise') : 'basic',
      emailVerified: true
    });

    await user.save();

    // Update Tenant with created_by
    tenant.created_by = user._id;
    await tenant.save();


    // Create subscription if plan is provided
    if (plan_name) {
      const planPricing = {
        'Basic': { price: 99, users: 5, devices: 10, storage: 1 },
        'Pro': { price: 299, users: 25, devices: 50, storage: 10 },
        'Enterprise': { price: 999, users: 100, devices: 200, storage: 100 }
      };

      const plan = planPricing[plan_name];
      if (plan) {
        // Manual creation by Super Admin defaults to "Comp" or "Manual" payment with 0 amount charged
        // But we want to reflect valid plan features
        const subscription = new Subscription({
          tenant_id: tenant._id,
          plan_name,
          price_per_month: 0, // Recorded as 0 for manual creation as per user request
          price_per_year: 0,
          billing_cycle: 'monthly',
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'active',
          payment_status: 'paid', // Mark as paid since admin created it
          features: {
            max_users: plan.users,
            max_devices: plan.devices,
            max_storage_gb: plan.storage,
            max_batches: -1, // unlimited
            ai_features: plan_name !== 'Basic',
            priority_support: plan_name === 'Enterprise',
            custom_integrations: plan_name === 'Enterprise',
            advanced_analytics: plan_name !== 'Basic'
          },
          created_by: user._id
        });

        await subscription.save();
        tenant.subscription_id = subscription._id;
        await tenant.save();

        // Update user subscription plan key
        user.subscription_plan = plan_name.toLowerCase();
        await user.save();

        // Create a 0-amount Invoice to record this "transaction"
        const invoice = new Invoice({
          tenant_id: tenant._id,
          subscription_id: subscription._id,
          amount: 0,
          currency: 'USD', // Or default
          status: 'paid', // Immediately paid
          billing_date: new Date(),
          due_date: new Date(),
          paid_at: new Date(),
          invoice_number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });
        await invoice.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Tenant and Admin User created successfully',
      data: { tenant, user } // Return both
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    // Log stack trace for deeper debugging
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Error creating tenant',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tenant-management/tenants/{id}:
 *   put:
 *     summary: Update tenant (Super Admin only)
 *     tags: [Tenant Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               business_type:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *       404:
 *         description: Tenant not found
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.put('/tenants/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Update tenant fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        tenant[key] = req.body[key];
      }
    });

    await tenant.save();

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: { tenant }
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating tenant',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tenant-management/tenants/{id}:
 *   delete:
 *     summary: Delete tenant (Super Admin only)
 *     tags: [Tenant Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Tenant deleted successfully
 *       404:
 *         description: Tenant not found
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.delete('/tenants/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Soft delete tenant
    await tenant.softDelete();

    // Cancel associated subscription
    const subscription = await Subscription.findOne({ tenant_id: tenant._id });
    if (subscription) {
      await subscription.cancel('Tenant deleted by Super Admin');
    }

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting tenant',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/tenant-management/statistics:
 *   get:
 *     summary: Get tenant management statistics (Super Admin only)
 *     tags: [Tenant Management]
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
 *                   total_tenants:
 *                     type: integer
 *                   active_tenants:
 *                     type: integer
 *                   trial_tenants:
 *                     type: integer
 *                   total_revenue:
 *                     type: number
 *                   average_revenue:
 *                     type: number
 *                   growth_rate:
 *                     type: number
 */
router.get('/statistics', auth, superAdminOnly, async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ is_active: true });

    // Get trial tenants (active subscriptions with trial end date in future)
    const trialSubscriptions = await Subscription.find({
      status: 'active',
      trial_end_date: { $gt: new Date() }
    });
    const trialTenants = trialSubscriptions.length;

    // Calculate revenue
    const activeSubscriptions = await Subscription.find({ status: 'active' });
    const totalRevenue = activeSubscriptions.reduce((sum, sub) => {
      return sum + (sub.price_per_month || 0);
    }, 0);
    const averageRevenue = activeTenants > 0 ? totalRevenue / activeTenants : 0;

    // Calculate growth rate (tenants created in last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const recentTenants = await Tenant.countDocuments({
      created_at: { $gte: thirtyDaysAgo }
    });
    const previousTenants = await Tenant.countDocuments({
      created_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
    });

    const growthRate = previousTenants > 0 ?
      ((recentTenants - previousTenants) / previousTenants) * 100 : 0;

    res.json({
      success: true,
      data: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        trial_tenants: trialTenants,
        total_revenue: totalRevenue,
        average_revenue: averageRevenue,
        growth_rate: growthRate
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

module.exports = router;
