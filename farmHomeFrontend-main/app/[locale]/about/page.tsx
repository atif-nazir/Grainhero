'use client'

import { Wheat as WheatIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-white text-black">
            {/* Hero */}
            <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#effbf7] to-white border-b">
                <div className="max-w-6xl mx-auto text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-[#00a63e]/10 rounded-full p-3">
                            <WheatIcon className="h-10 w-10 text-[#00a63e]" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">About GrainHero</h1>
                    <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                        AI-powered grain storage management for modern operations. Monitor, protect, and optimize your stored grain.
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
                    <div className="space-y-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-center lg:text-left">Our Mission</h2>
                        <p className="text-gray-700 text-lg leading-relaxed">
                            We empower every grain storage operation with intelligent, data-driven tools to maximize
                            efficiency, minimize waste, and ensure food security. Our platform combines real-time IoT
                            monitoring with predictive AI to proactively prevent spoilage and quality loss.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                'AI spoilage prediction & proactive alerts',
                                'End-to-end batch traceability (QR-enabled)',
                                'Real-time silo & environment monitoring',
                                'Actionable analytics & exportable reports',
                                'Role-based access & audit logs',
                                '24/7 support and onboarding assistance'
                            ].map((item) => (
                                <div key={item} className="rounded-2xl border border-[#00a63e]/20 bg-white p-4 hover:shadow-md transition-shadow">
                                    <p className="text-sm text-gray-800">{item}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
                            <Link href="/pricing" className="bg-[#00a63e] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#029238] transition-colors">View Pricing</Link>
                            <Link href="/contact" className="border border-[#00a63e] text-[#00a63e] px-6 py-3 rounded-full font-semibold hover:bg-[#00a63e] hover:text-white transition-colors">Contact Us</Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { v: '10+', l: 'Years Experience', c: 'text-[#00a63e]' },
                            { v: '5000+', l: 'Active Users', c: 'text-blue-600' },
                            { v: '99.9%', l: 'Uptime', c: 'text-purple-600' },
                            { v: '24/7', l: 'Support', c: 'text-orange-600' }
                        ].map(({ v, l, c }) => (
                            <div key={l} className="bg-gradient-to-br from-[#00a63e]/5 to-green-50 p-6 rounded-2xl text-center hover:scale-[1.02] transition-transform border border-[#00a63e]/10">
                                <div className={`text-3xl font-bold mb-1 ${c}`}>{v}</div>
                                <div className="text-sm text-gray-700">{l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Image Gallery */}
            <section className="pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Platform in Action</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="group relative overflow-hidden rounded-2xl border border-[#00a63e]/20 bg-white">
                                <div className="aspect-video bg-cover bg-center" style={{ backgroundImage: "url('/images/grain-fields-hero.jpg')" }} />
                                <div className="p-4">
                                    <p className="text-sm text-gray-700">{i === 1 ? 'Real-time dashboard' : i === 2 ? 'AI spoilage prediction' : 'Traceability & QR tagging'}</p>
                                </div>
                                <div className="absolute inset-0 bg-[#00a63e]/0 group-hover:bg-[#00a63e]/5 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    )
}


