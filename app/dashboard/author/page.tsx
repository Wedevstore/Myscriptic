"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MOCK_BOOKS } from "@/lib/mock-data"
import {
  authorEarningsStore, authorPayoutStore, engagementStore, seedStore,
  type AuthorEarning, type AuthorPayout,
} from "@/lib/store"
import {
  BookOpen, DollarSign, Eye, TrendingUp, Plus,
  BarChart3, Users, Clock, ChevronRight,
  CheckCircle, AlertCircle, Upload, XCircle, Loader2,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CoverImage } from "@/components/ui/cover-image"
import { booksApi, authorSalesApi, authorSubscriptionPoolApi } from "@/lib/api"
import { normalizeAuthorMyBooksList } from "@/lib/author-my-books"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { demoPic } from "@/lib/demo-images"
import type { BookCardData } from "@/components/books/book-card"

const STATUS_CONFIG = {
  APPROVED: { label: "Live",     className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  PENDING:  { label: "Review",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         icon: XCircle },
  DRAFT:    { label: "Draft",    className: "bg-muted text-muted-foreground",                                         icon: AlertCircle },
}

type DashboardBookStatus = keyof typeof STATUS_CONFIG

type DashboardBook = BookCardData & {
  status: DashboardBookStatus
  reads: number
  earnings: number
}

// ── Author's books (seeded from mock data + status overlay) ──────────────────
const AUTHOR_BOOKS: DashboardBook[] = MOCK_BOOKS.slice(0, 5).map((b, i) => ({
  ...b,
  status: (["APPROVED", "APPROVED", "PENDING", "APPROVED", "DRAFT"] as const)[i],
  reads: [12400, 8900, 340, 7800, 0][i],
  earnings: 0,
}))

function approvalToDashboardStatus(raw: string): DashboardBookStatus {
  const u = raw.toLowerCase()
  if (u === "approved" || u === "live" || u === "published" || u === "active") return "APPROVED"
  if (u === "pending" || u === "in_review" || u === "review") return "PENDING"
  if (u === "rejected") return "REJECTED"
  return "DRAFT"
}

function parseSalesEarningsByBook(data: unknown): Record<string, number> {
  const map: Record<string, number> = {}
  if (!Array.isArray(data)) return map
  for (const row of data) {
    if (!row || typeof row !== "object") continue
    const o = row as Record<string, unknown>
    const id = o.book_id != null ? String(o.book_id) : ""
    if (!id) continue
    const n = Number(o.net_earnings ?? 0)
    map[id] = Number.isFinite(n) ? n : 0
  }
  return map
}

function parseMineEngagement(row: Record<string, unknown>): { pagesRead: number; readerCount: number } {
  const e = row.engagement
  if (!e || typeof e !== "object") return { pagesRead: 0, readerCount: 0 }
  const o = e as Record<string, unknown>
  const pr = Number(o.pagesRead ?? o.pages_read ?? 0)
  const rc = Number(o.readerCount ?? o.reader_count ?? 0)
  return {
    pagesRead: Number.isFinite(pr) ? Math.max(0, Math.floor(pr)) : 0,
    readerCount: Number.isFinite(rc) ? Math.max(0, Math.floor(rc)) : 0,
  }
}

function mineRecordToDashboardBook(
  b: Record<string, unknown>,
  earningsByBook: Record<string, number>,
): DashboardBook {
  const id = String(b.id ?? "")
  const coverRaw =
    (typeof b.coverUrl === "string" && b.coverUrl.trim() ? b.coverUrl : null) ??
    (typeof b.cover_url === "string" && b.cover_url.trim() ? b.cover_url : null)
  const cover = coverRaw ?? demoPic("fallback-cover")
  const fmt = typeof b.format === "string" ? b.format : "ebook"
  const accessTypeRaw = b.accessType ?? b.access_type
  const access =
    typeof accessTypeRaw === "string" && (accessTypeRaw === "PAID" || accessTypeRaw === "SUBSCRIPTION")
      ? accessTypeRaw
      : "FREE"
  const authorName =
    typeof b.author === "string" && b.author.trim()
      ? b.author
      : typeof b.author === "object" &&
          b.author &&
          typeof (b.author as { name?: string }).name === "string"
        ? (b.author as { name: string }).name
        : "—"
  const ratingN = Number(b.rating)
  const rating = Number.isFinite(ratingN) ? ratingN : 0
  const reviewN = Number(b.reviewCount ?? b.review_count)
  const reviewCount = Number.isFinite(reviewN) ? Math.max(0, Math.floor(reviewN)) : 0

  const { pagesRead } = parseMineEngagement(b)

  return {
    id,
    title: String(b.title ?? "Untitled"),
    author: authorName,
    rating,
    reviewCount,
    category: typeof b.category === "string" && b.category.trim() ? b.category : "—",
    coverUrl: cover,
    format: fmt as DashboardBook["format"],
    accessType: access as DashboardBook["accessType"],
    status: approvalToDashboardStatus(String(b.approvalStatus ?? b.approval_status ?? "")),
    reads: pagesRead,
    earnings: earningsByBook[id] ?? 0,
  }
}

type LiveAuthorSnapshot = {
  books: DashboardBook[]
  salesNet: number
  poolReaders: number
  poolAvgCompletion: number
  ytdSubscriptionUsd: number
  pendingPoolUsd: number
  lastPaidUsd: number | null
  latestSharePct: number
  payoutBars: { id: string; netEarnings: number }[]
}

// ── Monthly reads chart (static baseline — engagement is seed/session data) ─

const MONTHLY_STATS = [
  { month: "Aug", reads: 4200,  earnings: 88.4  },
  { month: "Sep", reads: 5800,  earnings: 112.6 },
  { month: "Oct", reads: 7200,  earnings: 143.2 },
  { month: "Nov", reads: 9100,  earnings: 181.8 },
  { month: "Dec", reads: 11400, earnings: 228.0 },
  { month: "Jan", reads: 13200, earnings: 264.0 },
]

function MiniBarChart({ data }: { data: typeof MONTHLY_STATS }) {
  const max = Math.max(...data.map(d => d.reads))
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map(d => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-brand/80 rounded-sm"
            style={{ height: `${(d.reads / max) * 52}px` }}
          />
          <span className="text-[9px] text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

// ── Earnings trend (from payouts) ────────────────────────────────────────────

function EarningsTrendBar({ payouts }: { payouts: readonly { id?: string; netEarnings: number }[] }) {
  if (payouts.length === 0) return null
  const max = Math.max(...payouts.map(p => p.netEarnings), 1)
  const recent = payouts.slice(-6)
  return (
    <div className="flex items-end gap-1.5 h-12 mt-3">
      {recent.map((p, i) => (
        <div key={p.id ?? i} className="flex-1 bg-brand/70 rounded-sm" style={{ height: `${(p.netEarnings / max) * 44}px` }} />
      ))}
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function AuthorDashboardContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [earnings, setEarnings] = React.useState<AuthorEarning[]>([])
  const [payouts, setPayouts] = React.useState<AuthorPayout[]>([])
  const [totalReads, setTotalReads] = React.useState(0)
  /** `undefined` = loading, `null` = fetch failed (use mock), else live snapshot */
  const [liveSnap, setLiveSnap] = React.useState<LiveAuthorSnapshot | null | undefined>(undefined)

  const useLiveApi = Boolean(
    user && apiUrlConfigured() && (user.role === "author" || user.role === "admin"),
  )

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Fauthor")
    }
    if (
      !isLoading &&
      isAuthenticated &&
      user?.role !== "author" &&
      user?.role !== "admin"
    ) {
      router.replace("/")
    }
  }, [isLoading, isAuthenticated, user, router])

  React.useEffect(() => {
    if (isLoading || !user) return
    seedStore()
    setEarnings(authorEarningsStore.getByAuthor(user.id))
    const p = authorPayoutStore.getByAuthor(user.id)
    setPayouts(p)
    const engAll = engagementStore.getAll()
    const authorBookIds = AUTHOR_BOOKS.map(b => b.id)
    const reads = engAll.filter(e => authorBookIds.includes(e.bookId))
      .reduce((s, e) => s + e.pagesRead, 0)
    setTotalReads(reads)
  }, [isLoading, user])

  React.useEffect(() => {
    if (!useLiveApi || !user) {
      setLiveSnap(undefined)
      return
    }
    let alive = true
    setLiveSnap(undefined)
    Promise.all([
      booksApi.listMine({ per_page: "48" }).catch(() => ({ data: [] as unknown[] })),
      authorSalesApi.summary().catch(() => null),
      authorSalesApi.books().catch(() => ({ data: [] })),
      authorSubscriptionPoolApi.summary().catch(() => null),
      authorSubscriptionPoolApi.payouts().catch(() => ({ data: [] })),
    ])
      .then(([mineRes, salesSum, salesBooksRes, poolSum, poolPayRes]) => {
        if (!alive) return
        const rawBooks = normalizeAuthorMyBooksList(mineRes)
        const earnMap = parseSalesEarningsByBook(salesBooksRes?.data)
        const books = rawBooks.map(row => mineRecordToDashboardBook(row, earnMap))
          .slice(0, 8)

        const salesNet =
          salesSum && typeof salesSum === "object" && salesSum !== null && "net_total" in salesSum
            ? Number((salesSum as { net_total: unknown }).net_total)
            : 0
        const sn = Number.isFinite(salesNet) ? salesNet : 0

        let poolReaders = 0
        let poolAvgCompletion = 0
        let ytdSubscriptionUsd = 0
        if (poolSum && typeof poolSum === "object" && poolSum !== null) {
          const ps = poolSum as Record<string, unknown>
          poolReaders = Math.max(0, Math.floor(Number(ps.total_readers ?? 0)))
          const tcp = Number(ps.total_completion_points ?? 0)
          poolAvgCompletion =
            poolReaders > 0 && Number.isFinite(tcp) ? Math.round(tcp / poolReaders) : 0
          const ytd = Number(ps.ytd_subscription_payouts_usd ?? 0)
          ytdSubscriptionUsd = Number.isFinite(ytd) ? ytd : 0
        }

        const payArr = Array.isArray(poolPayRes?.data) ? poolPayRes.data : []
        const parsed = payArr
          .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
          .map((o, i) => ({
            id: String(o.id ?? `p-${i}`),
            netEarnings: Number(o.gross_earnings ?? 0),
            status: String(o.status ?? ""),
            sharePct: Number(o.share_percentage ?? 0),
          }))
        const sorted = [...parsed].sort((a, b) => Number(b.id) - Number(a.id))
        const pendingPoolUsd = parsed
          .filter(x => x.status === "pending" || x.status === "hold")
          .reduce((s, x) => s + (Number.isFinite(x.netEarnings) ? x.netEarnings : 0), 0)
        const paid = parsed.filter(x => x.status === "paid").sort((a, b) => Number(b.id) - Number(a.id))
        const lastPaidUsd = paid[0] && Number.isFinite(paid[0].netEarnings) ? paid[0].netEarnings : null
        const latestSharePct =
          sorted[0] && Number.isFinite(sorted[0].sharePct) ? sorted[0].sharePct : 0
        const payoutBars = parsed.map(x => ({ id: x.id, netEarnings: x.netEarnings }))

        setLiveSnap({
          books,
          salesNet: sn,
          poolReaders,
          poolAvgCompletion,
          ytdSubscriptionUsd,
          pendingPoolUsd,
          lastPaidUsd,
          latestSharePct,
          payoutBars,
        })
      })
      .catch(() => {
        if (alive) setLiveSnap(null)
      })
    return () => {
      alive = false
    }
  }, [useLiveApi, user])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  const earningsSummary = authorEarningsStore.summary(user.id)
  const payoutsSummary = authorPayoutStore.summary(user.id)

  const engAll = engagementStore.getAll()
  const bookReadMap: Record<string, number> = {}
  engAll.forEach(e => {
    if (!bookReadMap[e.bookId]) bookReadMap[e.bookId] = 0
    bookReadMap[e.bookId] += e.pagesRead
  })

  const mockMergedBooks: DashboardBook[] = AUTHOR_BOOKS.map(b => ({
    ...b,
    reads: bookReadMap[b.id] ?? b.reads,
    earnings:
      earnings.filter(e => e.bookId === b.id).reduce((s, e) => s + e.net, 0),
  }))

  const liveLoading = useLiveApi && liveSnap === undefined
  const liveOk = useLiveApi && liveSnap !== null && liveSnap !== undefined

  const LIVE_AUTHOR_BOOKS: DashboardBook[] = liveOk
    ? liveSnap.books
    : mockMergedBooks

  const approvedBooks = LIVE_AUTHOR_BOOKS.filter(b => b.status === "APPROVED")
  const avgEngagementMock = approvedBooks.length > 0
    ? Math.round(
        approvedBooks.reduce((s, b) => {
          const eng = engAll.filter(e => e.bookId === b.id)
          const avg = eng.length > 0 ? eng.reduce((a, e) => a + e.completionPct, 0) / eng.length : 0
          return s + avg
        }, 0) / approvedBooks.length,
      )
    : 0

  const totalEarned = liveOk
    ? liveSnap.salesNet + liveSnap.ytdSubscriptionUsd
    : earningsSummary.totalNet + payoutsSummary.totalNet

  const pendingPayout = liveOk
    ? liveSnap.pendingPoolUsd
    : earningsSummary.pendingNet + payoutsSummary.pendingNet

  const lastPaidPayout = liveOk
    ? liveSnap.lastPaidUsd != null
      ? { netEarnings: liveSnap.lastPaidUsd }
      : undefined
    : payouts.filter(p => p.status === "paid").slice(-1)[0]

  const poolShare = liveOk
    ? liveSnap.latestSharePct
    : payouts.length > 0
      ? payouts[payouts.length - 1].sharePct
      : 0

  const trendPayouts = liveOk
    ? liveSnap.payoutBars
    : payouts.map(p => ({ id: p.id, netEarnings: p.netEarnings }))

  const displayReads = liveLoading
    ? "—"
    : liveOk
      ? liveSnap.poolReaders.toLocaleString()
      : totalReads > 0
        ? totalReads.toLocaleString()
        : "29,300"

  const displayEngPct = liveLoading
    ? "—"
    : liveOk
      ? liveSnap.poolAvgCompletion > 0
        ? `${liveSnap.poolAvgCompletion}%`
        : avgEngagementMock > 0
          ? `${avgEngagementMock}%`
          : "72%"
      : avgEngagementMock > 0
        ? `${avgEngagementMock}%`
        : "72%"

  const kpiEarningsValue =
    liveLoading ? "—" : totalEarned > 0 ? `$${totalEarned.toFixed(2)}` : liveOk ? "$0.00" : "$580.20"
  const kpiPendingValue =
    liveLoading
      ? "—"
      : pendingPayout > 0
        ? `$${pendingPayout.toFixed(2)}`
        : liveOk
          ? "$0.00"
          : "$234.80"
  const kpiActiveBooksValue = liveLoading ? "—" : approvedBooks.length.toString()
  const kpiReadsDelta = liveOk ? null : "+22%"
  const kpiEngDelta =
    liveLoading || liveOk ? null : avgEngagementMock > 0 ? null : "+5%"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Author Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.name}. Here&apos;s your performance overview.
          </p>
        </div>
        <Link href="/dashboard/author/books/new">
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
            <Plus size={16} />
            Upload New Book
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Earnings",
            value: kpiEarningsValue,
            icon: DollarSign,
            delta: liveOk || liveLoading ? null : "+18%",
            color: "text-green-500",
          },
          {
            label: "Total Reads",
            value: displayReads,
            icon: Eye,
            delta: kpiReadsDelta,
            color: "text-blue-500",
          },
          {
            label: "Active Books",
            value: kpiActiveBooksValue,
            icon: BookOpen,
            delta: null,
            color: "text-brand",
          },
          {
            label: "Avg. Engagement",
            value: displayEngPct,
            icon: TrendingUp,
            delta: kpiEngDelta,
            color: "text-purple-500",
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-lg bg-muted", kpi.color)}>
                <kpi.icon size={18} />
              </div>
              {kpi.delta && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-[10px] border-0">
                  {kpi.delta}
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold font-serif text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Books table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-foreground">My Books</h2>
            <Link href="/dashboard/author/books" className="flex items-center gap-1 text-xs text-brand hover:underline">
              Manage all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {liveLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your books…
              </div>
            )}
            {!liveLoading && LIVE_AUTHOR_BOOKS.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No books yet.{" "}
                <Link href="/dashboard/author/books/new" className="text-brand hover:underline">
                  Upload one
                </Link>
                .
              </div>
            )}
            {!liveLoading &&
              LIVE_AUTHOR_BOOKS.map(book => {
              const status = STATUS_CONFIG[book.status] ?? STATUS_CONFIG.DRAFT
              return (
                <div key={book.id} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <div className="relative w-10 h-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    <CoverImage
                      src={book.coverUrl}
                      alt={`Cover of ${book.title}`}
                      sizes="40px"
                      className="rounded-md"
                      coverFallbackSeed={book.id}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={cn("text-[9px] px-1.5 py-0 gap-1 border-0", status.className)}>
                        <status.icon size={8} />
                        {status.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground capitalize">{book.format}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-xs font-semibold text-foreground">
                      {book.reads > 0 ? book.reads.toLocaleString() : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">reads</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                      ${book.earnings > 0 ? book.earnings.toFixed(2) : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">earned</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Live earnings card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-brand" />
              <h3 className="font-semibold text-sm text-foreground">Earnings Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Earned</span>
                <span className="text-sm font-bold text-foreground">
                  {liveLoading
                    ? "—"
                    : liveOk || totalEarned > 0
                      ? `$${totalEarned.toFixed(2)}`
                      : "$580.20"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Pending Payout</span>
                <span className="text-sm font-bold text-brand">
                  {liveLoading
                    ? "—"
                    : liveOk || pendingPayout > 0
                      ? `$${pendingPayout.toFixed(2)}`
                      : "$234.80"}
                </span>
              </div>
              {lastPaidPayout && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Last Payout</span>
                  <span className="text-sm font-medium text-foreground">
                    ${lastPaidPayout.netEarnings.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Pool Share</span>
                <span className="text-sm font-medium text-foreground">
                  {liveLoading
                    ? "—"
                    : liveOk
                      ? poolShare > 0
                        ? `${poolShare.toFixed(2)}%`
                        : "—"
                      : poolShare > 0
                        ? `${poolShare.toFixed(2)}%`
                        : "2.34%"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Next Payout</span>
                <span className="text-xs font-semibold text-foreground">
                  {liveOk ? "—" : "Feb 1, 2026"}
                </span>
              </div>
            </div>

            {/* Payout trend */}
            {trendPayouts.length > 0 && <EarningsTrendBar payouts={trendPayouts} />}

            <Link href="/dashboard/author/earnings">
              <Button variant="outline" className="w-full mt-4 h-8 text-xs hover:border-brand hover:text-brand">
                View Full Report
              </Button>
            </Link>
          </div>

          {/* Reads chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-brand" />
              <h3 className="font-semibold text-sm text-foreground">Monthly Reads</h3>
            </div>
            <MiniBarChart data={MONTHLY_STATS} />
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>
                {liveOk
                  ? `API: ${liveSnap.poolReaders.toLocaleString()} reader rows (subscription)`
                  : "Total: 50,900 reads (demo)"}
              </span>
              {!liveOk && <span className="text-green-500">+22% vs last period</span>}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Upload New Book",    href: "/dashboard/author/books/new", icon: Upload },
                { label: "Video courses",      href: "/dashboard/author/courses",   icon: GraduationCap },
                { label: "Earnings & Payouts", href: "/dashboard/author/earnings",  icon: DollarSign },
                { label: "View Analytics",     href: "/dashboard/author/sales",     icon: BarChart3 },
                { label: "Reader Insights",    href: "/dashboard/author/books",     icon: Users },
              ].map(action => (
                <Link key={action.href} href={action.href}>
                  <button className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-muted text-sm text-foreground transition-colors text-left group">
                    <action.icon size={14} className="text-muted-foreground group-hover:text-brand transition-colors" />
                    {action.label}
                    <ChevronRight size={12} className="ml-auto text-muted-foreground" />
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthorDashboardPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AuthorDashboardContent />
        </main>
      </div>
    </Providers>
  )
}
