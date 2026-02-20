const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * @swagger
 * /api/create-checkout-session:
 *   post:
 *     summary: Create Stripe checkout session for subscription
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *               - userEmail
 *               - planId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe price ID (optional, derived from planId)
 *               userEmail:
 *                 type: string
 *                 description: User email address
 *               planId:
 *                 type: string
 *                 description: Plan ID (basic, intermediate, pro)
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                 checkoutUrl:
 *                   type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post("/", async (req, res) => {
  try {
    const { userEmail, planId } = req.body;

    if (!userEmail || !planId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userEmail, planId",
      });
    }

    // Define plan details with PKR prices (in cents/paisa)
    // 1499 PKR = 149900
    // 3899 PKR = 389900
    // 5999 PKR = 599900
    const planDetails = {
      basic: {
        name: "Starter",
        description: "Perfect for small grain operations with a single warehouse.",
        price: 149900,
        interval: "month",
      },
      intermediate: {
        name: "Professional",
        description: "Advanced features for growing grain operations with multiple warehouses.",
        price: 389900,
        interval: "month",
      },
      pro: {
        name: "Enterprise",
        description: "Complete solution for large grain operations with unlimited staff.",
        price: 599900,
        interval: "month",
      },
    };

    const plan = planDetails[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan ID",
      });
    }

    // Check for existing subscription (optional logic, kept from original)
    // You might want to remove this if you want to allow re-subscriptions or multiple subs
    try {
      const User = require("../models/User");
      const existingUser = await User.findOne({ email: userEmail });
      if (
        existingUser &&
        existingUser.customerId &&
        existingUser.hasAccess &&
        existingUser.hasAccess === planId // Only block if they have the SAME plan active
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You already have this subscription active.",
        });
      }
    } catch (err) {
      console.log("User check skipped or failed", err.message);
    }

    // 1. Create or retrieve Product & Price for the SUBSCRIPTION
    let product;
    try {
      const products = await stripe.products.list({ limit: 100 });
      product = products.data.find((p) => p.name === plan.name);

      if (!product) {
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
        });
      }
    } catch (error) {
      console.error("Error creating/finding product:", error);
      return res.status(500).json({ success: false, message: "Failed to create product" });
    }

    let price;
    try {
      // Find a price that matches our amount and currency
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 100,
      });
      price = prices.data.find(
        (p) =>
          p.unit_amount === plan.price &&
          p.currency === "pkr" &&
          p.recurring?.interval === plan.interval
      );

      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.price,
          currency: "pkr",
          recurring: {
            interval: plan.interval,
          },
        });
      }
    } catch (error) {
      console.error("Error creating/finding price:", error);
      return res.status(500).json({ success: false, message: "Failed to create price" });
    }

    // 2. Define Line Items
    const line_items = [
      {
        price: price.id,
        quantity: 1,
      },
    ];

    // 3. Add One-Time IoT Setup Fee (7000 PKR = 700000)
    // We create a one-time price data object for this
    const iotFeeAmount = 700000;
    line_items.push({
      price_data: {
        currency: "pkr",
        product_data: {
          name: "IoT Hardware Setup Fee",
          description: "One-time charge for IoT infrastructure setup",
        },
        unit_amount: iotFeeAmount,
      },
      quantity: 1,
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: line_items,
      mode: "subscription",
      customer_email: userEmail,
      success_url: `${process.env.FRONT_END_URL || "http://localhost:3000"
        }/auth/signup?payment=success&session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(
          userEmail
        )}`,
      cancel_url: `${process.env.FRONT_END_URL || "http://localhost:3000"}/checkout?cancelled=true`,

      ui_mode: "hosted",
      custom_fields: [
        {
          key: "company_name",
          label: {
            type: "custom",
            custom: "Company/Farm Name (Optional)",
          },
          type: "text",
          optional: true,
        },
      ],

      metadata: {
        planId: planId,
        userEmail: userEmail,
      },
      subscription_data: {
        metadata: {
          planId: planId,
          userEmail: userEmail,
        },
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
      error: error.message,
    });
  }
});

module.exports = router;
