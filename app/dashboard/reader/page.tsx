"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { BookCard } from "@/components/books/book-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MOCK_BOOKS } from "@/lib/mock-data"
import {
  engagementStore, subscriptionStore, seedStore,
  type EngagementRecord,
} from "@/lib/store"
import { booksApi, progressApi, type ReadingAnalyticsBook } from "@/lib/api"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import type { BookCardData } from "@/components/books/book-card"
import { apiUrlConfigured, laravelAuthEnabled } from "@/lib/auth-mode"
import { demoPic } from "@/lib/demo-images"
import {
  BookOpen, Clock, Heart, ShoppingBag, Star,
  TrendingUp, Award, BarChart3, ChevronRight,
  Crown, Flame, CheckCircle, BarChart2,
} from "lucide-react"
import { cn } from "@/lib/utils"

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function mapAnalyticsToEngagement(
  books: ReadingAnalyticsBook[],
  userId: string
): { records: EngagementRecord[]; display: Record<string, LiveBookDisplay> } {
  const display: Record<string, LiveBookDisplay> = {}
  const records: EngagementRecord[] = books.map(b => {
    const cov = b.cover_url?.trim() ? b.cover_url : demoPic("fallback-cover")
    display[b.book_id] = {
      title: b.title,
      author: b.author,
      coverUrl: cov,
      format: b.format,
    }
    return {
      id: `eng-${b.book_id}`,
      userId,
      bookId: b.book_id,
      sessionId: `live-${b.book_id}`,
      pagesRead: b.pages_read,
      totalPages: b.pages_total,
      completionPct: b.completion_percentage,
      readingTimeSec: b.reading_time_seconds,
      lastPageAt: b.last_sync_at ?? new Date().toISOString(),
      cycleId: null,
      isValid: true,
    }
  })
  return { records, display }
}

// ── In-progress book card ─────────────────────────────────────────────────────

type LiveBookDisplay = { title: string; author: string; coverUrl: string; format?: string }

