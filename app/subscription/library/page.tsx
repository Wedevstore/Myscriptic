"use client"

/**
 * Subscription Library — Phase 3
 *
 * Mock: local subscriptionStore + MOCK_BOOKS.
 * Laravel Phase 3: GET /api/subscription/status + GET /api/subscription/catalog?category=&format=&sort=
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/providers/auth-provider"
import { subscriptionsApi, subscriptionCatalogApi } from "@/lib/api"
import { laravelPhase3Enabled } from "@/lib/auth-mode"
import { demoPic } from "@/lib/demo-images"
import { MOCK_BOOKS, CATEGORIES } from "@/lib/mock-data"
import {
  subscriptionStore, engagementStore, seedStore,
  type Subscription,
} from "@/lib/store"
import {
  BookOpen, Headphones, Crown, Search, Filter,
  ChevronLeft, Star, Play, Clock, CheckCircle,
  Lock, SlidersHorizontal, X, Infinity,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Subscription books are FREE + SUBSCRIPTION access type ───────────────────
type LibraryBookCardModel = {
  id: string
  title: string
  author: string
  coverUrl: string
  format: "ebook" | "audiobook" | "magazine"
  accessType: "FREE" | "SUBSCRIPTION"
  rating: number
  isNew?: boolean
  isTrending?: boolean
  category?: string
}

const MOCK_LIBRARY_BOOKS: LibraryBookCardModel[] = MOCK_BOOKS
  .filter(b => b.accessType === "FREE" || b.accessType === "SUBSCRIPTION")
  .map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    coverUrl: b.coverUrl,
    format: b.format,
    accessType: b.accessType as "FREE" | "SUBSCRIPTION",
    rating: b.rating,
    isNew: b.isNew,
    isTrending: b.isTrending,
    category: b.category,
  }))

function mapSubscriptionCatalogRow(r: Record<string, unknown>): LibraryBookCardModel {
  const at = String(r.access_type ?? "SUBSCRIPTION").toUpperCase()
  const fmt = r.format === "audiobook" || r.format === "magazine" ? r.format : "ebook"
  const ru = r.rating_avg
  const rating = typeof ru === "number" ? ru : Number(ru) || 0
  const cover = typeof r.cover_url === "string" && r.cover_url.trim() ? r.cover_url : demoPic("fallback-cover")
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    author: String(r.author ?? ""),
    coverUrl: cover,
    format: fmt,
    accessType: at === "FREE" ? "FREE" : "SUBSCRIPTION",
    rating,
    isNew: Boolean(r.is_new),
    isTrending: Boolean(r.is_trending),
    category: r.category != null ? String(r.category) : undefined,
  }
}

const SORT_OPTIONS = [
  { id: "trending",  label: "Trending"     },
  { id: "newest",    label: "Newest First" },
  { id: "rating",    label: "Top Rated"    },
  { id: "az",        label: "A – Z"        },
]

const FORMAT_OPTIONS = [
  { id: "all",       label: "All Formats"  },
  { id: "ebook",     label: "eBooks"       },
  { id: "audiobook", label: "Audiobooks"   },
]

// ── Access Gate Screen ────────────────────────────────────────────────────────

function NoSubscriptionGate() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-16 flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 rounded-3xl bg-brand/10 flex items-center justify-center mx-auto">
            <Crown size={40} className="text-brand" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-3">
              Subscription Required
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              The Subscription Library is exclusively for active subscribers.
              Subscribe now to access thousands of books instantly.
            </p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-5 text-left space-y-3">
            {[
              "Access 50,000+ ebooks and audiobooks",
              "Unlimited reading — no per-book fees",
              "New titles added every week",
              "Read on any device, sync your progress",
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-foreground">
                <CheckCircle size={14} className="text-brand shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/subscription">
              <Button className="w-full h-12 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
                <Crown size={15} /> View Subscription Plans
              </Button>
            </Link>
            <Link href="/books">
              <Button variant="outline" className="w-full h-12 gap-2">
                <BookOpen size={15} /> Browse Free Books Instead
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// ── Subscription Status Bar ───────────────────────────────────────────────────

function SubStatusBar({ sub }: { sub: Subscription }) {
  const exp  = new Date(sub.expiresAt)
  const now  = new Date()
  const days = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / 86400000))
  const pct  = Math.max(0, Math.min(100, (days / (sub.planId.includes("yearly") ? 365 : 30)) * 100))

  return (
    <div className="bg-brand/5 border-b border-brand/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-brand/15 flex items-center justify-center">
            <Crown size={13} className="text-brand" />
          </div>
          <span className="text-sm font-semibold text-foreground">{sub.planName}</span>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 text-[10px] px-2 gap-1">
            <CheckCircle size={9} /> Active
          </Badge>
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-[160px]">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">{days} days left</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Infinity size={12} className="text-brand" />
          Unlimited reading
        </div>
      </div>
    </div>
  )
}

// ── Book Card ─────────────────────────────────────────────────────────────────

function LibraryBookCard({
  book,
  engagement,
}: {
  book: LibraryBookCardModel
  engagement: { completionPct: number; pagesRead: number } | null
}) {
  const isStarted   = engagement && engagement.pagesRead > 0
  const isCompleted = engagement && engagement.completionPct >= 95

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 hover:shadow-md transition-all group flex flex-col">
      {/* Cover */}
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title} by ${book.author}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Access badge */}
        <div className="absolute top-2 left-2">
          <Badge className={cn(
            "text-[9px] border-0 px-1.5 py-0.5 font-semibold backdrop-blur-sm",
            book.accessType === "FREE"
              ? "bg-green-100/90 text-green-700 dark:bg-green-900/70 dark:text-green-400"
              : "bg-brand/90 text-white"
          )}>
            {book.accessType === "FREE" ? "Free" : "Included"}
          </Badge>
        </div>
        {/* Format badge */}
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-md bg-black/50 backdrop-blur-sm flex items-center justify-center">
            {book.format === "audiobook" ? (
              <Headphones size={11} className="text-white" />
            ) : (
              <BookOpen size={11} className="text-white" />
            )}
          </div>
        </div>
        {/* Completion overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-brand/20 flex items-center justify-center">
            <div className="bg-brand text-white rounded-full p-2">
              <CheckCircle size={20} />
            </div>
          </div>
        )}
        {/* Read button on hover */}
        {!isCompleted && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Link href={`/reader/${book.id}`}>
              <Button size="sm" className="bg-brand hover:bg-brand-dark text-white gap-2 shadow-xl">
                {book.format === "audiobook"
                  ? <><Play size={12} fill="currentColor" /> Listen</>
                  : <><BookOpen size={12} /> Read</>}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-brand transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={10}
                className={i < Math.floor(book.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">{book.rating}</span>
        </div>

        {/* Progress bar if started */}
        {isStarted && !isCompleted && (
          <div className="mt-auto pt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span className="flex items-center gap-1"><Clock size={9} /> In progress</span>
              <span>{Math.round(engagement!.completionPct)}%</span>
            </div>
            <Progress value={engagement!.completionPct} className="h-1" />
          </div>
        )}
        {isCompleted && (
          <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400 font-semibold">
            <CheckCircle size={10} /> Completed
          </div>
        )}

        {/* CTA */}
        <Link href={`/reader/${book.id}`} className="mt-auto pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs hover:border-brand hover:text-brand gap-1.5"
          >
            {isStarted && !isCompleted
              ? <><Clock size={11} /> Continue Reading</>
              : isCompleted
              ? <><BookOpen size={11} /> Read Again</>
              : book.format === "audiobook"
              ? <><Play size={11} fill="currentColor" /> Listen Now</>
              : <><BookOpen size={11} /> Read Now</>}
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function LibraryStats({
  total, started, completed,
}: { total: number; started: number; completed: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { label: "Available Books",  value: total,     color: "text-foreground" },
        { label: "In Progress",      value: started,   color: "text-brand" },
        { label: "Completed",        value: completed, color: "text-green-600 dark:text-green-400" },
      ].map(s => (
        <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
          <div className={cn("text-2xl font-bold font-serif", s.color)}>{s.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Main Library Content ──────────────────────────────────────────────────────

function SubscriptionLibraryContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [sub, setSub] = React.useState<Subscription | null>(null)
  const [gateReady, setGateReady] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState("all")
  const [format, setFormat] = React.useState("all")
  const [sort, setSort] = React.useState("trending")
  const [showFilter, setShowFilter] = React.useState(false)
  const [engMap, setEngMap] = React.useState<Record<string, { completionPct: number; pagesRead: number }>>({})
  const [liveBooks, setLiveBooks] = React.useState<LibraryBookCardModel[] | null>(null)
  const [catalogLoading, setCatalogLoading] = React.useState(false)
  const [catalogTotal, setCatalogTotal] = React.useState<number | null>(null)

  const useRemoteCatalog = laravelPhase3Enabled() && sub !== null

  React.useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent("/subscription/library")}`)
      return
    }

    seedStore()

    if (user) {
      const records = engagementStore.getByUser(user.id)
      const map: typeof engMap = {}
      records.forEach(r => {
        map[r.bookId] = { completionPct: r.completionPct, pagesRead: r.pagesRead }
      })
      setEngMap(map)
    }

    if (!laravelPhase3Enabled()) {
      setSub(subscriptionStore.getActiveByUser(user!.id))
      setGateReady(true)
      setLiveBooks(null)
      setCatalogTotal(null)
      return
    }

    setGateReady(false)
    subscriptionsApi
      .status()
      .then(s => {
        if (s.active && s.expires_at && s.plan) {
          const ui: Subscription = {
            id: "laravel",
            userId: user!.id,
            planId: s.plan.slug ?? String(s.plan.id),
            planName: s.plan.name,
            price: 0,
            currency: "NGN",
            status: "active",
            startedAt: new Date().toISOString(),
            expiresAt: s.expires_at,
            cancelledAt: null,
            gateway: "paystack",
            paymentRef: null,
            transactionId: null,
          }
          setSub(ui)
        } else {
          setSub(null)
        }
      })
      .catch(() => setSub(null))
      .finally(() => setGateReady(true))
  }, [isLoading, isAuthenticated, user, router])

  React.useEffect(() => {
    if (!laravelPhase3Enabled() || !sub || !user) {
      setLiveBooks(null)
      setCatalogLoading(false)
      setCatalogTotal(null)
      return
    }
    let alive = true
    setCatalogLoading(true)
    const baseParams: Record<string, string> = { per_page: "500", sort }
    if (category !== "all") baseParams.category = category
    if (format !== "all") baseParams.format = format

    ;(async () => {
      const acc: Record<string, unknown>[] = []
      let total = 0
      let lastPage = 1
      const maxPages = 25

      try {
        for (let page = 1; page <= lastPage && page <= maxPages; page++) {
          if (!alive) return
          const res = await subscriptionCatalogApi.books({
            ...baseParams,
            page: String(page),
          })
          if (!alive) return
          const chunk = (res.data ?? []) as Record<string, unknown>[]
          acc.push(...chunk)
          const meta = res.meta as { total?: number; last_page?: number } | undefined
          total = typeof meta?.total === "number" ? meta.total : acc.length
          lastPage = Math.max(1, Number(meta?.last_page ?? 1))
          if (chunk.length === 0) break
        }
        if (!alive) return
        setLiveBooks(acc.map(mapSubscriptionCatalogRow))
        setCatalogTotal(total > 0 ? total : acc.length)
      } catch {
        if (alive) {
          setLiveBooks([])
          setCatalogTotal(0)
        }
      } finally {
        if (alive) setCatalogLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [sub, user, category, format, sort])

  const pool: LibraryBookCardModel[] | null = useRemoteCatalog
    ? (catalogLoading && liveBooks === null ? null : (liveBooks ?? []))
    : MOCK_LIBRARY_BOOKS

  const filtered = React.useMemo(() => {
    if (pool === null) return []
    let books = pool

    if (search) {
      const q = search.toLowerCase()
      books = books.filter(b =>
        b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
      )
    }

    if (!useRemoteCatalog) {
      if (category !== "all") {
        books = books.filter(b => b.category?.toLowerCase() === category.toLowerCase())
      }
      if (format !== "all") {
        books = books.filter(b => b.format === format)
      }
      switch (sort) {
        case "rating":
          books = [...books].sort((a, b) => b.rating - a.rating)
          break
        case "az":
          books = [...books].sort((a, b) => a.title.localeCompare(b.title))
          break
        case "newest":
          books = [...books].filter(b => b.isNew).concat(books.filter(b => !b.isNew))
          break
        case "trending":
        default:
          books = [...books].filter(b => b.isTrending).concat(books.filter(b => !b.isTrending))
          break
      }
    }

    return books
  }, [pool, search, category, format, sort, useRemoteCatalog])

  const catalogSizeLabel =
    useRemoteCatalog && catalogTotal != null ? catalogTotal : MOCK_LIBRARY_BOOKS.length

  const startedCount   = Object.values(engMap).filter(e => e.pagesRead > 0 && e.completionPct < 95).length
  const completedCount = Object.values(engMap).filter(e => e.completionPct >= 95).length

  if (isLoading || !gateReady) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Checking subscription…</p>
          </div>
        </main>
      </div>
    )
  }

  if (!sub) return <NoSubscriptionGate />

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <SubStatusBar sub={sub} />
      <main id="main-content" className="flex-1 pt-16 bg-background">

        {/* Page header */}
        <div className="bg-sidebar border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link href="/subscription">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-7 text-xs px-2">
                      <ChevronLeft size={13} /> Subscription
                    </Button>
                  </Link>
                </div>
                <h1 className="font-serif text-3xl font-bold text-sidebar-foreground">
                  Your Subscription Library
                </h1>
                <p className="text-muted-foreground text-sm mt-1.5">
                  {catalogSizeLabel} books included in your {sub.planName}. Read or listen to as many as you want.
                </p>
              </div>
              <Badge className="bg-brand/20 text-brand border-0 px-3 py-1.5 text-xs font-semibold gap-1.5 self-start mt-1">
                <Infinity size={11} /> Unlimited Access
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Stats */}
          <LibraryStats
            total={catalogSizeLabel}
            started={startedCount}
            completed={completedCount}
          />

          {/* Continue reading row */}
          {startedCount > 0 && (
            <div className="mb-8">
              <h2 className="font-serif text-lg font-bold text-foreground mb-4">Continue Reading</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(pool ?? MOCK_LIBRARY_BOOKS).filter(b => {
                  const e = engMap[b.id]
                  return e && e.pagesRead > 0 && e.completionPct < 95
                }).slice(0, 5).map(book => (
                  <LibraryBookCard
                    key={book.id}
                    book={book}
                    engagement={engMap[book.id] ?? null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search books, authors…"
                className="pl-9 h-10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilter(f => !f)}
              className={cn("gap-2 h-10 px-4", showFilter && "border-brand text-brand")}
            >
              <SlidersHorizontal size={14} /> Filters
              {(category !== "all" || format !== "all") && (
                <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center">
                  {(category !== "all" ? 1 : 0) + (format !== "all" ? 1 : 0)}
                </span>
              )}
            </Button>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Expanded filter panel */}
          {showFilter && (
            <div className="bg-card border border-border rounded-xl p-5 mb-6 grid sm:grid-cols-2 gap-5">
              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategory("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      category === "all"
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border text-muted-foreground hover:border-brand/40"
                    )}
                  >
                    All
                  </button>
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.label)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        category === c.label
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border text-muted-foreground hover:border-brand/40"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Format</p>
                <div className="flex gap-2 flex-wrap">
                  {FORMAT_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        format === f.id
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border text-muted-foreground hover:border-brand/40"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> books
              {search && <> matching <span className="font-semibold text-foreground">&ldquo;{search}&rdquo;</span></>}
            </p>
            {(search || category !== "all" || format !== "all") && (
              <button
                onClick={() => { setSearch(""); setCategory("all"); setFormat("all") }}
                className="text-xs text-brand hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Book grid */}
          {pool === null ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading catalog…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Search size={24} className="text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No books found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try different filters or search terms.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map(book => (
                <LibraryBookCard
                  key={book.id}
                  book={book}
                  engagement={engMap[book.id] ?? null}
                />
              ))}
            </div>
          )}

          {/* PAID book upsell */}
          <div className="mt-12 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <Lock size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Looking for a PAID book?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Premium titles (marked PAID) are not included in your subscription and must be purchased individually. Browse the full store to find and buy them.
              </p>
            </div>
            <Link href="/store">
              <Button variant="outline" size="sm" className="shrink-0 gap-2 hover:border-amber-500 hover:text-amber-600">
                Browse Store
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function SubscriptionLibraryPage() {
  return (
    <Providers>
      <SubscriptionLibraryContent />
    </Providers>
  )
}
