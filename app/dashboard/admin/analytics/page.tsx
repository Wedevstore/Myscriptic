"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, BookOpen, TrendingUp, Globe, Download, RefreshCw, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { getPlatformStats, seedP4 } from "@/lib/store-p4"
import { adminApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"

// ── Data ──────────────────────────────────────────────────────────────────────
const DAU_DATA = [
  { day: "Mon", users: 28400 }, { day: "Tue", users: 31200 }, { day: "Wed", users: 29800 },
  { day: "Thu", users: 34100 }, { day: "Fri", users: 38000 }, { day: "Sat", users: 42500 },
  { day: "Sun", users: 39200 },
]
const CONTENT_PERF = [
  { category: "Fiction",   reads: 48200, completions: 62 },
  { category: "Self-Help", reads: 38100, completions: 71 },
  { category: "Business",  reads: 27400, completions: 58 },
  { category: "Romance",   reads: 44800, completions: 80 },
  { category: "Tech",      reads: 18200, completions: 45 },
  { category: "History",   reads: 14600, completions: 54 },
]
const DEVICE_DATA  = [{ name: "Mobile", value: 58 }, { name: "Web", value: 31 }, { name: "Tablet", value: 11 }]
const DEVICE_COLS  = ["var(--color-brand)", "var(--color-accent-sky)", "#a78bfa"]
const COHORT_DATA  = [
  { cohort: "Sep '25", w0: 100, w1: 75, w2: 64, w4: 57 },
  { cohort: "Oct '25", w0: 100, w1: 78, w2: 67, w4: 59 },
  { cohort: "Nov '25", w0: 100, w1: 74, w2: 65, w4: 58 },
  { cohort: "Dec '25", w0: 100, w1: 81, w2: 70, w4: 63 },
  { cohort: "Jan '26", w0: 100, w1: 79, w2: 68, w4: null },
]
const TOP_BOOKS = [
  { rank: 1, title: "The Lagos Chronicles",       author: "Chimamanda A.", reads: 12400, completion: 72, revenue: 0 },
  { rank: 2, title: "Atomic Habits: African Ed.", author: "James Okafor",  reads: 8900,  completion: 81, revenue: 115711 },
  { rank: 3, title: "The Entrepreneur's Code",    author: "Tunde Balogun", reads: 7200,  completion: 68, revenue: 0 },
  { rank: 4, title: "Sacred Grounds",             author: "Bisi Ogunwale", reads: 6100,  completion: 74, revenue: 0 },
  { rank: 5, title: "Python for Data Scientists", author: "Kofi Mensah",   reads: 5400,  completion: 85, revenue: 135046 },
]
const TT_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8, fontSize: 12,
  color: "var(--color-foreground)",
}