function ReadingProgressCard({
  record,
  display,
}: {
  record: EngagementRecord
  display?: LiveBookDisplay | null
}) {
  const fromMock = MOCK_BOOKS.find(b => b.id === record.bookId)
  const title = display?.title ?? fromMock?.title
  const author = display?.author ?? fromMock?.author ?? ""
  const coverUrl = display?.coverUrl ?? fromMock?.coverUrl ?? demoPic("fallback-cover")
  if (!title) return null

  const lastReadLabel = (() => {
    const diff = Date.now() - new Date(record.lastPageAt).getTime()
    const min  = Math.floor(diff / 60000)
    if (min < 60) return `${min}m ago`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  })()

  return (
    <div className="flex gap-3 p-4 rounded-xl border border-border bg-card hover:border-brand/30 transition-all group">
      <Link href={`/books/${record.bookId}`} className="shrink-0">
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          className="w-14 h-20 object-cover rounded-lg shadow-sm"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/books/${record.bookId}`}>
          <h4 className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors line-clamp-1">
            {title}
          </h4>
        </Link>
        <p className="text-xs text-muted-foreground mb-2">{author}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-foreground">{Math.round(record.completionPct)}%</span>
          </div>
          <Progress value={record.completionPct} className="h-1.5" />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock size={9} /> {fmtTime(record.readingTimeSec)}
          </span>
          <span className="text-[10px] text-muted-foreground">{lastReadLabel}</span>
        </div>
      </div>
      <Link href={`/reader/${record.bookId}`}>
        <Button size="sm" variant="outline" className="h-7 text-xs px-2 hover:border-brand hover:text-brand self-center">
          Resume
        </Button>
      </Link>
    </div>
  )
}

// ── Streak dots ───────────────────────────────────────────────────────────────

function StreakDots({ streak }: { streak: number }) {
  return (
    <div className="flex gap-1.5 mt-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 h-2 rounded-full",
            i < streak ? "bg-brand" : i === streak ? "bg-brand/40" : "bg-muted"
          )}
        />
      ))}
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const useLiveApi = apiUrlConfigured() && laravelAuthEnabled()

  const [engRecords, setEngRecords] = React.useState<EngagementRecord[]>([])
  const [bookDisplayById, setBookDisplayById] = React.useState<Record<string, LiveBookDisplay>>({})
  const [isSubscriber, setIsSubscriber] = React.useState(false)
  const [dataReady, setDataReady] = React.useState(false)
  const [recBooks, setRecBooks] = React.useState<BookCardData[]>([])

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Freader")
    }
  }, [isLoading, isAuthenticated, router])

  React.useEffect(() => {
    if (isLoading || !user) return

    if (!useLiveApi) {
      seedStore()
      setEngRecords(engagementStore.getByUser(user.id))
      setBookDisplayById({})
      setIsSubscriber(subscriptionStore.isActive(user.id))
      setRecBooks(MOCK_BOOKS.filter(b => b.accessType !== "PAID").slice(0, 4))
      setDataReady(true)
      return
    }

    let alive = true
    setDataReady(false)
    Promise.all([
      progressApi.analytics(),
      booksApi.list({ per_page: "4" }).catch(() => ({ data: [] as unknown[], meta: {} })),
    ])
      .then(([analyticsRes, booksRes]) => {
        if (!alive || !user) return
        const books = analyticsRes.data.books ?? []
        const { records, display } = mapAnalyticsToEngagement(books, user.id)
        setEngRecords(records)
        setBookDisplayById(display)
        const subActive =
          Boolean(user.subscriptionPlan) &&
          Boolean(user.subscriptionExpiresAt) &&
          new Date(user.subscriptionExpiresAt!).getTime() > Date.now()
        setIsSubscriber(subActive)
        const raw = booksRes.data as unknown[]
        const cards = Array.isArray(raw)
          ? raw.slice(0, 4).map(r => apiBookToCard(r as ApiBookRecord))
          : []
        setRecBooks(
          cards.length > 0
            ? cards
            : MOCK_BOOKS.filter(b => b.accessType !== "PAID").slice(0, 4)
        )
        setDataReady(true)
      })
      .catch(() => {
        if (!alive || !user) return
        seedStore()
        setEngRecords(engagementStore.getByUser(user.id))
        setBookDisplayById({})
        setIsSubscriber(subscriptionStore.isActive(user.id))
        setRecBooks(MOCK_BOOKS.filter(b => b.accessType !== "PAID").slice(0, 4))
        setDataReady(true)
      })

    return () => {
      alive = false
    }
  }, [isLoading, user, useLiveApi])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  if (useLiveApi && !dataReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  // Derived from live engagement records
  const inProgress    = engRecords.filter(r => r.pagesRead > 0 && r.completionPct < 95)
  const completed     = engRecords.filter(r => r.completionPct >= 95)
  const totalTimeSec  = engRecords.reduce((s, r) => s + r.readingTimeSec, 0)
  const totalPages    = engRecords.reduce((s, r) => s + r.pagesRead, 0)

  // Stats row (live + blended)
  const STATS = [
    { label: "Books Read",    value: completed.length.toString(),          icon: BookOpen, color: "text-brand" },
    { label: "Time Reading",  value: fmtTime(totalTimeSec) || "—",         icon: Clock,    color: "text-blue-500" },
    { label: "Pages Read",    value: totalPages > 0 ? totalPages.toLocaleString() : "—", icon: BookOpen, color: "text-green-500" },
    { label: "In Progress",   value: inProgress.length.toString(),         icon: TrendingUp, color: "text-amber-500" },
  ]

  // Weekly reading mini-bar (computed from last 7 days using engagement lastPageAt)
  const today = new Date()
  const weekBars = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const dayStr = d.toISOString().slice(0, 10)
    const reading = engRecords.filter(r => r.lastPageAt.slice(0, 10) === dayStr)
    return {
      label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
      active: reading.length > 0,
    }
  })

  const streakCount = (() => {
    let count = 0
    for (let i = weekBars.length - 1; i >= 0; i--) {
      if (weekBars[i].active) count++
      else break
    }
    return count
  })()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Welcome back, {user.name.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSubscriber
              ? `You have an active subscription — unlimited reading access.`
              : "Upgrade to a plan for unlimited reading access."}
          </p>
        </div>
        {!isSubscriber ? (
          <Link href="/subscription">
            <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
              <Award size={16} />
              Upgrade to Pro
            </Button>
          </Link>
        ) : (
          <Link href="/subscription/library">
            <Badge className="bg-brand/10 text-brand border-0 px-4 py-2 text-sm font-semibold gap-2 cursor-pointer hover:bg-brand/20 transition-colors">
              <Crown size={14} />
              Subscription Library
            </Badge>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {STATS.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl bg-muted", s.color)}>
              <s.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold font-serif text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Continue Reading */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-foreground">Continue Reading</h2>
            <Link href={isSubscriber ? "/subscription/library" : "/library"} className="flex items-center gap-1 text-sm text-brand hover:underline">
              {isSubscriber ? "Subscription Library" : "My Library"} <ChevronRight size={14} />
            </Link>
          </div>
          {inProgress.length > 0 ? (
            <div className="space-y-3">
              {inProgress.slice(0, 5).map(record => (
                <ReadingProgressCard
                  key={record.id}
                  record={record}
                  display={bookDisplayById[record.bookId] ?? null}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <BookOpen size={28} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground text-sm">No books in progress</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Start a book and your progress will appear here.</p>
              <Link href={isSubscriber ? "/subscription/library" : "/books"}>
                <Button size="sm" className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2">
                  <BookOpen size={13} /> Browse Books
                </Button>
              </Link>
            </div>
          )}

          {/* Completed books */}
          {completed.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  Completed
                </h2>
                <Badge variant="secondary" className="text-xs">{completed.length}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {completed.slice(0, 6).map(record => {
                  const d = bookDisplayById[record.bookId]
                  const fromMock = MOCK_BOOKS.find(b => b.id === record.bookId)
                  const title = d?.title ?? fromMock?.title
                  const coverUrl = d?.coverUrl ?? fromMock?.coverUrl ?? demoPic("fallback-cover")
                  if (!title) return null
                  return (
                    <Link key={record.id} href={`/books/${record.bookId}`}>
                      <div className="flex gap-2.5 p-3 rounded-xl border border-border bg-card hover:border-brand/30 transition-all group">
                        <img
                          src={coverUrl}
                          alt={`Cover of ${title}`}
                          className="w-9 h-12 object-cover rounded-md shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-brand transition-colors">{title}</p>
                          <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-0.5">
                            <CheckCircle size={9} /> Done
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reading streak */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} className="text-orange-500" />
              <h3 className="font-semibold text-sm text-foreground">Reading Streak</h3>
            </div>
            <div className="text-3xl font-bold font-serif text-brand mb-1">
              {streakCount > 0 ? `${streakCount} day${streakCount !== 1 ? "s" : ""}` : "Start today!"}
            </div>
            <p className="text-xs text-muted-foreground">
              {streakCount > 0
                ? "Keep it up! Read today to maintain your streak."
                : "Read a book today to start your streak."}
            </p>
            <StreakDots streak={streakCount} />
          </div>

          {/* Monthly stats */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-brand" />
              <h3 className="font-semibold text-sm text-foreground">This Month</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Pages read",    value: totalPages > 0 ? totalPages.toLocaleString() : "0", pct: Math.min(100, (totalPages / 500) * 100) },
                { label: "Time reading",  value: fmtTime(totalTimeSec) || "0m",                      pct: Math.min(100, (totalTimeSec / 72000) * 100) },
                { label: "Books finished",value: completed.length.toString(),                         pct: Math.min(100, (completed.length / 5) * 100) },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                  <Progress value={item.pct} className="h-1.5" />
                </div>
              ))}
            </div>
            <Link href="/dashboard/reader/analytics">
              <Button variant="outline" size="sm" className="w-full mt-4 h-7 text-xs hover:border-brand hover:text-brand gap-1.5">
                <BarChart2 size={11} /> View Full Analytics
              </Button>
            </Link>
          </div>

          {/* Subscription CTA or status */}
          {isSubscriber ? (
            <div className="bg-brand/5 border border-brand/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-brand" />
                <h3 className="font-semibold text-sm text-foreground">Subscription Active</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                You have unlimited access to the subscription library.
              </p>
              <Link href="/subscription/library">
                <Button size="sm" className="w-full h-8 text-xs bg-brand hover:bg-brand-dark text-primary-foreground gap-1.5">
                  <BookOpen size={11} /> Open Library
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-brand" />
                <h3 className="font-semibold text-sm text-foreground">Go Unlimited</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Subscribe to access 50,000+ ebooks and audiobooks with no per-book fees.
              </p>
              <Link href="/subscription">
                <Button size="sm" className="w-full h-9 text-xs bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-1.5">
                  <Crown size={12} /> View Plans
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recommended */}
      <section className="mt-12" aria-label="Recommended books">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl font-bold text-foreground">Recommended for You</h2>
          <Link href="/discover" className="flex items-center gap-1 text-sm text-brand hover:underline">
            Discover more <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recBooks.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default function ReaderDashboardPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <DashboardContent />
        </main>
      </div>
    </Providers>
  )
}
