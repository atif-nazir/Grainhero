require("dotenv").config();
const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_SECRET_WEBHOOK;
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const mongoose = require("mongoose");
const sendEmail = require("../utils/emailHelper");
const {
  getPlanMapping,
  checkoutPlanIdToPlanKey,
  getSubscriptionPlanName,
} = require("../configs/plan-mapping");
const { getPlanFeatures } = require("../configs/plan-features");
const {
  SUBSCRIPTION_STATUSES,
  BILLING_CYCLES,
  PAYMENT_STATUSES,
} = require("../configs/enum");
const plans = [
  {
    id: "basic",
    name: "Starter",
    priceFrontend: "Rs. 1,499/mo",
    description: "Perfect for small grain operations with a single warehouse.",
    features: [
      "1 Warehouse",
      "3 Silos",
      "5 Staff (2 Managers + 3 Technicians)",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    priceId: "price_starter_1499",
    price: 1499,
    duration: "/month",
  },
  {
    id: "intermediate",
    name: "Professional",
    priceFrontend: "Rs. 3,899/mo",
    description:
      "Advanced features for growing grain operations with multiple warehouses.",
    features: [
      "2 Warehouses",
      "6 Silos",
      "10 Staff",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    priceId: "price_professional_3899",
    price: 3899,
    duration: "/month",
  },
  {
    id: "pro",
    name: "Enterprise",
    priceFrontend: "Rs. 5,999/mo",
    description:
      "Complete solution for large grain operations with unlimited staff.",
    features: [
      "5 Warehouses",
      "15 Silos",
      "Unlimited Staff",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    priceId: "price_enterprise_5999",
    price: 5999,
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
      // This is handled by checkout.session.completed, just log it
      break;
    }
    case "payment_method.attached": {
      const paymentMethod = event.data.object;
      console.log(`Payment method attached: ${paymentMethod.id}`);
      // Just log, no action needed
      break;
    }
    case "charge.succeeded": {
      const charge = event.data.object;
      console.log(`Charge succeeded: ${charge.id} for amount ${charge.amount}`);
      // This is handled by checkout.session.completed, just log it
      break;
    }
    case "customer.created": {
      const customer = event.data.object;
      console.log(
        `Customer created in Stripe: ${customer.id} (${customer.email})`
      );
      // Customer is created automatically by Stripe, no action needed
      break;
    }
    case "customer.updated": {
      const customer = event.data.object;
      console.log(`Customer updated in Stripe: ${customer.id}`);
      // Just log, no action needed unless you want to sync customer data
      break;
    }
    case "customer.subscription.created": {
      const subscription = event.data.object;
      console.log(`Subscription created in Stripe: ${subscription.id}`);
      // This is handled by checkout.session.completed, just log it
      break;
    }
    case "payment_intent.created": {
      const paymentIntent = event.data.object;
      console.log(`Payment intent created: ${paymentIntent.id}`);
      // Just log, payment will be handled by checkout.session.completed
      break;
    }
    case "invoice.created": {
      const invoice = event.data.object;
      console.log(`Invoice created: ${invoice.id}`);
      // Just log, invoice.payment_succeeded will handle the actual payment
      break;
    }
    case "invoice.finalized": {
      const invoice = event.data.object;
      console.log(`Invoice finalized: ${invoice.id}`);
      // Just log, invoice.payment_succeeded will handle the actual payment
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      console.log(`Invoice paid: ${invoice.id}`);
      // This is similar to invoice.payment_succeeded, but we handle payment_succeeded
      // Just log it
      break;
    }
    case "invoice_payment.paid": {
      const invoicePayment = event.data.object;
      console.log(`Invoice payment paid: ${invoicePayment.id}`);
      // This is handled by invoice.payment_succeeded, just log it
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
            149900: { id: "basic", name: "Starter", price: 1499 },
            389900: {
              id: "intermediate",
              name: "Professional",
              price: 3899,
            },
            599900: { id: "pro", name: "Enterprise", price: 5999 },
          };

          const plan = planDetails[priceAmount];
          if (!plan) {
            console.error("Plan not found for price amount:", priceAmount);
            return;
          }

          // Get plan mapping for consistent naming
          const planMapping = getPlanMapping(plan.id);
          const planKey = checkoutPlanIdToPlanKey(plan.id); // Convert to plan-features key
          const planFeatures = getPlanFeatures(planKey);
          const subscriptionPlanName = getSubscriptionPlanName(plan.id);

          let user;
          let tenant;
          if (customer.email) {
            user = await User.findOne({ email: customer.email });
            console.log("Found user:", user ? user.email : "none");

            if (!user) {
              // Create new user for payment-first flow
              console.log("Creating new user for email:", customer.email);

              // Check if tenant already exists (from previous payment)
              const Tenant = require("../models/Tenant");
              try {
                tenant = await Tenant.findOne({ email: customer.email });
              } catch (tenantError) {
                console.error("Error finding tenant:", tenantError);
                tenant = null;
              }

              if (!tenant) {
                try {
                  // Create tenant only if it doesn't exist
                  tenant = new Tenant({
                    name: `${customer.name || "Admin User"}'s Farm`,
                    email: customer.email,
                    business_type: "farm",
                    created_by: null, // Will be set after user creation
                  });
                  await tenant.save();
                  console.log("New tenant created:", tenant._id);
                } catch (tenantError) {
                  // If tenant creation fails (e.g., duplicate), try to find it again
                  if (tenantError.code === 11000) {
                    console.log(
                      "Tenant already exists (duplicate key), finding it..."
                    );
                    tenant = await Tenant.findOne({ email: customer.email });
                    if (tenant) {
                      console.log("Found existing tenant:", tenant._id);
                    } else {
                      console.error(
                        "Could not find tenant after duplicate error"
                      );
                      throw tenantError;
                    }
                  } else {
                    throw tenantError;
                  }
                }
              } else {
                console.log("Existing tenant found:", tenant._id);
              }

              // Check if user already exists (race condition check)
              user = await User.findOne({ email: customer.email });
              if (user) {
                console.log(
                  "User was created between checks, updating instead"
                );
                // Update existing user with payment info
                user.hasAccess = plan.id;
                user.subscription_plan = planKey;
                user.customerId = customerId;
                user.priceId = priceId;
                if (tenant && !user.tenant_id) {
                  user.tenant_id = tenant._id;
                  user.owned_tenant_id = tenant._id;
                }
                await user.save();
              } else {
                // Create user - use tenant if available, but don't fail if tenant is missing
                const userData = {
                  email: customer.email,
                  name: customer.name || "Admin User",
                  role: "pending", // Keep as pending until they complete signup
                  hasAccess: plan.id, // Keep checkout plan ID for hasAccess
                  subscription_plan: planKey, // Use plan key for subscription_plan (basic, standard, professional, enterprise)
                  customerId: customerId,
                  priceId: priceId,
                  status: "active",
                  emailVerified: true,
                  createdAt: new Date(),
                  updated_at: new Date(),
                };

                // Only add tenant_id if we have a tenant
                if (tenant) {
                  userData.tenant_id = tenant._id;
                  userData.owned_tenant_id = tenant._id;
                }

                user = new User(userData);
                await user.save();
                console.log("New user created:", user.email);

                // Update tenant with user reference (if tenant exists)
                if (tenant) {
                  try {
                    await Tenant.findByIdAndUpdate(tenant._id, {
                      created_by: user._id,
                    });
                  } catch (updateError) {
                    console.warn(
                      "Could not update tenant created_by:",
                      updateError.message
                    );
                    // Non-critical, continue
                  }
                }

                // Add a small delay to ensure user is fully saved
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            } else {
              // Update existing user data and grant access
              user.priceId = priceId;
              user.hasAccess = plan.id; // Keep checkout plan ID
              user.subscription_plan = planKey; // Update subscription_plan with plan key
              user.customerId = customerId;

              // Get tenant if not already set
              if (!user.tenant_id) {
                const Tenant = require("../models/Tenant");
                // Check if tenant already exists for this email
                try {
                  tenant = await Tenant.findOne({ email: user.email });
                } catch (tenantError) {
                  console.error("Error finding tenant:", tenantError);
                  tenant = null;
                }

                if (!tenant) {
                  try {
                    // Create tenant only if it doesn't exist
                    tenant = new Tenant({
                      name: `${user.name || "Admin User"}'s Farm`,
                      email: user.email,
                      business_type: "farm",
                      created_by: user._id,
                    });
                    await tenant.save();
                    console.log(
                      "New tenant created for existing user:",
                      tenant._id
                    );
                  } catch (tenantError) {
                    // If tenant creation fails (e.g., duplicate), try to find it again
                    if (tenantError.code === 11000) {
                      console.log(
                        "Tenant already exists (duplicate key), finding it..."
                      );
                      tenant = await Tenant.findOne({ email: user.email });
                      if (tenant) {
                        console.log("Found existing tenant:", tenant._id);
                      } else {
                        console.error(
                          "Could not find tenant after duplicate error"
                        );
                        // Continue without tenant - user will be updated anyway
                      }
                    } else {
                      console.error("Error creating tenant:", tenantError);
                      // Continue without tenant - user will be updated anyway
                    }
                  }
                } else {
                  console.log("Existing tenant found for user:", tenant._id);
                }

                if (tenant) {
                  user.tenant_id = tenant._id;
                  user.owned_tenant_id = tenant._id;
                }
              } else {
                try {
                  tenant = await require("../models/Tenant").findById(
                    user.tenant_id
                  );
                } catch (tenantError) {
                  console.warn(
                    "Could not find tenant by ID:",
                    tenantError.message
                  );
                  // Try to find by email as fallback
                  try {
                    tenant = await require("../models/Tenant").findOne({
                      email: user.email,
                    });
                  } catch (fallbackError) {
                    console.error(
                      "Could not find tenant by email either:",
                      fallbackError.message
                    );
                  }
                }
              }

              console.log("User updated:", user.email);
              await user.save();
            }

            // Ensure tenant is available (but don't fail if we can't get/create one)
            if (!tenant) {
              const Tenant = require("../models/Tenant");
              try {
                // Try to find tenant by user's tenant_id first
                if (user.tenant_id) {
                  tenant = await Tenant.findById(user.tenant_id);
                }
                // If still not found, try by email
                if (!tenant) {
                  tenant = await Tenant.findOne({ email: customer.email });
                }
                // If still not found, try to create one (but handle duplicate gracefully)
                if (!tenant) {
                  try {
                    tenant = new Tenant({
                      name: `${user.name || customer.name || "Admin User"
                        }'s Farm`,
                      email: customer.email,
                      business_type: "farm",
                      created_by: user._id || null,
                    });
                    await tenant.save();
                    console.log("Created tenant as fallback:", tenant._id);

                    // Update user with tenant_id if not set
                    if (!user.tenant_id) {
                      user.tenant_id = tenant._id;
                      user.owned_tenant_id = tenant._id;
                      await user.save();
                    }
                  } catch (createError) {
                    if (createError.code === 11000) {
                      // Duplicate key - tenant was created between checks
                      console.log(
                        "Tenant created between checks, finding it..."
                      );
                      tenant = await Tenant.findOne({ email: customer.email });
                      if (tenant && !user.tenant_id) {
                        user.tenant_id = tenant._id;
                        user.owned_tenant_id = tenant._id;
                        await user.save();
                      }
                    } else {
                      console.error(
                        "Error creating fallback tenant:",
                        createError.message
                      );
                      // Continue without tenant - subscription can still be created
                    }
                  }
                }
              } catch (tenantError) {
                console.error(
                  "Error in tenant fallback logic:",
                  tenantError.message
                );
                // Continue without tenant - subscription can still be created
              }
            }

            // Create or update Subscription record
            try {
              // Use tenant_id if available, otherwise use user._id as fallback
              const subscriptionTenantId = tenant
                ? tenant._id
                : user.tenant_id || user._id;

              // Check if subscription already exists for this tenant/user
              let subscription = await Subscription.findOne({
                $or: [
                  { tenant_id: subscriptionTenantId },
                  { stripe_customer_id: customerId },
                ],
                stripe_subscription_id: sessionFull.subscription || null,
                status: {
                  $in: [
                    SUBSCRIPTION_STATUSES.ACTIVE,
                    SUBSCRIPTION_STATUSES.TRIAL,
                  ],
                },
              });

              const now = new Date();
              const endDate = new Date(now);
              endDate.setMonth(endDate.getMonth() + 1); // Monthly subscription

              // Map plan features to Subscription model format
              const subscriptionFeatures = {
                max_users: planFeatures.limits.users.total,
                max_devices: planFeatures.limits.sensors,
                max_storage_gb: planFeatures.limits.storage_gb,
                max_batches:
                  planFeatures.limits.grain_batches === -1
                    ? -1
                    : planFeatures.limits.grain_batches,
                ai_features: planFeatures.features.ai_predictions || false,
                priority_support:
                  planFeatures.features.priority_support || false,
                custom_integrations:
                  planFeatures.features.custom_integrations || false,
                advanced_analytics:
                  planFeatures.features.advanced_analytics || false,
              };

              if (subscription) {
                // Update existing subscription
                subscription.plan_name = subscriptionPlanName;
                subscription.plan_description = planFeatures.description;
                subscription.price_per_month = plan.price;
                subscription.currency = planFeatures.currency || "USD";
                subscription.billing_cycle = BILLING_CYCLES.MONTHLY;
                subscription.start_date = now;
                subscription.end_date = endDate;
                subscription.status = SUBSCRIPTION_STATUSES.ACTIVE;
                subscription.payment_status = PAYMENT_STATUSES.PAID;
                subscription.last_payment_date = now;
                subscription.next_payment_date = endDate;
                subscription.payment_method = "stripe";
                subscription.stripe_subscription_id = sessionFull.subscription;
                subscription.stripe_customer_id = customerId;
                subscription.stripe_price_id = priceId;
                subscription.features = subscriptionFeatures;
                subscription.auto_renew = true;
                subscription.created_by = user._id;
                await subscription.save();
                console.log("Subscription updated for user:", user.email);
              } else {
                // Create new subscription
                subscription = new Subscription({
                  tenant_id: subscriptionTenantId,
                  plan_name: subscriptionPlanName,
                  plan_description: planFeatures.description,
                  price_per_month: plan.price,
                  currency: planFeatures.currency || "USD",
                  billing_cycle: BILLING_CYCLES.MONTHLY,
                  start_date: now,
                  end_date: endDate,
                  status: SUBSCRIPTION_STATUSES.ACTIVE,
                  payment_status: PAYMENT_STATUSES.PAID,
                  last_payment_date: now,
                  next_payment_date: endDate,
                  payment_method: "stripe",
                  stripe_subscription_id: sessionFull.subscription,
                  stripe_customer_id: customerId,
                  stripe_price_id: priceId,
                  features: subscriptionFeatures,
                  auto_renew: true,
                  created_by: user._id,
                });
                await subscription.save();
                console.log("Subscription created for user:", user.email);
              }
            } catch (subscriptionError) {
              console.error(
                "Error creating/updating subscription:",
                subscriptionError
              );
              // Don't fail the webhook if subscription creation fails, but log it
            }

            // Send payment confirmation email
            try {
              // Get payment intent ID or use session ID as fallback
              const transactionId =
                sessionFull.payment_intent || sessionFull.id || "N/A";
              const paymentDate = new Date().toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const billingPeriod = "/month"; // Monthly subscription

              // Generate signup completion link
              const signupLink = `${process.env.FRONT_END_URL}/auth/signup?payment=success&email=${encodeURIComponent(customer.email)}`;

              const emailContent = `
Dear ${customer.name || "Valued Customer"},

Thank you for your successful payment! Your GrainHero subscription has been activated.

Payment Details:
- Plan: ${plan.name}
- Amount: Rs. ${plan.price}${billingPeriod}
- Transaction ID: ${transactionId}
- Date: ${paymentDate}

To complete your account setup, please click the link below:

🔗 Complete Your Account Setup: ${signupLink}

This will take you to our signup page where you can:
- Set your full name
- Create a secure password
- Add your phone number (optional)
- Complete your admin account registration

After completing signup, you can:

1. Login to your dashboard at ${process.env.FRONT_END_URL}/auth/login
2. Start managing your grain storage with AI-powered insights
3. Invite team members to collaborate
4. Access 24/7 customer support

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
            console.error(
              "No user found for email:",
              customer?.email || "unknown"
            );
            // Don't throw - log the error but don't crash the webhook
            // The user might be created later via signup flow
          }
        } catch (err) {
          console.error("Error handling checkout.session.completed:", err);
          // Log detailed error for debugging
          if (err.code === 11000) {
            console.error(
              "Duplicate key error - this should be handled gracefully now"
            );
          }
          // Don't rethrow - webhook should return 200 to Stripe even if there are issues
          // Stripe will retry if needed, but we don't want to spam errors
        }
      })();
      break;
    }
    case "invoice.payment_succeeded": {
      // Handle subscription renewal
      (async () => {
        try {
          const invoice = event.data.object;
          const stripeSubscriptionId = invoice.subscription;

          if (!stripeSubscriptionId) {
            console.log("No subscription ID in invoice, skipping");
            return;
          }

          // Retrieve subscription from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(
            stripeSubscriptionId
          );

          // Find subscription in database
          const subscription = await Subscription.findOne({
            stripe_subscription_id: stripeSubscriptionId,
          });

          if (subscription) {
            // Update subscription with renewal info
            const now = new Date();
            subscription.last_payment_date = new Date(invoice.created * 1000);
            subscription.payment_status = PAYMENT_STATUSES.PAID;
            subscription.status = SUBSCRIPTION_STATUSES.ACTIVE;

            // Calculate next payment date based on billing cycle
            const nextPaymentDate = new Date(
              stripeSubscription.current_period_end * 1000
            );
            subscription.next_payment_date = nextPaymentDate;
            subscription.end_date = nextPaymentDate;

            await subscription.save();

            // Get user to send renewal email
            const user = await User.findOne({
              customerId: stripeSubscription.customer,
            });

            if (user) {
              // Send renewal confirmation email
              try {
                const renewalEmailContent = `
Dear ${user.name || "Valued Customer"},

Your GrainHero subscription has been successfully renewed!

Renewal Details:
- Plan: ${subscription.plan_name}
- Amount: Rs. ${subscription.price_per_month}/${subscription.billing_cycle === BILLING_CYCLES.MONTHLY
                    ? "month"
                    : "year"
                  }
- Invoice ID: ${invoice.id}
- Next Billing Date: ${nextPaymentDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}

Your subscription is active and will continue automatically.

Thank you for being a valued GrainHero customer!

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
                `;

                await sendEmail(
                  user.email,
                  "Subscription Renewed - GrainHero",
                  renewalEmailContent,
                  renewalEmailContent.replace(/\n/g, "<br>")
                );
                console.log("Renewal confirmation email sent to:", user.email);
              } catch (emailError) {
                console.error("Failed to send renewal email:", emailError);
              }
            }

            console.log("Subscription renewed:", subscription._id);
          } else {
            console.log(
              "Subscription not found in database for renewal:",
              stripeSubscriptionId
            );
          }
        } catch (err) {
          console.error("Error handling subscription renewal:", err);
        }
      })();
      break;
    }
    case "customer.subscription.updated": {
      // Handle subscription upgrade/downgrade
      (async () => {
        try {
          const stripeSubscription = event.data.object;

          // Find subscription in database
          const subscription = await Subscription.findOne({
            stripe_subscription_id: stripeSubscription.id,
          });

          if (subscription) {
            const oldPlanName = subscription.plan_name;
            const oldPrice = subscription.price_per_month;

            // Get new price ID from Stripe subscription
            const newPriceId = stripeSubscription.items.data[0]?.price?.id;
            const newPriceAmount =
              stripeSubscription.items.data[0]?.price?.unit_amount;

            if (newPriceAmount) {
              // Map price amount to plan
              const planDetails = {
                149900: { id: "basic", name: "Starter", price: 1499 },
                389900: {
                  id: "intermediate",
                  name: "Professional",
                  price: 3899,
                },
                599900: { id: "pro", name: "Enterprise", price: 5999 },
              };

              const newPlan = planDetails[newPriceAmount];
              if (newPlan) {
                const planKey = checkoutPlanIdToPlanKey(newPlan.id);
                const planFeatures = getPlanFeatures(planKey);
                const subscriptionPlanName = getSubscriptionPlanName(
                  newPlan.id
                );

                // Update subscription with new plan
                subscription.plan_name = subscriptionPlanName;
                subscription.plan_description = planFeatures.description;
                subscription.price_per_month = newPlan.price;
                subscription.stripe_price_id = newPriceId;

                // Update features based on new plan
                subscription.features = {
                  max_users: planFeatures.limits.users.total,
                  max_devices: planFeatures.limits.sensors,
                  max_storage_gb: planFeatures.limits.storage_gb,
                  max_batches:
                    planFeatures.limits.grain_batches === -1
                      ? -1
                      : planFeatures.limits.grain_batches,
                  ai_features: planFeatures.features.ai_predictions || false,
                  priority_support:
                    planFeatures.features.priority_support || false,
                  custom_integrations:
                    planFeatures.features.custom_integrations || false,
                  advanced_analytics:
                    planFeatures.features.advanced_analytics || false,
                };

                // Update end date based on current period
                subscription.end_date = new Date(
                  stripeSubscription.current_period_end * 1000
                );
                subscription.next_payment_date = new Date(
                  stripeSubscription.current_period_end * 1000
                );

                await subscription.save();

                // Update user model
                const user = await User.findOne({
                  customerId: stripeSubscription.customer,
                });

                if (user) {
                  user.hasAccess = newPlan.id;
                  user.subscription_plan = planKey;
                  user.priceId = newPriceId;
                  await user.save();

                  // Determine if upgrade or downgrade
                  const isUpgrade =
                    newPlan.price > oldPrice ||
                    (oldPlanName === "Grain Starter" &&
                      subscriptionPlanName !== "Grain Starter");

                  // Send upgrade/downgrade email
                  try {
                    const changeEmailContent = `
Dear ${user.name || "Valued Customer"},

Your GrainHero subscription has been ${isUpgrade ? "upgraded" : "downgraded"}!

Subscription Changes:
- Previous Plan: ${oldPlanName}
- New Plan: ${subscriptionPlanName}
- New Price: Rs. ${newPlan.price}/month
- Effective Date: ${new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}

${isUpgrade
                        ? "🎉 Congratulations! You now have access to additional features and higher limits."
                        : "Your subscription has been adjusted. Some features may no longer be available."
                      }

You can manage your subscription from your dashboard.

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
                    `;

                    await sendEmail(
                      user.email,
                      `Subscription ${isUpgrade ? "Upgraded" : "Downgraded"
                      } - GrainHero`,
                      changeEmailContent,
                      changeEmailContent.replace(/\n/g, "<br>")
                    );
                    console.log(
                      `Subscription ${isUpgrade ? "upgrade" : "downgrade"
                      } email sent to:`,
                      user.email
                    );
                  } catch (emailError) {
                    console.error("Failed to send change email:", emailError);
                  }
                }

                console.log(
                  `Subscription ${isUpgrade ? "upgraded" : "downgraded"
                  } from ${oldPlanName} to ${subscriptionPlanName}`
                );
              }
            }
          } else {
            console.log(
              "Subscription not found in database for update:",
              stripeSubscription.id
            );
          }
        } catch (err) {
          console.error("Error handling subscription update:", err);
        }
      })();
      break;
    }
    case "invoice.payment_failed": {
      // Handle failed payment
      (async () => {
        try {
          const invoice = event.data.object;
          const stripeSubscriptionId = invoice.subscription;

          if (stripeSubscriptionId) {
            const subscription = await Subscription.findOne({
              stripe_subscription_id: stripeSubscriptionId,
            });

            if (subscription) {
              subscription.payment_status = PAYMENT_STATUSES.FAILED;
              await subscription.save();

              // Get user to send failure notification
              const stripeSubscription = await stripe.subscriptions.retrieve(
                stripeSubscriptionId
              );
              const user = await User.findOne({
                customerId: stripeSubscription.customer,
              });

              if (user) {
                try {
                  const failureEmailContent = `
Dear ${user.name || "Valued Customer"},

We were unable to process your payment for your GrainHero subscription.

Payment Details:
- Plan: ${subscription.plan_name}
- Amount: Rs. ${subscription.price_per_month}
- Invoice ID: ${invoice.id}

Please update your payment method to avoid service interruption.

Update Payment: ${process.env.FRONT_END_URL}/profile/billing

If you have any questions, please contact our support team.

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
                  `;

                  await sendEmail(
                    user.email,
                    "Payment Failed - GrainHero Subscription",
                    failureEmailContent,
                    failureEmailContent.replace(/\n/g, "<br>")
                  );
                } catch (emailError) {
                  console.error("Failed to send failure email:", emailError);
                }
              }

              console.log("Payment failed for subscription:", subscription._id);
            }
          }
        } catch (err) {
          console.error("Error handling payment failure:", err);
        }
      })();
      break;
    }
    case "customer.subscription.deleted": {
      (async () => {
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            event.data.object.id
          );
          const user = await User.findOne({
            customerId: stripeSubscription.customer,
          });

          if (user) {
            // Update user access
            user.hasAccess = "none";
            user.subscription_plan = undefined;
            await user.save();

            // Update Subscription record
            const subscription = await Subscription.findOne({
              stripe_subscription_id: event.data.object.id,
              tenant_id: user.tenant_id,
            });

            if (subscription) {
              subscription.status = SUBSCRIPTION_STATUSES.CANCELLED;
              subscription.cancellation_date = new Date();
              subscription.auto_renew = false;
              await subscription.save();
              console.log(
                "Subscription cancelled in database:",
                subscription._id
              );
            }
          }
          console.log("Subscription deleted:", stripeSubscription.id);
        } catch (err) {
          console.error("Error handling subscription deletion:", err);
        }
      })();
      break;
    }
    case "customer.deleted": {
      // Handle customer deletion from Stripe
      (async () => {
        try {
          const customerId = event.data.object.id;
          console.log("Customer deleted from Stripe:", customerId);

          // Find user with this customer ID
          const user = await User.findOne({ customerId: customerId });

          if (user) {
            // Find all subscriptions for this customer
            const subscriptions = await Subscription.find({
              stripe_customer_id: customerId,
            });

            // Cancel all subscriptions
            for (const subscription of subscriptions) {
              subscription.status = SUBSCRIPTION_STATUSES.CANCELLED;
              subscription.cancellation_date = new Date();
              subscription.auto_renew = false;
              await subscription.save();
              console.log(
                "Subscription cancelled due to customer deletion:",
                subscription._id
              );
            }

            // Update user access (but don't delete user - they may still have account)
            user.hasAccess = "none";
            user.subscription_plan = undefined;
            user.customerId = undefined; // Clear customer ID
            await user.save();

            console.log(
              "User access revoked due to customer deletion:",
              user.email
            );
          } else {
            console.log("No user found for deleted customer:", customerId);
          }
        } catch (err) {
          console.error("Error handling customer deletion:", err);
        }
      })();
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}.`);
  }

  response.send();
});

module.exports = router;
