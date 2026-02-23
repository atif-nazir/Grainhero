'use client'
import { Wheat as WheatIcon, Menu, X, BarChart3, Brain, Thermometer, TrendingUp, Bell, Check, Cpu } from "lucide-react"
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
  popular?: boolean
  iotChargeLabel?: string
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
    { href: '/about', label: 'About' },
    { href: '/faq', label: 'FAQ' },
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

// (removed legacy Hero component)

// Highlights row (Professional showcase with multiple cards)
function Highlights() {
  const highlights = [
    {
      title: "Plans and prices",
      description: "Explore packages full of tools, services and bonus features.",
      button: "From Rs. 1,499/mo",
      link: "#plans",
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
        <div className="flex flex-wrap justify-center gap-6">
          {pricingData.map((p: Plan) => {
            const priceText = p.priceFrontend ?? `Rs. ${p.price?.toLocaleString()}${p.duration ?? ''}`
            const isSelected = selectedPlanId === p.id
            return (
              <label key={p.id} className={`cursor-pointer text-left w-full max-w-sm rounded-2xl bg-white border p-6 shadow-sm transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.03] ${isSelected ? 'border-[#00a63e] ring-2 ring-[#00a63e]/20' : 'border-gray-200 hover:border-[#00a63e]/60'}`}>
                <input type="radio" name="landing-plan" value={p.id} checked={isSelected} onChange={() => setSelectedPlanId(p.id)} className="sr-only" />
                {p.popular && <div className="mb-3 text-xs font-semibold text-white inline-block bg-[#00a63e] px-3 py-1 rounded-full">Most Popular</div>}
                <h4 className="text-xl font-semibold">{p.name}</h4>
                <p className="text-3xl font-bold mt-2 text-[#00a63e]">{priceText}</p>
                {p.iotChargeLabel && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
                    <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{p.iotChargeLabel}</span>
                  </div>
                )}
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {p.features.map((f: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />{f}</li>
                  ))}
                </ul>
                <Link href="/checkout" onClick={() => { try { localStorage.setItem('selectedPlanId', p.id) } catch { } }} className={`mt-6 inline-block w-full text-center py-2.5 rounded-full font-semibold transition ${isSelected ? 'bg-[#00a63e] text-white hover:bg-[#029238]' : 'border border-gray-300 hover:border-[#00a63e] hover:text-[#00a63e]'}`}>{p.id === 'custom' ? 'Contact Us' : 'Choose plan'}</Link>
              </label>
            )
          })}
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

// Contact removed (use /contact page)

// Footer (simplified, no sensitive information)
function Footer() {
  const currentYear = new Date().getFullYear()
  const footerColumns = [
    { title: 'Product', links: [{ href: '/pricing', label: 'Pricing' }, { href: '/auth/login', label: 'Login' }] },
    {
      title: 'Company', links: [
        { href: '/about', label: 'About Us' },
        { href: '/faq', label: 'FAQs' },
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
