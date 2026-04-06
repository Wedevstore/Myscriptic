"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, BookOpen, DollarSign, TrendingUp, ChevronRight,
  CheckCircle, Clock, XCircle, Bell, Tag, ArrowUpRight,
  BarChart3, AlertCircle, Zap, Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { adminApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { apiRevenueCycleToRow } from "@/lib/admin-revenue-mapper"
import { getPlatformStats, seedP4, activityLogStore, notificationStore, type ActivityLog } from "@/lib/store-p4"
import { revenueCycleStore, seedStore } from "@/lib/store"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const TT_STYLE = {
  backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
  borderRadius: 8, fontSize: 11, color: "var(--color-foreground)",
}

function mapActionToCategory(action: string): ActivityLog["category"] {
  const a = action.toLowerCase()
  if (a.startsWith("book.")) return "book"
  if (a.includes("user.") || a.includes("blocked") || a.includes("author.application")) return "admin"
  if (a.includes("payment") || a.includes("payout") || a.includes("refund")) return "payment"
  if (a.includes("subscription")) return "subscription"
  if (a.includes("coupon")) return "coupon"
  if (a.includes("auth") || a.includes("login")) return "auth"
  return "system"
}

function mapPlatformActivityRow(row: Record<string, unknown>): ActivityLog {
  const action = String(row.action ?? "")
  const actor = row.actor as Record<string, unknown> | null | undefined
  const subj = row.subject_user as Record<string, unknown> | null | undefined
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  return {
    id: String(row.id ?? ""),
    userId: String(actor?.id ?? subj?.id ?? ""),
    userName: String(actor?.name ?? subj?.name ?? "System"),
    action,
    category: mapActionToCategory(action),
    metadata: {
      ...meta,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      ip_address: row.ip_address,
    },
    createdAt: String(row.created_at ?? ""),
  }
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, isLive, icon: Icon, cls, href }: {
  label: string; value: string; delta?: string; isLive?: boolean
  icon: React.ElementType; cls: string; href: string
}) {
  return (
    <Link href={href} className="group block bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all hover:border-brand/40">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", cls)}><Icon size={16} /></div>
        <ArrowUpRight size={14} className="text-muted-foreground/30 group-hover:text-brand transition-colors" />
      </div>
      <div className="text-2xl font-bold font-serif text-foreground tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {isLive ? (
        <div className="text-[11px] text-muted-foreground mt-1">Live data</div>
      ) : delta ? (
        <div className="text-[11px] font-semibold text-emerald-500 mt-1">{delta}</div>
      ) : null}
    </Link>
  )
}

