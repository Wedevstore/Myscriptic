"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Providers } from "@/components/providers"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { seedP4, getPlatformStats, notificationStore } from "@/lib/store-p4"
import {
  LayoutDashboard, Users, BookOpen, DollarSign, BarChart3,
  Bell, Tag, FileText, Settings, Shield, ChevronDown, LogOut,
  Menu, X, Newspaper, Image, Globe, Receipt, TrendingUp,
  UserCheck, Zap, Percent, Hash, Lock, ChevronRight, GraduationCap,
  UsersRound,
} from "lucide-react"
import { canAccessRoute, type StaffPermission, NAV_PERMISSION_MAP } from "@/lib/staff-permissions"

// ── Nav structure ─────────────────────────────────────────────────────────────
interface NavItem {
  label:    string
  href:     string
  icon:     React.ElementType
  badge?:   number | string
  children?:NavItem[]
}

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard",     href: "/dashboard/admin",             icon: LayoutDashboard },
      { label: "Analytics",     href: "/dashboard/admin/analytics",   icon: BarChart3 },
    ],
  },
  {
    heading: "Content",
    items: [
      { label: "CMS Builder",   href: "/dashboard/admin/cms",         icon: Newspaper },
      { label: "Banners",       href: "/dashboard/admin/banners",     icon: Image },
      { label: "CMS Pages",     href: "/dashboard/admin/pages",       icon: Globe },
      { label: "Books",         href: "/dashboard/admin/books",       icon: BookOpen },
      { label: "Author courses", href: "/dashboard/admin/author-courses", icon: GraduationCap },
    ],
  },
  {
    heading: "People",
    items: [
      { label: "Users",         href: "/dashboard/admin/users",       icon: Users },
      { label: "Authors",       href: "/dashboard/admin/authors",     icon: UserCheck },
      { label: "Subscriptions", href: "/dashboard/admin/subscriptions", icon: Zap },
    ],
  },
  {
    heading: "Revenue",
    items: [
      { label: "Revenue Pool",  href: "/dashboard/admin/revenue",     icon: DollarSign },
      { label: "Orders",        href: "/dashboard/admin/orders",      icon: Receipt },
      { label: "Coupons",       href: "/dashboard/admin/coupons",     icon: Percent },
      { label: "Tax Config",    href: "/dashboard/admin/tax",         icon: Hash },
    ],
  },
  {
    heading: "Platform",
    items: [
      { label: "Notifications", href: "/dashboard/admin/notifications", icon: Bell },
      { label: "Contact inbox", href: "/dashboard/admin/contact-messages", icon: FileText },
      { label: "Activity Log",  href: "/dashboard/admin/activity",    icon: TrendingUp },
      { label: "Staff",         href: "/dashboard/admin/staff",       icon: UsersRound },
      { label: "Settings",      href: "/dashboard/admin/settings",    icon: Settings },
    ],
  },
]

// ── Sidebar inner ─────────────────────────────────────────────────────────────
function SidebarNav({ onClose }: { onClose?: () => void }) {
  const pathname  = usePathname()
  const { user, logout } = useAuth()
  const router    = useRouter()
  const [stats, setStats] = React.useState({ pendingApprovals: 0 })

  React.useEffect(() => {
    seedP4()
    const s = getPlatformStats()
    setStats({ pendingApprovals: s.pendingApprovals })
  }, [])

  function isActive(href: string) {
    if (href === "/dashboard/admin") return pathname === href
    return pathname.startsWith(href)
  }

  function handleLogout() {
    logout()
    router.replace("/auth/login?next=%2Fdashboard%2Fadmin")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <BookOpen size={16} className="text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sidebar-foreground font-serif font-bold text-[15px] tracking-tight">MyScriptic</span>
          <span className="text-[10px] text-sidebar-foreground/40 font-mono uppercase tracking-widest">{user?.role === "staff" ? "Staff" : "Admin"}</span>
        </div>
        <div className="ml-auto">
          <Badge className="bg-brand/20 text-brand border border-brand/30 text-[9px] px-1.5 py-0 font-mono">
            v4
          </Badge>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-1 text-sidebar-foreground/50 hover:text-sidebar-foreground" aria-label="Close sidebar">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_SECTIONS.map(section => {
          const visibleItems = section.items.filter(item =>
            canAccessRoute(user?.role ?? "user", user?.id ?? "", item.href)
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={section.heading}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 px-2 mb-1">
                {section.heading}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map(item => {
                  const active = isActive(item.href)
                  const showBadge = item.href.includes("authors") && stats.pendingApprovals > 0
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all group relative",
                          active
                            ? "bg-brand text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <item.icon size={15} className={cn(active ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {showBadge && (
                          <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                            {stats.pendingApprovals}
                          </span>
                        )}
                        {active && <ChevronRight size={12} className="opacity-60" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* User block */}
      <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group cursor-default">
          <div className="w-7 h-7 rounded-full bg-brand/25 flex items-center justify-center shrink-0">
            <Shield size={13} className="text-brand" />
          </div>
          <div className="flex flex-col flex-1 min-w-0 leading-none">
            <span className="text-[12px] font-semibold text-sidebar-foreground truncate">{user?.name ?? "Admin"}</span>
            <span className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-foreground/50 hover:text-red-400"
            aria-label="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Admin layout wrapper ──────────────────────────────────────────────────────
function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router  = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const isAdminOrStaff = user?.role === "admin" || user?.role === "staff"

  React.useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdminOrStaff)) {
      router.replace("/auth/login?next=%2Fdashboard%2Fadmin")
    }
  }, [isLoading, isAuthenticated, isAdminOrStaff, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user || !isAdminOrStaff) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="w-56 shrink-0 hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarNav />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col shadow-2xl">
            <SidebarNav onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={20} />
          </button>
          <Breadcrumb />
          <div className="ml-auto flex items-center gap-2">
            <AdminNotifBell />
            <div className="w-7 h-7 rounded-full bg-brand/15 flex items-center justify-center">
              <Shield size={13} className="text-brand" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb() {
  const pathname = usePathname()
  const parts    = pathname.split("/").filter(Boolean)

  const LABELS: Record<string, string> = {
    dashboard: "Dashboard", admin: "Admin", analytics: "Analytics",
    cms: "CMS Builder", banners: "Banners", pages: "CMS Pages",
    books: "Books", users: "Users", authors: "Authors",
    subscriptions: "Subscriptions", revenue: "Revenue Pool",
    orders: "Orders", coupons: "Coupons", tax: "Tax Config",
    notifications: "Notifications",
    "contact-messages": "Contact inbox",
    activity: "Activity Log",
    staff: "Staff",
    settings: "Settings",
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {parts.map((part, i) => {
        const label = LABELS[part] ?? part
        const isLast = i === parts.length - 1
        return (
          <React.Fragment key={part}>
            {i > 0 && <span className="text-muted-foreground/40">/</span>}
            <span className={cn(isLast ? "text-foreground font-semibold" : "text-muted-foreground")}>
              {label}
            </span>
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// ── Notification bell (admin header) ─────────────────────────────────────────
function AdminNotifBell() {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    seedP4()
    setCount(notificationStore.getAll().filter((n) => !n.isRead).length)
  }, [])
  return (
    <Link href="/dashboard/admin/notifications" className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}>
      <Bell size={16} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Providers>
  )
}
