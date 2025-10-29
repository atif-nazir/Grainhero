'use client'
import { Wheat as WheatIcon, Menu, X, BarChart3, Brain, Thermometer, TrendingUp, Bell, Check } from "lucide-react"
import { Link } from '@/i18n/navigation'
import { useState, useEffect } from 'react'
import pricingData from './pricing-data.js'
import {
  AnimatedHero,
  AnimatedFeatureCards,
  AnimatedCTA
} from '@/components/animations/AnimatedLanding'
import {
  AnimatedBackground,
  AnimatedText
} from '@/components/animations/MotionGraphics'

type Plan = {
  id: string
  name: string
  priceFrontend?: string
  description: string
  features: string[]
  link?: string
  price?: number
  duration?: string
}

export default function HomePage() {
  return (
    <AnimatedBackground className="min-h-screen">
      <main className="min-h-screen bg-white text-black">
        <Navigation />
        <AnimatedHero
          title="Your grain success starts here"
          subtitle="From monitoring to AI predictions, GrainHero has you covered."
          ctaText="Start now"
          onCtaClick={() => window.location.href = '/checkout'}
        />
        <Highlights />
        <Features />
        <PricingShowcase />
        <AboutUs />
        <FAQs />
        <CTA />
        <Footer />
      </main>
    </AnimatedBackground>
  )
}

