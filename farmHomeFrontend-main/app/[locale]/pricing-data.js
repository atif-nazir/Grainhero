const pricingData = [
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
    priceId: "price_1RoRPZRYMUmJuwVF7aJeMEmm", // Grain Starter $99/mo
    price: 99,
    duration: "/month",
    interval: "month",
    popular: false,
    limits: {
      users: 5,
      storage: 10,
    },
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
    priceId: "price_1RonmCRYMUmJuwVF0bBYtZJW", // Grain Professional $299/mo
    price: 299,
    duration: "/month",
    interval: "month",
    popular: true,
    limits: {
      users: 50,
      storage: 100,
    },
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
    priceId: "price_1RonmYRYMUmJuwVFHKWWflRo", // Grain Enterprise $999/mo
    price: 999,
    duration: "/month",
    interval: "month",
    popular: false,
    limits: {
      users: -1, // unlimited
      storage: -1, // unlimited
    },
  },
  {
    id: "custom",
    name: "Custom Solution",
    priceFrontend: "Contact Us",
    description: "Tailored solutions for unique grain management requirements.",
    features: [
      "Custom feature development",
      "On-premise deployment",
      "Integration with existing systems",
      "Custom training programs",
      "Dedicated support team",
      "SLA guarantees",
      "Custom pricing models",
      "Industry-specific modules",
    ],
    link: "mailto:noreply.grainhero1@gmail.com?subject=Custom Grain Management Solution Inquiry",
    priceId: "custom",
    price: 0,
    duration: "custom",
    interval: "custom",
    popular: false,
    limits: {
      users: 0,
      storage: 0,
    },
  },
];

export default pricingData;
