"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronLeft, DollarSign, TrendingUp, ShoppingCart,
  BookOpen, Headphones, Download, ExternalLink, Star,
  CheckCircle, Clock, BarChart3, ArrowUpRight, ArrowDownRight, Loader2,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import { seedStore, SALES_COMMISSION_PCT } from "@/lib/store"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { demoPic } from "@/lib/demo-images"
import { authorSalesApi, booksApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"

// ── Mock extended sales data ─────────────────────────────────────────────────
const MONTHLY_SALES = [
  { month: "Aug '25", sales: 4,  revenue: 68.96,  commission: 13.79, net: 55.17 },
  { month: "Sep '25", sales: 7,  revenue: 126.93, commission: 25.39, net: 101.54 },
  { month: "Oct '25", sales: 11, revenue: 199.89, commission: 39.98, net: 159.91 },
  { month: "Nov '25", sales: 9,  revenue: 163.91, commission: 32.78, net: 131.13 },
  { month: "Dec '25", sales: 15, revenue: 272.85, commission: 54.57, net: 218.28 },
  { month: "Jan '26", sales: 18, revenue: 327.42, commission: 65.48, net: 261.94 },
]

const PER_BOOK_STATS = [
  {
    bookId: "bk_002",
    title: "Atomic Habits: African Edition",
    author: "James Okafor",
    coverUrl: demoPic("core-bk-atomic"),
    format: "ebook",
    price: 12.99,
    totalSales: 38,
    totalRevenue: 493.62,
    commission: 98.72,
    netEarnings: 394.90,
    rating: 4.9,
    reviewCount: 3400,
    trend: "up" as const,
    trendPct: 22,
    conversionRate: 8.4,
  },
  {
    bookId: "bk_008",
    title: "Currency of Knowledge",
    author: "Dr. Amaka Eze",
    coverUrl: demoPic("core-bk-currency"),
    format: "audiobook",
    price: 19.99,
    totalSales: 19,
    totalRevenue: 379.81,
    commission: 75.96,
    netEarnings: 303.85,
    rating: 4.3,
    reviewCount: 340,
    trend: "up" as const,
    trendPct: 15,
    conversionRate: 5.2,
  },
  {
    bookId: "bk_010",
    title: "Python for Data Scientists",
    author: "Kofi Mensah",
    coverUrl: demoPic("core-bk-python"),
    format: "ebook",
    price: 24.99,
    totalSales: 27,
    totalRevenue: 674.73,
    commission: 134.95,
    netEarnings: 539.78,
    rating: 4.7,
    reviewCount: 2800,
    trend: "down" as const,
    trendPct: 8,
    conversionRate: 11.3,
  },
  {
    bookId: "bk_005",
    title: "Midnight in Accra",
    author: "Efua Asante",
    coverUrl: demoPic("core-bk-accra"),
    format: "ebook",
    price: 8.99,
    totalSales: 9,
    totalRevenue: 80.91,
    commission: 16.18,
    netEarnings: 64.73,
    rating: 4.5,
    reviewCount: 920,
    trend: "up" as const,
    trendPct: 5,
    conversionRate: 3.7,
  },
]

const RECENT_TRANSACTIONS = [
  { id: "txn_r_001", buyer: "John R.", bookTitle: "Python for Data Scientists", amount: 24.99, net: 19.99, gateway: "Paystack",    date: "Jan 26, 2026", status: "success" as const },
  { id: "txn_r_002", buyer: "Amara L.", bookTitle: "Atomic Habits: African Edition", amount: 12.99, net: 10.39, gateway: "PayPal", date: "Jan 24, 2026", status: "success" as const },
  { id: "txn_r_003", buyer: "Kwame D.", bookTitle: "Currency of Knowledge", amount: 19.99, net: 15.99, gateway: "Flutterwave", date: "Jan 22, 2026", status: "success" as const },
  { id: "txn_r_004", buyer: "Ngozi B.", bookTitle: "Midnight in Accra", amount: 8.99, net: 7.19, gateway: "Korapay", date: "Jan 20, 2026", status: "refunded" as const },
  { id: "txn_r_005", buyer: "Seun K.", bookTitle: "Python for Data Scientists", amount: 24.99, net: 19.99, gateway: "Paystack", date: "Jan 18, 2026", status: "success" as const },
  { id: "txn_r_006", buyer: "Fatima M.", bookTitle: "Atomic Habits: African Edition", amount: 12.99, net: 10.39, gateway: "Flutterwave", date: "Jan 15, 2026", status: "success" as const },
]

const COMMISSION_PCT = Math.round(SALES_COMMISSION_PCT * 100)

type BookSalesStat = {
  bookId: string
  title: string
  author: string
  coverUrl: string
  format: "ebook" | "audiobook" | "magazine"
  price: number
  totalSales: number | null
  totalRevenue: number
  commission: number
  netEarnings: number
  rating: number
  reviewCount: number
  trend: "up" | "down"
  trendPct: number | null
  conversionRate: number | null
}

type LiveTxnRow = {
  id: string
  buyer: string
  bookTitle: string
  amount: number
  net: number
  gateway: string
  date: string
  status: "success" | "refunded" | "other"
}

type MineSalesBook = {
  id: string
  title: string
  author?: string | null
  coverUrl?: string | null
  format?: string | null
  price?: number | null
  rating?: number | null
  reviewCount?: number | null
}

function parseNetByBookId(data: unknown): Record<string, number> {
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

function buildLiveBookRows(mine: MineSalesBook[], netById: Record<string, number>): BookSalesStat[] {
  const com = SALES_COMMISSION_PCT
  return mine
    .map(b => {
      const id = String(b.id)
      const net = netById[id] ?? 0
      const gross = com > 0 && com < 1 ? net / (1 - com) : net
      const commission = Math.max(0, gross - net)
      const fmt: BookSalesStat["format"] =
        b.format === "audiobook" ? "audiobook" : b.format === "magazine" ? "magazine" : "ebook"
      return {
        bookId: id,
        title: b.title || "Untitled",
        author: typeof b.author === "string" && b.author.trim() ? b.author : "—",
        coverUrl: typeof b.coverUrl === "string" && b.coverUrl.trim() ? b.coverUrl : demoPic("fallback-cover"),
        format: fmt,
        price: typeof b.price === "number" && Number.isFinite(b.price) ? b.price : 0,
        totalSales: null,
        totalRevenue: gross,
        commission,
        netEarnings: net,
        rating: typeof b.rating === "number" && Number.isFinite(b.rating) ? b.rating : 0,
        reviewCount:
          typeof b.reviewCount === "number" && Number.isFinite(b.reviewCount) ? b.reviewCount : 0,
        trend: "up" as const,
        trendPct: null,
        conversionRate: null,
      }
    })
    .sort((a, b) => b.netEarnings - a.netEarnings)
}

function mapApiTransactions(data: unknown, com: number): LiveTxnRow[] {
  if (!Array.isArray(data)) return []
  const out: LiveTxnRow[] = []
  for (const row of data) {
    if (!row || typeof row !== "object") continue
    const t = row as Record<string, unknown>
    const amount = Number(t.amount ?? 0)
    const st = String(t.status ?? "").toLowerCase()
    const success = st === "success" || st === "completed" || st === "paid"
    const refunded = st === "refunded" || st === "refund"
    const netEst = success && com > 0 && com < 1 ? amount * (1 - com) : 0
    const created = t.created_at != null ? String(t.created_at) : ""
    out.push({
      id: String(t.id ?? ""),
      buyer: "—",
      bookTitle: `Order #${t.order_id ?? "?"}`,
      amount: Number.isFinite(amount) ? amount : 0,
      net: Number.isFinite(netEst) ? netEst : 0,
      gateway: String(t.gateway ?? "—"),
      date: created
        ? new Date(created).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      status: refunded ? "refunded" : success ? "success" : "other",
    })
  }
  return out
}

const MOCK_PER_BOOK_ROWS: BookSalesStat[] = PER_BOOK_STATS as BookSalesStat[]

const MOCK_TXN_ROWS: LiveTxnRow[] = RECENT_TRANSACTIONS.map(t => ({
  id: t.id,
  buyer: t.buyer,
  bookTitle: t.bookTitle,
  amount: t.amount,
  net: t.net,
  gateway: t.gateway,
  date: t.date,
  status: t.status === "refunded" ? "refunded" : "success",
}))

function KPICard({ label, value, sub, icon: Icon, colorClass, bgClass }: {
  label: string; value: string; sub?: string; icon: React.ElementType
  colorClass: string; bgClass: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bgClass, colorClass)}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold font-serif text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/70 mt-1">{sub}</div>}
    </div>
  )
}

