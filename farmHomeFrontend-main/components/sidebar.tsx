"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Bell,
  Smartphone,
  Search,
  Settings,
  LogOut,
  Package,
  OctagonAlert,
  ChevronDown,
  ChevronRight,
  Sparkles,
  QrCode,
  TrendingUp,
  CreditCard,
  Building2,
  Crown,
  Shield,
  Globe,
  Zap,
  Database,
  Server,
  Activity,
  DollarSign,
  UserCheck,
  AlertTriangle,
  Brain,
  Cloud,
} from "lucide-react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { LanguageSelector } from "@/components/language-selector"
import { useAuth } from "@/app/[locale]/providers"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/app/[locale]/providers"
// Removed usePlan import

// Helper to humanize route keys when translations are missing
function humanizeName(key: string) {
  return key
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Core dashboard
const dashboardNav = [
  { name: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "manager", "technician"], badge: undefined },
]

// Grain Operations & Management
const grainOperationsNav = [
  {
    name: "grain-batches",
    label: "Grain Batches",
    href: "/grain-batches",
    icon: Package,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
  {
    name: "silos",
    label: "Silos",
    href: "/silos",
    icon: Package,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: undefined
  },
  {
    name: "buyers",
    label: "Buyers",
    href: "/buyers",
    icon: Users,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
  {
    name: "traceability",
    label: "Traceability",
    href: "/traceability",
    icon: QrCode,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
]

// IoT Monitoring & Control
const iotMonitoringNav = [
  {
    name: "sensors",
    label: "Sensors",
    href: "/sensors",
    icon: Smartphone,
    roles: ["super_admin", "admin", "technician"],
    badge: undefined
  },
  {
    name: "environmental",
    label: "Environmental Data",
    href: "/environmental",
    icon: Cloud,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: undefined
  },
  {
    name: "grain-alerts",
    label: "Grain Alerts",
    href: "/grain-alerts",
    icon: OctagonAlert,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: undefined
  },
]

// AI and Analytics features
const aiAnalyticsNav = [
  {
    name: "ai-predictions",
    label: "AI Predictions",
    href: "/ai-predictions",
    icon: Sparkles,
    roles: ["super_admin", "admin", "manager"],
    badge: "AI"
  },
  { 
    name: "ai-spoilage", 
    href: "/ai-spoilage", 
    icon: OctagonAlert,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: "AI"
  },
  {
    name: "risk-assessment",
    label: "Risk Assessment",
    href: "/risk-assessment",
    icon: BarChart3,
    roles: ["super_admin", "admin", "manager"],
    badge: "AI"
  },
  {
    name: "spoilage-analysis",
    label: "Spoilage Analysis",
    href: "/spoilage-analysis",
    icon: TrendingUp,
    roles: ["super_admin", "admin", "manager"],
    badge: "AI"
  },
  { 
    name: "model-performance", 
    href: "/model-performance", 
    icon: Brain,
    roles: ["super_admin", "admin", "manager"],
    badge: "ML"
  },
  { 
    name: "data-management", 
    href: "/data-management", 
    icon: Database,
    roles: ["super_admin", "admin", "manager"],
    badge: "ML"
  },
  {
    name: "environmental-data",
    label: "Environmental Data",
    href: "/environmental-data",
    icon: BarChart3,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: undefined
  },
  { 
    name: "data-visualization", 
    href: "/data-visualization", 
    icon: BarChart3,
    roles: ["super_admin", "admin", "manager"],
    badge: "NEW"
  },
]

// Business & Finance
const businessNav = [
  {
    name: "insurance",
    label: "Insurance",
    href: "/insurance",
    icon: FileText,
    roles: ["super_admin", "admin"],
    badge: undefined
  },
  {
    name: "payments",
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
  {
    name: "reports",
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
]

// System Administration
const systemNav = [
  { name: "team-management", label: "Team Management", href: "/team-management", icon: Users, roles: ["admin"], badge: undefined },
  { name: "users", label: "Users", href: "/users", icon: Users, roles: ["super_admin", "admin"], badge: undefined },
  { name: "settings", label: "Settings", href: "/settings", icon: Settings, roles: ["super_admin", "admin"], badge: undefined },
]

// Super Admin Exclusive Features
const superAdminNav = [
  {
    name: "tenant-management",
    label: "Tenant Management",
    href: "/tenant-management",
    icon: Building2,
    roles: ["super_admin"],
    badge: "Super Admin"
  },
  {
    name: "plan-management",
    label: "Plan Management",
    href: "/plan-management",
    icon: Crown,
    roles: ["super_admin"],
    badge: "Super Admin"
  },
  {
    name: "system-health",
    label: "System Health",
    href: "/system-health",
    icon: Activity,
    roles: ["super_admin"],
    badge: "Super Admin"
  },
  {
    name: "global-analytics",
    label: "Global Analytics",
    href: "/global-analytics",
    icon: Globe,
    roles: ["super_admin"],
    badge: "Super Admin"
  },
  {
    name: "security-center",
    label: "Security Center",
    href: "/security-center",
    icon: Shield,
    roles: ["super_admin"],
    badge: "Super Admin"
  },
  {
    name: "revenue-management",
    label: "Revenue Management",
    href: "/revenue-management",
    icon: DollarSign,
    roles: ["super_admin"],
    badge: "Super Admin"
  },
  {
    name: "system-logs",
    label: "System Logs",
    href: "/system-logs",
    icon: Database,
    roles: ["super_admin"],
    badge: "Super Admin"
  },
  {
    name: "server-monitoring",
    label: "Server Monitoring",
    href: "/server-monitoring",
    icon: Server,
    roles: ["super_admin"],
    badge: "Super Admin"
  },
]

const milestone2Navigation = [
  { name: "analytics", href: "/analytics", icon: BarChart3, badge: "New" },
  { name: "reports", href: "/reports", icon: FileText, badge: "New" },
  { name: "notifications", href: "/notifications", icon: Bell, badge: "New" },
  { name: "mobile", href: "/mobile", icon: Smartphone, badge: "New" },
]

const adminNavigation = [
  { name: "team-management", href: "/team-management", icon: Users },
  { name: "users", href: "/users", icon: Users },
  { name: "settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('Sidebar')
  const [milestone2Expanded, setMilestone2Expanded] = useState(true)
  const [adminExpanded, setAdminExpanded] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { currentLanguage } = useLanguage();
  const userRole = user?.role || "technician";

  // Role-based navigation filtering
  const hasAccess = (item: { roles?: string[] }) => {
    if (!item.roles) return true; // No role restriction
    return item.roles.includes(userRole);
  };

  const showOnlySuperAdmin = userRole === "super_admin";

  const visibleDashboardNav = showOnlySuperAdmin ? dashboardNav.filter(hasAccess) : dashboardNav.filter(hasAccess);
  const visibleGrainOpsNav = showOnlySuperAdmin ? [] : grainOperationsNav.filter(hasAccess);
  const visibleIoTNav = showOnlySuperAdmin ? [] : iotMonitoringNav.filter(hasAccess);
  const visibleAINav = showOnlySuperAdmin ? [] : aiAnalyticsNav.filter(hasAccess);
  const visibleBusinessNav = showOnlySuperAdmin ? [] : businessNav.filter(hasAccess);
  const visibleSystemNav = showOnlySuperAdmin ? [] : systemNav.filter(hasAccess);
  const visibleSuperAdminNav = superAdminNav.filter(hasAccess);

  return (
    <div className="flex h-full w-72 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200 justify-between">
        <h1 className="text-xl font-bold text-gray-900">Farm Home</h1>
        <div className="ml-2">
          <LanguageSelector />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {/* Dashboard */}
          {visibleDashboardNav.length > 0 && (
            <div className="space-y-1">
              {visibleDashboardNav.map((item) => {
                const isActive = pathname === `/${currentLanguage}${item.href}`;
                return (
                  <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {t(`${item.name}`, { fallback: (item as any).label ?? humanizeName(item.name) })}
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Grain Operations */}
          {visibleGrainOpsNav.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Grain Operations</div>
              {visibleGrainOpsNav.map((item) => {
                const isActive = pathname === `/${currentLanguage}${item.href}`;
                return (
                  <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {t(`${item.name}`, { fallback: (item as any).label ?? humanizeName(item.name) })}
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}

          {/* AI & Analytics */}
          {visibleAINav.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">AI & Analytics</div>
              {visibleAINav.map((item) => {
                const isActive = pathname === `/${currentLanguage}${item.href}`;
                return (
                  <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {t(`${item.name}`, { fallback: (item as any).label ?? humanizeName(item.name) })}
                      {item.badge && (
                        <Badge variant={item.badge === "AI" ? "default" : "secondary"} className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}

          {/* IoT Monitoring */}
          {visibleIoTNav.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">IoT Monitoring</div>
              {visibleIoTNav.map((item) => {
                const isActive = pathname === `/${currentLanguage}${item.href}`;
                return (
                  <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {t(`${item.name}`, { fallback: (item as any).label ?? humanizeName(item.name) })}
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Business & Finance */}
          {visibleBusinessNav.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Business</div>
              {visibleBusinessNav.map((item) => {
                const isActive = pathname === `/${currentLanguage}${item.href}`;
                return (
                  <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {t(`${item.name}`, { fallback: (item as any).label ?? humanizeName(item.name) })}
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Super Admin Exclusive Features */}
          {visibleSuperAdminNav.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Super Admin</div>
              {visibleSuperAdminNav.map((item) => {
                const isActive = pathname === `/${currentLanguage}${item.href}`;
                return (
                  <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start", isActive && "bg-red-50 text-red-700 border-red-200")}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {t(`${item.name}`)}
                      {item.badge && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}

          {/* System Administration */}
          {visibleSystemNav.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">System</div>
              {visibleSystemNav.map((item) => {
                const isActive = pathname === `/${currentLanguage}${item.href}`;
                return (
                  <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {t(`${item.name}`)}
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Milestone 2 Features */}
          {!showOnlySuperAdmin && (
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                onClick={() => setMilestone2Expanded(!milestone2Expanded)}
              >
                <span>Advanced Features</span>
                {milestone2Expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {milestone2Expanded && (
                <div className="space-y-1 pl-2">
                  {milestone2Navigation.map((item) => {
                    const isActive = pathname === `/${currentLanguage}${item.href}`;
                    return (
                      <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          <span className="flex-1 text-left">{t(`${item.name}`)}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    )
                  })}

                  {/* Advanced Search */}
                  <div className="px-3 py-2">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Search className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">{t("advancedSearch")}</span>
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Search across all modules with complex filters</p>
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <Search className="h-3 w-3 mr-2" />
                        Open Search
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Features */}
          {!showOnlySuperAdmin && (
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                onClick={() => setAdminExpanded(!adminExpanded)}
              >
                <span>Administration</span>
                {adminExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {adminExpanded && (
                <div className="space-y-1 pl-2">
                  {adminNavigation.map((item) => {
                    const isActive = pathname === `/${currentLanguage}${item.href}`;
                    return (
                      <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          {t(`${item.name}`)}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* Plans Button and User Profile & Logout */}
      <div className="border-t border-gray-200 p-4">
        <Button
          variant="outline"
          className="w-full justify-start mb-2"
          onClick={() => {
            router.push('/plans');
          }}
        >
          <BarChart3 className="mr-3 h-4 w-4" />
          {t('plans', { defaultMessage: 'Plans' })}
        </Button>
        <div
          className="flex items-center space-x-3 mb-3 cursor-pointer hover:bg-gray-100 rounded p-2 transition"
          onClick={() => router.push("/profile")}
          role="button"
          tabIndex={0}
        >
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">{user?.name?.[0] || "U"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name || "User"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role || "Role"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => {
            localStorage.clear();
            router.push(`/${currentLanguage}/auth/login`);
          }}
        >
          <LogOut className="mr-3 h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </div>
  )
}