// ── Quick action card ─────────────────────────────────────────────────────────
function QuickLink({ href, icon: Icon, label, count, color }: {
  href: string; icon: React.ElementType; label: string; count?: number; color: string
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-brand/30 transition-all group">
      <div className={cn("p-2 rounded-lg shrink-0", color)}><Icon size={14} /></div>
      <span className="text-sm font-medium text-foreground flex-1 group-hover:text-brand transition-colors">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{count}</span>
      )}
      <ChevronRight size={12} className="text-muted-foreground/40 group-hover:text-brand transition-colors" />
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const live = apiUrlConfigured()
  const [mockStats] = React.useState(() => {
    seedP4()
    seedStore()
    return getPlatformStats()
  })
  const [apiMetrics, setApiMetrics] = React.useState<Record<string, number> | null>(null)
  const [chartRev, setChartRev] = React.useState<{ date: string; amount: number }[] | null>(null)
  const [logs] = React.useState(() => activityLogStore.getAll().slice(0, 6))
  const [apiActivity, setApiActivity] = React.useState<ActivityLog[] | undefined>(undefined)
  const [liveCycle, setLiveCycle] = React.useState<ReturnType<typeof apiRevenueCycleToRow> | null | undefined>(undefined)
  const [unreadN] = React.useState(() => notificationStore.getAdminUnread())
  const [queuedBroadcasts, setQueuedBroadcasts] = React.useState(0)
  const [cycles] = React.useState(() => revenueCycleStore.getAll().slice(0, 1))

  React.useEffect(() => {
    if (!live) return
    let cancel = false
    adminApi
      .dashboard()
      .then(d => { if (!cancel) setApiMetrics(d) })
      .catch(() => { if (!cancel) setApiMetrics(null) })
    adminApi
      .dashboardCharts(30)
      .then(d => { if (!cancel) setChartRev(d.revenue_by_day) })
      .catch(() => { if (!cancel) setChartRev(null) })
    adminApi
      .platformActivities({ page: "1", per_page: "6" })
      .then(res => {
        if (cancel) return
        const rows = ((res.data ?? []) as Record<string, unknown>[]).map(mapPlatformActivityRow)
        setApiActivity(rows)
      })
      .catch(() => { if (!cancel) setApiActivity([]) })
    adminApi
      .revenueCycles()
      .then(res => {
        if (cancel) return
        const rows = (res.data as Record<string, unknown>[]).map(apiRevenueCycleToRow)
        setLiveCycle(rows[0] ?? null)
      })
      .catch(() => { if (!cancel) setLiveCycle(null) })
    adminApi
      .notificationBroadcasts()
      .then(res => {
        if (cancel) return
        const rows = (res.data ?? []) as { status?: string }[]
        setQueuedBroadcasts(rows.filter(r => r.status === "queued" || r.status === "processing").length)
      })
      .catch(() => { if (!cancel) setQueuedBroadcasts(0) })
    return () => { cancel = true }
  }, [live])

  const stats = {
    totalUsers: apiMetrics?.users_total ?? mockStats.totalUsers,
    activeSubscribers: apiMetrics?.subscriptions_active ?? mockStats.activeSubscribers,
    monthlyRevenue: apiMetrics?.revenue_month_usd ?? mockStats.monthlyRevenue,
    totalBooks: apiMetrics?.books_total ?? mockStats.totalBooks,
    totalAuthors: apiMetrics?.authors_total ?? mockStats.totalAuthors,
    lifetimeRevenue: apiMetrics?.revenue_lifetime_usd ?? mockStats.lifetimeRevenue,
    pendingApprovals: apiMetrics?.pending_author_applications ?? mockStats.pendingApprovals,
    revenueByMonth:
      chartRev && chartRev.length > 0
        ? chartRev.map(r => ({
            month: r.date.slice(5),
            revenue: r.amount,
          }))
        : mockStats.revenueByMonth,
  }

  const CAT_ICONS: Record<string, React.ElementType> = {
    payment: DollarSign, subscription: Zap, auth: Users,
    admin: AlertCircle, book: BookOpen, coupon: Tag, system: BarChart3,
  }
  const CAT_CLS: Record<string, string> = {
    payment: "text-green-500 bg-green-50 dark:bg-green-900/20",
    subscription: "text-brand bg-brand/10",
    auth: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    admin: "text-red-500 bg-red-50 dark:bg-red-900/20",
    book: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
    coupon: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    system: "text-slate-500 bg-muted",
  }

  const latestCycle = live ? liveCycle : cycles[0]
  const activityRows = live ? apiActivity : logs

  const cycleLabel =
    latestCycle && typeof latestCycle === "object"
      ? `${new Date(latestCycle.cycleStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(latestCycle.cycleEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : ""

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl font-bold text-foreground">Overview</h1>
            {live && apiMetrics && (
              <Badge variant="outline" className="text-[10px]">API</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Platform health at a glance — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <Link href="/dashboard/admin/analytics">
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs hover:border-brand hover:text-brand">
            <BarChart3 size={12} /> Full Analytics
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users"       value={stats.totalUsers.toLocaleString()}        delta="+8.4% this month"  isLive={Boolean(live && apiMetrics)} icon={Users}      cls="bg-blue-50 dark:bg-blue-900/20 text-blue-500"   href="/dashboard/admin/users" />
        <KpiCard label="Active Subscribers" value={stats.activeSubscribers.toLocaleString()} delta="+6.1% this month"  isLive={Boolean(live && apiMetrics)} icon={TrendingUp} cls="bg-purple-50 dark:bg-purple-900/20 text-purple-500" href="/dashboard/admin/subscriptions" />
        <KpiCard label="Monthly Revenue"   value={`$${stats.monthlyRevenue.toLocaleString()}`} delta="+18.2% vs last month" isLive={Boolean(live && apiMetrics)} icon={DollarSign} cls="bg-green-50 dark:bg-green-900/20 text-green-500"  href="/dashboard/admin/revenue" />
        <KpiCard label="Total Books"       value={stats.totalBooks.toLocaleString()}         delta="+12% this month"   isLive={Boolean(live && apiMetrics)} icon={BookOpen}   cls="bg-amber-50 dark:bg-amber-900/20 text-brand"     href="/dashboard/admin/books" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-foreground">Revenue Trend</h2>
            <Link href="/dashboard/admin/revenue" className="text-[11px] text-brand hover:underline flex items-center gap-0.5">
              Details <ChevronRight size={11} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.revenueByMonth}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-brand)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TT_STYLE} formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-brand)" fill="url(#rg)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-foreground px-0.5">Quick Access</h2>
          <QuickLink href="/dashboard/admin/analytics"    icon={BarChart3}    label="Analytics"        color="bg-blue-50 dark:bg-blue-900/20 text-blue-500" />
          <QuickLink href="/dashboard/admin/notifications" icon={Bell}         label="Notifications"    count={live ? queuedBroadcasts : unreadN}  color="bg-amber-50 dark:bg-amber-900/20 text-brand" />
          <QuickLink href="/dashboard/admin/contact-messages" icon={Mail}     label="Contact inbox"    color="bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400" />
          <QuickLink href="/dashboard/admin/authors"      icon={Users}        label="Author Approvals" count={stats.pendingApprovals} color="bg-purple-50 dark:bg-purple-900/20 text-purple-500" />
          <QuickLink href="/dashboard/admin/cms"          icon={BarChart3}    label="CMS Builder"      color="bg-green-50 dark:bg-green-900/20 text-green-500" />
          <QuickLink href="/dashboard/admin/coupons"      icon={Tag}          label="Coupons"          color="bg-orange-50 dark:bg-orange-900/20 text-orange-500" />
          <QuickLink href="/dashboard/admin/revenue"      icon={DollarSign}   label="Revenue Pool"     color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Activity feed */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">Activity Log</h2>
            <Link href="/dashboard/admin/activity" className="text-[11px] text-brand hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={11} />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {live && apiActivity === undefined ? (
              <li className="px-5 py-8 text-center text-xs text-muted-foreground">Loading activity…</li>
            ) : !activityRows?.length ? (
              <li className="px-5 py-8 text-center text-xs text-muted-foreground">No activity yet.</li>
            ) : activityRows.map(log => {
              const Icon = CAT_ICONS[log.category] ?? AlertCircle
              const cls  = CAT_CLS[log.category]  ?? "text-muted-foreground bg-muted"
              return (
                <li key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className={cn("p-1.5 rounded-lg mt-0.5 shrink-0", cls)}><Icon size={12} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug truncate">{log.action}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{log.userName} · {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Revenue cycle status */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">Revenue Cycle</h2>
            <Link href="/dashboard/admin/revenue" className="text-[11px] text-brand hover:underline flex items-center gap-0.5">
              Manage <ChevronRight size={11} />
            </Link>
          </div>
          <div className="p-5 space-y-4">
            {live && liveCycle === undefined ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Loading revenue cycle…</div>
            ) : latestCycle && typeof latestCycle === "object" ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Cycle</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{cycleLabel}</p>
                  </div>
                  <Badge className={cn(
                    "border-0 text-[10px]",
                    latestCycle.status === "open"         && "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
                    latestCycle.status === "calculating"  && "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
                    latestCycle.status === "finalized"    && "bg-muted text-muted-foreground",
                    latestCycle.status === "locked"       && "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
                  )}>
                    {latestCycle.status === "open" ? (
                      <CheckCircle size={9} className="mr-1 inline" />
                    ) : latestCycle.status === "calculating" ? (
                      <Clock size={9} className="mr-1 inline" />
                    ) : latestCycle.status === "finalized" ? (
                      <Clock size={9} className="mr-1 inline" />
                    ) : (
                      <CheckCircle size={9} className="mr-1 inline" />
                    )}
                    {latestCycle.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Pool",   value: `$${latestCycle.totalRevenue.toLocaleString()}` },
                    { label: "Author Pool",  value: `$${latestCycle.authorPool.toLocaleString()}` },
                    { label: "Admin Cut",    value: `$${latestCycle.adminEarnings.toLocaleString()}` },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/50 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                      <div className="text-sm font-bold text-foreground mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">No revenue cycles yet.</div>
            )}

            {/* Platform total */}
            <div className="border-t border-border pt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-muted-foreground">Lifetime Revenue</div>
                <div className="text-base font-bold text-brand font-serif">${stats.lifetimeRevenue.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Total Authors</div>
                <div className="text-base font-bold text-foreground font-serif">{stats.totalAuthors.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