function BookSalesRow({ book }: { book: BookSalesStat }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors text-left"
      >
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          className="w-10 h-14 object-cover rounded-lg shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-[10px] py-0 gap-1 capitalize">
              {book.format === "audiobook" ? <Headphones size={9} /> : <BookOpen size={9} />}
              {book.format}
            </Badge>
            <span className="text-xs text-muted-foreground">${book.price.toFixed(2)}</span>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-bold text-foreground">
            {book.totalSales != null ? `${book.totalSales} sales` : "—"}
          </span>
          <span className="text-[11px] text-muted-foreground">all time</span>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-bold text-brand">${book.netEarnings.toFixed(2)}</span>
          <span className="text-[11px] text-muted-foreground">net earned</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-semibold shrink-0",
            book.trendPct == null
              ? "text-muted-foreground"
              : book.trend === "up"
                ? "text-green-600 dark:text-green-400"
                : "text-destructive",
          )}
        >
          {book.trendPct != null ? (
            <>
              {book.trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {book.trendPct}%
            </>
          ) : (
            <span className="text-[11px] font-normal">API</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-5 grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Gross Revenue", value: `$${book.totalRevenue.toFixed(2)}` },
            {
              label: `Commission (${COMMISSION_PCT}%)`,
              value: `-$${book.commission.toFixed(2)}`,
              red: true,
            },
            { label: "Net Earnings", value: `$${book.netEarnings.toFixed(2)}`, brand: true },
            {
              label: "Conversion Rate",
              value: book.conversionRate != null ? `${book.conversionRate}%` : "—",
            },
          ].map(d => (
            <div key={d.label} className="bg-muted rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground mb-1">{d.label}</p>
              <p className={cn("text-sm font-bold",
                d.brand ? "text-brand" : d.red ? "text-destructive" : "text-foreground"
              )}>{d.value}</p>
            </div>
          ))}
          <div className="sm:col-span-2 md:col-span-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{book.rating}</span>
              ({book.reviewCount.toLocaleString()} reviews)
            </div>
            <Link href={`/books/${book.bookId}`}>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <ExternalLink size={11} /> View Book
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function SalesContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [liveBooks, setLiveBooks] = React.useState<BookSalesStat[] | null>(null)
  const [liveSummary, setLiveSummary] = React.useState<{
    net: number
    gross: number
    orders: number
  } | null>(null)
  const [liveTxns, setLiveTxns] = React.useState<LiveTxnRow[] | null>(null)
  const [liveLoading, setLiveLoading] = React.useState(false)

  const useLiveApi = Boolean(
    user && apiUrlConfigured() && (user.role === "author" || user.role === "admin"),
  )

  React.useEffect(() => {
    seedStore()
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Fauthor%2Fsales")
    }
    if (!isLoading && isAuthenticated && user?.role !== "author" && user?.role !== "admin") {
      router.replace("/")
    }
  }, [isLoading, isAuthenticated, user, router])

  React.useEffect(() => {
    if (!useLiveApi || !user) {
      setLiveBooks(null)
      setLiveSummary(null)
      setLiveTxns(null)
      return
    }
    let alive = true
    setLiveLoading(true)
    Promise.all([
      booksApi.listMine({ per_page: "96" }),
      authorSalesApi.summary().catch(() => null),
      authorSalesApi.books().catch(() => ({ data: [] })),
      authorSalesApi.transactions().catch(() => ({ data: [] })),
    ])
      .then(([mineRes, sum, salesBooks, txRes]) => {
        if (!alive) return
        const mineRaw = Array.isArray(mineRes.data) ? mineRes.data : []
        const mine: MineSalesBook[] = mineRaw
          .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
          .map(r => ({
            id: String(r.id ?? ""),
            title: String(r.title ?? ""),
            author: r.author != null ? String(r.author) : null,
            coverUrl: r.coverUrl != null ? String(r.coverUrl) : null,
            format: r.format != null ? String(r.format) : null,
            price: r.price != null ? Number(r.price) : null,
            rating: r.rating != null ? Number(r.rating) : null,
            reviewCount: r.reviewCount != null ? Number(r.reviewCount) : null,
          }))
        const netMap = parseNetByBookId(salesBooks?.data)
        setLiveBooks(buildLiveBookRows(mine, netMap))

        let net = 0
        let gross = 0
        let orders = 0
        if (sum && typeof sum === "object") {
          const s = sum as Record<string, unknown>
          net = Number(s.net_total ?? 0)
          gross = Number(s.gross_total ?? 0)
          orders = Math.floor(Number(s.orders_count ?? 0))
        }
        setLiveSummary({
          net: Number.isFinite(net) ? net : 0,
          gross: Number.isFinite(gross) ? gross : 0,
          orders: Number.isFinite(orders) ? orders : 0,
        })

        setLiveTxns(mapApiTransactions(txRes?.data, SALES_COMMISSION_PCT))
      })
      .catch(() => {
        if (alive) {
          setLiveBooks(null)
          setLiveSummary(null)
          setLiveTxns(null)
        }
      })
      .finally(() => {
        if (alive) setLiveLoading(false)
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

  if (useLiveApi && liveLoading && liveBooks === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
        Loading sales data…
      </div>
    )
  }

  const effectiveLive =
    useLiveApi &&
    liveBooks !== null &&
    liveSummary !== null &&
    liveTxns !== null &&
    !liveLoading

  const perBookStats = effectiveLive ? liveBooks! : MOCK_PER_BOOK_ROWS
  const txnRows = effectiveLive ? liveTxns! : MOCK_TXN_ROWS

  const totalNet = effectiveLive
    ? liveSummary!.net
    : MOCK_PER_BOOK_ROWS.reduce((s, b) => s + b.netEarnings, 0)
  const totalGross = effectiveLive
    ? liveSummary!.gross
    : MOCK_PER_BOOK_ROWS.reduce((s, b) => s + b.totalRevenue, 0)
  const totalSales = effectiveLive
    ? liveSummary!.orders
    : MOCK_PER_BOOK_ROWS.reduce((s, b) => s + (b.totalSales ?? 0), 0)

  const avgOrderVal = totalSales > 0 ? totalGross / totalSales : 0
  const janSales = MONTHLY_SALES[MONTHLY_SALES.length - 1]

  const breakdown = effectiveLive
    ? {
        revenue: liveSummary!.gross,
        commission: Math.max(0, liveSummary!.gross - liveSummary!.net),
        net: liveSummary!.net,
      }
    : {
        revenue: janSales.revenue,
        commission: janSales.commission,
        net: janSales.net,
      }

  const breakdownTitle = effectiveLive ? "All-time (API)" : "January 2026 Breakdown"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/author">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft size={15} /> Dashboard
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Direct Sales Analytics</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Revenue from one-time book purchases. Commission rate: {COMMISSION_PCT}% platform fee.
        {effectiveLive && (
          <span className="block mt-1 text-xs">
            Live totals from the API. Monthly charts stay as demos until a time-series endpoint exists.
            Transaction &quot;Your Net&quot; uses the same {COMMISSION_PCT}% fee as an estimate on payment
            amount.
          </span>
        )}
      </p>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="Total Net Earnings"
          value={`$${totalNet.toFixed(2)}`}
          sub="After platform commission"
          icon={DollarSign}
          colorClass="text-green-600 dark:text-green-400"
          bgClass="bg-green-50 dark:bg-green-900/20"
        />
        <KPICard
          label={effectiveLive ? "Paid orders" : "Total Books Sold"}
          value={`${totalSales}`}
          sub={
            effectiveLive
              ? `${perBookStats.length} titles · unique checkouts`
              : "All time · 4 titles"
          }
          icon={ShoppingCart}
          colorClass="text-brand"
          bgClass="bg-brand/10"
        />
        <KPICard
          label="Avg Order Value"
          value={`$${avgOrderVal.toFixed(2)}`}
          sub="Gross per transaction"
          icon={TrendingUp}
          colorClass="text-blue-600 dark:text-blue-400"
          bgClass="bg-blue-50 dark:bg-blue-900/20"
        />
        <KPICard
          label={effectiveLive ? "Gross revenue (API)" : "Jan 2026 Net"}
          value={
            effectiveLive
              ? `$${liveSummary!.gross.toFixed(2)}`
              : `$${janSales.net.toFixed(2)}`
          }
          sub={
            effectiveLive
              ? "Before platform commission"
              : `${janSales.sales} sales this month`
          }
          icon={BarChart3}
          colorClass="text-purple-600 dark:text-purple-400"
          bgClass="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* Commission explanation banner */}
      <div className="flex items-start gap-3 p-4 bg-brand/5 border border-brand/20 rounded-xl mb-8">
        <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
          <DollarSign size={14} className="text-brand" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Direct Sales Commission Structure</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            For every paid book sale, the platform retains a <strong className="text-foreground">{COMMISSION_PCT}% commission</strong>.
            You keep the remaining <strong className="text-foreground">{100 - COMMISSION_PCT}%</strong>.
            Example: $12.99 sale → ${(12.99 * SALES_COMMISSION_PCT).toFixed(2)} commission → <span className="text-brand font-semibold">${(12.99 * (1 - SALES_COMMISSION_PCT)).toFixed(2)} to you</span>.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold font-serif text-brand">{100 - COMMISSION_PCT}%</div>
          <div className="text-[10px] text-muted-foreground">your share</div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Revenue Chart</TabsTrigger>
          <TabsTrigger value="books">Per-Book Breakdown</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
        </TabsList>

        {/* Revenue chart */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-foreground">Monthly Sales Revenue</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    const csv = ["Month,Revenue,Net"].concat(MONTHLY_SALES.map(r => `${r.month},${r.revenue},${r.net}`)).join("\n")
                    const blob = new Blob([csv], { type: "text/csv" })
                    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sales-revenue.csv"; a.click()
                  }}
                >
                  <Download size={11} /> Export CSV
                </Button>
              </div>
              {effectiveLive ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground text-center px-6">
                  Month-by-month revenue is not available from the API yet. Use the KPIs above and the
                  per-book tab for live numbers.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={MONTHLY_SALES} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-border)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-border)" tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, ""]} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-brand)" fill="url(#salesGrad)" strokeWidth={2} name="Gross Revenue" />
                    <Area type="monotone" dataKey="net" stroke="#22c55e" fill="url(#netGrad)" strokeWidth={2} name="Net Earnings" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-5">Monthly Units Sold</h2>
              {effectiveLive ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground text-center px-6">
                  Units-sold over time will appear here once the backend exposes it.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={MONTHLY_SALES} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-border)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-border)" />
                    <Tooltip />
                    <Bar dataKey="sales" name="Books Sold" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Commission breakdown for latest month */}
          <div className="mt-6 bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4">{breakdownTitle}</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Gross Revenue",         value: `$${breakdown.revenue.toFixed(2)}`, color: "text-foreground",   bar: "bg-brand",      pct: 100 },
                { label: `Commission (${COMMISSION_PCT}%)`, value: `-$${breakdown.commission.toFixed(2)}`, color: "text-destructive",  bar: "bg-destructive/60", pct: COMMISSION_PCT },
                { label: "Your Net Earnings",     value: `$${breakdown.net.toFixed(2)}`,      color: "text-green-600 dark:text-green-400", bar: "bg-green-500", pct: 100 - COMMISSION_PCT },
              ].map(d => (
                <div key={d.label} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">{d.label}</span>
                    <span className={cn("text-sm font-bold", d.color)}>{d.value}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", d.bar)} style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Per-book breakdown */}
        <TabsContent value="books">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Sales by Title</h2>
              <p className="text-xs text-muted-foreground">Click a row to expand details</p>
            </div>
            <div className="divide-y divide-border">
              {[...perBookStats].sort((a, b) => b.netEarnings - a.netEarnings).map(book => (
                <BookSalesRow key={book.bookId} book={book} />
              ))}
            </div>

            {/* Revenue share bar */}
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue Share by Title</p>
              <div className="space-y-2">
                {[...perBookStats].sort((a, b) => b.totalRevenue - a.totalRevenue).map(book => {
                  const pct = totalGross > 0 ? (book.totalRevenue / totalGross) * 100 : 0
                  return (
                    <div key={book.bookId} className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground w-40 truncate shrink-0">{book.title.slice(0, 20)}...</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-semibold text-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Recent transactions */}
        <TabsContent value="transactions">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Recent Transactions</h2>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => {
                  const hdr = "Buyer,Book,Amount,Net,Gateway,Date,Status"
                  const rows = txnRows.map(t => `${t.buyer},${t.bookTitle},$${t.amount},$${t.net},${t.gateway},${t.date},${t.status}`)
                  const blob = new Blob([hdr + "\n" + rows.join("\n")], { type: "text/csv" })
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "transactions.csv"; a.click()
                }}
              >
                <Download size={11} /> Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Buyer", "Book", "Sale Price", "Your Net", "Gateway", "Date", "Status"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {txnRows.map(txn => (
                    <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                            {txn.buyer !== "—" ? txn.buyer[0] : "?"}
                          </div>
                          <span className="text-sm font-medium text-foreground">{txn.buyer}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">
                        {txn.bookTitle}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">${txn.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold text-brand">
                        {txn.net > 0 ? `$${txn.net.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{txn.gateway}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{txn.date}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium",
                          txn.status === "success"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : txn.status === "refunded"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                        )}>
                          {txn.status === "success" ? (
                            <CheckCircle size={9} />
                          ) : txn.status === "refunded" ? (
                            <Clock size={9} />
                          ) : null}
                          {txn.status === "success"
                            ? "Paid"
                            : txn.status === "refunded"
                              ? "Refunded"
                              : txn.status}
                        </span>
                      </td>
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

export default function AuthorSalesPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <SalesContent />
        </main>
      </div>
    </Providers>
  )
}
