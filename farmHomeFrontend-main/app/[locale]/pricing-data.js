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
      "Basic reports"
    ],
    link:'https://buy.stripe.com/test_8x2bJ3cyO4AofwHcBZa3u00',
    priceId:'price_1RoRPZRYMUmJuwVF7aJeMEmm',
    price:99,
    duration:'/month'
  },
  {
    id: "intermediate",
    name: "Grain Professional",
    priceFrontend: "$299/mo",
    description: "Advanced features for growing grain operations and cooperatives.",
    features: [
      "Up to 50 grain batches",
      "Advanced silo management",
      "IoT sensor integration",
      "AI-powered risk assessment",
      "Comprehensive traceability",
      "Insurance management",
      "Buyer management",
      "Priority support",
      "Advanced analytics"
    ],
    link:'https://buy.stripe.com/test_fZu7sN6aq7MA5W71Xla3u02',
    priceId:'price_1RonmCRYMUmJuwVF0bBYtZJW',
    price:299,
    duration:'/month'
  },
  {
    id: "pro",
    name: "Grain Enterprise",
    priceFrontend: "$999/mo",
    description: "Complete solution for large grain operations and trading companies.",
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
      "Bulk operations"
    ],
    link:'https://buy.stripe.com/test_4gM3cx9mC6Iw1FR1Xla3u03',
    priceId:'price_1RonmYRYMUmJuwVFHKWWflRo',
    price:999,
    duration:'/month'
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
      "Industry-specific modules"
    ],
    link:'mailto:sales@grainhero.com?subject=Custom Grain Management Solution Inquiry',
    priceId:'custom',
    price:0,
    duration:'custom'
  }
];

export default pricingData; 