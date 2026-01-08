"use client"

import type React from "react"

import { useAuth } from "@/app/[locale]/providers"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { CartProvider } from "@/components/CartProvider";
import { usePathname, useRouter as useNextRouter } from "next/navigation"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const nextRouter = useNextRouter()

  // Super-admin exclusive routes (without locale prefix)
  const superAdminOnlyRoutes = useMemo(() => new Set([
    "/tenant-management",
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
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </CartProvider>
  )
}
