"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, CreditCard, Shield, Clock, Users, Zap, Globe } from "lucide-react"
import pricingData from '../pricing-data.js'

export default function CheckoutPage() {
    const searchParams = useSearchParams()
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [userEmail, setUserEmail] = useState<string>('')
    const router = useRouter()

    useEffect(() => {
        // Get user email from URL params or localStorage
        const email = searchParams.get('email') || localStorage.getItem('signupEmail')
        if (email) {
            setUserEmail(email)
            localStorage.setItem('signupEmail', email)
        }

        // Pre-select plan if coming from pricing page
        const preselectedPlan = localStorage.getItem('selectedPlanId')
        if (preselectedPlan) {
            setSelectedPlan(preselectedPlan)
            localStorage.removeItem('selectedPlanId') // Clear after use
        }
    }, [searchParams])

    const handlePlanSelect = (planId: string) => {
        setSelectedPlan(planId)
    }

    const handlePayment = async () => {
        if (!selectedPlan || !userEmail) return

        setIsProcessing(true)
        try {
            const plan = pricingData.find(p => p.id === selectedPlan)

            if (!plan) {
                console.error('Plan not found for selected plan:', selectedPlan)
                setIsProcessing(false)
                return
            }

            if (plan.id === 'custom') {
                // Handle custom/contact plans - redirect to contact form
                router.push('/contact?plan=custom')
                return
            }

            // Store checkout data for post-payment processing
            localStorage.setItem('checkoutData', JSON.stringify({
                planId: selectedPlan,
                userEmail: userEmail,
                timestamp: new Date().toISOString()
            }))

            // Use dynamic checkout only (no static links)
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: plan.priceId,
                    userEmail: userEmail,
                    planId: selectedPlan
                })
            })

            const data = await response.json()

            if (data.success && data.checkoutUrl) {
                // Redirect to dynamic Stripe checkout
                window.location.href = data.checkoutUrl
            } else {
                console.error('Failed to create checkout session:', data.message)
                setIsProcessing(false)

                // Show user-friendly error messages
                let errorMessage = data.message || 'Please try again.'
                if (data.message && data.message.includes('already have an active subscription')) {
                    errorMessage = 'You already have an active subscription. Please contact us to upgrade or change your plan.'
                }

                alert(`Failed to create checkout session: ${errorMessage}`)
            }
        } catch (error) {
            console.error('Checkout error:', error)
            setIsProcessing(false)
            alert('Checkout failed. Please try again.')
        }
    }

    const selectedPlanData = pricingData.find(p => p.id === selectedPlan)

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Select the perfect plan for your grain storage needs and complete your subscription
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Plan Selection */}
                    <div className="lg:col-span-2">
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <CreditCard className="h-6 w-6 text-green-600" />
                                    Select Your Plan
                                </CardTitle>
                                <CardDescription>
                                    Choose the plan that best fits your grain storage requirements
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {pricingData.map((plan) => (
                                        <label
                                            key={plan.id}
                                            className={`block rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedPlan === plan.id
                                                ? 'border-green-500 bg-green-50 shadow-lg'
                                                : 'border-gray-200 bg-white hover:border-green-300'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <input
                                                            type="radio"
                                                            name="plan"
                                                            value={plan.id}
                                                            checked={selectedPlan === plan.id}
                                                            onChange={() => handlePlanSelect(plan.id)}
                                                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                        />
                                                        <div>
                                                            <h3 className="text-xl font-semibold text-gray-900">
                                                                {plan.name}
                                                            </h3>
                                                            {plan.popular && (
                                                                <Badge className="bg-green-600 text-white ml-2">
                                                                    Most Popular
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-gray-600 mb-4">
                                                        {plan.description}
                                                    </p>

                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <Users className="h-4 w-4 text-green-600" />
                                                            <span>{plan.limits.users} Users</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <Globe className="h-4 w-4 text-green-600" />
                                                            <span>{plan.limits.storage}GB Storage</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <Zap className="h-4 w-4 text-green-600" />
                                                            <span>AI Insights</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <Shield className="h-4 w-4 text-green-600" />
                                                            <span>24/7 Support</span>
                                                        </div>
                                                    </div>

                                                    <ul className="space-y-2">
                                                        {plan.features.map((feature, index) => (
                                                            <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                                                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                                <span>{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="text-right ml-6">
                                                    <div className="text-3xl font-bold text-gray-900 mb-1">
                                                        ${plan.price}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        per {plan.interval}
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Email Input */}
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle className="text-xl">Account Information</CardTitle>
                                <CardDescription>
                                    Enter your email address to proceed with the order
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={userEmail}
                                            onChange={(e) => setUserEmail(e.target.value)}
                                            placeholder="Enter your email address"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                            required
                                        />
                                        {userEmail && (
                                            <p className="text-sm text-green-600 mt-1">
                                                ✓ Email address provided
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Order Summary */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-8">
                            <CardHeader>
                                <CardTitle className="text-xl">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {selectedPlanData ? (
                                    <>
                                        {/* Plan Details */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">
                                                        {selectedPlanData.name}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">
                                                        {selectedPlanData.description}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-gray-900">
                                                        ${selectedPlanData.price}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        per {selectedPlanData.interval}
                                                    </div>
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Plan Features */}
                                            <div className="space-y-2">
                                                <h5 className="font-medium text-gray-900">What&apos;s included:</h5>
                                                <ul className="space-y-1">
                                                    {selectedPlanData.features.slice(0, 4).map((feature, index) => (
                                                        <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                                            <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                    {selectedPlanData.features.length > 4 && (
                                                        <li className="text-sm text-gray-500">
                                                            +{selectedPlanData.features.length - 4} more features
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Pricing Breakdown */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span>Plan Price</span>
                                                <span>${selectedPlanData.price}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>Billing Cycle</span>
                                                <span>{selectedPlanData.interval}</span>
                                            </div>
                                            <Separator />
                                            <div className="flex justify-between font-semibold text-lg">
                                                <span>Total</span>
                                                <span>${selectedPlanData.price}</span>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Security Badges */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Shield className="h-4 w-4 text-green-600" />
                                                <span>256-bit SSL encryption</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <CreditCard className="h-4 w-4 text-green-600" />
                                                <span>Secure payment processing</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock className="h-4 w-4 text-green-600" />
                                                <span>Instant activation</span>
                                            </div>
                                        </div>

                                        {/* Checkout Button */}
                                        <Button
                                            onClick={handlePayment}
                                            disabled={!selectedPlan || !userEmail || isProcessing}
                                            className={`w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${selectedPlan === 'custom'
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {selectedPlan === 'custom' ? (
                                                    <>
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        {isProcessing ? 'Redirecting...' : 'Contact Us'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard className="h-5 w-5" />
                                                        {isProcessing ? 'Processing...' : 'Proceed to Payment'}
                                                    </>
                                                )}
                                            </div>
                                        </Button>

                                        {(!selectedPlan || !userEmail) && (
                                            <div className="text-sm text-gray-500 text-center">
                                                {!selectedPlan && !userEmail
                                                    ? "Please select a plan and enter your email address"
                                                    : !selectedPlan
                                                        ? "Please select a plan to continue"
                                                        : "Please enter your email address to continue"
                                                }
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-500 text-center">
                                            By proceeding, you agree to our Terms of Service and Privacy Policy.
                                            You can cancel anytime.
                                        </p>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600">
                                            Select a plan to see order details
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
