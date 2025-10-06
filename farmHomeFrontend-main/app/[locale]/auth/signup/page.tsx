"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import pricingData from "../../pricing-data.js"
import { WheatIcon as Sheep, Check } from "lucide-react"
import { config } from "@/config"
import { useTranslations } from 'next-intl';

export default function SignUpPage() {
  const t = useTranslations('AuthPage');
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(pricingData[0]?.id ?? null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`${config.backendUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
          confirm_password: formData.confirmPassword,
        }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        setMessage(error?.message || "Signup failed. Please try again.")
      } else {
        // After account creation, redirect to Stripe checkout for the selected plan if available
        const plan = pricingData.find(p => p.id === selectedPlanId)
        if (plan?.link) {
          window.location.href = plan.link
          return
        }
        // Fallback: go to pricing if plan missing
        router.push("/pricing")
      }
    } catch {
      setMessage("Network error. Please try again.")
    }
    setIsLoading(false)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Signup Form */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sheep className="h-10 w-10 text-green-600" />
              <div>
                <CardTitle className="text-2xl">{t('createAccount')}</CardTitle>
                <CardDescription>{t('signUpForFarmHome')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('fullName')}</Label>
                <Input id="name" type="text" placeholder="John Doe" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input id="email" type="email" placeholder="admin@farmhome.com" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phoneNumber')} <span className="text-gray-400">{t('optional')}</span></Label>
                <Input id="phone" type="tel" placeholder="+234 800 000 0000" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <Input id="password" type="password" value={formData.password} onChange={(e) => handleChange("password", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} required />
                </div>
              </div>
              {message && <div className="text-sm mt-2 text-red-600">{message}</div>}
              <Button type="submit" className="w-full" disabled={isLoading} aria-label="Create account and continue to payment">
                {isLoading ? t('creatingAccount') : t('createAccount')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Plan selection + Stripe CTA */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Choose your plan</CardTitle>
            <CardDescription>Select a plan and pay securely with Stripe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pricingData.map((plan) => (
                <label key={plan.id} className={`block rounded-xl border p-4 cursor-pointer transition-colors ${selectedPlanId === plan.id ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">{plan.name}</div>
                      <div className="text-sm text-gray-600">{plan.description}</div>
                      <ul className="mt-3 space-y-1">
                        {plan.features.map((f: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-600" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="text-2xl font-bold">{plan.priceFrontend ?? `$${plan.price}${plan.duration}`}</div>
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={selectedPlanId === plan.id}
                        onChange={() => setSelectedPlanId(plan.id)}
                        className="mt-2"
                        aria-label={`Select ${plan.name} plan`}
                      />
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6">
              <p className="text-sm text-gray-600">Payment is handled on Stripe after creating your account.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
