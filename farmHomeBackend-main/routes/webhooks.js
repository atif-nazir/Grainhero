require("dotenv").config();
const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_SECRET_WEBHOOK;
const User = require("../models/User");
const mongoose = require("mongoose");
const sendEmail = require("../utils/emailHelper");
const plans = [
  {
    id: "basic",
    name: "Grain Starter",
    priceFrontend: "$99/mo",
    description: "Perfect for small grain operations and individual farmers.",
    features: [
      "Up to 5 grain batches",
      "Basic silo monitoring",
      "Simple traceability",
      "Email support",
      "Mobile app access",
      "Basic reports",
    ],
    link: "https://buy.stripe.com/test_8x2bJ3cyO4AofwHcBZa3u00",
    priceId: "price_1RoRPZRYMUmJuwVF7aJeMEmm",
    price: 99,
    duration: "/month",
  },
  {
    id: "intermediate",
    name: "Grain Professional",
    priceFrontend: "$299/mo",
    description:
      "Advanced features for growing grain operations and cooperatives.",
    features: [
      "Up to 50 grain batches",
      "Advanced silo management",
      "IoT sensor integration",
      "AI-powered risk assessment",
      "Comprehensive traceability",
      "Insurance management",
      "Buyer management",
      "Priority support",
      "Advanced analytics",
    ],
    link: "https://buy.stripe.com/test_fZu7sN6aq7MA5W71Xla3u02",
    priceId: "price_1RonmCRYMUmJuwVF0bBYtZJW",
    price: 299,
    duration: "/month",
  },
  {
    id: "pro",
    name: "Grain Enterprise",
    priceFrontend: "$999/mo",
    description:
      "Complete solution for large grain operations and trading companies.",
    features: [
      "Unlimited grain batches",
      "Multi-tenant management",
      "Advanced IoT monitoring",
      "Predictive analytics",
      "Custom integrations",
      "API access",
      "White-label options",
      "Dedicated account manager",
      "24/7 premium support",
      "Custom reporting",
      "Bulk operations",
    ],
    link: "https://buy.stripe.com/test_4gM3cx9mC6Iw1FR1Xla3u03",
    priceId: "price_1RonmYRYMUmJuwVFHKWWflRo",
    price: 999,
    duration: "/month",
  },
];

router.post("/", (request, response) => {
  let event = request.body;
  if (endpointSecret) {
    const signature = request.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      break;
    }
    case "payment_method.attached": {
      const paymentMethod = event.data.object;
      break;
    }
    case "checkout.session.completed": {
      // Grant access to the product (subscription)

      (async () => {
        try {
          // Retrieve the full session with line_items
          const sessionFull = await stripe.checkout.sessions.retrieve(
            event.data.object.id,
            { expand: ["line_items"] }
          );

          const customerId = sessionFull?.customer;
          const customer = await stripe.customers.retrieve(customerId);

          const priceId = sessionFull?.line_items?.data[0]?.price?.id;
          const priceAmount =
            sessionFull?.line_items?.data[0]?.price?.unit_amount;

          // Define plan details (same as checkout session)
          const planDetails = {
            9900: { id: "basic", name: "Grain Starter", price: 99 },
            29900: {
              id: "intermediate",
              name: "Grain Professional",
              price: 299,
            },
            99900: { id: "pro", name: "Grain Enterprise", price: 999 },
          };

          const plan = planDetails[priceAmount];
          if (!plan) {
            console.error("Plan not found for price amount:", priceAmount);
            return;
          }

          let user;
          if (customer.email) {
            user = await User.findOne({ email: customer.email });
            console.log("user:", user);

            if (!user) {
              // Create new user for payment-first flow
              console.log("Creating new user for email:", customer.email);
              user = new User({
                email: customer.email,
                name: customer.name || "Admin User",
                role: "pending", // Set as pending until password is set
                hasAccess: plan.id,
                customerId: customerId,
                priceId: priceId,
                status: "active",
                emailVerified: true,
                tenant_id: new mongoose.Types.ObjectId(), // Create new tenant
                owned_tenant_id: new mongoose.Types.ObjectId(),
                createdAt: new Date(),
                updated_at: new Date(),
              });
              await user.save();
              console.log("New user created:", user);

              // Add a small delay to ensure user is fully saved
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              // Update existing user data and grant access
              user.priceId = priceId;
              user.hasAccess = plan.id;
              user.customerId = customerId;
              console.log("User updated:", user);
              console.log("customerid:", customerId);
              await user.save();
            }

            // Send payment confirmation email
            try {
              const emailContent = `
Dear ${user.name || "Valued Customer"},

Thank you for your successful payment! Your GrainHero subscription has been activated.

Payment Details:
- Plan: ${plan.name}
- Amount: $${plan.price}${plan.duration}
- Transaction ID: ${sessionFull.payment_intent}
- Date: ${new Date().toLocaleString()}

Your account is now active and ready to use. You can:

1. Complete your account setup at ${
                process.env.FRONT_END_URL
              }/auth/signup?payment=success&email=${encodeURIComponent(
                user.email
              )}
2. Login to your dashboard at ${process.env.FRONT_END_URL}/auth/login
3. Start managing your grain storage with AI-powered insights
4. Invite team members to collaborate
5. Access 24/7 customer support

Welcome to GrainHero!

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
                  `;

              await sendEmail(
                user.email,
                "Payment Confirmation - GrainHero Subscription Activated",
                emailContent,
                emailContent.replace(/\n/g, "<br>")
              );
              console.log("Payment confirmation email sent to:", user.email);
            } catch (emailError) {
              console.error(
                "Failed to send payment confirmation email:",
                emailError
              );
              console.error("Email error details:", emailError.message);
            }
          } else {
            console.error("No user found");
            throw new Error("No user found");
          }
        } catch (err) {
          console.error("Error handling checkout.session.completed:", err);
        }
      })();
      break;
    }
    case "customer.subscription.deleted": {
      (async () => {
        const subscription = await stripe.subscriptions.retrieve(
          event.data.object.id
        );
        const user = await User.findOne({
          customerId: subscription.customer,
        });
        if (user) {
          user.hasAccess = "none";
          await user.save();
        }
        console.log("Subscription deleted:", subscription);
      })();
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}.`);
  }

  response.send();
});

module.exports = router;
