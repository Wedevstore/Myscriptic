"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, BookOpen, TrendingUp, Globe, Download, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { getPlatformStats, seedP4 } from "@/lib/store-p4"
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
        <div className="text-[11px] font-semibold text-emerald-500 mt-0.5">{sub}</div>
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [stats]      = React.useState(() => getPlatformStats())
  const [refreshing, setRefreshing] = React.useState(false)

  React.useEffect(() => { seedP4() }, [])

  function handleRefresh() {
    setRefreshing(true); setTimeout(() => setRefreshing(false), 700)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform-wide engagement, retention, and revenue insights.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={12} className={cn(refreshing && "animate-spin")} /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
            <Download size={12} /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Monthly Active Users" value="2.04M"     sub="+3.4% vs last month" icon={Users}     cls="bg-blue-50 dark:bg-blue-900/20 text-blue-500" />
        <KPI label="Daily Active Users"   value="34.2K"     sub="+11% vs last week"   icon={TrendingUp} cls="bg-amber-50 dark:bg-amber-900/20 text-brand" />
        <KPI label="Avg Reading Time"     value="42 min"    sub="+8% vs last month"   icon={BookOpen}   cls="bg-green-50 dark:bg-green-900/20 text-green-500" />
        <KPI label="Completion Rate"      value="67%"       sub="+2pp vs last month"  icon={Globe}      cls="bg-purple-50 dark:bg-purple-900/20 text-purple-500" />
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
              <h3 className="font-semibold text-sm text-foreground mb-4">Monthly Active Users (6 months)</h3>
              <ResponsiveContainer width="100%" height={240}>
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
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm text-foreground mb-4">Device Breakdown</h3>
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
            <h3 className="font-semibold text-sm text-foreground mb-4">Daily Active Users (This Week)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={DAU_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={TT_STYLE} formatter={(v) => [Number(v ?? 0).toLocaleString(), "DAU"]} />
                <Bar dataKey="users" fill="var(--color-brand)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* ── Revenue ── */}
        <TabsContent value="revenue" className="space-y-5">
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-sm text-foreground mb-4">Revenue Over Time</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.revenueByMonth}>
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
                  <Area type="monotone" dataKey="subscriptions" name="Subscriptions" stroke="var(--color-accent-sky)" fill="url(#rg2)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground">Monthly Summary</h3>
              {stats.revenueByMonth.slice(-4).reverse().map(r => (
                <div key={r.month} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs font-medium text-foreground">{r.month}</span>
                  <span className="text-xs font-bold text-green-500">${r.revenue.toLocaleString()}</span>
                </div>
              ))}
              <div className="pt-2">
                <div className="text-xs text-muted-foreground">Lifetime Revenue</div>
                <div className="text-xl font-bold text-foreground font-serif mt-0.5">${stats.lifetimeRevenue.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Content ── */}
        <TabsContent value="content">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm text-foreground mb-5">Reads & Completion Rate by Category</h3>
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
                <p className="text-xs text-muted-foreground mt-0.5">% of users from each cohort who returned at W1, W2, and W4.</p>
              </div>
              <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-0 text-[10px]">
                Avg 4-week retention: 58%
              </Badge>
            </div>
            <div className="overflow-x-auto">
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
            </div>
          </div>
        </TabsContent>

        {/* ── Top Books ── */}
        <TabsContent value="topbooks">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">Top Performing Books</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Rank","Book","Reads","Completion","Revenue"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {TOP_BOOKS.map(b => (
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
