require('dotenv').config();
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_SECRET_WEBHOOK;
const User = require('../models/User');
const plans = [
    {
      id: "basic",
      name: "Basic",
      priceFrontend: "$9/mo",
      description: "Essential tools for small farms to get started.",
      features: [
        "Animal management",
        "Basic analytics",
        "Role-based access",
        "Email support"
      ],
      link:'https://buy.stripe.com/test_8x2bJ3cyO4AofwHcBZa3u00',
      priceId:'price_1RoRPZRYMUmJuwVF7aJeMEmm',
      price:20,
      duration:'/month'
    },
    {
      id: "intermediate",
      name: "Intermediate",
      priceFrontend: "$29/mo",
      description: "Advanced features for growing farms and teams.",
      features: [
        "Everything in Basic",
        "Breeding & health tracking",
        "Advanced analytics",
        "Priority email support"
      ],
      link:'https://buy.stripe.com/test_fZu7sN6aq7MA5W71Xla3u02',
      priceId:'price_1RonmCRYMUmJuwVF0bBYtZJW',
      price:50,
      duration:'/month'
    },
    {
      id: "pro",
      name: "Pro",
      priceFrontend: "Contact us",
      description: "Custom solutions for large operations and enterprises.",
      features: [
        "Everything in Pro",
        "Custom integrations",
        "Dedicated account manager",
        "24/7 support"
      ],
      link:'https://buy.stripe.com/test_4gM3cx9mC6Iw1FR1Xla3u03',
      priceId:'price_1RonmYRYMUmJuwVFHKWWflRo',
      price:50,
      duration:'/month'
    }
  ];
// TODO: Replace with your actual plans array if needed

router.post('/', express.raw({ type: 'application/json' }), (request, response) => {
    let event = request.body;
    if (endpointSecret) {
        const signature = request.headers['stripe-signature'];
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
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
            break;
        }
        case 'payment_method.attached': {
            const paymentMethod = event.data.object;
            break;
        }
        case 'checkout.session.completed': {
            // Grant access to the product (subscription)

            (async () => {
                try {
                    // Retrieve the full session with line_items
                    const sessionFull = await stripe.checkout.sessions.retrieve(
                        event.data.object.id,
                        { expand: ['line_items'] }
                    );

                    const customerId = sessionFull?.customer;
                    const customer = await stripe.customers.retrieve(customerId);

                    const priceId = sessionFull?.line_items?.data[0]?.price?.id;
                    const plan = plans.find((p) => p.priceId === priceId);
                    if (!plan) return;

                    let user;
                    if (customer.email) {
                        user = await User.findOne({ email: customer.email });
                        console.log('user:', user);
                        if (!user) {
                            throw new Error('User not found for email: ' + customer.email);
                        }
                        // Update user data and grant access
                        user.priceId = priceId;
                        user.hasAccess = plan.id;
                        user.customerId = customerId;
                        console.log('User updated:', user);
                        console.log('customerid:', customerId);
                        await user.save();
                    } else {
                        console.error('No user found');
                        throw new Error('No user found');
                    }
                } catch (err) {
                    console.error('Error handling checkout.session.completed:', err);
                }
            })();
            break;
        }
        case 'customer.subscription.deleted': {
            (async () => {
                const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
                const user = await User.findOne({ customerId: subscription.customer });
                if (user) {
                    user.hasAccess = false;
                    await user.save();
                }
                console.log('Subscription deleted:', subscription);
            })();
            break;
        }
        default:
            console.log(`Unhandled event type ${event.type}.`);
    }

    response.send();
});

module.exports = router;