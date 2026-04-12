"use client"

/**
 * Author — Subscription Earnings Dashboard  (Phase 3)
 *
 * Offline: authorPayoutStore, revenueCycleStore, engagementStore, adminSettingsStore.
 * With `NEXT_PUBLIC_API_URL`: pool summary, payouts (+ nested revenue cycles), and my-books engagement.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/components/providers/auth-provider"
import { MOCK_BOOKS } from "@/lib/mock-data"
import {
  authorPayoutStore, revenueCycleStore, engagementStore,
  adminSettingsStore, seedStore,
  type AuthorPayout, type RevenueCycle,
} from "@/lib/store"
import {
  ChevronLeft, DollarSign, TrendingUp, Eye, Clock,
  Download, Info, CheckCircle, AlertCircle, HelpCircle,
  BarChart3, BookOpen, Users, Zap, Lock, Shield, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CoverImage } from "@/components/ui/cover-image"
import { authorSubscriptionPoolApi, booksApi } from "@/lib/api"
import { normalizeAuthorMyBooksList } from "@/lib/author-my-books"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { demoPic } from "@/lib/demo-images"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

const STATUS_CONFIG = {
  pending: { label: "Pending",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",   icon: Clock },
  paid:    { label: "Paid",     cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",   icon: CheckCircle },
  held:    { label: "On Hold",  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           icon: AlertCircle },
}

function isoDateOnly(v: unknown): string {
  if (v == null) return ""
  const s = String(v)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function mapApiCycleStatus(raw: string): RevenueCycle["status"] {
  const u = raw.toLowerCase()
  if (u === "locked") return "locked"
  if (u === "finalized") return "finalized"
  if (u === "calculating") return "calculating"
  return "open"
}

function mapApiRevenueCycle(c: Record<string, unknown>): RevenueCycle {
  return {
    id: String(c.id ?? ""),
    cycleStart: isoDateOnly(c.cycle_start ?? c.cycleStart),
    cycleEnd: isoDateOnly(c.cycle_end ?? c.cycleEnd),
    totalRevenue: Number(c.gross_subscription_revenue ?? c.total_revenue ?? 0),
    subscriberCount: Number(c.subscriber_count ?? 0),
    adminCommissionPct: Number(c.admin_commission_pct ?? 0),
    adminEarnings: Number(c.admin_earnings ?? 0),
    authorPool: Number(c.author_pool ?? 0),
    totalEngagement: Number(c.total_engagement_weight ?? 0),
    status: mapApiCycleStatus(String(c.status ?? "open")),
    calculatedAt: null,
    lockedAt: null,
  }
}

function mapApiPayoutStatus(raw: string): AuthorPayout["status"] {
  const u = raw.toLowerCase()
  if (u === "paid") return "paid"
  if (u === "hold") return "held"
  return "pending"
}

function mapApiAuthorPayout(o: Record<string, unknown>, userId: string): AuthorPayout {
  const meta =
    o.meta && typeof o.meta === "object" && !Array.isArray(o.meta)
      ? (o.meta as Record<string, unknown>)
      : {}
  const gross = Number(o.gross_earnings ?? 0)
  const platformFee = Number(meta.platform_fee ?? meta.platformFee ?? 0)
  const net = Number(meta.net_earnings ?? meta.netEarnings ?? gross - platformFee)
  const weight = Number(o.engagement_weight ?? 0)
  const share = Number(o.share_percentage ?? 0)

  return {
    id: String(o.id ?? ""),
    authorId: userId,
    authorName: "—",
    cycleId: String(o.revenue_cycle_id ?? ""),
    totalEngagement: Number.isFinite(weight) ? weight : 0,
    sharePct: Number.isFinite(share) ? share : 0,
    grossEarnings: Number.isFinite(gross) ? gross : 0,
    platformFee: Number.isFinite(platformFee) ? platformFee : 0,
    netEarnings: Number.isFinite(net) ? net : 0,
    status: mapApiPayoutStatus(String(o.status ?? "pending")),
    requestedAt: null,
    paidAt: o.paid_at != null ? String(o.paid_at) : null,
  }
}

function parsePoolPayoutsPayload(
  data: unknown,
  userId: string,
): { payouts: AuthorPayout[]; cycles: RevenueCycle[] } {
  const cyclesById = new Map<string, RevenueCycle>()
  const payouts: AuthorPayout[] = []
  if (!Array.isArray(data)) return { payouts: [], cycles: [] }

  for (const row of data) {
    if (!row || typeof row !== "object") continue
    const o = row as Record<string, unknown>
    const rc = o.revenue_cycle
    if (rc && typeof rc === "object" && !Array.isArray(rc)) {
      const cycle = mapApiRevenueCycle(rc as Record<string, unknown>)
      if (cycle.id) cyclesById.set(cycle.id, cycle)
    }
    payouts.push(mapApiAuthorPayout(o, userId))
  }
  return { payouts, cycles: [...cyclesById.values()] }
}

function summarizePayoutsList(payouts: AuthorPayout[]) {
  const paid = payouts.filter(p => p.status === "paid")
  const pending = payouts.filter(p => p.status === "pending" || p.status === "held")
  return {
    totalGross: payouts.reduce((s, p) => s + p.grossEarnings, 0),
    totalNet: payouts.reduce((s, p) => s + p.netEarnings, 0),
    paidNet: paid.reduce((s, p) => s + p.netEarnings, 0),
    pendingNet: pending.reduce((s, p) => s + p.netEarnings, 0),
    totalPayouts: payouts.length,
    pendingPayouts: pending.length,
  }
}

type LiveEngagementBookRow = {
  id: string
  title: string
  coverUrl: string
  category: string
  accessType: string
  readerCount: number
  avgCompletionPct: number
  pagesRead: number
}

function parseLiveEngagementBooks(data: unknown): LiveEngagementBookRow[] {
  if (!Array.isArray(data)) return []
  const out: LiveEngagementBookRow[] = []
  for (const row of data) {
    if (!row || typeof row !== "object") continue
    const b = row as Record<string, unknown>
    const eng = b.engagement && typeof b.engagement === "object" ? (b.engagement as Record<string, unknown>) : {}
    const rc = Number(eng.readerCount ?? eng.reader_count ?? 0)
    const avg = Number(eng.avgCompletionPct ?? eng.avg_completion_pct ?? 0)
    const pr = Number(eng.pagesRead ?? eng.pages_read ?? 0)
    const accessRaw = b.accessType ?? b.access_type
    const access =
      accessRaw === "PAID" || accessRaw === "SUBSCRIPTION" ? String(accessRaw) : "FREE"
    const coverStr =
      typeof b.coverUrl === "string" && b.coverUrl.trim()
        ? b.coverUrl
        : typeof b.cover_url === "string" && b.cover_url.trim()
          ? b.cover_url
          : ""
    out.push({
      id: String(b.id ?? ""),
      title: String(b.title ?? "Untitled"),
      coverUrl: coverStr || demoPic("fallback-cover"),
      category: typeof b.category === "string" && b.category.trim() ? b.category : "—",
      accessType: access,
      readerCount: Number.isFinite(rc) ? Math.max(0, Math.floor(rc)) : 0,
      avgCompletionPct: Number.isFinite(avg) ? avg : 0,
      pagesRead: Number.isFinite(pr) ? Math.max(0, Math.floor(pr)) : 0,
    })
  }
  return out
}

// ── Formula Card ──────────────────────────────────────────────────────────────

function PoolFormulaCard({
  cycle,
  payout,
  settings,
  fromLiveApi,
}: {
  cycle: RevenueCycle | null
  payout: AuthorPayout | null
  settings: { adminCommissionPct: number; platformFeeOnPayout: number }
  fromLiveApi?: boolean
}) {
  const authorPool        = cycle?.authorPool       ?? 0
  const totalEngagement   = cycle?.totalEngagement  ?? 1
  const authorEngagement  = payout?.totalEngagement ?? 0
  const sharePct          = payout?.sharePct        ?? 0
  const gross             = payout?.grossEarnings   ?? 0
  const fee               = payout?.platformFee     ?? 0
  const net               = payout?.netEarnings     ?? 0

  const steps = [
    {
      label: "Total Subscription Revenue",
      value: fmtMoney(cycle?.totalRevenue ?? 0),
      detail: `${cycle?.subscriberCount?.toLocaleString() ?? "—"} subscribers`,
      color: "bg-blue-500",
    },
    {
      label: `Admin Commission (${settings.adminCommissionPct}%)`,
      value: `− ${fmtMoney(cycle?.adminEarnings ?? 0)}`,
      detail: "Platform operating costs",
      color: "bg-slate-400",
    },
    {
      label: "Author Pool",
      value: fmtMoney(authorPool),
      detail: "Distributed to all authors",
      color: "bg-brand",
    },
    {
      label: "Your Engagement Share",
      value: `${sharePct.toFixed(4)}%`,
      detail: fromLiveApi
        ? `${fmtNum(authorEngagement)} / ${fmtNum(totalEngagement)} pool weight (completion-based)`
        : `${fmtNum(authorEngagement)} / ${fmtNum(totalEngagement)} engagement minutes`,
      color: "bg-amber-500",
    },
    {
      label: "Gross Earnings",
      value: fmtMoney(gross),
      detail: `${sharePct.toFixed(4)}% × ${fmtMoney(authorPool)}`,
      color: "bg-emerald-500",
    },
    {
      label: `Platform Fee (${settings.platformFeeOnPayout}%)`,
      value: `− ${fmtMoney(fee)}`,
      detail: "Processing & payout costs",
      color: "bg-slate-400",
    },
    {
      label: "Net Payout",
      value: fmtMoney(net),
      detail: "Amount transferred to you",
      color: "bg-green-600",
      highlight: true,
    },
  ]

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 bg-brand/10 rounded-xl">
          <BarChart3 size={16} className="text-brand" />
        </div>
        <h2 className="font-semibold text-foreground">Revenue Pool Calculation</h2>
        <div className="ml-auto">
          <Badge className="bg-muted text-muted-foreground border-0 gap-1 text-[10px]">
            <Shield size={9} /> Tamper-proof
          </Badge>
        </div>
      </div>

      {cycle ? (
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className={cn(
              "flex items-center justify-between p-3.5 rounded-xl",
              step.highlight
                ? "bg-green-50 border border-green-200 dark:bg-green-900/10 dark:border-green-900/30"
                : "bg-muted/50"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full shrink-0", step.color)} />
                <div>
                  <p className={cn("text-sm font-medium", step.highlight ? "text-green-700 dark:text-green-400" : "text-foreground")}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{step.detail}</p>
                </div>
              </div>
              <span className={cn(
                "text-sm font-bold font-serif tabular-nums",
                step.highlight ? "text-green-700 dark:text-green-400 text-base" : "text-foreground"
              )}>
                {step.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No open billing cycle data available yet.
        </div>
      )}

      <div className="mt-4 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 flex gap-2.5">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          Your earnings are calculated server-side at the end of each billing cycle.
          Engagement is weighted by <strong>completion percentage</strong> — completing
          a book earns more than partial reads. Anti-manipulation filters are applied.
        </p>
      </div>
    </div>
  )
}

// ── Per-book engagement table ─────────────────────────────────────────────────

function BookEngagementTable({
  authorId,
  cycleId,
  liveRows,
}: {
  authorId: string
  cycleId: string | null
  /** When set (including `[]`), replaces mock engagement + MOCK_BOOKS. */
  liveRows?: LiveEngagementBookRow[] | null
}) {
  const mockRows = React.useMemo(() => {
    const allEngagement = engagementStore.getAll().filter(e => e.isValid && (!cycleId || e.cycleId === cycleId))
    const authorBooks = MOCK_BOOKS.slice(0, 6)
    return authorBooks.map(book => {
      const records = allEngagement.filter(e => e.bookId === book.id)
      const readers = records.length
      const avgComp = readers > 0 ? records.reduce((s, r) => s + r.completionPct, 0) / readers : 0
      const engMin = records.reduce((s, r) => s + Math.floor(r.readingTimeSec / 60), 0)
      return { book, readers, avgComp, engMin }
    })
  }, [cycleId])

  const rows =
    liveRows != null
      ? liveRows.map(b => ({
          book: {
            id: b.id,
            title: b.title,
            coverUrl: b.coverUrl,
            category: b.category,
            accessType: b.accessType as "FREE" | "PAID" | "SUBSCRIPTION",
          },
          readers: b.readerCount,
          avgComp: b.avgCompletionPct,
          engMetric: b.pagesRead,
          engIsPages: true,
        }))
      : mockRows.map(r => ({
          ...r,
          engMetric: r.engMin,
          engIsPages: false,
        }))

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="font-semibold text-foreground">Per-Book Engagement</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {liveRows != null
            ? "Reader counts and pages read from your live library (subscription pool weight uses completion %)."
            : "Engagement minutes feed directly into your earnings share calculation."}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {(
                liveRows != null
                  ? ["Book", "Readers", "Avg Completion", "Pages read", "Access Type"]
                  : ["Book", "Readers", "Avg Completion", "Eng. Minutes", "Access Type"]
              ).map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ book, readers, avgComp, engMetric, engIsPages }) => (
              <tr key={book.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-12 shrink-0 overflow-hidden rounded bg-muted">
                      <CoverImage
                        src={book.coverUrl}
                        alt={`Cover of ${book.title}`}
                        sizes="32px"
                        className="rounded"
                        coverFallbackSeed={book.id}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-xs line-clamp-1">{book.title}</p>
                      <p className="text-[10px] text-muted-foreground">{book.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                    <Users size={11} className="text-muted-foreground" />
                    {readers > 0 ? fmtNum(readers) : <span className="text-muted-foreground">—</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {readers > 0 ? (
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={avgComp} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-foreground tabular-nums w-8 text-right">{Math.round(avgComp)}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No reads yet</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {engMetric > 0
                      ? engIsPages
                        ? `${fmtNum(engMetric)} pg`
                        : `${fmtNum(engMetric)} min`
                      : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn(
                    "border-0 text-[10px]",
                    book.accessType === "FREE"         && "bg-muted text-muted-foreground",
                    book.accessType === "SUBSCRIPTION" && "bg-brand/10 text-brand",
                    book.accessType === "PAID"         && "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                  )}>
                    {book.accessType}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Payout History Row ────────────────────────────────────────────────────────

function PayoutRow({
  payout,
  cycle,
  fromLiveApi,
}: {
  payout: AuthorPayout
  cycle: RevenueCycle | undefined
  /** Backend uses engagement weight (completion points), not minutes. */
  fromLiveApi?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const status = STATUS_CONFIG[payout.status]
  const StatusIcon = status.icon
  const engUnit = fromLiveApi ? "weight" : "min"

  return (
    <>
      <tr
        className="hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
          {cycle ? `${new Date(cycle.cycleStart).toLocaleString("en-US", { month: "short", year: "numeric" })}` : payout.cycleId}
        </td>
        <td className="px-4 py-3.5">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium", status.cls)}>
            <StatusIcon size={10} /> {status.label}
          </span>
        </td>
        <td className="px-4 py-3.5 text-sm tabular-nums text-right font-medium text-foreground">
          {fmtMoney(payout.grossEarnings)}
        </td>
        <td className="px-4 py-3.5 text-sm tabular-nums text-right text-muted-foreground">
          − {fmtMoney(payout.platformFee)}
        </td>
        <td className="px-4 py-3.5 text-sm tabular-nums text-right font-bold text-foreground">
          {fmtMoney(payout.netEarnings)}
        </td>
        <td className="px-4 py-3.5 text-sm tabular-nums text-right text-muted-foreground">
          {payout.sharePct.toFixed(4)}%
        </td>
        <td className="px-4 py-3.5 text-sm tabular-nums text-right text-muted-foreground">
          {fmtNum(payout.totalEngagement)} {engUnit}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="px-4 pb-4 bg-muted/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
              {[
                { label: "Cycle Period",      value: cycle ? `${cycle.cycleStart} – ${cycle.cycleEnd}` : "—" },
                { label: "Author Pool",       value: fmtMoney(cycle?.authorPool ?? 0) },
                { label: "Platform Eng.",     value: `${fmtNum(cycle?.totalEngagement ?? 0)} ${engUnit}` },
                { label: "Paid At",           value: payout.paidAt ? new Date(payout.paidAt).toLocaleDateString() : "Not yet" },
              ].map(item => (
                <div key={item.label} className="bg-card border border-border rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-xs font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(payouts: AuthorPayout[], cycles: RevenueCycle[]) {
  const header = "Cycle,Status,Gross ($),Platform Fee ($),Net ($),Share %,Engagement (min)"
  const rows   = payouts.map(p => {
    const c = cycles.find(cy => cy.id === p.cycleId)
    return [
      c ? `${c.cycleStart} – ${c.cycleEnd}` : p.cycleId,
      p.status,
      p.grossEarnings.toFixed(2),
      p.platformFee.toFixed(2),
      p.netEarnings.toFixed(2),
      p.sharePct.toFixed(4),
      p.totalEngagement,
    ].join(",")
  })
  const csv  = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = "my-earnings.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main ──────────────────────────────────────────────────────────────────────

function EarningsContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [payouts, setPayouts] = React.useState<AuthorPayout[]>([])
  const [cycles, setCycles] = React.useState<RevenueCycle[]>([])
  const [settings, setSettings] = React.useState({ adminCommissionPct: 30, platformFeeOnPayout: 10 })
  const [liveEngagementBooks, setLiveEngagementBooks] = React.useState<LiveEngagementBookRow[] | null>(
    null,
  )
  const [liveLoading, setLiveLoading] = React.useState(false)

  const useLiveApi = Boolean(
    user && apiUrlConfigured() && (user.role === "author" || user.role === "admin"),
  )

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Fauthor%2Fearnings")
    }
    if (!isLoading && isAuthenticated && user?.role !== "author" && user?.role !== "admin") {
      router.replace("/")
    }
  }, [isLoading, isAuthenticated, user, router])

  React.useEffect(() => {
    seedStore()
    const authorId = user?.id ?? "usr_author_1"
    if (!useLiveApi) {
      setPayouts(authorPayoutStore.getByAuthor(authorId))
      setCycles(revenueCycleStore.getAll())
    }
    setSettings(adminSettingsStore.get())
  }, [user, useLiveApi])

  React.useLayoutEffect(() => {
    if (useLiveApi && user?.id) setLiveLoading(true)
  }, [useLiveApi, user?.id])

  React.useEffect(() => {
    if (!useLiveApi || !user?.id) {
      setLiveEngagementBooks(null)
      setLiveLoading(false)
      return
    }
    let alive = true
    setLiveLoading(true)
    Promise.all([
      authorSubscriptionPoolApi.payouts().catch(() => ({ data: [] })),
      booksApi.listMine({ per_page: "96" }).catch(() => ({ data: [] })),
    ])
      .then(([payRes, mineRes]) => {
        if (!alive) return
        const { payouts: apiPayouts, cycles: apiCycles } = parsePoolPayoutsPayload(
          payRes.data,
          user.id,
        )
        setPayouts(apiPayouts)
        setCycles(apiCycles.length > 0 ? apiCycles : revenueCycleStore.getAll())
        setLiveEngagementBooks(parseLiveEngagementBooks(normalizeAuthorMyBooksList(mineRes)))
      })
      .catch(() => {
        if (!alive) return
        const authorId = user.id ?? "usr_author_1"
        setPayouts(authorPayoutStore.getByAuthor(authorId))
        setCycles(revenueCycleStore.getAll())
        setLiveEngagementBooks(null)
      })
      .finally(() => {
        if (alive) setLiveLoading(false)
      })
    return () => {
      alive = false
    }
  }, [useLiveApi, user?.id])

  if (isLoading || !user) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )

  if (useLiveApi && liveLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
        Loading subscription earnings…
      </div>
    )
  }

  const effectiveLive = useLiveApi && liveEngagementBooks !== null

  const openCycle = cycles.find(c => c.status === "open") ?? null
  const latestPayout =
    payouts.find(p => p.cycleId === openCycle?.id) ?? payouts[0] ?? null
  const summary = effectiveLive
    ? summarizePayoutsList(payouts)
    : authorPayoutStore.summary(user.id ?? "usr_author_1")

  const poolSettings = effectiveLive && openCycle && openCycle.adminCommissionPct > 0
    ? {
        adminCommissionPct: openCycle.adminCommissionPct,
        platformFeeOnPayout: settings.platformFeeOnPayout,
      }
    : settings

  // Build chart data from real payouts
  const chartData = [...cycles]
    .filter(c => c.status === "locked")
    .sort((a, b) => a.cycleStart.localeCompare(b.cycleStart))
    .slice(-6)
    .map(c => {
      const p = payouts.find(pay => pay.cycleId === c.id)
      return {
        month: new Date(c.cycleStart).toLocaleString("en-US", { month: "short" }),
        net:   p?.netEarnings  ?? 0,
        gross: p?.grossEarnings ?? 0,
        share: p?.sharePct     ?? 0,
      }
    })

  const KPIs = [
    {
      label: "Total Net Earned",
      value: fmtMoney(summary.totalNet),
      delta: effectiveLive ? null : "+12%",
      icon: DollarSign,
      color: "text-brand bg-brand/10",
    },
    {
      label: "Pending Payout",
      value: fmtMoney(summary.pendingNet),
      delta: null,
      icon: Clock,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Total Paid Out",
      value: fmtMoney(summary.paidNet),
      delta: null,
      icon: CheckCircle,
      color: "text-green-500 bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Payout Records",
      value: String(summary.totalPayouts),
      delta: null,
      icon: BarChart3,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/author">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft size={15} /> Author Dashboard
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Subscription Earnings</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Your revenue pool earnings — calculated monthly from reader engagement across your books.
        {effectiveLive && (
          <span className="block mt-1 text-xs">
            Showing live payout rows and cycles from the API. Engagement &quot;weight&quot; is
            completion-based (not clock minutes). Platform fee on payout may be stored in{" "}
            <code className="text-[11px]">meta</code> when the backend adds it.
          </span>
        )}
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {KPIs.map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-lg", kpi.color)}>
                <kpi.icon size={18} />
              </div>
              {kpi.delta && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 text-[10px]">
                  {kpi.delta}
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold font-serif text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="formula">Pool Formula</TabsTrigger>
          <TabsTrigger value="books">Per-Book Stats</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Earnings chart */}
          {chartData.length > 0 ? (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-foreground">Earnings Trend</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Net payout per billing cycle</p>
                </div>
                <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">Last 6 cycles</Badge>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--brand))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--brand))" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [fmtMoney(Number(v ?? 0)), "Net"]}
                  />
                  <Area type="monotone" dataKey="net" stroke="hsl(var(--brand))" fill="url(#earnGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <BarChart3 size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">No finalized cycles yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Earnings appear after the monthly calculation is run by the admin.
              </p>
            </div>
          )}

          {/* Current cycle preview */}
          {openCycle && (
            <div className="bg-card border border-brand/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                <h2 className="font-semibold text-foreground">Current Cycle Preview</h2>
                <Badge className="bg-brand/10 text-brand border-0 text-[10px] ml-auto">Open</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Cycle Period",      value: `${openCycle.cycleStart} – ${openCycle.cycleEnd}` },
                  { label: "Total Revenue",     value: fmtMoney(openCycle.totalRevenue) },
                  { label: "Author Pool",       value: fmtMoney(openCycle.authorPool) },
                  { label: "Your Est. Share",   value: latestPayout ? `${latestPayout.sharePct.toFixed(3)}%` : "Calculating…" },
                ].map(item => (
                  <div key={item.label} className="bg-muted/50 rounded-xl p-3.5">
                    <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                <Lock size={10} />
                Final earnings are locked at cycle close. Values shown are estimates based on current engagement.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Formula */}
        <TabsContent value="formula">
          <PoolFormulaCard
            cycle={openCycle}
            payout={latestPayout}
            settings={poolSettings}
            fromLiveApi={effectiveLive}
          />
        </TabsContent>

        {/* Per-book stats */}
        <TabsContent value="books">
          <BookEngagementTable
            authorId={user.id ?? "usr_author_1"}
            cycleId={openCycle?.id ?? null}
            liveRows={effectiveLive ? liveEngagementBooks : undefined}
          />
        </TabsContent>

        {/* Payout history */}
        <TabsContent value="history">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Payout History</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{payouts.length} records • Click a row to expand</p>
              </div>
              <Button
                variant="outline" size="sm"
                className="gap-1.5 h-8 text-xs hover:border-brand hover:text-brand"
                onClick={() => exportCSV(payouts, cycles)}
                disabled={payouts.length === 0}
              >
                <Download size={13} /> Export CSV
              </Button>
            </div>

            {payouts.length === 0 ? (
              <div className="py-16 text-center">
                <DollarSign size={36} className="text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground">No payouts yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Payouts are generated after each monthly calculation. Keep publishing and readers will find you.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {["Cycle", "Status", "Gross", "Fee", "Net", "Share %", "Engagement"].map(h => (
                        <th key={h} className={cn(
                          "px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap",
                          h === "Cycle" || h === "Status" ? "text-left" : "text-right"
                        )}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payouts.map(p => (
                      <PayoutRow
                        key={p.id}
                        payout={p}
                        cycle={cycles.find(c => c.id === p.cycleId)}
                        fromLiveApi={effectiveLive}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary footer */}
            {payouts.length > 0 && (
              <div className="p-4 border-t border-border bg-muted/30 flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Total Gross</span>
                  <p className="font-bold text-foreground font-serif">{fmtMoney(summary.totalGross)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Total Net</span>
                  <p className="font-bold text-foreground font-serif">{fmtMoney(summary.totalNet)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Paid Out</span>
                  <p className="font-bold text-green-600 dark:text-green-400 font-serif">{fmtMoney(summary.paidNet)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Pending</span>
                  <p className="font-bold text-amber-500 font-serif">{fmtMoney(summary.pendingNet)}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function AuthorEarningsPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 pt-16">
          <EarningsContent />
        </main>
      </div>
    </Providers>
  )
}