// Navigation (Hostinger-style: logo left, tabs next, actions right)
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { href: '/pricing', label: 'Pricing' },
    { href: '#about', label: 'About' },
    { href: '#faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' }
  ]

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-200' : 'bg-white'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center space-x-2 mr-6">
            <WheatIcon className="w-8 h-8 text-[#00a63e]" />
            <span className="text-xl font-bold">GrainHero</span>
          </Link>
          {/* Middle: Tabs */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-gray-700 hover:text-[#00a63e] transition-colors duration-200">
                {item.label}
              </Link>
            ))}
          </div>
          {/* Right: actions */}
          <div className="ml-auto hidden md:flex items-center gap-4">
            <Link href="/auth/login" className="text-gray-700 hover:text-[#00a63e] transition-colors">Login</Link>
            <Link href="/checkout" className="bg-[#00a63e] hover:bg-[#029238] text-white px-5 py-2 rounded-full transition">Get Started</Link>
          </div>
          {/* Mobile: menu button */}
          <button className="md:hidden ml-auto p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="block text-gray-700 hover:text-[#00a63e] py-2" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <Link href="/auth/login" className="text-gray-700 hover:text-[#00a63e]" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link href="/checkout" className="bg-[#00a63e] hover:bg-[#029238] text-white px-5 py-2 rounded-full" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}


// Highlights row (Professional showcase with multiple cards)
function Highlights() {
  const highlights = [
    {
      title: "Plans and prices",
      description: "Explore packages full of tools, services and bonus features.",
      button: "View Plans",
      link: "/pricing",
      icon: <BarChart3 className="w-6 h-6" />,
      color: "bg-[#00a63e]"
    },
    {
      title: "AI-Powered Insights",
      description: "Get intelligent predictions and recommendations for your grain storage.",
      button: "Explore Features",
      link: "#features",
      icon: <Brain className="w-6 h-6" />,
      color: "bg-blue-600"
    },
    {
      title: "24/7 Support",
      description: "Round-the-clock assistance from our grain storage experts.",
      button: "Get Support",
      link: "/contact",
      icon: <Bell className="w-6 h-6" />,
      color: "bg-purple-600"
    }
  ]

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {highlights.map((highlight, index) => (
            <div key={index} className="group rounded-2xl bg-gradient-to-br from-[#effbf7] to-white border border-[#00a63e]/20 p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${highlight.color} text-white`}>
                  {highlight.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{highlight.title}</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">{highlight.description}</p>
              <Link href={highlight.link} className={`inline-block ${highlight.color} text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 group-hover:scale-105`}>
                {highlight.button}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Animated Features
function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Spoilage Prediction",
      description: "Predict deterioration before it happens, saving costs.",
      color: "bg-blue-500"
    },
    {
      icon: Thermometer,
      title: "IoT Sensor Management",
      description: "Real-time monitoring of temperature and humidity.",
      color: "bg-green-500"
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Comprehensive trends, history and facility comparisons.",
      color: "bg-purple-500"
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Instant notifications on threshold breaches.",
      color: "bg-yellow-500"
    },
    {
      icon: BarChart3,
      title: "Grain Batch Tracking",
      description: "Complete traceability from harvest to storage.",
      color: "bg-red-500"
    },
    {
      icon: WheatIcon,
      title: "Silo Management",
      description: "Monitor and manage multiple storage silos efficiently.",
      color: "bg-indigo-500"
    }
  ]

  return (
    <section id="features" className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <AnimatedText
            text="Built for modern grain operations"
            className="text-3xl md:text-4xl font-bold mb-3"
          />
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Comprehensive tools to optimize your grain storage, reduce losses, and maximize profitability.</p>
        </div>
        <AnimatedFeatureCards features={features} />
      </div>
    </section>
  )
}


// Pricing showcase (uses project pricing data)
function PricingShowcase() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(pricingData[0]?.id ?? null)
  return (
    <section id="plans" className="py-16 px-4 sm:px-6 lg:px-8 bg-[#effbf7]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-sm md:text-base font-medium text-[#00a63e]">Plans and pricing</span>
          <h3 className="text-3xl md:text-5xl font-bold mt-2">Pick the plan that checks your boxes</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingData.map((p: Plan) => {
            const priceText = p.priceFrontend ?? `$${p.price}${p.duration ?? ''}`
            const isSelected = selectedPlanId === p.id
            return (
              <label key={p.id} className={`cursor-pointer text-left rounded-2xl bg-white border p-6 shadow-sm transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.03] ${isSelected ? 'border-[#00a63e] ring-2 ring-[#00a63e]/20' : 'border-gray-200 hover:border-[#00a63e]/60'}`}>
                <input type="radio" name="landing-plan" value={p.id} checked={isSelected} onChange={() => setSelectedPlanId(p.id)} className="sr-only" />
                {p.id === 'intermediate' && <div className="mb-3 text-xs font-semibold text-white inline-block bg-[#00a63e] px-3 py-1 rounded-full">Most Popular</div>}
                <h4 className="text-xl font-semibold">{p.name}</h4>
                <p className="text-3xl font-bold mt-2">{priceText}</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {p.features.map((f: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />{f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    if (p.id === 'custom') {
                      window.location.href = '/contact?plan=custom'
                    } else {
                      localStorage.setItem('selectedPlanId', p.id)
                      window.location.href = '/checkout'
                    }
                  }}
                  className={`mt-6 inline-block w-full text-center py-2.5 rounded-full font-semibold transition ${isSelected ? 'bg-[#00a63e] text-white hover:bg-[#029238]' : 'border border-gray-300 hover:border-[#00a63e] hover:text-[#00a63e]'}`}
                >
                  {p.id === 'custom' ? 'Contact Us' : 'Choose plan'}
                </button>
              </label>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// About Us Section
function AboutUs() {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-sm md:text-base font-medium text-[#00a63e]">About GrainHero</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-6">Revolutionizing Grain Storage Management</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            We&apos;re on a mission to transform how farmers and grain operators manage their storage facilities
            through cutting-edge AI technology and real-time monitoring.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          <div className="space-y-8">
            <div>
              <h3 className="text-3xl font-bold mb-6 text-gray-900">Our Story</h3>
              <div className="space-y-6 text-gray-700 text-lg leading-relaxed">
                <p>
                  Founded by agricultural technology experts, GrainHero was born from a simple observation:
                  traditional grain storage management was inefficient and prone to costly losses.
                </p>
                <p>
                  We combined decades of farming experience with modern AI and IoT technology to create
                  a comprehensive platform that prevents spoilage, optimizes storage conditions, and
                  maximizes profitability for grain operations of all sizes.
                </p>
                <p>
                  Today, we serve thousands of farmers, cooperatives, and grain facilities worldwide,
                  helping them protect their harvest and increase their bottom line.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/pricing" className="bg-[#00a63e] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#029238] transition-all duration-300 text-center shadow-lg hover:shadow-xl">
                Get Started Today
              </Link>
              <Link href="/contact" className="border-2 border-[#00a63e] text-[#00a63e] px-8 py-4 rounded-full font-semibold hover:bg-[#00a63e] hover:text-white transition-all duration-300 text-center">
                Contact Our Team
              </Link>
            </div>
          </div>

          <div className="relative">
            {/* Main Platform Image Placeholder */}
            <div className="relative bg-gradient-to-br from-[#00a63e]/10 to-green-100 rounded-3xl p-8 mb-8">
              <div className="aspect-video bg-white rounded-2xl shadow-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-[#00a63e] rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-gray-600 font-medium">GrainHero Dashboard</p>
                  <p className="text-sm text-gray-500">Real-time monitoring & AI insights</p>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-[#00a63e]/10 to-green-100 p-6 rounded-2xl text-center hover:scale-105 transition-transform duration-300">
                <div className="text-3xl font-bold text-[#00a63e] mb-2">10+</div>
                <div className="text-sm font-medium text-gray-700">Years Experience</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl text-center hover:scale-105 transition-transform duration-300">
                <div className="text-3xl font-bold text-blue-600 mb-2">5000+</div>
                <div className="text-sm font-medium text-gray-700">Active Users</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl text-center hover:scale-105 transition-transform duration-300">
                <div className="text-3xl font-bold text-purple-600 mb-2">99.9%</div>
                <div className="text-sm font-medium text-gray-700">Uptime</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl text-center hover:scale-105 transition-transform duration-300">
                <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
                <div className="text-sm font-medium text-gray-700">Support</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#effbf7] to-blue-50 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Our Mission</h3>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              To empower every grain storage operation with intelligent, data-driven solutions
              that maximize efficiency, minimize waste, and ensure food security for future generations.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-16 h-16 bg-[#00a63e] rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">AI-Powered Intelligence</h4>
              <p className="text-sm text-gray-600">Advanced algorithms predict and prevent storage issues before they occur.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Real-Time Monitoring</h4>
              <p className="text-sm text-gray-600">24/7 surveillance of your grain storage conditions and quality.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Proactive Alerts</h4>
              <p className="text-sm text-gray-600">Instant notifications when action is needed to protect your grain.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// FAQs Section
function FAQs() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const faqs = [
    {
      question: "How does GrainHero prevent grain spoilage?",
      answer: "Our AI system continuously monitors temperature, humidity, and other environmental factors. When conditions approach spoilage thresholds, it automatically triggers alerts and suggests corrective actions. Our predictive algorithms can forecast potential issues up to 48 hours in advance."
    },
    {
      question: "What types of grain storage facilities does GrainHero support?",
      answer: "GrainHero works with all types of storage facilities including silos, bins, warehouses, and flat storage. Our sensors and monitoring systems are adaptable to any storage configuration, from small farm operations to large commercial facilities."
    },
    {
      question: "How accurate are the AI predictions?",
      answer: "Our AI models achieve 95%+ accuracy in predicting storage issues. The system learns from your specific storage conditions and continuously improves its predictions based on historical data and real-time monitoring."
    },
    {
      question: "Do I need technical expertise to use GrainHero?",
      answer: "Not at all! GrainHero is designed for easy use by farmers and grain operators of all technical levels. Our intuitive dashboard provides clear insights and recommendations in plain language, with step-by-step guidance for any required actions."
    },
    {
      question: "What kind of support do you provide?",
      answer: "We offer 24/7 technical support via phone, email, and chat. Our team includes agricultural experts and technical specialists who understand both farming operations and technology. We also provide comprehensive training and ongoing consultation services."
    },
    {
      question: "How quickly can I get started with GrainHero?",
      answer: "Most customers are up and running within 24-48 hours. Our installation team handles sensor setup and system configuration. You can start monitoring your grain storage immediately, with full AI-powered insights available within the first week."
    },
    {
      question: "Is my data secure with GrainHero?",
      answer: "Absolutely. We use enterprise-grade encryption for all data transmission and storage. Your agricultural data is never shared with third parties without your explicit consent. We comply with all relevant data protection regulations and maintain strict security protocols."
    },
    {
      question: "Can GrainHero integrate with my existing farm management systems?",
      answer: "Yes! GrainHero offers APIs and integrations with most popular farm management software, accounting systems, and ERP platforms. Our team can help you set up seamless data flow between systems to streamline your operations."
    }
  ]

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-sm md:text-base font-medium text-[#00a63e]">Frequently Asked Questions</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-6">Everything You Need to Know</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get answers to common questions about GrainHero&apos;s grain storage management platform.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <button
                className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              >
                <span className="text-lg font-semibold text-gray-900 pr-4">{faq.question}</span>
                <div className={`w-6 h-6 rounded-full bg-[#00a63e] flex items-center justify-center transition-transform ${openFAQ === index ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {openFAQ === index && (
                <div className="px-6 pb-6">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">Still have questions? We&apos;re here to help!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="bg-[#00a63e] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#029238] transition-colors">
              Contact Support
            </Link>
            <Link href="/pricing" className="border border-[#00a63e] text-[#00a63e] px-8 py-3 rounded-full font-semibold hover:bg-[#00a63e] hover:text-white transition-colors">
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// Animated CTA
function CTA() {
  return (
    <AnimatedCTA
      title="Ready to optimize your grain storage?"
      description="Join thousands of farmers and grain operators who trust GrainHero to protect their harvest and maximize profits."
      buttonText="Get started"
      onButtonClick={() => window.location.href = '/checkout'}
    />
  )
}


// Footer (simplified, no sensitive information)
function Footer() {
  const currentYear = new Date().getFullYear()
  const footerColumns = [
    {
      title: 'Product',
      links: [
        { href: '/pricing', label: 'Pricing' },
        { href: '#features', label: 'Features' },
        { href: '/auth/login', label: 'Login' }
      ]
    },
    {
      title: 'Company',
      links: [
        { href: '#about', label: 'About Us' },
        { href: '#faq', label: 'FAQ' },
        { href: '/contact', label: 'Contact' },
        { href: '/privacy-policy', label: 'Privacy Policy' }
      ]
    }
  ]
  return (
    <footer className="bg-white text-gray-800 pt-12 px-4 sm:px-6 lg:px-8 border-t">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <WheatIcon className="w-8 h-8 text-[#00a63e]" />
              <span className="text-2xl font-bold">GrainHero</span>
            </div>
            <p className="text-gray-600 mb-6 max-w-md">AI-powered grain storage management for the modern age.</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#effbf7] flex items-center justify-center" aria-label="Twitter (static)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 12 7.48v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83" /></svg>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#effbf7] flex items-center justify-center" aria-label="LinkedIn (static)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zM8 8h3.8v2.05h.05C12.62 8.62 14.44 8 16.5 8 21 8 22 10.5 22 14.43V23h-4v-7.09c0-1.69-.03-3.87-2.36-3.87-2.36 0-2.72 1.85-2.72 3.76V23H8V8z" /></svg>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#effbf7] flex items-center justify-center" aria-label="Facebook (static)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2v-3h2v-2.3c0-2 1.2-3.1 3-3.1.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2V12h2.2l-.3 3h-1.9v7A10 10 0 0 0 22 12" /></svg>
              </div>
            </div>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-lg font-semibold mb-4">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="text-gray-600 hover:text-[#00a63e] transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="py-6 border-t text-center text-gray-500">
          <p>&copy; {currentYear} GrainHero. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
