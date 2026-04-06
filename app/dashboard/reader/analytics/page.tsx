"use client"

/**
 * Reader Reading Analytics — Phase 3
 *
 * With `NEXT_PUBLIC_API_URL` set, loads aggregates from `GET /api/reading-analytics`.
 * Otherwise uses local engagementStore + mock book metadata for charts.
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
  engagementStore, subscriptionStore, seedStore,
  type EngagementRecord,
} from "@/lib/store"
import {
  progressApi,
  type ReadingAnalyticsBook,
  type ReadingAnalyticsSummary,
} from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { demoPic } from "@/lib/demo-images"
import {
  ChevronLeft, BookOpen, Clock, TrendingUp, Award,
  Target, CheckCircle, Flame, BarChart2, Star,
  Headphones, Calendar, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  Radar, AreaChart, Area,
} from "recharts"

// ── Static goal definitions ────────────────────────────────────────────────────

const READING_GOALS = [
  { id: "books_month", label: "Books this month",   target: 4,   unit: "books"   },
  { id: "pages_week",  label: "Pages this week",    target: 200, unit: "pages"   },
  { id: "hours_month", label: "Hours this month",   target: 20,  unit: "hours"   },
]

// Weekly activity data (mock + engagement-derived)
const WEEKLY_DATA = [
  { day: "Mon", pages: 45, minutes: 62  },
  { day: "Tue", pages: 0,  minutes: 0   },
  { day: "Wed", pages: 82, minutes: 95  },
  { day: "Thu", pages: 38, minutes: 51  },
  { day: "Fri", pages: 65, minutes: 78  },
  { day: "Sat", pages: 120,minutes: 148 },
  { day: "Sun", pages: 55, minutes: 71  },
]

// Monthly trend (last 6 months)
const MONTHLY_TREND = [
  { month: "Aug", minutes: 1240 },
  { month: "Sep", minutes: 1580 },
  { month: "Oct", minutes: 1920 },
  { month: "Nov", minutes: 2100 },
  { month: "Dec", minutes: 2480 },
  { month: "Jan", minutes: 2610 },
]

// Achievements
const ACHIEVEMENTS = [
  { id: "first_book",   label: "First Book",       desc: "Completed your first book",       earned: true,  icon: BookOpen },
  { id: "streak_7",     label: "7-Day Streak",     desc: "Read 7 days in a row",             earned: true,  icon: Flame },
  { id: "night_owl",    label: "Night Owl",        desc: "Read past midnight 5 times",       earned: true,  icon: Star },
  { id: "speed_reader", label: "Speed Reader",     desc: "Finished a book in under 3 hours", earned: false, icon: Zap },
  { id: "explorer",     label: "Genre Explorer",   desc: "Read books in 5 different genres", earned: false, icon: TrendingUp },
  { id: "century",      label: "100 Pages Club",   desc: "Read 100 pages in a single day",   earned: false, icon: Target },
]

// ── Helper functions ──────────────────────────────────────────────────────────

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function fmtHours(seconds: number): string {
  return (seconds / 3600).toFixed(1)
}

type AnalyticsBookRow = {
  id: string
  bookId: string
  title: string
  author: string
  coverUrl: string
  category?: string | null
  format: string
  completionPct: number
  pagesRead: number
  totalPages: number
  readingTimeSec: number
  isValid: boolean
}

function apiBookToRow(b: ReadingAnalyticsBook): AnalyticsBookRow {
  const cov =
    typeof b.cover_url === "string" && b.cover_url.trim().length > 0
      ? b.cover_url
      : demoPic("fallback-cover")
  return {
    id:            `live-${b.book_id}`,
    bookId:        String(b.book_id),
    title:         b.title || "Unknown",
    author:        b.author || "",
    coverUrl:      cov,
    category:      b.category ?? null,
    format:        b.format || "ebook",
    completionPct: Number(b.completion_percentage),
    pagesRead:     Number(b.pages_read),
    totalPages:    Number(b.pages_total),
    readingTimeSec: Number(b.reading_time_seconds),
    isValid:       true,
  }
}

function engagementToRow(r: EngagementRecord): AnalyticsBookRow {
  const book = MOCK_BOOKS.find(mb => mb.id === r.bookId)
  return {
    id:            r.id,
    bookId:        r.bookId,
    title:         book?.title ?? "Unknown",
    author:        book?.author ?? "",
    coverUrl:      book?.coverUrl ?? demoPic("fallback-cover"),
    category:      book?.category,
    format:        book?.format ?? "ebook",
    completionPct: r.completionPct,
    pagesRead:     r.pagesRead,
    totalPages:    r.totalPages,
    readingTimeSec: r.readingTimeSec,
    isValid:       r.isValid,
  }
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, icon: Icon, colorClass, trend,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; colorClass: string; trend?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", colorClass)}>
          <Icon size={16} />
        </div>
        {trend && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 text-[10px]">
            {trend}
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold font-serif text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Book Engagement Row ───────────────────────────────────────────────────────

function BookEngRow({ row }: { row: AnalyticsBookRow }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        <img
          src={row.coverUrl}
          alt={`Cover of ${row.title}`}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{row.title}</p>
        <p className="text-xs text-muted-foreground">{row.author}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <Progress value={row.completionPct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">{Math.round(row.completionPct)}%</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={10} />
          {fmtTime(row.readingTimeSec)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          p.{row.pagesRead}/{row.totalPages}
        </div>
      </div>
      {row.completionPct >= 95 && (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 text-[9px] px-1.5 shrink-0">
          <CheckCircle size={8} className="mr-0.5" /> Done
        </Badge>
      )}
      {!row.isValid && (
        <Badge className="bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-0 text-[9px] px-1.5 shrink-0">
          Flagged
        </Badge>
      )}
    </div>
  )
}

// ── Main Content ──────────────────────────────────────────────────────────────

function AnalyticsContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [records, setRecords] = React.useState<EngagementRecord[]>([])
  const [isSubscriber, setIsSubscriber] = React.useState(false)
  const useLiveApi = Boolean(user && apiUrlConfigured())
  const [live, setLive] = React.useState<{
    status: "idle" | "loading" | "ok" | "err"
    summary: ReadingAnalyticsSummary | null
    books: AnalyticsBookRow[] | null
  }>({ status: "idle", summary: null, books: null })

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Freader%2Fanalytics")
      return
    }
    if (user) {
      seedStore()
      setRecords(engagementStore.getByUser(user.id))
      setIsSubscriber(subscriptionStore.isActive(user.id))
    }
  }, [isLoading, isAuthenticated, user, router])

  React.useEffect(() => {
    if (!useLiveApi || !user) return
    let alive = true
    setLive({ status: "loading", summary: null, books: null })
    progressApi
      .analytics()
      .then(res => {
        if (!alive) return
        const rows = (res.data?.books ?? []).map(apiBookToRow)
        setLive({
          status: "ok",
          summary: res.data.summary,
          books: rows,
        })
      })
      .catch(() => {
        if (!alive) return
        setLive({ status: "err", summary: null, books: null })
      })
    return () => {
      alive = false
    }
  }, [useLiveApi, user])

  const engagementRows = React.useMemo(
    () => records.map(engagementToRow),
    [records]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  const useLiveData =
    useLiveApi && live.status === "ok" && live.books !== null && live.summary !== null

  const bookRows = useLiveData ? live.books! : engagementRows

  const liveBoot = useLiveApi && live.status === "loading" && engagementRows.length === 0
  if (liveBoot) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  const totalTimeSec = useLiveData
    ? live.summary!.total_reading_time_seconds
    : bookRows.reduce((s, r) => s + r.readingTimeSec, 0)
  const totalPages = useLiveData
    ? live.summary!.total_pages_read
    : bookRows.reduce((s, r) => s + r.pagesRead, 0)
  const completedBooks = useLiveData
    ? live.summary!.books_completed
    : bookRows.filter(r => r.completionPct >= 95).length
  const inProgress = bookRows.filter(r => r.pagesRead > 0 && r.completionPct < 95).length
  const avgCompletion = useLiveData
    ? Math.round(live.summary!.average_completion_pct)
    : bookRows.length > 0
      ? Math.round(bookRows.reduce((s, r) => s + r.completionPct, 0) / bookRows.length)
      : 0

  const genreMap: Record<string, number> = {}
  bookRows.forEach(r => {
    if (r.category) {
      genreMap[r.category] = (genreMap[r.category] ?? 0) + r.readingTimeSec
    }
  })
  const genreData = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, seconds]) => ({ name, hours: parseFloat((seconds / 3600).toFixed(1)) }))

  const radarData = [
    { subject: "Fiction",    A: genreMap["Fiction"]    ? Math.min(100, (genreMap["Fiction"]    / 7200) * 100) : 0 },
    { subject: "Business",   A: genreMap["Business"]   ? Math.min(100, (genreMap["Business"]   / 7200) * 100) : 0 },
    { subject: "Self-Help",  A: genreMap["Self-Help"]  ? Math.min(100, (genreMap["Self-Help"]  / 7200) * 100) : 0 },
    { subject: "Technology", A: genreMap["Technology"] ? Math.min(100, (genreMap["Technology"] / 7200) * 100) : 0 },
    { subject: "Historical", A: genreMap["Historical"] ? Math.min(100, (genreMap["Historical"] / 7200) * 100) : 0 },
    { subject: "Leadership", A: genreMap["Leadership"] ? Math.min(100, (genreMap["Leadership"] / 7200) * 100) : 0 },
  ]

  const ebookCount     = bookRows.filter(r => r.format === "ebook").length
  const audiobookCount = bookRows.filter(r => r.format === "audiobook").length

  const goalProgress = [
    { ...READING_GOALS[0], current: completedBooks },
    { ...READING_GOALS[1], current: Math.min(200, totalPages) },
    { ...READING_GOALS[2], current: parseFloat(fmtHours(totalTimeSec)) },
  ]

  const kpiTrendTime = useLiveData ? undefined : "+12%"
  const kpiTrendPages = useLiveData ? undefined : "+8%"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/reader">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft size={15} /> Reader Dashboard
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-foreground">Reading Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detailed stats from your engagement across all books
          </p>
          {useLiveData && (
            <p className="text-[11px] text-muted-foreground/80 mt-1">
              Totals and book list sync from your account; weekly and monthly charts are illustrative until time-series data is available.
            </p>
          )}
        </div>
        {isSubscriber && (
          <Badge className="bg-brand/20 text-brand border-0 gap-1.5 px-3 py-1.5 text-xs font-semibold">
            <Star size={10} /> Subscriber Insights
          </Badge>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="Total Reading Time"
          value={fmtTime(totalTimeSec)}
          sub={`${fmtHours(totalTimeSec)}h total`}
          icon={Clock}
          colorClass="bg-brand/10 text-brand"
          trend={kpiTrendTime}
        />
        <KPICard
          label="Pages Read"
          value={totalPages.toLocaleString()}
          icon={BookOpen}
          colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          trend={kpiTrendPages}
        />
        <KPICard
          label="Books Completed"
          value={completedBooks.toString()}
          sub={`${inProgress} in progress`}
          icon={CheckCircle}
          colorClass="bg-green-50 text-green-600 dark:bg-green-900/20"
        />
        <KPICard
          label="Avg Completion"
          value={`${avgCompletion}%`}
          sub="across all books"
          icon={Target}
          colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20"
        />
      </div>

      {/* Streak + format row */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {/* Reading streak */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
            <Flame size={24} className="text-orange-500" />
          </div>
          <div>
            <div className="text-3xl font-bold font-serif text-foreground">7</div>
            <div className="text-sm font-medium text-foreground">Day Streak</div>
            <div className="text-xs text-muted-foreground">Personal best: 14 days</div>
          </div>
        </div>

        {/* Format split */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Format Split</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                <BookOpen size={13} className="text-brand" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{ebookCount}</div>
                <div className="text-[10px] text-muted-foreground">eBooks</div>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Headphones size={13} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{audiobookCount}</div>
                <div className="text-[10px] text-muted-foreground">Audiobooks</div>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-brand rounded-l-full transition-all"
              style={{ width: `${records.length > 0 ? (ebookCount / records.length) * 100 : 50}%` }}
            />
            <div className="h-full bg-blue-400 flex-1 rounded-r-full" />
          </div>
        </div>

        {/* This month */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            <Calendar size={11} className="inline mr-1" />
            January 2026
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Books read",    value: `${completedBooks}`,              max: 4   },
              { label: "Pages turned",  value: `${totalPages}`,                  max: 800 },
              { label: "Hours logged",  value: `${fmtHours(totalTimeSec)}h`,     max: 20  },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
                <Progress
                  value={Math.min(100, (parseFloat(s.value) / s.max) * 100)}
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="activity">
        <TabsList className="mb-6">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="genres">Genre Breakdown</TabsTrigger>
          <TabsTrigger value="goals">Goals &amp; Achievements</TabsTrigger>
        </TabsList>

        {/* Activity tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-foreground">This Week — Daily Reading</h2>
              {useLiveData && (
                <p className="text-[11px] text-muted-foreground mt-1">Demo pattern — not tied to server history.</p>
              )}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={WEEKLY_DATA} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                <Tooltip
                  formatter={(v, name) => {
                    const n = Number(v ?? 0)
                    return [
                      name === "minutes" ? `${n} min` : `${n} pages`,
                      name === "minutes" ? "Reading Time" : "Pages",
                    ]
                  }}
                />
                <Bar dataKey="pages" name="pages" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-foreground">6-Month Reading Trend (minutes/month)</h2>
              {useLiveData && (
                <p className="text-[11px] text-muted-foreground mt-1">Demo trend — not tied to server history.</p>
              )}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={MONTHLY_TREND} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="analGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                <Tooltip formatter={(v) => [`${Number(v ?? 0)} min`, "Reading Time"]} />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--color-brand)"
                  fill="url(#analGrad)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Books tab */}
        <TabsContent value="books">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Books Progress</h2>
              <Badge variant="secondary" className="text-xs">{bookRows.length} books tracked</Badge>
            </div>
            {bookRows.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground">No reading data yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start reading a book — your progress will appear here automatically.
                </p>
                <Link href="/subscription/library">
                  <Button size="sm" className="mt-4 bg-brand hover:bg-brand-dark text-primary-foreground gap-2">
                    <BookOpen size={13} /> Open Library
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="px-5 divide-y divide-border">
                {[...bookRows]
                  .sort((a, b) => b.completionPct - a.completionPct)
                  .map(r => <BookEngRow key={r.id} row={r} />)}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Genre breakdown tab */}
        <TabsContent value="genres" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-5">Hours by Genre</h2>
              {genreData.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  No genre data yet
                </div>
              ) : (
                <div className="space-y-3">
                  {genreData.map((g, i) => (
                    <div key={g.name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-foreground">{g.name}</span>
                        <span className="text-muted-foreground">{g.hours}h</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (g.hours / (genreData[0]?.hours || 1)) * 100)}%`,
                            background: `hsl(${(i * 47) % 360} 70% 55%)`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-4">Reading Breadth</h2>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar
                    name="Hours"
                    dataKey="A"
                    stroke="var(--color-brand)"
                    fill="var(--color-brand)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Goals & Achievements tab */}
        <TabsContent value="goals" className="space-y-6">
          {/* Goals */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Target size={16} className="text-brand" />
              <h2 className="font-semibold text-foreground">Reading Goals</h2>
            </div>
            <div className="space-y-5">
              {goalProgress.map(goal => {
                const pct = Math.min(100, (goal.current / goal.target) * 100)
                const done = pct >= 100
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {done
                          ? <CheckCircle size={14} className="text-green-500" />
                          : <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/40" />}
                        <span className="text-sm font-medium text-foreground">{goal.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {typeof goal.current === "number" ? goal.current : "—"} / {goal.target} {goal.unit}
                        </span>
                        {done && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 text-[10px] px-2">
                            Done!
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={pct} className={cn("h-2", done && "[&>div]:bg-green-500")} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Award size={16} className="text-brand" />
              <h2 className="font-semibold text-foreground">Achievements</h2>
              <Badge variant="secondary" className="text-xs ml-auto">
                {ACHIEVEMENTS.filter(a => a.earned).length} / {ACHIEVEMENTS.length} earned
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ACHIEVEMENTS.map(ach => (
                <div
                  key={ach.id}
                  className={cn(
                    "rounded-xl border p-4 flex items-start gap-3 transition-all",
                    ach.earned
                      ? "border-brand/30 bg-brand/5"
                      : "border-border bg-muted/30 opacity-60"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    ach.earned ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground"
                  )}>
                    <ach.icon size={16} />
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm font-semibold",
                      ach.earned ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {ach.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ach.desc}</p>
                    {ach.earned && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-brand font-semibold">
                        <CheckCircle size={9} /> Earned
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement note for subscriber */}
          {isSubscriber && (
            <div className="flex items-start gap-3 p-4 bg-brand/5 border border-brand/20 rounded-xl">
              <BarChart2 size={15} className="text-brand shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold text-foreground">Your reading supports authors. </span>
                <span className="text-muted-foreground">
                  Every minute you spend reading subscription books contributes to the monthly author revenue pool.
                  The more you read, the higher an author&apos;s earnings share.
                </span>
                <Link href="/dashboard/author/earnings" className="ml-1 text-brand font-semibold hover:underline text-xs">
                  Learn more
                </Link>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ReaderAnalyticsPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AnalyticsContent />
        </main>
      </div>
    </Providers>
  )
}
