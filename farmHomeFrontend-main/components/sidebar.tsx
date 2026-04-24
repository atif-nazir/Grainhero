"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard, Users, BarChart3, Cloud, Smartphone, Settings, LogOut,
  Package, OctagonAlert, ChevronDown, ChevronRight, Sparkles, QrCode,
  CreditCard, Shield, Brain, Zap, ClipboardList, Menu, X, PanelLeftClose,
} from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { LanguageSelector } from "@/components/language-selector"
import { useAuth } from "@/app/[locale]/providers"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/app/[locale]/providers"
import { useIsMobile } from "@/hooks/use-mobile"

// ── Types ──
interface NavItem {
  name: string; label: string; href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[]; badge?: string;
}

function humanizeName(key: string) {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ══════════════════════════════════════
// NAVIGATION DATA (preserved)
// ══════════════════════════════════════
const dashboardNav = [
  { name: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
]
const grainOperationsNav = [
  { name: "grain-batches", label: "Grain Procurement & Intake", href: "/grain-batches", icon: Package, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "silos", label: "Storage Assignment", href: "/silos", icon: Package, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "buyers", label: "Buyers & Dispatch", href: "/buyers", icon: Users, roles: ["super_admin", "admin", "manager"], badge: undefined },
  { name: "traceability", label: "Traceability", href: "/traceability", icon: QrCode, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
]
const iotMonitoringNav = [
  { name: "sensors", label: "Sensor & Actuator Setup", href: "/sensors", icon: Smartphone, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "actuators", label: "Actuators", href: "/actuators", icon: Zap, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "environmental", label: "Environmental Data", href: "/environmental", icon: Cloud, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
  { name: "grain-alerts", label: "Alerts & Notifications", href: "/grain-alerts", icon: OctagonAlert, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
]
const aiAnalyticsNav = [
  { name: "ai-spoilage", label: "Spoilage Prediction", href: "/ai-predictions", icon: Sparkles, roles: ["super_admin", "admin", "manager", "technician"], badge: "AI" },
  { name: "risk-assessment", label: "Risk Assessment", href: "/risk-assessment", icon: BarChart3, roles: ["super_admin", "admin", "manager"], badge: "AI" },
  { name: "ai-predictions", label: "AI Predictions", href: "/ai-predictions", icon: Sparkles, roles: ["super_admin", "admin", "manager"], badge: "AI" },
  { name: "model-performance", label: "ML Model Performance", href: "/model-performance", icon: Brain, roles: ["super_admin", "admin", "manager"], badge: "ML" },
  { name: "data-visualization", label: "Data Visualization", href: "/data-visualization", icon: BarChart3, roles: ["super_admin", "admin", "manager"], badge: "NEW" },
]
const businessNav = [
  { name: "payments", label: "Payments & Invoices", href: "/payments", icon: CreditCard, roles: ["super_admin", "admin", "manager"], badge: undefined },
  { name: "reports", label: "Reports & Analytics", href: "/reports", icon: BarChart3, roles: ["super_admin", "admin", "manager"], badge: undefined },
  { name: "analytics", label: "Analytics Dashboard", href: "/analytics", icon: BarChart3, roles: ["super_admin", "admin", "manager"], badge: undefined },
  { name: "activity-logs", label: "Activity Logs", href: "/activity-logs", icon: ClipboardList, roles: ["super_admin", "admin", "manager", "technician"], badge: "NEW" },
  { name: "insurance", label: "Insurance & Loss Claims", href: "/insurance", icon: Shield, roles: ["super_admin", "admin", "manager"], badge: undefined },
]
const systemNav = [
  // COMMENTED OUT - Not in core 10 modules
  { name: "team-management", label: "Team Management", href: "/team-management", icon: Users, roles: ["admin", "super_admin", "manager"], badge: undefined },
  { name: "settings", label: "Settings", href: "/settings", icon: Settings, roles: ["super_admin", "admin"], badge: undefined },
]
const superAdminNav: NavItem[] = []

// ══════════════════════════════════════
// SIDEBAR COMPONENT
// ══════════════════════════════════════
export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('Sidebar')
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const userRole = user?.role || "technician"

  // ── State ──
  const [isPinned, setIsPinned] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [grainOpsExpanded, setGrainOpsExpanded] = useState(true)
  const [aiAnalyticsExpanded, setAiAnalyticsExpanded] = useState(false)
  const [iotMonitoringExpanded, setIotMonitoringExpanded] = useState(false)
  const [businessSystemExpanded, setBusinessSystemExpanded] = useState(true)
  const [systemExpanded, setSystemExpanded] = useState(true)
  const enterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isExpanded = isMobile ? true : (isPinned || isHovering)

  // Close mobile sidebar on route change
  useEffect(() => { if (isMobile) setIsMobileOpen(false) }, [pathname, isMobile])

  // Lock body scroll when mobile open
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, isMobileOpen])

  // Escape key closes mobile
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileOpen(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // ── Hover handlers with generous delays to prevent flickering ──
  const handleMouseEnter = useCallback(() => {
    if (isPinned || isMobile) return
    if (leaveTimeoutRef.current) { clearTimeout(leaveTimeoutRef.current); leaveTimeoutRef.current = null }
    enterTimeoutRef.current = setTimeout(() => setIsHovering(true), 150)
  }, [isPinned, isMobile])

  const handleMouseLeave = useCallback(() => {
    if (isPinned || isMobile) return
    if (enterTimeoutRef.current) { clearTimeout(enterTimeoutRef.current); enterTimeoutRef.current = null }
    leaveTimeoutRef.current = setTimeout(() => setIsHovering(false), 400)
  }, [isPinned, isMobile])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current)
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    }
  }, [])

  const handleNavClick = useCallback(() => {
    if (isMobile) setIsMobileOpen(false)
  }, [isMobile])

  // ── Role-based filtering (preserved) ──
  const hasAccess = (item: { roles?: string[] }) => !item.roles || item.roles.includes(userRole)
  const showOnlyManager = userRole === "manager" || userRole === "admin" || userRole === "super_admin"
  const showIoTSections = userRole === "admin" || userRole === "manager" || userRole === "technician" || userRole === "super_admin"
  const showBusinessSections = userRole === "admin" || userRole === "manager" || userRole === "super_admin"
  const showSystemSections = userRole === "admin" || userRole === "super_admin"

  const visibleDashboardNav = dashboardNav.filter(hasAccess)
  const visibleGrainOpsNav = showOnlyManager ? grainOperationsNav.filter(hasAccess) : []
  const visibleIoTNav = showIoTSections ? iotMonitoringNav.filter(hasAccess) : []
  const visibleAINav = showOnlyManager ? aiAnalyticsNav.filter(hasAccess) : []
  const visibleBusinessNav = showBusinessSections ? businessNav.filter(hasAccess) : []
  const visibleSystemNav = showSystemSections ? systemNav.filter(hasAccess) : []
  const visibleSuperAdminNav = superAdminNav.filter(hasAccess)

  // ══════════════════════════════════════
  // RENDER HELPERS
  // ══════════════════════════════════════
  function getLabel(item: NavItem) {
    return t(`${item.name}`, { fallback: item.label ?? humanizeName(item.name) })
  }

  function renderNavItem(item: NavItem) {
    const isActive = pathname === `/${currentLanguage}${item.href}`
    const label = getLabel(item)
    const Icon = item.icon

    if (!isExpanded) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            <Link href={`/${currentLanguage}${item.href}`} onClick={handleNavClick}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              )}>
              <Icon className="h-[18px] w-[18px]" />
              {item.badge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-white" />
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="font-medium text-sm px-3 py-1.5 rounded-lg">
            {label}
            {item.badge && <span className="ml-2 text-[10px] font-semibold text-blue-400">• {item.badge}</span>}
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Link key={item.name} href={`/${currentLanguage}${item.href}`} onClick={handleNavClick}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group",
          isActive
            ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm ring-1 ring-blue-100/80"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        )}>
        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />}
        <Icon className={cn("h-[16px] w-[16px] shrink-0", isActive && "text-blue-600")} />
        <span className="truncate">{label}</span>
        {item.badge && (
          <Badge variant={item.badge === "AI" || item.badge === "ML" ? "default" : "secondary"}
            className="ml-auto text-[9px] px-1.5 py-0 h-4 shrink-0 font-semibold">
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  function renderSection(title: string, expanded: boolean, setExpanded: (v: boolean) => void, items: NavItem[]) {
    if (items.length === 0) return null

    if (!isExpanded) {
      if (!expanded) return null
      return (
        <div key={title} className="space-y-1 py-1">
          <div className="mx-3 my-1 border-t border-gray-100" />
          {items.map(renderNavItem)}
        </div>
      )
    }

    return (
      <div key={title} className="mt-4 first:mt-0">
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-gray-300 uppercase tracking-[0.08em] hover:text-gray-500 transition-colors">
          <span>{title}</span>
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          expanded ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
        )}>
          <div className="space-y-0.5">{items.map(renderNavItem)}</div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════
  // SIDEBAR CONTENT
  // ══════════════════════════════════════
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className={cn(
        "flex items-center shrink-0 h-16 border-b border-gray-100/80",
        isExpanded ? "px-5 justify-between" : "px-0 justify-center"
      )}>
        {isExpanded ? (
          <>
            <Link href={`/${currentLanguage}/dashboard`} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200/50">
                <span className="text-white font-extrabold text-sm">G</span>
              </div>
              <div>
                <span className="text-base font-bold text-gray-900 tracking-tight">GrainHero</span>
                <span className="block text-[9px] font-medium text-gray-300 uppercase tracking-widest -mt-0.5">Platform</span>
              </div>
            </Link>
            {isMobile ? (
              <button onClick={() => setIsMobileOpen(false)} aria-label="Close"
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="h-5 w-5" />
              </button>
            ) : (
              <button onClick={() => { setIsPinned(false); setIsHovering(false) }} aria-label="Collapse"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setIsPinned(true)} aria-label="Expand sidebar"
                className="p-0 rounded-xl hover:scale-105 transition-transform">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200/50">
                  <span className="text-white font-extrabold text-sm">G</span>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>Pin sidebar open</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ── Navigation (scrollable) ── */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <nav className={cn("py-3", isExpanded ? "px-3" : "px-1.5 space-y-1")}>
            {visibleDashboardNav.map(renderNavItem)}
            {visibleGrainOpsNav.length > 0 && renderSection("Grain Operations", grainOpsExpanded, setGrainOpsExpanded, visibleGrainOpsNav)}
            {visibleIoTNav.length > 0 && renderSection("IoT Monitoring", iotMonitoringExpanded, setIotMonitoringExpanded, visibleIoTNav)}
            {visibleAINav.length > 0 && renderSection("AI & Analytics", aiAnalyticsExpanded, setAiAnalyticsExpanded, visibleAINav)}
            {visibleBusinessNav.length > 0 && renderSection("Business & System", businessSystemExpanded, setBusinessSystemExpanded, visibleBusinessNav)}
            {visibleSuperAdminNav.length > 0 && renderSection("Super Admin", true, () => {}, visibleSuperAdminNav)}
            {visibleSystemNav.length > 0 && renderSection("System", systemExpanded, setSystemExpanded, visibleSystemNav)}
          </nav>
        </ScrollArea>
      </div>

      {/* ── Bottom ── */}
      <div className={cn("border-t border-gray-100/80 shrink-0", isExpanded ? "p-3 space-y-1" : "p-2 space-y-1.5")}>
        {isExpanded && <div className="px-1 pb-1"><LanguageSelector /></div>}

        {/* User */}
        {isExpanded ? (
          <div onClick={() => { router.push("/profile"); handleNavClick() }} role="button" tabIndex={0}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-all group">
            {user?.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name || "User"} width={36} height={36}
                className="w-9 h-9 rounded-xl object-cover border border-gray-200 shrink-0" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-blue-100">
                <span className="text-sm font-bold text-blue-600">{user?.name?.[0] || "U"}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || "User"}</p>
              <p className="text-[11px] text-gray-400 truncate capitalize">{user?.role || "Role"}</p>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => { router.push("/profile"); handleNavClick() }} aria-label="Profile"
                className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">{user?.name?.[0] || "U"}</span>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>{user?.name || "Profile"}</TooltipContent>
          </Tooltip>
        )}

        {/* Logout */}
        {isExpanded ? (
          <button onClick={() => { localStorage.clear(); router.push(`/${currentLanguage}/auth/login`) }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
            <LogOut className="h-4 w-4 shrink-0" /><span>{t("logout")}</span>
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => { localStorage.clear(); router.push(`/${currentLanguage}/auth/login`) }} aria-label="Logout"
                className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>Logout</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile hamburger */}
      {isMobile && !isMobileOpen && (
        <button onClick={() => setIsMobileOpen(true)} aria-label="Open menu"
          className="fixed top-4 left-4 z-30 p-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95">
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobile && (
        <div onClick={() => setIsMobileOpen(false)} aria-hidden="true"
          className={cn(
            "fixed inset-0 z-40 bg-black/20 backdrop-blur-[3px] transition-all duration-300",
            isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )} />
      )}

      {/* Sidebar */}
      {isMobile ? (
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white/[0.98] backdrop-blur-xl shadow-2xl shadow-gray-300/30 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )} style={{ width: 290 }}>
          {sidebarContent}
        </aside>
      ) : (
        <aside
          className="relative flex flex-col h-full bg-white/[0.98] backdrop-blur-xl border-r border-gray-100/80 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] shrink-0 overflow-hidden will-change-[width]"
          style={{ width: isExpanded ? 270 : 68 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {sidebarContent}
        </aside>
      )}
    </TooltipProvider>
  )
}