function KPI({ label, value, sub, icon: Icon, cls }: { label: string; value: string; sub: string; icon: React.ElementType; cls: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex gap-4 items-start">
      <div className={cn("p-2.5 rounded-xl shrink-0", cls)}><Icon size={17} /></div>
      <div>
        <div className="text-2xl font-bold font-serif text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub ? <div className="text-[11px] font-semibold text-emerald-500 mt-0.5">{sub}</div> : null}
      </div>
    </div>
  )
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function periodToMonthLabel(period: string): string {
  const parts = period.split("-")
  if (parts.length >= 2) {
    const mi = Number(parts[1]) - 1
    if (mi >= 0 && mi < 12) return MONTH_SHORT[mi]
  }
  return period
}

function escCsv(s: string) {
  return `"${String(s).replace(/"/g, '""')}"`
}

export default function AdminAnalyticsPage() {
  const live = apiUrlConfigured()
  const [stats]      = React.useState(() => getPlatformStats())
  const [refreshing, setRefreshing] = React.useState(false)
  const [liveDash, setLiveDash] = React.useState<Record<string, number> | null>(null)
  const [liveCharts, setLiveCharts] = React.useState<{
    subscriptions_active_by_day: { date: string; active: number }[]
    engagement_by_day: { date: string; engagements: number }[]
  } | null>(null)
  const [liveRevenueByMonth, setLiveRevenueByMonth] = React.useState<{ month: string; revenue: number; subscriptions: number }[]>([])
  const [liveTopEngagement, setLiveTopEngagement] = React.useState<
    { book_id: string; title: string; unique_readers: number; reading_time_seconds: number }[]
  >([])
  const [liveCohort, setLiveCohort] = React.useState<
    { month: string; signed_up: number; returned_count: number; retention_rate: number }[]
  >([])
  const [liveErr, setLiveErr] = React.useState("")

  React.useEffect(() => { seedP4() }, [])

  const loadLive = React.useCallback(async () => {
    if (!live) return
    setLiveErr("")
    try {
      const [d, ch, rev, top, cohort] = await Promise.all([
        adminApi.dashboard(),
        adminApi.dashboardCharts(30),
        adminApi.analyticsRevenue("monthly"),
        adminApi.analyticsTopBooksEngagement(),
        adminApi.analyticsCohort(7),
      ])
      setLiveDash(d)
      setLiveCharts(ch)
      const revMerged = (rev.data as { period: string; amount: number }[]).map(r => ({
        month: periodToMonthLabel(r.period),
        revenue: r.amount,
        subscriptions: 0,
      }))
      setLiveRevenueByMonth(revMerged)
      setLiveTopEngagement(
        (top.data as Record<string, unknown>[]).map(row => ({
          book_id: String(row.book_id ?? ""),
          title: String(row.title ?? "—"),
          unique_readers: Number(row.unique_readers ?? 0),
          reading_time_seconds: Number(row.reading_time_seconds ?? 0),
        }))
      )
      setLiveCohort(
        (cohort.data as Record<string, unknown>[]).map(row => ({
          month: String(row.month ?? ""),
          signed_up: Number(row.signed_up ?? 0),
          returned_count: Number(row.returned_count ?? 0),
          retention_rate: Number(row.retention_rate ?? 0),
        }))
      )
    } catch (e) {
      setLiveErr(e instanceof Error ? e.message : "Could not load analytics")
    }
  }, [live])

  React.useEffect(() => {
    if (!live) return
    void loadLive()
  }, [live, loadLive])

  function handleRefresh() {
    if (live) {
      setRefreshing(true)
      void loadLive().finally(() => setRefreshing(false))
      return
    }
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 700)
  }

  const revenueChartData = live && liveRevenueByMonth.length > 0 ? liveRevenueByMonth : stats.revenueByMonth
  const cohortAvg =
    live && liveCohort.length > 0
      ? Math.round(
          (liveCohort.reduce((s, r) => s + r.retention_rate, 0) / liveCohort.length) * 100
        )
      : null

  function handleExportCsv() {
    const lines: string[] = []
    lines.push("# MyScriptic analytics export", `generated,${new Date().toISOString()}`, `mode,${live ? "api" : "demo"}`, "")
    if (live && liveDash) {
      lines.push("kpi", "metric,value")
      lines.push(`registered_users,${liveDash.users_total}`)
      lines.push(`subscriptions_active,${liveDash.subscriptions_active}`)
      lines.push(`books_total,${liveDash.books_total}`)
      lines.push(`revenue_month_usd,${liveDash.revenue_month_usd}`)
      lines.push(`revenue_lifetime_usd,${liveDash.revenue_lifetime_usd}`)
    } else {
      lines.push("kpi_demo", "note,values from local demo store")
      lines.push(`monthly_active_users,2048312`)
      lines.push(`demo_monthly_revenue,${stats.monthlyRevenue}`)
    }
    lines.push("")
    lines.push("revenue_by_month", "month,revenue_usd,subscriptions_usd")
    const revSrc = live && liveRevenueByMonth.length > 0 ? liveRevenueByMonth : stats.revenueByMonth
    for (const r of revSrc) {
      lines.push(`${escCsv(r.month)},${r.revenue},${r.subscriptions ?? 0}`)
    }
    if (live && liveCharts) {
      lines.push("")
      lines.push("subscriptions_active_by_day", "date,active")
      for (const r of liveCharts.subscriptions_active_by_day) {
        lines.push(`${escCsv(r.date)},${r.active}`)
      }
      lines.push("")
      lines.push("engagement_events_by_day", "date,engagements")
      for (const r of liveCharts.engagement_by_day) {
        lines.push(`${escCsv(r.date)},${r.engagements}`)
      }
    }
    lines.push("")
    lines.push("top_books", "book_id,title,unique_readers,reading_hours")
    if (live && liveTopEngagement.length > 0) {
      for (const b of liveTopEngagement) {
        const hrs = Math.round(b.reading_time_seconds / 3600)
        lines.push(`${escCsv(b.book_id)},${escCsv(b.title)},${b.unique_readers},${hrs}`)
      }
    } else {
      for (const b of TOP_BOOKS) {
        lines.push(`${escCsv(String(b.rank))},${escCsv(b.title)},${b.reads},${b.completion}`)
      }
    }
    lines.push("")
    lines.push("cohort")
    if (live && liveCohort.length > 0) {
      lines.push("month,signed_up,returned_7d,retention_pct")
      for (const c of liveCohort) {
        lines.push(`${escCsv(c.month)},${c.signed_up},${c.returned_count},${Math.round(c.retention_rate * 100)}`)
      }
    } else {
      lines.push("cohort,w0,w1,w2,w4")
      for (const c of COHORT_DATA) {
        lines.push(`${escCsv(c.cohort)},${c.w0},${c.w1},${c.w2},${c.w4 ?? ""}`)
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `analytics-${live ? "api" : "demo"}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-foreground">Analytics</h1>
            {live && <Badge variant="outline" className="text-[10px]">API</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Platform-wide engagement, retention, and revenue insights.</p>
          {liveErr && <p className="text-xs text-destructive mt-1">{liveErr}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={12} className={cn(refreshing && "animate-spin")} /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" type="button" onClick={handleExportCsv}>
            <Download size={12} /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label={live ? "Registered users" : "Monthly Active Users"}
          value={live && liveDash ? liveDash.users_total.toLocaleString() : "2.04M"}
          sub={live ? "" : "+3.4% vs last month"}
          icon={Users}
          cls="bg-blue-50 dark:bg-blue-900/20 text-blue-500"
        />
        <KPI
          label={live ? "Active subscriptions" : "Daily Active Users"}
          value={live && liveDash ? liveDash.subscriptions_active.toLocaleString() : "34.2K"}
          sub={live ? "" : "+11% vs last week"}
          icon={TrendingUp}
          cls="bg-amber-50 dark:bg-amber-900/20 text-brand"
        />
        <KPI
          label={live ? "Books in catalog" : "Avg Reading Time"}
          value={live && liveDash ? liveDash.books_total.toLocaleString() : "42 min"}
          sub={live ? "" : "+8% vs last month"}
          icon={BookOpen}
          cls="bg-green-50 dark:bg-green-900/20 text-green-500"
        />
        <KPI
          label={live ? "Revenue (MTD)" : "Completion Rate"}
          value={
            live && liveDash
              ? `$${liveDash.revenue_month_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "67%"
          }
          sub={live ? "" : "+2pp vs last month"}
          icon={live ? DollarSign : Globe}
          cls="bg-purple-50 dark:bg-purple-900/20 text-purple-500"
        />
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-5 h-9">
          <TabsTrigger value="users"    className="text-xs">User Growth</TabsTrigger>
          <TabsTrigger value="revenue"  className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="content"  className="text-xs">Content</TabsTrigger>
          <TabsTrigger value="cohort"   className="text-xs">Cohort Retention</TabsTrigger>
          <TabsTrigger value="topbooks" className="text-xs">Top Books</TabsTrigger>
        </TabsList>

        {/* ── User Growth ── */}
        <TabsContent value="users" className="space-y-5">
          <div className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm text-foreground mb-4">
                {live ? "Active subscriptions (last 30 days)" : "Monthly Active Users (6 months)"}
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                {live && liveCharts && liveCharts.subscriptions_active_by_day.length > 0 ? (
                  <AreaChart
                    data={liveCharts.subscriptions_active_by_day.map(d => ({
                      month: d.date.slice(5),
                      mau: d.active,
                    }))}
                  >
                    <defs>
                      <linearGradient id="mauGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TT_STYLE} formatter={(v) => [Number(v ?? 0).toLocaleString(), "Active"]} />
                    <Area type="monotone" dataKey="mau" stroke="var(--color-brand)" fill="url(#mauGrad)" strokeWidth={2.5} dot={false} />
                  </AreaChart>
                ) : (
                  <AreaChart data={[
                    { month: "Aug", mau: 1620000 }, { month: "Sep", mau: 1780000 },
                    { month: "Oct", mau: 1890000 }, { month: "Nov", mau: 1940000 },
                    { month: "Dec", mau: 2010000 }, { month: "Jan", mau: 2048312 },
                  ]}>
                    <defs>
                      <linearGradient id="mauGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1e6).toFixed(1)}M`} />
                    <Tooltip contentStyle={TT_STYLE} formatter={(v) => [`${(Number(v ?? 0) / 1000).toFixed(0)}K`, "MAU"]} />
                    <Area type="monotone" dataKey="mau" stroke="var(--color-brand)" fill="url(#mauGrad)" strokeWidth={2.5} dot={false} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-foreground">Device Breakdown</h3>
                {live && <Badge variant="secondary" className="text-[9px]">Demo</Badge>}
              </div>
              <div className="flex justify-center mb-4">
                <PieChart width={150} height={150}>
                  <Pie data={DEVICE_DATA} cx={75} cy={75} innerRadius={48} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {DEVICE_DATA.map((_, i) => <Cell key={i} fill={DEVICE_COLS[i]} />)}
                  </Pie>
                </PieChart>
              </div>
              {DEVICE_DATA.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DEVICE_COLS[i] }} />
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm text-foreground mb-4">
              {live ? "Daily engagement events (last 30 days)" : "Daily Active Users (This Week)"}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              {live && liveCharts && liveCharts.engagement_by_day.length > 0 ? (
                <BarChart
                  data={liveCharts.engagement_by_day.map(d => ({
                    day: d.date.slice(5),
                    users: d.engagements,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TT_STYLE} formatter={(v) => [Number(v ?? 0).toLocaleString(), "Events"]} />
                  <Bar dataKey="users" fill="var(--color-brand)" radius={[4,4,0,0]} />
                </BarChart>
              ) : (
                <BarChart data={DAU_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={TT_STYLE} formatter={(v) => [Number(v ?? 0).toLocaleString(), "DAU"]} />
                  <Bar dataKey="users" fill="var(--color-brand)" radius={[4,4,0,0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* ── Revenue ── */}
        <TabsContent value="revenue" className="space-y-5">
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm text-foreground mb-4">
                {live ? "Paid revenue by month (orders + subscriptions)" : "Revenue Over Time"}
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent-sky)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent-sky)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TT_STYLE} formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" name="Total" stroke="var(--color-brand)" fill="url(#rg1)" strokeWidth={2} dot={false} />
                  {(!live || revenueChartData.some(r => r.subscriptions > 0)) && (
                    <Area type="monotone" dataKey="subscriptions" name="Subscriptions" stroke="var(--color-accent-sky)" fill="url(#rg2)" strokeWidth={2} dot={false} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground">Monthly Summary</h3>
              {revenueChartData.slice(-4).reverse().map(r => (
                <div key={r.month} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs font-medium text-foreground">{r.month}</span>
                  <span className="text-xs font-bold text-green-500">${r.revenue.toLocaleString()}</span>
                </div>
              ))}
              <div className="pt-2">
                <div className="text-xs text-muted-foreground">Lifetime Revenue</div>
                <div className="text-xl font-bold text-foreground font-serif mt-0.5">
                  $
                  {(live && liveDash
                    ? liveDash.revenue_lifetime_usd
                    : stats.lifetimeRevenue
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Content ── */}
        <TabsContent value="content">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <h3 className="font-semibold text-sm text-foreground">Reads & Completion Rate by Category</h3>
              {live && <Badge variant="secondary" className="text-[9px]">Demo</Badge>}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={CONTENT_PERF}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left"  dataKey="reads"       name="Total Reads"    fill="var(--color-brand)"      radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="completions" name="Completion %" fill="var(--color-accent-sky)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* ── Cohort ── */}
        <TabsContent value="cohort">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Cohort Retention Analysis</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {live
                    ? "Users who signed up in each month and logged in again after 7 days."
                    : "% of users from each cohort who returned at W1, W2, and W4."}
                </p>
              </div>
              <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-0 text-[10px]">
                {cohortAvg != null ? `Avg 7-day retention: ${cohortAvg}%` : "Avg 4-week retention: 58%"}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              {live && liveCohort.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Month", "Signed up", "Returned (7d)", "Retention"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {liveCohort.map(row => {
                      const pct = Math.round(row.retention_rate * 100)
                      return (
                        <tr key={row.month} className="hover:bg-muted/30">
                          <td className="px-3 py-3 font-medium text-foreground text-xs">{row.month}</td>
                          <td className="px-3 py-3 text-xs">{row.signed_up.toLocaleString()}</td>
                          <td className="px-3 py-3 text-xs">{row.returned_count.toLocaleString()}</td>
                          <td className="px-3 py-3">
                            <span
                              className="inline-flex items-center justify-center min-w-12 py-1 px-2 rounded-md text-[11px] font-semibold"
                              style={{
                                backgroundColor: `hsl(var(--brand) / ${pct / 100 * 0.35 + 0.05})`,
                                color: pct > 50 ? "hsl(var(--brand-dark))" : "hsl(var(--muted-foreground))",
                              }}
                            >
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Cohort","Week 0","Week 1","Week 2","Week 4"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {COHORT_DATA.map(row => (
                      <tr key={row.cohort} className="hover:bg-muted/30">
                        <td className="px-3 py-3 font-medium text-foreground text-xs">{row.cohort}</td>
                        {[row.w0, row.w1, row.w2, row.w4].map((val, i) => (
                          <td key={i} className="px-3 py-3">
                            {val !== null ? (
                              <span className="inline-flex items-center justify-center w-12 py-1 rounded-md text-[11px] font-semibold"
                                style={{ backgroundColor: `hsl(var(--brand) / ${val / 100 * 0.35 + 0.05})`, color: val > 50 ? "hsl(var(--brand-dark))" : "hsl(var(--muted-foreground))" }}>
                                {val}%
                              </span>
                            ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Top Books ── */}
        <TabsContent value="topbooks">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-sm text-foreground">
                {live ? "Top books by reading time (API)" : "Top Performing Books"}
              </h3>
              {live && (
                <Badge variant="outline" className="text-[9px]">Engagement</Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {(live ? ["Rank", "Book", "Readers", "Reading time", "Sales $"] : ["Rank", "Book", "Reads", "Completion", "Revenue"]).map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {live && liveTopEngagement.length > 0
                    ? liveTopEngagement.slice(0, 15).map((b, i) => {
                        const rank = i + 1
                        const hrs = Math.round(b.reading_time_seconds / 3600)
                        return (
                          <tr key={b.book_id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", rank === 1 ? "bg-brand/20 text-brand" : "bg-muted text-muted-foreground")}>{rank}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-semibold text-foreground">{b.title}</p>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-foreground">{b.unique_readers.toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{hrs > 0 ? `${hrs}h` : "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">—</td>
                          </tr>
                        )
                      })
                    : TOP_BOOKS.map(b => (
                        <tr key={b.rank} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", b.rank === 1 ? "bg-brand/20 text-brand" : "bg-muted text-muted-foreground")}>{b.rank}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-foreground">{b.title}</p>
                            <p className="text-[10px] text-muted-foreground">{b.author}</p>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-foreground">{b.reads.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-brand rounded-full" style={{ width: `${b.completion}%` }} />
                              </div>
                              <span className="text-[10px] text-foreground">{b.completion}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-green-500">{b.revenue > 0 ? `$${b.revenue.toLocaleString()}` : "—"}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
