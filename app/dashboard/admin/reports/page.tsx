"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts"
import {
  FileText, Download, Search, Shield,
  ChevronLeft, DollarSign, Users, BookOpen,
  TrendingUp, Filter, CheckCircle, Clock, XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Mock audit log ─────────────────────────────────────────────────────────
const AUDIT_LOG = [
  { id: "aud_001", event: "Payout Approved",    user: "Admin",          amount: 340.20, author: "Chimamanda A.",  timestamp: "2026-01-28 09:14:02", status: "completed" },
  { id: "aud_002", event: "Pool Calculation",   user: "System (Cron)",  amount: 13986,  author: "All Authors",    timestamp: "2026-01-01 00:00:01", status: "completed" },
  { id: "aud_003", event: "Payout Held",        user: "Admin",          amount: 215.80, author: "New Author XY",  timestamp: "2026-01-27 15:40:12", status: "held" },
  { id: "aud_004", event: "Commission Updated", user: "Admin",          amount: null,   author: null,             timestamp: "2025-12-15 11:22:34", status: "completed" },
  { id: "aud_005", event: "Payout Approved",    user: "Admin",          amount: 890.40, author: "Tunde Balogun",  timestamp: "2026-01-28 09:50:18", status: "completed" },
  { id: "aud_006", event: "Refund Issued",      user: "Admin",          amount: 12.99,  author: null,             timestamp: "2026-01-26 13:08:55", status: "completed" },
  { id: "aud_007", event: "Payout Approved",    user: "Admin",          amount: 605.70, author: "Wanjiru Mwangi", timestamp: "2026-01-28 10:02:44", status: "completed" },
  { id: "aud_008", event: "Payout Failed",      user: "System",         amount: 180.00, author: "Auth Z",         timestamp: "2026-01-25 08:33:21", status: "failed" },
]

// ── Monthly author payout reports ────────────────────────────────────────────
const PAYOUT_REPORTS = [
  { id: "rpt_001", author: "Chimamanda A.",  email: "c.author@mail.com", reads: 12400, engagement: 8.2, gross: 1146.08, commission: 343.82, net: 802.26,  status: "paid" },
  { id: "rpt_002", author: "Tunde Balogun", email: "t.author@mail.com", reads: 8900,  engagement: 6.1,  gross: 853.18,  commission: 255.95, net: 597.23,  status: "paid" },
  { id: "rpt_003", author: "Wanjiru Mwangi",email: "w.author@mail.com", reads: 15600, engagement: 10.4, gross: 1454.32, commission: 436.30, net: 1018.02, status: "paid" },
  { id: "rpt_004", author: "Seun Adesanya", email: "s.author@mail.com", reads: 4200,  engagement: 2.8,  gross: 391.61,  commission: 117.48, net: 274.13,  status: "pending" },
  { id: "rpt_005", author: "Efua Asante",   email: "e.author@mail.com", reads: 3800,  engagement: 2.5,  gross: 349.65,  commission: 104.90, net: 244.75,  status: "held" },
  { id: "rpt_006", author: "Kofi Mensah",   email: "k.author@mail.com", reads: 7200,  engagement: 4.8,  gross: 671.33,  commission: 201.40, net: 469.93,  status: "pending" },
]

// ── Monthly revenue chart data ────────────────────────────────────────────────
const REVENUE_CHART = [
  { month: "Aug", revenue: 92400, authorPool: 64680, commission: 27720 },
  { month: "Sep", revenue: 105800, authorPool: 74060, commission: 31740 },
  { month: "Oct", revenue: 118200, authorPool: 82740, commission: 35460 },
  { month: "Nov", revenue: 131000, authorPool: 91700, commission: 39300 },
  { month: "Dec", revenue: 144600, authorPool: 101220, commission: 43380 },
  { month: "Jan", revenue: 148200, authorPool: 103740, commission: 44460 },
]

// ── Engagement trend ──────────────────────────────────────────────────────────
const ENGAGEMENT_TREND = [
  { month: "Aug", avgCompletion: 58 },
  { month: "Sep", avgCompletion: 61 },
  { month: "Oct", avgCompletion: 63 },
  { month: "Nov", avgCompletion: 67 },
  { month: "Dec", avgCompletion: 70 },
  { month: "Jan", avgCompletion: 72 },
]

const STATUS_CONFIG = {
  paid:    { label: "Paid",    color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  held:    { label: "On Hold", color: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  failed: { label: "Failed",   color: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
}

function AdminReportsContent() {
  const [activeTab, setActiveTab] = React.useState<"payouts" | "audit">("payouts")
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  // Filter reports
  const filteredReports = PAYOUT_REPORTS.filter(r => {
    const matchSearch = !search || r.author.toLowerCase().includes(search.toLowerCase()) || r.email.includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || r.status === statusFilter
    return matchSearch && matchStatus
  })

  // Totals
  const totals = filteredReports.reduce(
    (acc, r) => ({
      reads: acc.reads + r.reads,
      gross: acc.gross + r.gross,
      commission: acc.commission + r.commission,
      net: acc.net + r.net,
    }),
    { reads: 0, gross: 0, commission: 0, net: 0 }
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/admin/revenue" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={18} />
            </Link>
            <FileText size={20} className="text-brand" />
            <h1 className="font-serif text-3xl font-bold text-foreground">Financial Reports</h1>
          </div>
          <p className="text-muted-foreground">Monthly payout reports, audit logs, and revenue analytics — January 2026.</p>
        </div>
        <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2" size="sm">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: "$148,200", icon: DollarSign, delta: "+18.2%", color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Author Pool (70%)", value: "$103,740", icon: TrendingUp, delta: null, color: "text-brand", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Platform Commission", value: "$44,460", icon: Shield, delta: null, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
          { label: "Authors Paid", value: "8 / 12", icon: Users, delta: null, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-lg", stat.bg, stat.color)}>
                <stat.icon size={16} />
              </div>
              {stat.delta && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-[10px] border-0">
                  {stat.delta}
                </Badge>
              )}
            </div>
            <div className="text-xl font-bold font-serif text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue breakdown bar chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm text-foreground mb-4">Revenue Breakdown (6 months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={REVENUE_CHART} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, ""]}
              />
              <Bar dataKey="authorPool" name="Author Pool" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="commission" name="Commission" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded bg-brand" /> Author Pool
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded bg-muted-foreground opacity-50" /> Commission
            </div>
          </div>
        </div>

        {/* Engagement trend */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm text-foreground mb-4">Avg. Completion Rate Trend (%)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ENGAGEMENT_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 80]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v ?? 0)}%`, "Avg Completion"]}
              />
              <Line type="monotone" dataKey="avgCompletion" stroke="hsl(var(--brand))" strokeWidth={2.5} dot={{ fill: "hsl(var(--brand))", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1 w-fit">
        {(["payouts", "audit"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all capitalize",
              activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "payouts" ? "Payout Reports" : "Audit Log"}
          </button>
        ))}
      </div>

      {/* Payout Reports Tab */}
      {activeTab === "payouts" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Filter bar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by author name or email..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              {["all", "paid", "pending", "held"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize",
                    statusFilter === s
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted-foreground hover:border-brand/30"
                  )}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Author</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reads</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engagement %</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Payout</th>
                  <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReports.map(r => {
                  const cfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{r.author}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{r.reads.toLocaleString()}</td>
                      <td className="p-3 text-right font-medium text-foreground">{r.engagement}%</td>
                      <td className="p-3 text-right text-foreground">${r.gross.toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground">${r.commission.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-brand">${r.net.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <Badge className={cn("text-[10px] border-0 capitalize", cfg.color)}>
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1.5 justify-end">
                          {r.status === "pending" && (
                            <>
                              <button className="px-2.5 py-1 rounded bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[11px] font-semibold hover:bg-green-200 transition-colors flex items-center gap-1">
                                <CheckCircle size={11} /> Approve
                              </button>
                              <button className="px-2.5 py-1 rounded bg-red-100 dark:bg-red-900/20 text-red-500 text-[11px] font-semibold hover:bg-red-200 transition-colors flex items-center gap-1">
                                <Clock size={11} /> Hold
                              </button>
                            </>
                          )}
                          {r.status === "held" && (
                            <button className="px-2.5 py-1 rounded bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[11px] font-semibold hover:bg-green-200 transition-colors flex items-center gap-1">
                              <CheckCircle size={11} /> Release
                            </button>
                          )}
                          <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="Download report">
                            <Download size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                  <td className="p-3 text-foreground">Totals</td>
                  <td className="p-3 text-right text-foreground">{totals.reads.toLocaleString()}</td>
                  <td className="p-3 text-right text-foreground">—</td>
                  <td className="p-3 text-right text-foreground">${totals.gross.toFixed(2)}</td>
                  <td className="p-3 text-right text-foreground">${totals.commission.toFixed(2)}</td>
                  <td className="p-3 text-right text-brand">${totals.net.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Shield size={14} className="text-brand" />
            <span className="text-sm font-semibold text-foreground">Financial Audit Log</span>
            <span className="text-xs text-muted-foreground ml-1">— immutable record of all financial operations</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performed By</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Author / Target</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp (UTC)</th>
                  <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {AUDIT_LOG.map(log => {
                  const cfg = STATUS_CONFIG[log.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.completed
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-foreground">{log.event}</td>
                      <td className="p-3 text-muted-foreground">{log.user}</td>
                      <td className="p-3 text-muted-foreground">{log.author ?? "—"}</td>
                      <td className="p-3 text-right font-mono text-foreground">
                        {log.amount != null ? `$${log.amount.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{log.timestamp}</td>
                      <td className="p-3 text-center">
                        <Badge className={cn("text-[10px] border-0 capitalize", cfg.color)}>
                          {cfg.label}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Audit log entries are immutable and cannot be edited or deleted. Retained for 7 years per financial compliance requirements.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminReportsPage() {
  return <AdminReportsContent />
}
