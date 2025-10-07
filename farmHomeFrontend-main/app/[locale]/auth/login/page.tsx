"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/app/[locale]/providers"
import { WheatIcon as Sheep, Mail, Phone, MessageSquare } from "lucide-react"
import { config } from "@/config"
import {useTranslations} from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('AuthPage');
  // Remove loginMethod and phone state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${config.backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        setMessage(error?.message || "Login failed. Please try again.")
      } else {
        const data = await res.json()
        // Update user context (this will also set farm-home-user in localStorage)
        localStorage.setItem("token", data.token)
        localStorage.setItem("id", JSON.stringify(data.id))
        localStorage.setItem("email", data.email)
        localStorage.setItem("name", data.name)
        localStorage.setItem("phone", data.phone)
        localStorage.setItem("role", data.role)
        localStorage.setItem("avatar", data.avatar)
        console.log(data)
        await login(email, password)
        setMessage("Login successful! Redirecting...")
        setTimeout(() => router.push("/dashboard"), 1000)
      }
    } catch (err) {
      setMessage("Network error. Please try again.")
      console.log(err)
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sheep className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('welcomeBack')}</CardTitle>
          <CardDescription>{t('signInToAccount')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@farmhome.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {message && (
              <div className="text-center text-sm mt-2 text-red-600">{message}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('signingIn') : t('signIn')}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/auth/forget-password" className="text-sm text-blue-600 hover:underline">
              {t('forgotPassword')}
            </Link>
            <div className="text-sm text-gray-600">
              {t('dontHaveAccount') + ' '}
              <Link href="/auth/signup" className="text-blue-600 hover:underline">
                {t('signUp')}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
