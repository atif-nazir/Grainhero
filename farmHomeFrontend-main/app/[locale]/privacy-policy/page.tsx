'use client'

import { Wheat as WheatIcon, ArrowLeft, Shield, Lock, Eye, Database, Users, FileText } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center space-x-2">
                            <WheatIcon className="w-8 h-8 text-[#00a63e]" />
                            <span className="text-xl font-bold">GrainHero</span>
                        </Link>
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-600 hover:text-[#00a63e] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-6">
                        <div className="bg-[#00a63e]/10 p-4 rounded-full">
                            <Shield className="h-12 w-12 text-[#00a63e]" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Your privacy is important to us. Learn how GrainHero protects and manages your agricultural data.
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Introduction */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-[#00a63e]" />
                                Introduction
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-gray-700">
                                GrainHero (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use
                                our grain storage management platform.
                            </p>
                            <p className="text-gray-700">
                                This policy applies to all users of our services, including farmers, agricultural cooperatives,
                                and grain storage facilities.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Information We Collect */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-[#00a63e]" />
                                Information We Collect
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Personal Information</h4>
                                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                                    <li>Name, email address, and phone number</li>
                                    <li>Business information and farm details</li>
                                    <li>Payment and billing information</li>
                                    <li>Account credentials and preferences</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Agricultural Data</h4>
                                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                                    <li>Grain storage quantities and types</li>
                                    <li>Environmental sensor readings (temperature, humidity)</li>
                                    <li>Storage facility information and locations</li>
                                    <li>Quality assessments and test results</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Technical Information</h4>
                                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                                    <li>Device information and IP addresses</li>
                                    <li>Usage patterns and feature interactions</li>
                                    <li>Log files and error reports</li>
                                    <li>Cookies and similar tracking technologies</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* How We Use Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5 text-[#00a63e]" />
                                How We Use Your Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Service Delivery</h4>
                                    <ul className="list-disc pl-6 space-y-1 text-gray-700">
                                        <li>Provide grain storage management tools</li>
                                        <li>Generate AI-powered insights and predictions</li>
                                        <li>Send alerts and notifications</li>
                                        <li>Process payments and subscriptions</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Data Analysis</h4>
                                    <ul className="list-disc pl-6 space-y-1 text-gray-700">
                                        <li>Improve our algorithms and models</li>
                                        <li>Develop new features and services</li>
                                        <li>Conduct research and analytics</li>
                                        <li>Ensure system security and reliability</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Protection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-[#00a63e]" />
                                Data Protection & Security
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-gray-700">
                                We implement industry-standard security measures to protect your data:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-gray-700">
                                <li>End-to-end encryption for data transmission</li>
                                <li>Secure cloud storage with regular backups</li>
                                <li>Access controls and authentication systems</li>
                                <li>Regular security audits and updates</li>
                                <li>Employee training on data protection practices</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Data Sharing */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-[#00a63e]" />
                                Data Sharing & Disclosure
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-gray-700">
                                We do not sell your personal or agricultural data. We may share information only in these limited circumstances:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-gray-700">
                                <li>With your explicit consent</li>
                                <li>To comply with legal obligations</li>
                                <li>To protect our rights and prevent fraud</li>
                                <li>With trusted service providers (under strict confidentiality agreements)</li>
                                <li>In case of business transfers (with prior notice)</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Your Rights */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-[#00a63e]" />
                                Your Rights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-gray-700">
                                You have the right to:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-gray-700">
                                <li>Access and review your personal data</li>
                                <li>Correct inaccurate or incomplete information</li>
                                <li>Request deletion of your data</li>
                                <li>Export your data in a portable format</li>
                                <li>Opt out of certain data processing activities</li>
                                <li>Withdraw consent at any time</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Us</CardTitle>
                            <CardDescription>
                                Questions about this Privacy Policy? We&apos;re here to help.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Email</h4>
                                    <p className="text-gray-700">privacy@grainhero.com</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Phone</h4>
                                    <p className="text-gray-700">03110851784</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-sm text-gray-600">
                                    We will respond to your privacy inquiries within 30 days.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-900 text-white py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <WheatIcon className="w-6 h-6 text-[#00a63e]" />
                        <span className="text-lg font-bold">GrainHero</span>
                    </div>
                    <p className="text-gray-400 text-sm">
                        &copy; {new Date().getFullYear()} GrainHero. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
