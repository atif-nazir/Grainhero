"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WheatIcon as Sheep } from "lucide-react"
import { config } from "@/config"
import { useTranslations } from "next-intl"

export default function ResetPasswordPage() {
  const t = useTranslations('AuthPage');
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  console.log(token)
  console.log(newPassword)
  console.log(confirmPassword)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    if (!token) {
      setMessage("Invalid or missing token.")
      setIsLoading(false)
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.")
      setIsLoading(false)
      return
    }
    try {
      const res = await fetch(`${config.backendUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || "Request failed. Please try again.")
      } else {
        setMessage(data?.message || "Password reset successful! You can now log in.")
        setTimeout(() => router.push("/auth/login"), 2000)
      }
    } catch (err) {
      setMessage("Network error. Please try again.")
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
          <CardTitle className="text-2xl">{t('resetPassword') || "Reset Password"}</CardTitle>
          <CardDescription>{t('resetPasswordDescription') || "Enter your new password below."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('newPassword') || "New Password"}</Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword') || "Confirm Password"}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {message && (
              <div className="text-center text-sm mt-2 text-red-600">{message}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('resetting') || "Resetting..." : t('resetPassword') || "Reset Password"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/auth/login" className="text-sm text-blue-600 hover:underline">
              {t('backToLogin') || "Back to Login"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 