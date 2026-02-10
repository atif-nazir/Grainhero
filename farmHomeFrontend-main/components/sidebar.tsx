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
  Database,
  Server,
  Activity,
  DollarSign,
  Brain,
  Cloud,
  Zap,
} from "lucide-react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { LanguageSelector } from "@/components/language-selector"
import { useAuth } from "@/app/[locale]/providers"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/app/[locale]/providers"
// Removed usePlan import

// Navigation Item Type Definition
interface NavItem {
  name: string;
  label: string;
  href: string;
  icon: any;
  roles: string[];
  badge?: string;
}

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

// Grain Operations & Management - CORE MODULES ONLY
const grainOperationsNav = [
  {
    name: "grain-batches",
    label: "Grain Procurement & Intake",
    href: "/grain-batches",
    icon: Package,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
  {
    name: "silos",
    label: "Storage Assignment",
    href: "/silos",
    icon: Package,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: undefined
  },
  {
    name: "buyers",
    label: "Buyers & Dispatch",
    href: "/buyers",
    icon: Users,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
  // COMMENTED OUT - Not in core 10 modules
  // {
  //   name: "traceability",
  //   label: "Traceability",
  //   href: "/traceability",
  //   icon: QrCode,
  //   roles: ["super_admin", "admin", "manager"],
  //   badge: undefined
  // },
]

// IoT Monitoring & Control - CORE MODULES ONLY
const iotMonitoringNav = [
  {
    name: "sensors",
    label: "Sensor & Actuator Setup",
    href: "/sensors",
    icon: Smartphone,
    roles: ["super_admin", "admin", "technician"],
    badge: undefined
  },
  {
    name: "actuators",
    label: "Actuators",
    href: "/actuators",
    icon: Zap,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: undefined
  },
  {
    name: "environmental",
    label: "Environmental Data (PMD/Weather)",
    href: "/environmental",
    icon: Cloud,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: undefined
  },
  {
    name: "grain-alerts",
    label: "Alerts & Notifications",
    href: "/grain-alerts",
    icon: OctagonAlert,
    roles: ["super_admin", "admin", "manager", "technician"],
    badge: undefined
  },
]

// AI and Analytics features - CORE MODULES ONLY
const aiAnalyticsNav = [
  {
    name: "ai-spoilage",
    label: "Spoilage Prediction & Advisory",
    href: "/ai-spoilage",
    icon: Sparkles,
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
  // COMMENTED OUT - Not in core 10 modules
  // {
  //   name: "ai-predictions",
  //   label: "AI Predictions",
  //   href: "/ai-predictions",
  //   icon: Sparkles,
  //   roles: ["super_admin", "admin", "manager"],
  //   badge: "AI"
  // },
  // {
  //   name: "spoilage-analysis",
  //   label: "Spoilage Analysis",
  //   href: "/spoilage-analysis",
  //   icon: TrendingUp,
  //   roles: ["super_admin", "admin", "manager"],
  //   badge: "AI"
  // },
  // {
  //   name: "model-performance",
  //   href: "/model-performance",
  //   icon: Brain,
  //   roles: ["super_admin", "admin", "manager"],
  //   badge: "ML"
  // },
  // {
  //   name: "data-management",
  //   href: "/data-management",
  //   icon: Database,
  //   roles: ["super_admin", "admin", "manager"],
  //   badge: "ML"
  // },
  // {
  //   name: "environmental-data",
  //   label: "Environmental Data",
  //   href: "/environmental-data",
  //   icon: BarChart3,
  //   roles: ["super_admin", "admin", "manager", "technician"],
  //   badge: undefined
  // },
  // {
  //   name: "data-visualization",
  //   href: "/data-visualization",
  //   icon: BarChart3,
  //   roles: ["super_admin", "admin", "manager"],
  //   badge: "NEW"
  // },
]

// Business & Finance - CORE MODULES ONLY
const businessNav = [

  {
    name: "payments",
    label: "Payments & Invoices",
    href: "/payments",
    icon: CreditCard,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
  {
    name: "reports",
    label: "Reports & Analytics",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
  {
    name: "analytics",
    label: "Analytics Dashboard",
    href: "/analytics",
    icon: BarChart3,
    roles: ["super_admin", "admin", "manager"],
    badge: undefined
  },
]

// System Administration - MINIMAL (Settings only for core functionality)
const systemNav = [
  // COMMENTED OUT - Not in core 10 modules
  // { name: "team-management", label: "Team Management", href: "/team-management", icon: Users, roles: ["admin"], badge: undefined },
  { name: "settings", label: "Settings", href: "/settings", icon: Settings, roles: ["super_admin", "admin"], badge: undefined },
]

// Super Admin Exclusive Features - COMMENTED OUT (Not in core 10 modules)
// Super Admin Exclusive Features
// Super Admin Exclusive Features
const superAdminNav: NavItem[] = [
  // Consolidated into main Dashboard
  /*
  {
    name: "super-admin-dashboard",
    label: "Overview",
    href: "/super-admin/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin"],
    badge: undefined
  },
  {
    name: "tenant-management",
    label: "Tenants",
    href: "/super-admin/tenants",
    icon: Building2,
    roles: ["super_admin"],
    badge: undefined
  },
  {
    name: "plan-management",
    label: "Subscriptions",
    href: "/super-admin/subscriptions",
    icon: CreditCard,
    roles: ["super_admin"],
    badge: undefined
  },
  {
    name: "user-management",
    label: "Users",
    href: "/super-admin/users",
    icon: Users,
    roles: ["super_admin"],
    badge: undefined
  },
  {
    name: "global-analytics",
    label: "Platform Analytics",
    href: "/super-admin/analytics",
    icon: BarChart3,
    roles: ["super_admin"],
    badge: undefined
  },
  {
    name: "system-health",
    label: "System Monitoring",
    href: "/super-admin/monitoring",
    icon: Activity,
    roles: ["super_admin"],
    badge: undefined
  },
  {
    name: "super-admin-reports",
    label: "Reports",
    href: "/super-admin/reports",
    icon: FileText,
    roles: ["super_admin"],
    badge: undefined
  },
  */
]

// COMMENTED OUT - Not in core 10 modules
// const milestone2Navigation = [
//   { name: "analytics", href: "/analytics", icon: BarChart3, badge: "New" },
//   { name: "reports", href: "/reports", icon: FileText, badge: "New" },
//   { name: "notifications", href: "/notifications", icon: Bell, badge: "New" },
//   { name: "mobile", href: "/mobile", icon: Smartphone, badge: "New" },
// ]


export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('Sidebar')
  const [milestone2Expanded, setMilestone2Expanded] = useState(false)
  const [systemExpanded, setSystemExpanded] = useState(false)
  const [grainOpsExpanded, setGrainOpsExpanded] = useState(false)
  const [aiAnalyticsExpanded, setAiAnalyticsExpanded] = useState(false)
  const [iotMonitoringExpanded, setIotMonitoringExpanded] = useState(false)
  const [businessSystemExpanded, setBusinessSystemExpanded] = useState(false)
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
  const showOnlyAdmin = userRole === "admin";
  const showOnlyManager = userRole === "manager" || userRole === "admin";
  const showIoTSections = userRole === "admin" || userRole === "manager" || userRole === "technician";
  const showBusinessSections = userRole === "admin" || userRole === "manager" || userRole === "super_admin";
  const showSystemSections = userRole === "admin" || userRole === "super_admin";

  const visibleDashboardNav = dashboardNav.filter(hasAccess);
  const visibleGrainOpsNav = showOnlyManager ? grainOperationsNav.filter(hasAccess) : [];
  const visibleIoTNav = showIoTSections ? iotMonitoringNav.filter(hasAccess) : [];
  const visibleAINav = showOnlyManager ? aiAnalyticsNav.filter(hasAccess) : [];
  const visibleBusinessNav = showBusinessSections ? businessNav.filter(hasAccess) : [];
  const visibleSystemNav = showSystemSections ? systemNav.filter(hasAccess) : [];
  const visibleSuperAdminNav = superAdminNav.filter(hasAccess);

  return (
    <div className="flex h-full w-72 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200 justify-between">
        <h1 className="text-xl font-bold text-gray-900">GrainHero</h1>
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
                      {t(`${item.name}`, { fallback: (item as { label?: string }).label ?? humanizeName(item.name) })}
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
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                onClick={() => setGrainOpsExpanded(!grainOpsExpanded)}
              >
                <span>Grain Operations</span>
                {grainOpsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {grainOpsExpanded && (
                <div className="space-y-1 pl-2">
                  {visibleGrainOpsNav.map((item) => {
                    const isActive = pathname === `/${currentLanguage}${item.href}`;
                    return (
                      <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          {t(`${item.name}`, { fallback: (item as { label?: string }).label ?? humanizeName(item.name) })}
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
            </div>
          )}

          {/* AI & Analytics */}
          {visibleAINav.length > 0 && (
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                onClick={() => setAiAnalyticsExpanded(!aiAnalyticsExpanded)}
              >
                <span>AI & Analytics</span>
                {aiAnalyticsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {aiAnalyticsExpanded && (
                <div className="space-y-1 pl-2">
                  {visibleAINav.map((item) => {
                    const isActive = pathname === `/${currentLanguage}${item.href}`;
                    return (
                      <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          {t(`${item.name}`, { fallback: (item as { label?: string }).label ?? humanizeName(item.name) })}
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
            </div>
          )}

          {/* IoT Monitoring */}
          {visibleIoTNav.length > 0 && (
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                onClick={() => setIotMonitoringExpanded(!iotMonitoringExpanded)}
              >
                <span>IoT Monitoring</span>
                {iotMonitoringExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {iotMonitoringExpanded && (
                <div className="space-y-1 pl-2">
                  {visibleIoTNav.map((item) => {
                    const isActive = pathname === `/${currentLanguage}${item.href}`;
                    return (
                      <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          {t(`${item.name}`, { fallback: (item as { label?: string }).label ?? humanizeName(item.name) })}
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
            </div>
          )}

          {/* Business & Finance */}
          {visibleBusinessNav.length > 0 && (
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                onClick={() => setBusinessSystemExpanded(!businessSystemExpanded)}
              >
                <span>Business & System</span>
                {businessSystemExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {businessSystemExpanded && (
                <div className="space-y-1 pl-2">
                  {visibleBusinessNav.map((item) => {
                    const isActive = pathname === `/${currentLanguage}${item.href}`;
                    return (
                      <Link key={item.name} href={`/${currentLanguage}${item.href}`}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn("w-full justify-start", isActive && "bg-blue-50 text-blue-700 border-blue-200")}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          {t(`${item.name}`, { fallback: (item as { label?: string }).label ?? humanizeName(item.name) })}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              )}
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
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                onClick={() => setSystemExpanded(!systemExpanded)}
              >
                <span>System</span>
                {systemExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {systemExpanded && (
                <div className="space-y-1 pl-2">
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
            </div>
          )}


        </nav>
      </ScrollArea>

      {/* User Profile & Logout */}
      <div className="border-t border-gray-200 p-4">
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
