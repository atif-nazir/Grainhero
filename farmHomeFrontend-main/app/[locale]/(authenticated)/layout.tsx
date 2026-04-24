"use client"

import type React from "react"

import { useAuth } from "@/app/[locale]/providers"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { CartProvider } from "@/components/CartProvider";
import { usePathname, useRouter as useNextRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"

export default function AuthenticatedLayout({
  children,
  params: _params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const nextRouter = useNextRouter()
  const isMobile = useIsMobile()

  // Super-admin exclusive routes (without locale prefix)
  const superAdminOnlyRoutes = useMemo(() => new Set([
    "/admin-management",
    "/plan-management",
    "/system-health",
    "/global-analytics",
    "/security-center",
    "/revenue-management",
    "/system-logs",
    "/server-monitoring",
  ]), [])

  // Helper to strip locale segment and return app path
  const normalizedAppPath = useMemo(() => {
    if (!pathname) return "";
    const segments = pathname.split("/").filter(Boolean)
    // segments[0] is locale, app path starts at index 1
    return segments.length > 1 ? `/${segments.slice(1).join("/")}` : "/"
  }, [pathname])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  // Block access to super-admin-only routes for non super admins
  useEffect(() => {
    if (!user) return
    const role = user.role
    if (role !== "super_admin" && superAdminOnlyRoutes.has(normalizedAppPath)) {
      nextRouter.push("/not-allowed")
    }
  }, [user, normalizedAppPath, nextRouter, superAdminOnlyRoutes])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <CartProvider>
      <div className="flex h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #eff6ff 50%, #f5f3ff 75%, #fdf4ff 100%)' }}>
        <Sidebar />
        <main className={`flex-1 overflow-y-auto scroll-smooth ${isMobile ? 'p-4 pt-16' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </CartProvider>
  )
}
