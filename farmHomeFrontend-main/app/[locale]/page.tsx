'use client'
import { Wheat as WheatIcon, Menu, X, BarChart3, Brain, Thermometer, TrendingUp, Bell, Check } from "lucide-react"
import { Link } from '@/i18n/navigation'
import { useState, useEffect } from 'react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <Navigation />
      <Hero />
      <Highlights />
      <Features />
      <GrowthSection />
      <EmailSection />
      <PricingShowcase />
      <MadeWithSection />
      <CTA />
      <Footer />
    </main>
  )
}

// Navigation
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { href: '#plans', label: 'Plans' },
    { href: '#features', label: 'Features' },
    { href: '#testimonials', label: 'Testimonials' }
  ]

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-200' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <WheatIcon className="w-8 h-8 text-[#00a63e]" />
            <span className="text-2xl font-bold">GrainHero</span>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-gray-700 hover:text-[#00a63e] transition-colors duration-200">
                {item.label}
              </Link>
            ))}
            <Link href="/auth/login" className="text-gray-700 hover:text-[#00a63e] transition-colors duration-200">
              Login
            </Link>
            <Link href="/auth/signup" className="bg-[#00a63e] hover:bg-[#029238] text-white px-6 py-2 rounded-full transition-all duration-300 hover:scale-105">
              Get Started
            </Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="block text-gray-700 hover:text-[#00a63e] transition-colors duration-200 py-2" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <Link href="/auth/login" className="block text-gray-700 hover:text-[#00a63e] transition-colors duration-200 py-2" onClick={() => setMobileMenuOpen(false)}>
                Login
              </Link>
              <Link href="/auth/signup" className="block w-full bg-[#00a63e] hover:bg-[#029238] text-white px-6 py-2 rounded-full text-center transition-all duration-300" onClick={() => setMobileMenuOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// Hero - two columns with light green background and mock cards
function Hero() {
  return (
    <section id="home" className="pt-24 md:pt-28 pb-12 px-4 sm:px-6 lg:px-8 bg-[#effbf7]">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="transition-all duration-700">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Your grain success
            <br /> starts here
          </h1>
          <p className="mt-6 text-lg text-gray-700 max-w-xl">
            From monitoring to AI predictions, GrainHero has you covered.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href="/auth/signup" className="bg-black text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition">
              Start now
            </Link>
            <Link href="#plans" className="px-6 py-3 rounded-full font-semibold border border-gray-300 text-gray-900 hover:border-[#00a63e] hover:text-[#00a63e] transition">
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
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Page views</p>
                  <p className="text-2xl font-semibold">1,934</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">AI insights</p>
                  <p className="text-2xl font-semibold text-[#00a63e]">+7%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Highlights row (Plans + Domain style blocks)
function Highlights() {
  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#effbf7] to-white border border-[#00a63e]/20 p-6">
          <h3 className="text-xl font-semibold mb-2">Plans and prices</h3>
          <p className="text-gray-600 mb-4">Explore packages full of tools, services and bonus features.</p>
          <Link href="#plans" className="inline-block bg-[#00a63e] text-white px-5 py-2 rounded-full">From $9/mo</Link>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-white to-[#effbf7] border border-[#00a63e]/20 p-6">
          <h3 className="text-xl font-semibold mb-2">Find a domain</h3>
          <p className="text-gray-600 mb-4">Make your mark online with the perfect name.</p>
          <div className="flex items-center gap-2">
            <input className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none" placeholder="yourfarm" />
            <button className="rounded-full bg-black text-white px-5 py-2">Search</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// Features (restyled to white cards with green accents)
function Features() {
  const features = [
    { icon: <Brain className="w-7 h-7" />, title: "AI-Powered Spoilage Prediction", description: "Predict deterioration before it happens, saving costs." },
    { icon: <Thermometer className="w-7 h-7" />, title: "IoT Sensor Management", description: "Real-time monitoring of temp and humidity." },
    { icon: <TrendingUp className="w-7 h-7" />, title: "Analytics Dashboard", description: "Trends, history and facility comparisons." },
    { icon: <Bell className="w-7 h-7" />, title: "Smart Alerts", description: "Instant notifications on threshold breaches." }
  ]

  return (
    <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">From idea to online, quicker and slicker</h2>
          <p className="text-gray-600 mt-3">Built-in tools to launch and grow confidently.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className={`rounded-xl border border-gray-200 p-6 bg-white transition-all duration-300 hover:shadow-md delay-[${index * 100}ms]`}>
              <div className="text-[#00a63e] mb-3">{feature.icon}</div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Growth section (dark gradient style block)
function GrowthSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0b0b0b] to-[#141414] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-semibold">More power & control</h3>
            <ul className="mt-6 space-y-3 text-gray-300 text-sm">
              <li>Automate the busywork</li>
              <li>Performance you can rely on</li>
            </ul>
          </div>
          <div>
            <h3 className="text-2xl font-semibold">More flexible growth</h3>
            <ul className="mt-6 space-y-3 text-gray-300 text-sm">
              <li>Hosting that grows with you</li>
              <li>Tools for agencies</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {['4M+', '150+', '20+', '10M+'].map((k, i) => (
            <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
              <p className="text-3xl font-bold">{k}</p>
              <p className="text-xs text-gray-300 mt-2">metric</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Email/marketing showcase style block
function EmailSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-3xl font-bold text-center mb-10">Email your audience with confidence</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-200 p-6">
            <h4 className="text-xl font-semibold mb-2">Build trust with a professional business email</h4>
            <ul className="text-sm text-gray-600 space-y-2 mt-4">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />Custom domains</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />SSL & protection</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />Inbox tools</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6">
            <h4 className="text-xl font-semibold mb-2">Grow with AI‑powered email marketing</h4>
            <ul className="text-sm text-gray-600 space-y-2 mt-4">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />Smart segmentation</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />Automations</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />Analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// Pricing showcase (four cards)
function PricingShowcase() {
  const plans = [
    { name: 'Single', price: 'Rs. 399/mo', features: ['Basic sensors', 'Email alerts', '1 site'] },
    { name: 'Premium', price: 'Rs. 599/mo', features: ['Advanced sensors', 'AI predictions', '3 months free'], popular: true },
    { name: 'Business', price: 'Rs. 799/mo', features: ['More facilities', 'Priority support'] },
    { name: 'Cloud Startup', price: 'Rs. 2,099/mo', features: ['Unlimited', 'SLA support'] },
  ]
  return (
    <section id="plans" className="py-16 px-4 sm:px-6 lg:px-8 bg-[#effbf7]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-sm font-medium text-[#00a63e]">Plans and pricing</span>
          <h3 className="text-3xl md:text-4xl font-bold mt-2">Pick the plan that checks your boxes</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p, i) => (
            <div key={i} className={`rounded-2xl bg-white border ${p.popular ? 'border-[#00a63e]' : 'border-gray-200'} p-6 shadow-sm`}>
              {p.popular && <div className="mb-3 text-xs font-semibold text-white inline-block bg-[#00a63e] px-3 py-1 rounded-full">Most Popular</div>}
              <h4 className="text-xl font-semibold">{p.name}</h4>
              <p className="text-3xl font-bold mt-2">{p.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                {p.features.map((f, idx) => (
                  <li key={idx} className="flex items-center gap-2"><Check className="w-4 h-4 text-[#00a63e]" />{f}</li>
                ))}
              </ul>
              <Link href="/auth/signup" className={`mt-6 inline-block w-full text-center py-2.5 rounded-full font-semibold transition ${p.popular ? 'bg-[#00a63e] text-white hover:bg-[#029238]' : 'border border-gray-300 hover:border-[#00a63e] hover:text-[#00a63e]'}`}>Choose plan</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Made with section (gallery placeholder)
function MadeWithSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto text-center">
        <h3 className="text-3xl font-bold mb-6">Made with GrainHero</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl h-28 bg-gray-100" />
          ))}
        </div>
        <Link href="#plans" className="mt-8 inline-block bg-black text-white px-6 py-3 rounded-full">Get started</Link>
      </div>
    </section>
  )
}

// CTA (bottom)
function CTA() {
  return (
    <section id="cta" className="py-16 px-4 sm:px-6 lg:px-8 bg-[#effbf7]">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Not sure which plan to choose?</h2>
        <p className="text-gray-700 mb-8">Our smart AI assistant can help you find the best package for your project.</p>
        <Link href="/auth/signup" className="bg-[#00a63e] hover:bg-[#029238] text-white px-8 py-4 rounded-full text-lg font-semibold transition">Get started</Link>
      </div>
    </section>
  )
}

// Footer (light)
function Footer() {
  const currentYear = new Date().getFullYear()
  const footerSections = [
    { title: 'Product', links: [{ href: '/#features', label: 'Features' }, { href: '/pricing', label: 'Pricing' }, { href: '/api', label: 'API' }, { href: '/documentation', label: 'Documentation' }] },
    { title: 'Company', links: [{ href: '/about', label: 'About' }, { href: '/blog', label: 'Blog' }, { href: '/careers', label: 'Careers' }, { href: '/contact', label: 'Contact' }] },
    { title: 'Legal', links: [{ href: '/privacy', label: 'Privacy Policy' }, { href: '/terms', label: 'Terms of Service' }, { href: '/cookies', label: 'Cookie Policy' }, { href: '/gdpr', label: 'GDPR' }] }
  ]
  return (
    <footer className="bg-white text-gray-800 py-12 px-4 sm:px-6 lg:px-8 border-t">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <WheatIcon className="w-8 h-8 text-[#00a63e]" />
              <span className="text-2xl font-bold">GrainHero</span>
            </Link>
            <p className="text-gray-600 mb-4">AI-powered grain storage management for the modern age.</p>
            <div className="flex space-x-4">
              {['twitter', 'linkedin', 'facebook'].map((platform) => (
                <Link key={platform} href={`https://${platform}.com/grainhero`} className="w-10 h-10 bg-[#effbf7] rounded-full flex items-center justify-center hover:bg-[#00a63e] hover:text-white transition-colors duration-200" aria-label={`Follow us on ${platform}`}>
                  <span className="sr-only">{platform}</span>
                  <div className="w-5 h-5 bg-current rounded-sm opacity-70"></div>
                </Link>
              ))}
            </div>
          </div>
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-600 hover:text-[#00a63e] transition-colors duration-200">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t text-center text-gray-500">
          <p>&copy; {currentYear} GrainHero. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
