const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permission");
const Subscription = require("../models/Subscription");
const { USER_ROLES } = require("../configs/enum");

// Helper to resolve tenant scope
function resolveTenantScope(user, queryTenantId) {
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    // Super admin can view all; optionally scoped by tenant_id query
    return queryTenantId ? { tenant_id: queryTenantId } : {};
  }
  // Admin (and others) must be scoped to their tenant
  return { tenant_id: user.tenant_id || user.owned_tenant_id };
}

/**
 * GET /api/payments
 * List subscriptions/payments scoped to tenant (admin) or globally (super admin)
 */
router.get(
  "/",
  auth,
  requirePermission("payment.view"),
  async (req, res) => {
    try {
      const { tenant_id, status, page = 1, limit = 20 } = req.query;

      let filter = {};

      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        // Super admin can view all; optionally scoped by tenant_id query
        if (tenant_id) filter.tenant_id = tenant_id;
      } else {
        // Admin (and others) - try to find their subscription
        const tenantId = req.user.tenant_id || req.user.owned_tenant_id;
        if (tenantId) {
          filter.tenant_id = tenantId;
        } else if (req.user.customerId) {
          // Fallback: find by Stripe customer ID when tenant_id is missing
          filter.stripe_customer_id = req.user.customerId;
        } else {
          // Last resort: find by created_by (user ID)
          filter.$or = [
            { created_by: req.user._id },
            { tenant_id: req.user._id }
          ];
        }
      }

      if (status) filter.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [items, total] = await Promise.all([
        Subscription.find(filter)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Subscription.countDocuments(filter),
      ]);

      res.json({
        payments: items,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("Payments list error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /api/payments/summary
 * Summary metrics for payments/subscriptions
 */
router.get(
  "/summary",
  auth,
  requirePermission("payment.view"),
  async (req, res) => {
    try {
      const { tenant_id } = req.query;

      let filter = {};
      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        if (tenant_id) filter.tenant_id = tenant_id;
      } else {
        const tenantId = req.user.tenant_id || req.user.owned_tenant_id;
        if (tenantId) {
          filter.tenant_id = tenantId;
        } else if (req.user.customerId) {
          filter.stripe_customer_id = req.user.customerId;
        } else {
          filter.$or = [
            { created_by: req.user._id },
            { tenant_id: req.user._id }
          ];
        }
      }

      const subs = await Subscription.find(filter);

      const summary = subs.reduce(
        (acc, sub) => {
          acc.total_subscriptions += 1;
          acc.total_revenue += sub.price_per_month || 0;
          acc.active += sub.status === "active" ? 1 : 0;
          acc.cancelled += sub.status === "cancelled" ? 1 : 0;
          acc.past_due += sub.payment_status === "failed" ? 1 : 0;
          return acc;
        },
        {
          total_subscriptions: 0,
          total_revenue: 0,
          active: 0,
          cancelled: 0,
          past_due: 0,
        }
      );

      res.json(summary);
    } catch (err) {
      console.error("Payments summary error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;


