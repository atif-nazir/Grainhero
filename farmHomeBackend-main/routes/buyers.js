const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const Buyer = require("../models/Buyer");
const GrainBatch = require("../models/GrainBatch");
const { BUYER_STATUSES } = require("../configs/enum");
const { body, validationResult } = require("express-validator");

const resolveTenantId = (user) =>
  user?.tenant_id || user?.owned_tenant_id || user?._id;

const buildSearchFilters = (tenantId, query) => {
  const filters = { tenant_id: tenantId };
  if (!query) return filters;

  const { q, status, city } = query;
  if (q) {
    const regex = new RegExp(q.trim(), "i");
    filters.$or = [
      { name: regex },
      { company_name: regex },
      { "contact_person.name": regex },
      { "contact_person.email": regex },
      { "contact_person.phone": regex },
    ];
  }
  if (status && status !== "all") {
    filters.status = status;
  }
  if (city && city !== "all") {
    filters["location.city"] = new RegExp(`^${city}$`, "i");
  }
  return filters;
};

const mapBuyerStats = (buyers, stats) => {
  const statsMap = new Map();
  stats.forEach((entry) => {
    statsMap.set(entry._id.toString(), entry);
  });

  return buyers.map((buyer) => {
    const extra = statsMap.get(buyer._id.toString());
    return {
      ...buyer,
      totalOrders: extra?.totalOrders || 0,
      lastOrderDate: extra?.lastOrderDate || null,
    };
  });
};

router.get("/dashboard", auth, async (req, res) => {
  try {
    const tenantId = resolveTenantId(req.user);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context missing" });
    }

    const filters = buildSearchFilters(tenantId, req.query);
    const buyers = await Buyer.find(filters).sort({ created_at: -1 }).lean();
    const buyerIds = buyers.map((b) => b._id);

    let batchStats = [];
    if (buyerIds.length > 0) {
      batchStats = await GrainBatch.aggregate([
        {
          $match: {
            buyer_id: { $in: buyerIds },
            admin_id: req.user._id,
          },
        },
        {
          $group: {
            _id: "$buyer_id",
            totalOrders: { $sum: 1 },
            lastOrderDate: { $max: "$actual_dispatch_date" },
          },
        },
      ]);
    }

    const buyersWithStats = mapBuyerStats(buyers, batchStats);

    const summaryPromise = Promise.all([
      Buyer.countDocuments({ tenant_id: tenantId }),
      GrainBatch.countDocuments({
        admin_id: req.user._id,
        buyer_id: { $ne: null },
        status: { $in: ["processing", "on_hold", "stored"] },
      }),
      GrainBatch.countDocuments({
        admin_id: req.user._id,
        buyer_id: { $ne: null },
        expected_dispatch_date: { $gte: new Date() },
      }),
      Buyer.findOne({ tenant_id: tenantId }).sort({ rating: -1 }).lean(),
    ]);

    const [totalBuyers, activeContracts, scheduledDispatches, topBuyer] =
      await summaryPromise;

    const buyerNameMap = buyers.reduce((acc, buyer) => {
      acc[buyer._id.toString()] = buyer.name;
      return acc;
    }, {});

    const recentContractsRaw = await GrainBatch.find({
      admin_id: req.user._id,
      buyer_id: { $ne: null },
    })
      .sort({ updated_at: -1 })
      .limit(5)
      .lean();

    const recentContracts = recentContractsRaw.map((item) => ({
      id: item.batch_id,
      buyer: buyerNameMap[item.buyer_id?.toString()] || "Unknown",
      grain: item.grain_type,
      quantity_kg: item.quantity_kg,
      price_per_kg: item.purchase_price_per_kg,
      status: item.status,
    }));

    const upcomingDispatchesRaw = await GrainBatch.find({
      admin_id: req.user._id,
      buyer_id: { $ne: null },
      expected_dispatch_date: { $ne: null },
    })
      .sort({ expected_dispatch_date: 1 })
      .limit(5)
      .lean();

    const upcomingDispatches = upcomingDispatchesRaw.map((item) => ({
      id: item.batch_id,
      buyer: buyerNameMap[item.buyer_id?.toString()] || "Unknown",
      batch: item.batch_id,
      quantity_kg: item.quantity_kg,
      eta: item.expected_dispatch_date,
      status: item.status === "dispatched" ? "confirmed" : "scheduled",
    }));

    res.json({
      buyers: buyersWithStats,
      summary: {
        totalBuyers,
        activeContracts,
        scheduledDispatches,
        topRating: topBuyer?.rating || null,
      },
      recentContracts,
      upcomingDispatches,
    });
  } catch (error) {
    console.error("Error fetching buyers dashboard:", error);
    res.status(500).json({ message: "Failed to fetch buyers data" });
  }
});

router.post(
  "/",
  auth,
  [
    body("name").trim().notEmpty().withMessage("Buyer name is required"),
    body("contactPerson.name")
      .trim()
      .notEmpty()
      .withMessage("Contact name is required"),
    body("contactPerson.email")
      .optional()
      .isEmail()
      .withMessage("Invalid contact email"),
    body("status")
      .optional()
      .isIn(Object.values(BUYER_STATUSES))
      .withMessage("Invalid status"),
    body("rating")
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage("Rating must be between 0 and 5"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const tenantId = resolveTenantId(req.user);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context missing" });
      }

      const payload = req.body;
      const buyer = await Buyer.create({
        tenant_id: tenantId,
        admin_id: req.user._id,
        name: payload.name,
        company_name: payload.companyName || payload.name,
        buyer_type: payload.buyerType,
        contact_person: {
          name: payload.contactPerson.name,
          email: payload.contactPerson.email,
          phone: payload.contactPerson.phone,
          designation: payload.contactPerson.designation,
        },
        location: {
          address: payload.location?.address,
          city: payload.location?.city,
          state: payload.location?.state,
          country: payload.location?.country,
        },
        status: payload.status || BUYER_STATUSES.ACTIVE,
        rating: payload.rating ?? 4,
        notes: payload.notes,
        tags: payload.tags,
        preferred_grain_types: payload.preferredGrainTypes,
        preferred_payment_terms: payload.preferredPaymentTerms,
      });

      res.status(201).json(buyer);
    } catch (error) {
      console.error("Error creating buyer:", error);
      res.status(500).json({ message: "Failed to create buyer" });
    }
  }
);

module.exports = router;
