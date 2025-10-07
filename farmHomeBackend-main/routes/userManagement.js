const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/permission');
const User = require('../models/User');
const { body, validationResult, param, query } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: User Management
 *   description: User management operations for tenant administrators
 */

/**
 * @swagger
 * /user-management/users:
 *   get:
 *     summary: Get all users for tenant
 *     tags: [User Management]
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
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', [
  auth,
  requirePermission('users.manage'),
  requireTenantAccess
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { 
      $or: [
        { tenant_id: req.user.tenant_id },
        { owned_tenant_id: req.user.tenant_id }
      ]
    };
    
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.blocked = req.query.status === 'blocked';

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      users,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /user-management/users:
 *   post:
 *     summary: Create new user
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/users', [
  auth,
  requirePermission('users.manage'),
  requireTenantAccess,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['manager', 'technician']).withMessage('Role must be manager or technician')
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, role, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or phone already exists' });
    }

    const user = new User({
      name,
      email,
      phone,
      password,
      role,
      location,
      tenant_id: req.user.tenant_id,
      created_by: req.user._id
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /user-management/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users/:id', [
  auth,
  requirePermission('users.manage'),
  requireTenantAccess,
  param('id').isMongoId().withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      $or: [
        { tenant_id: req.user.tenant_id },
        { owned_tenant_id: req.user.tenant_id }
      ]
    }).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /user-management/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.put('/users/:id', [
  auth,
  requirePermission('users.manage'),
  requireTenantAccess,
  param('id').isMongoId().withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      $or: [
        { tenant_id: req.user.tenant_id },
        { owned_tenant_id: req.user.tenant_id }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'phone', 'role', 'location', 'blocked'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    user.updated_by = req.user._id;
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'User updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /user-management/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/users/:id', [
  auth,
  requirePermission('users.manage'),
  requireTenantAccess,
  param('id').isMongoId().withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      $or: [
        { tenant_id: req.user.tenant_id },
        { owned_tenant_id: req.user.tenant_id }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting admin users
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /user-management/statistics:
 *   get:
 *     summary: Get user statistics for tenant
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', [
  auth,
  requirePermission('users.manage'),
  requireTenantAccess
], async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { tenant_id: req.user.tenant_id },
        { owned_tenant_id: req.user.tenant_id }
      ]
    });

    const stats = {
      total_users: users.length,
      active_users: users.filter(u => !u.blocked).length,
      blocked_users: users.filter(u => u.blocked).length,
      role_distribution: {
        admin: users.filter(u => u.role === 'admin').length,
        manager: users.filter(u => u.role === 'manager').length,
        technician: users.filter(u => u.role === 'technician').length
      },
      recent_users: users
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map(u => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          created_at: u.created_at
        }))
    };

    res.json(stats);

  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
