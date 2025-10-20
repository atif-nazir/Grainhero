const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceClaim = require('../models/InsuranceClaim');
const GrainBatch = require('../models/GrainBatch');
const { body, validationResult, param, query } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Insurance
 *   description: Insurance policy and claims management
 */

/**
 * @swagger
 * /insurance/policies:
 *   get:
 *     summary: Get all insurance policies for tenant
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of policies
 */
router.get('/policies', [
  auth,
  requirePermission('insurance.view'),
  requireTenantAccess
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { tenant_id: req.user.tenant_id };
    
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider_name = { $regex: req.query.provider, $options: 'i' };

    const [policies, total] = await Promise.all([
      InsurancePolicy.find(filter)
        .populate('covered_batches.batch_id', 'batch_id grain_type quantity_kg')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InsurancePolicy.countDocuments(filter)
    ]);

    res.json({
      policies,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });

  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/policies:
 *   post:
 *     summary: Create new insurance policy
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.post('/policies', [
  auth,
  requirePermission('insurance.manage'),
  requireTenantAccess,
  [
    body('policy_number').notEmpty().withMessage('Policy number is required'),
    body('provider_name').notEmpty().withMessage('Provider name is required'),
    body('coverage_type').isIn(['Comprehensive', 'Fire & Theft', 'Spoilage Only', 'Weather Damage', 'Custom']).withMessage('Invalid coverage type'),
    body('coverage_amount').isFloat({ min: 0 }).withMessage('Coverage amount must be positive'),
    body('premium_amount').isFloat({ min: 0 }).withMessage('Premium amount must be positive'),
    body('start_date').isISO8601().withMessage('Valid start date is required'),
    body('end_date').isISO8601().withMessage('Valid end date is required')
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const policy = new InsurancePolicy({
      ...req.body,
      tenant_id: req.user.tenant_id,
      created_by: req.user._id
    });

    await policy.save();

    res.status(201).json({
      message: 'Policy created successfully',
      policy
    });

  } catch (error) {
    console.error('Create policy error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Policy number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/policies/{id}:
 *   get:
 *     summary: Get policy by ID
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get('/policies/:id', [
  auth,
  requirePermission('insurance.view'),
  requireTenantAccess,
  param('id').isMongoId().withMessage('Valid policy ID is required')
], async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      tenant_id: req.user.tenant_id
    })
    .populate('covered_batches.batch_id')
    .populate('created_by', 'name email');

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);

  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/policies/{id}:
 *   put:
 *     summary: Update policy
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.put('/policies/:id', [
  auth,
  requirePermission('insurance.manage'),
  requireTenantAccess,
  param('id').isMongoId().withMessage('Valid policy ID is required')
], async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      tenant_id: req.user.tenant_id
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'provider_name', 'provider_contact', 'coverage_type', 'coverage_amount',
      'premium_amount', 'deductible', 'start_date', 'end_date', 'renewal_date',
      'status', 'risk_factors', 'terms_conditions', 'premium_factors',
      'auto_renewal', 'notifications_enabled', 'notes', 'tags'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        policy[field] = req.body[field];
      }
    });

    policy.updated_by = req.user._id;
    await policy.save();

    res.json({
      message: 'Policy updated successfully',
      policy
    });

  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/policies/{id}/batches:
 *   post:
 *     summary: Add batch to policy coverage
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.post('/policies/:id/batches', [
  auth,
  requirePermission('insurance.manage'),
  requireTenantAccess,
  param('id').isMongoId().withMessage('Valid policy ID is required'),
  [
    body('batch_id').isMongoId().withMessage('Valid batch ID is required'),
    body('coverage_value').isFloat({ min: 0 }).withMessage('Coverage value must be positive')
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      tenant_id: req.user.tenant_id
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Verify batch exists and belongs to tenant
    const batch = await GrainBatch.findOne({
      _id: req.body.batch_id,
      tenant_id: req.user.tenant_id
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    await policy.addBatch(
      req.body.batch_id,
      batch.grain_type,
      batch.quantity_kg,
      req.body.coverage_value
    );

    res.json({
      message: 'Batch added to policy coverage successfully',
      policy
    });

  } catch (error) {
    console.error('Add batch to policy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/claims:
 *   get:
 *     summary: Get all claims for tenant
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get('/claims', [
  auth,
  requirePermission('insurance.view'),
  requireTenantAccess
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { tenant_id: req.user.tenant_id };
    
    if (req.query.status) filter.status = req.query.status;
    if (req.query.claim_type) filter.claim_type = req.query.claim_type;

    const [claims, total] = await Promise.all([
      InsuranceClaim.find(filter)
        .populate('policy_id', 'policy_number provider_name')
        .populate('batch_affected.batch_id', 'batch_id grain_type')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InsuranceClaim.countDocuments(filter)
    ]);

    res.json({
      claims,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });

  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/claims:
 *   post:
 *     summary: Create new insurance claim
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.post('/claims', [
  auth,
  requirePermission('insurance.manage'),
  requireTenantAccess,
  [
    body('policy_id').isMongoId().withMessage('Valid policy ID is required'),
    body('claim_type').isIn(['Fire', 'Theft', 'Spoilage', 'Weather Damage', 'Equipment Failure', 'Other']).withMessage('Invalid claim type'),
    body('description').notEmpty().withMessage('Description is required'),
    body('amount_claimed').isFloat({ min: 0 }).withMessage('Amount claimed must be positive'),
    body('incident_date').isISO8601().withMessage('Valid incident date is required'),
    body('batch_affected.batch_id').isMongoId().withMessage('Valid batch ID is required'),
    body('batch_affected.quantity_affected').isFloat({ min: 0 }).withMessage('Quantity affected must be positive')
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify policy exists and belongs to tenant
    const policy = await InsurancePolicy.findOne({
      _id: req.body.policy_id,
      tenant_id: req.user.tenant_id
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Generate claim number
    const claimCount = await InsuranceClaim.countDocuments({ tenant_id: req.user.tenant_id });
    const claimNumber = `CLM-${new Date().getFullYear()}-${String(claimCount + 1).padStart(3, '0')}`;

    const claim = new InsuranceClaim({
      ...req.body,
      claim_number: claimNumber,
      tenant_id: req.user.tenant_id,
      created_by: req.user._id
    });

    await claim.save();

    // Update policy claims count
    policy.claims_count += 1;
    await policy.save();

    res.status(201).json({
      message: 'Claim created successfully',
      claim
    });

  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/statistics:
 *   get:
 *     summary: Get insurance statistics for tenant
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', [
  auth,
  requirePermission('insurance.view'),
  requireTenantAccess
], async (req, res) => {
  try {
    const policies = await InsurancePolicy.find({ tenant_id: req.user.tenant_id });
    const claims = await InsuranceClaim.find({ tenant_id: req.user.tenant_id });

    const stats = {
      total_policies: policies.length,
      active_policies: policies.filter(p => p.status === 'active').length,
      total_coverage: policies.reduce((sum, p) => sum + p.coverage_amount, 0),
      total_premium: policies.reduce((sum, p) => sum + p.premium_amount, 0),
      total_claims: claims.length,
      approved_claims: claims.filter(c => c.status === 'approved').length,
      total_claims_amount: claims.reduce((sum, c) => sum + c.amount_approved, 0),
      average_risk_score: policies.length > 0 ? 
        Math.round(policies.reduce((sum, p) => sum + p.overall_risk_score, 0) / policies.length) : 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Get insurance statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
