const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { auth } = require("../middleware/auth");
const {
  requirePermission,
  requireTenantAccess,
} = require("../middleware/permission");
const Silo = require("../models/Silo");

/**
 * @swagger
 * tags:
 *   name: Silos
 *   description: Grain storage silo management
 */

/**
 * @swagger
 * /silos/test:
 *   get:
 *     summary: Test endpoint to verify silos API is working
 *     tags: [Silos]
 *     responses:
 *       200:
 *         description: API is working
 */
router.get("/test", (req, res) => {
  res.json({
    message: "Silos API is working!",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /silos:
 *   get:
 *     summary: Get all silos for tenant
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of silos
 */
router.get(
  "/",
  [
  auth,
    requirePermission("batch.view"), // reuse view permission for storage
    requireTenantAccess,
  ],
  async (req, res) => {
    try {
      console.log("Silos GET request - User:", req.user);
      console.log("Silos GET request - Tenant ID:", req.user?.tenant_id);

      const filter = { admin_id: req.user.admin_id };
      if (req.query.status) filter.status = req.query.status;

      console.log("Using filter (temporarily showing all silos):", filter);

      console.log("Silos filter:", filter);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

    const [silos, total] = await Promise.all([
      Silo.find(filter)
          .populate({ path: "current_batch_id", select: "batch_id grain_type" })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
        Silo.countDocuments(filter),
    ]);

      console.log("Found silos:", silos.length);
      console.log("Total silos in DB:", total);

    // Map to frontend-friendly shape for current_batch_id
      const mapped = silos.map((s) => ({
      ...s,
        current_batch_id: s.current_batch_id
          ? {
        batch_id: s.current_batch_id.batch_id,
              grain_type: s.current_batch_id.grain_type,
            }
          : undefined,
    }));

    res.json({
      silos: mapped,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
          items_per_page: limit,
        },
    });
  } catch (error) {
      console.error("Get silos error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /silos/stats:
 *   get:
 *     summary: Get silo statistics for tenant
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Silo statistics
 */
router.get(
  "/stats",
  [auth, requirePermission("batch.view"), requireTenantAccess],
  async (req, res) => {
    try {
      const silos = await Silo.find({ admin_id: req.user.admin_id }).lean();
      const total = silos.length;
      const totalCapacity = silos.reduce(
        (sum, s) => sum + (s.capacity_kg || 0),
        0
      );
      const totalCurrent = silos.reduce(
        (sum, s) => sum + (s.current_occupancy_kg || 0),
        0
      );
      const utilization =
        totalCapacity > 0
          ? Math.round((totalCurrent / totalCapacity) * 100)
          : 0;
      const byStatus = silos.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});
    res.json({ total, totalCapacity, totalCurrent, utilization, byStatus });
  } catch (error) {
      console.error("Get silo stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /silos:
 *   post:
 *     summary: Create a new silo
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - silo_id
 *               - name
 *               - capacity_kg
 *             properties:
 *               silo_id:
 *                 type: string
 *               name:
 *                 type: string
 *               capacity_kg:
 *                 type: number
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, offline, maintenance]
 *     responses:
 *       201:
 *         description: Silo created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  [
    auth,
    requirePermission("batch.create"), // reuse batch permission for silo management
    requireTenantAccess,
    [
      body("silo_id").notEmpty().withMessage("Silo ID is required"),
      body("name").notEmpty().withMessage("Silo name is required"),
      body("capacity_kg")
        .isFloat({ min: 1 })
        .withMessage("Capacity must be a positive number"),
      body("location").optional(),
      body("status").optional().isIn(["active", "offline", "maintenance"]),
    ],
  ],
  async (req, res) => {
    try {
      console.log("=== SILO CREATION REQUEST ===");
      console.log("Request body:", req.body);
      console.log("User admin_id:", req.user.admin_id);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        silo_id,
        name,
        capacity_kg,
        location,
        status = "active",
      } = req.body;

      // Check if silo_id already exists for this tenant
      console.log("Checking for existing silo with silo_id:", silo_id, "admin_id:", req.user.admin_id);
      const existingSilo = await Silo.findOne({
        silo_id,
        admin_id: req.user.admin_id,
      });

      if (existingSilo) {
        console.log("Silo ID already exists:", existingSilo);
        return res.status(400).json({
          error: "Silo ID already exists for this tenant",
        });
      }

      const silo = new Silo({
        silo_id,
        name,
        capacity_kg,
        location,
        status,
        admin_id: req.user.admin_id,
        created_by: req.user._id,
        current_occupancy_kg: 0,
        current_conditions: {
          temperature: { value: 20, timestamp: new Date() },
          humidity: { value: 50, timestamp: new Date() },
          co2: { value: 400, timestamp: new Date() },
        },
      });

      await silo.save();
      res.status(201).json({
        message: "Silo created successfully",
        silo,
      });
    } catch (error) {
      console.error("Create silo error:", error);
      res.status(500).json({ error: "Failed to create silo" });
    }
  }
);

/**
 * @swagger
 * /silos/{id}:
 *   get:
 *     summary: Get a single silo by ID
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silo details
 *       404:
 *         description: Silo not found
 */
router.get(
  "/:id",
  [auth, requirePermission("batch.view"), requireTenantAccess],
  async (req, res) => {
    try {
      const silo = await Silo.findOne({
        _id: req.params.id,
        admin_id: req.user.admin_id,
      }).populate("current_batch_id", "batch_id grain_type");

      if (!silo) {
        return res.status(404).json({ error: "Silo not found" });
      }

      res.json({ silo });
    } catch (error) {
      console.error("Get silo error:", error);
      res.status(500).json({ error: "Failed to get silo" });
    }
  }
);

/**
 * @swagger
 * /silos/{id}:
 *   put:
 *     summary: Update a silo
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               capacity_kg:
 *                 type: number
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, offline, maintenance]
 *     responses:
 *       200:
 *         description: Silo updated successfully
 *       404:
 *         description: Silo not found
 */
router.put(
  "/:id",
  [
    auth,
    requirePermission("batch.update"),
    requireTenantAccess,
    [
      body("name").optional().notEmpty().withMessage("Name cannot be empty"),
      body("capacity_kg")
        .optional()
        .isFloat({ min: 1 })
        .withMessage("Capacity must be positive"),
      body("status").optional().isIn(["active", "offline", "maintenance"]),
    ],
  ],
  async (req, res) => {
    try {
      console.log("=== SILO UPDATE REQUEST ===");
      console.log("Silo ID:", req.params.id);
      console.log("User admin_id:", req.user.admin_id);
      console.log("Update data:", req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const silo = await Silo.findOne({
        _id: req.params.id,
        admin_id: req.user.admin_id,
      });
      
      console.log("Found silo:", silo ? "Yes" : "No");

      if (!silo) {
        return res.status(404).json({ error: "Silo not found" });
      }

      const { name, capacity_kg, location, status } = req.body;

      if (name) silo.name = name;
      if (capacity_kg !== undefined) silo.capacity_kg = capacity_kg;
      if (location !== undefined) silo.location = location;
      if (status) silo.status = status;

      await silo.save();
      res.json({
        message: "Silo updated successfully",
        silo,
      });
    } catch (error) {
      console.error("Update silo error:", error);
      res.status(500).json({ error: "Failed to update silo" });
    }
  }
);

/**
 * @swagger
 * /silos/{id}:
 *   delete:
 *     summary: Delete a silo
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silo deleted successfully
 *       404:
 *         description: Silo not found
 *       400:
 *         description: Cannot delete silo with grain
 */
router.delete(
  "/:id",
  [auth, requirePermission("batch.delete"), requireTenantAccess],
  async (req, res) => {
    try {
      const silo = await Silo.findOne({
        _id: req.params.id,
        admin_id: req.user.admin_id,
      });

      if (!silo) {
        return res.status(404).json({ error: "Silo not found" });
      }

      // Check if silo has grain
      if (silo.current_occupancy_kg > 0) {
        return res.status(400).json({
          error: "Cannot delete silo with grain. Please empty the silo first.",
        });
      }

      await Silo.findByIdAndDelete(req.params.id);
      res.json({ message: "Silo deleted successfully" });
    } catch (error) {
      console.error("Delete silo error:", error);
      res.status(500).json({ error: "Failed to delete silo" });
    }
  }
);

module.exports = router;