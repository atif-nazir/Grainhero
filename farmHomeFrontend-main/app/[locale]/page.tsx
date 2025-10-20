'use client'
import { Wheat as WheatIcon, Menu, X, BarChart3, Brain, Thermometer, TrendingUp, Bell, Check, Shield, Zap } from "lucide-react"
import { Link } from '@/i18n/navigation'
import { useState, useEffect } from 'react'
import pricingData from './pricing-data.js'

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
    <main className="min-h-screen bg-white text-black">
      <Navigation />
      <Hero />
      <Highlights />
      <Features />
      <PricingShowcase />
      <CTA />
      <Contact />
      <Footer />
    </main>
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
    { href: '#plans', label: 'Pricing' },
    { href: '#features', label: 'Features' },
    { href: '#contact', label: 'Contact' }
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

// Hero - Clean design with project theme colors
function Hero() {
  return (
    <section id="home" className="pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-[#effbf7]">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="transition-all duration-700">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900">
            Your grain success
            <br /> starts here
          </h1>
          <p className="mt-6 text-lg text-gray-700 max-w-xl">
            From monitoring to AI predictions, GrainHero has you covered.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href="/checkout" className="bg-black text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition">
              Start now
            </Link>
            <Link href="/pricing" className="px-6 py-3 rounded-full font-semibold border border-gray-300 text-gray-900 hover:border-[#00a63e] hover:text-[#00a63e] transition">
              Plans and prices
            </Link>
          </div>
        </div>
        <div className="transition-all duration-700">
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#00a63e]/10 rounded-lg"></div>
            <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-[#00a63e]/10 rounded-lg"></div>
            <div className="rounded-2xl bg-white shadow-xl p-4">
              <div className="aspect-video rounded-xl bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-[#00a63e] mx-auto mb-2" />
                  <p className="text-sm text-gray-500">bold moves</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Highlights row (Professional showcase with multiple cards)
function Highlights() {
  const highlights = [
    {
      title: "Plans and prices",
      description: "Explore packages full of tools, services and bonus features.",
      button: "From $99/mo",
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
      link: "#contact",
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

// Features (expanded to 9 features in 3x3 grid with hover effects)
function Features() {
  const features = [
    { icon: <Brain className="w-6 h-6" />, title: "AI-Powered Spoilage Prediction", description: "Predict deterioration before it happens, saving costs." },
    { icon: <Thermometer className="w-6 h-6" />, title: "IoT Sensor Management", description: "Real-time monitoring of temperature and humidity." },
    { icon: <TrendingUp className="w-6 h-6" />, title: "Analytics Dashboard", description: "Comprehensive trends, history and facility comparisons." },
    { icon: <Bell className="w-6 h-6" />, title: "Smart Alerts", description: "Instant notifications on threshold breaches." },
    { icon: <BarChart3 className="w-6 h-6" />, title: "Grain Batch Tracking", description: "Complete traceability from harvest to storage." },
    { icon: <WheatIcon className="w-6 h-6" />, title: "Silo Management", description: "Monitor and manage multiple storage silos efficiently." },
    { icon: <Check className="w-6 h-6" />, title: "Quality Control", description: "Automated quality assessment and grading systems." },
    { icon: <Shield className="w-6 h-6" />, title: "Risk Assessment", description: "Identify and mitigate storage risks proactively." },
    { icon: <Zap className="w-6 h-6" />, title: "Automated Controls", description: "Smart ventilation and climate control systems." }
  ]

  return (
    <section id="features" className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Built for modern grain operations</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Comprehensive tools to optimize your grain storage, reduce losses, and maximize profitability.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className={`group rounded-xl border border-gray-200 p-6 bg-white transition-all duration-300 hover:border-[#00a63e] hover:shadow-lg hover:-translate-y-1 delay-[${index * 30}ms]`}>
              <div className="text-[#00a63e] mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
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
                <Link href="/auth/signup" className={`mt-6 inline-block w-full text-center py-2.5 rounded-full font-semibold transition ${isSelected ? 'bg-[#00a63e] text-white hover:bg-[#029238]' : 'border border-gray-300 hover:border-[#00a63e] hover:text-[#00a63e]'}`}>Choose plan</Link>
              </label>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// CTA (bottom)
function CTA() {
  return (
    <section id="cta" className="py-16 px-4 sm:px-6 lg:px-8 bg-[#effbf7]">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to optimize your grain storage?</h2>
        <p className="text-gray-700 mb-8">Join thousands of farmers and grain operators who trust GrainHero to protect their harvest and maximize profits.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/checkout" className="bg-[#00a63e] hover:bg-[#029238] text-white px-8 py-4 rounded-full text-lg font-semibold transition">Get started</Link>
          <Link href="#contact" className="border-2 border-[#00a63e] text-[#00a63e] hover:bg-[#00a63e] hover:text-white px-8 py-4 rounded-full text-lg font-semibold transition">Contact us</Link>
        </div>
      </div>
    </section>
  )
}

// Contact section (redesigned with project-specific content and modern practices)
function Contact() {
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    inquiry: 'general',
    message: '',
    subscribe: false
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setStatus(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('Thank you! We\'ll get back to you within 24 hours.')
      setForm({ name: '', email: '', company: '', phone: '', inquiry: 'general', message: '', subscribe: false })
    } catch {
      // Fallback to mailto
      const subject = `GrainHero Inquiry: ${form.inquiry}`
      const body = `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\nPhone: ${form.phone}\nInquiry: ${form.inquiry}\n\nMessage:\n${form.message}`
      window.location.href = `mailto:noreply.grainhero1@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#effbf7] to-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Get in touch with our team</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Questions about grain storage management, AI predictions, or IoT sensors?
            Our experts are here to help you optimize your operations.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Contact info and benefits */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Why contact GrainHero?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#00a63e] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">AI-Powered Solutions</h4>
                    <p className="text-gray-600 text-sm">Get personalized recommendations for your grain storage optimization</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#00a63e] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">IoT Integration Support</h4>
                    <p className="text-gray-600 text-sm">Expert guidance on sensor deployment and data analysis</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#00a63e] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Custom Implementation</h4>
                    <p className="text-gray-600 text-sm">Tailored solutions for your specific grain storage challenges</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h4 className="font-semibold mb-3">Quick Response Times</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• General inquiries: Within 24 hours</p>
                <p>• Technical support: Within 4 hours</p>
                <p>• Sales questions: Within 2 hours</p>
                <p>• Emergency support: Immediate response</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h4 className="font-semibold mb-3">Contact Information</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>📧 noreply.grainhero1@gmail.com</p>
                <p>📞 03110851784</p>
                <p>🏢 Available 24/7 for critical alerts</p>
              </div>
            </div>
          </div>

          {/* Right: Contact form */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h3 className="text-2xl font-semibold mb-6">Send us a message</h3>
            <form onSubmit={submit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00a63e]/30 focus:border-[#00a63e]"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00a63e]/30 focus:border-[#00a63e]"
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00a63e]/30 focus:border-[#00a63e]"
                    placeholder="Your Company"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00a63e]/30 focus:border-[#00a63e]"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inquiry Type *</label>
                <select
                  required
                  value={form.inquiry}
                  onChange={e => setForm({ ...form, inquiry: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00a63e]/30 focus:border-[#00a63e]"
                  aria-label="Select inquiry type"
                >
                  <option value="general">General Information</option>
                  <option value="sales">Sales & Pricing</option>
                  <option value="technical">Technical Support</option>
                  <option value="integration">IoT Integration</option>
                  <option value="partnership">Partnership</option>
                  <option value="media">Media & Press</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00a63e]/30 focus:border-[#00a63e]"
                  placeholder="Tell us about your grain storage challenges, current setup, or specific questions about our AI-powered solutions..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="subscribe"
                  checked={form.subscribe}
                  onChange={e => setForm({ ...form, subscribe: e.target.checked })}
                  className="w-4 h-4 text-[#00a63e] border-gray-300 rounded focus:ring-[#00a63e]/30"
                />
                <label htmlFor="subscribe" className="text-sm text-gray-600">
                  Subscribe to our newsletter for grain storage insights and AI updates
                </label>
              </div>

              {status && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">{status}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-[#00a63e] hover:bg-[#029238] text-white px-6 py-4 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer (simplified, no sensitive information)
function Footer() {
  const currentYear = new Date().getFullYear()
  const footerColumns = [
    { title: 'Product', links: [{ href: '#plans', label: 'Pricing' }, { href: '/auth/signup', label: 'Sign up' }, { href: '/auth/login', label: 'Login' }] },
    { title: 'Company', links: [{ href: '#contact', label: 'Contact' }] }
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
