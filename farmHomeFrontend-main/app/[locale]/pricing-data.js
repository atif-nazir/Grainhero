const pricingData = [
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

export default pricingData; 