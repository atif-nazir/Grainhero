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
 *                 description: Stripe price ID
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
    const { priceId, userEmail, planId } = req.body;

    if (!userEmail || !planId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userEmail, planId",
      });
    }

    // Define plan details
    const planDetails = {
      basic: {
        name: "Grain Starter",
        description:
          "Perfect for small grain operations and individual farmers.",
       
        interval: "month",
      },
      intermediate: {
        name: "Grain Professional",
        description:
          "Advanced features for growing grain operations and cooperatives.",
       
        interval: "month",
      },
      pro: {
        name: "Grain Enterprise",
        description:
          "Complete solution for large grain operations and trading companies.",
        
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

    // Check for existing subscription
    const User = require("../models/User");
    const existingUser = await User.findOne({ email: userEmail });
    if (
      existingUser &&
      existingUser.customerId &&
      existingUser.hasAccess &&
      existingUser.hasAccess !== "none"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active subscription. Please contact us if you want to upgrade or change your plan.",
      });
    }

    // Create or retrieve product
    let product;
    try {
      // Try to find existing product first
      const products = await stripe.products.list({ limit: 100 });
      product = products.data.find((p) => p.name === plan.name);

      if (!product) {
        // Create new product if not found
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
        });
      }
    } catch (error) {
      console.error("Error creating/finding product:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create product",
      });
    }

    // Create or retrieve price
    let price;
    try {
      // Try to find existing price first
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 100,
      });
      price = prices.data.find(
        (p) =>
          p.unit_amount === plan.price &&
          p.recurring?.interval === plan.interval
      );

      if (!price) {
        // Create new price if not found
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.price,
          currency: "usd",
          recurring: {
            interval: plan.interval,
          },
        });
      }
    } catch (error) {
      console.error("Error creating/finding price:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create price",
      });
    }

    // Create Stripe checkout session with custom branding
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: userEmail,
      success_url: `${
        process.env.FRONT_END_URL
      }/auth/signup?payment=success&session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(
        userEmail
      )}`,
      cancel_url: `${process.env.FRONT_END_URL}/checkout?cancelled=true`,

      // Custom branding to match your app theme
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

      // Custom colors to match your app theme
      custom_text: {
        submit: {
          message:
            "Welcome to GrainHero! Your subscription will be activated immediately after payment.",
        },
      },

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
