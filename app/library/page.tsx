"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen, Headphones, Search, Clock, CheckCircle2,
  PlayCircle, ChevronRight, Library, Lock, ShoppingBag,
  Star,
} from "lucide-react"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { allowMockCatalogFallback } from "@/lib/catalog-mode"
import { libraryApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { demoPic } from "@/lib/demo-images"
import { libraryStore, seedStore, type LibraryEntry } from "@/lib/store"
import { cn } from "@/lib/utils"

// ── reading progress is stored separately (localStorage) ─────────────────────

const PROGRESS_KEY = "ms_reading_progress"

type ProgressMap = Record<string, { percent: number; lastRead: string }>

function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") } catch { return {} }
}

// ── status helpers ────────────────────────────────────────────────────────────

type ReadStatus = "reading" | "finished" | "not-started"

function getReadStatus(percent: number): ReadStatus {
  if (percent >= 100) return "finished"
  if (percent > 0)    return "reading"
  return "not-started"
}

const STATUS_META: Record<ReadStatus, { label: string; icon: React.ElementType; className: string }> = {
  "reading":     { label: "Reading",     icon: BookOpen,     className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "finished":    { label: "Finished",    icon: CheckCircle2, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "not-started": { label: "Not Started", icon: Clock,        className: "bg-muted text-muted-foreground" },
}

// ── source badge ──────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<LibraryEntry["source"], { label: string; cls: string }> = {
  purchase:     { label: "Purchased",   cls: "bg-brand/10 text-brand border-brand/20" },
  subscription: { label: "Subscribed",  cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200" },
  free:           { label: "Free access", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200" },
}

type BookDisplay = {
  title: string
  author: string
  category: string
  coverUrl: string
  format: "ebook" | "audiobook" | "magazine"
}

type ApiLibraryRow = {
  book_id: string
  source: string
  order_id: string | null
  granted_at: string
  book: {
    title?: string
    cover_url?: string | null
    format?: string
    author?: string | null
    category?: string | null
  } | null
}

function mapApiSource(raw: string): LibraryEntry["source"] {
  if (raw === "purchase" || raw === "subscription" || raw === "free") return raw
  return "subscription"
}

function getBookDisplay(
  entry: LibraryEntry,
  liveMap: Map<string, BookDisplay> | null,
): BookDisplay | null {
  if (liveMap?.has(entry.bookId)) return liveMap.get(entry.bookId)!
  if (!allowMockCatalogFallback()) return null
  const book = MOCK_BOOKS.find(b => b.id === entry.bookId)
  if (!book) return null
  return {
    title: book.title,
    author: book.author,
    category: book.category,
    coverUrl: book.coverUrl,
    format: book.format,
  }
}

// ── library card ──────────────────────────────────────────────────────────────

function LibraryCard({
  entry,
  display,
  progress,
}: {
  entry: LibraryEntry
  display: BookDisplay
  progress: ProgressMap
}) {
  const pct     = progress[entry.bookId]?.percent ?? 0
  const lastRead = progress[entry.bookId]?.lastRead ?? "Never"
  const status  = getReadStatus(pct)
  const meta    = STATUS_META[status]
  const src     = SOURCE_BADGE[entry.source]
  const isAudio = display.format === "audiobook"
  const readerHref = isAudio ? `/audio/${entry.bookId}` : `/reader/${entry.bookId}`

  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-brand/30 transition-all group">
      {/* Cover */}
      <Link href={readerHref} className="shrink-0">
        <img
          src={display.coverUrl}
          alt={`Cover of ${display.title}`}
          className="w-16 h-24 object-cover rounded-lg shadow-sm"
        />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
          <Link href={`/books/${entry.bookId}`}>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors line-clamp-1">
              {display.title}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={cn("text-[9px] px-2 py-0 border", src.cls)}>
              {src.label}
            </Badge>
            <Badge className={cn("text-[9px] px-2 py-0 border-0", meta.className)}>
              {meta.label}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">{display.author} &middot; {display.category}</p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          {isAudio ? <Headphones size={12} /> : <BookOpen size={12} />}
          {isAudio ? "Audiobook" : "eBook"}
        </div>

        {/* Progress bar */}
        {status !== "not-started" && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status === "finished" ? "bg-green-500" : "bg-brand"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Last read: {lastRead}</span>
          <Link href={readerHref}>
            <Button
              size="sm"
              variant={status === "finished" ? "outline" : "default"}
              className={cn(
                "h-7 text-xs px-3 gap-1",
                status !== "finished" && "bg-brand hover:bg-brand-dark text-primary-foreground"
              )}
            >
              {status === "not-started"
                ? <><PlayCircle size={12} /> Start</>
                : status === "finished"
                ? <><BookOpen size={12} /> Read Again</>
                : <><PlayCircle size={12} /> Resume</>
              }
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── page content ──────────────────────────────────────────────────────────────

function LibraryContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const useLiveApi = apiUrlConfigured()
  const [liveReady, setLiveReady] = React.useState(() => !useLiveApi)
  const [entries, setEntries]   = React.useState<LibraryEntry[]>([])
  const [liveDisplayByBookId, setLiveDisplayByBookId] =
    React.useState<Map<string, BookDisplay> | null>(null)
  const [progress, setProgress] = React.useState<ProgressMap>({})
  const [search, setSearch]     = React.useState("")
  const [tab, setTab]           = React.useState("all")

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Flibrary")
      return
    }
    if (!user || isLoading) return

    if (!useLiveApi) {
      seedStore()
      setEntries(libraryStore.getByUser(user.id))
      setLiveDisplayByBookId(null)
      setProgress(loadProgress())
      setLiveReady(true)
      return
    }

    let alive = true
    setLiveReady(false)
    libraryApi
      .list()
      .then(res => {
        if (!alive) return
        const list = (Array.isArray(res.data) ? res.data : []) as ApiLibraryRow[]
        const map = new Map<string, BookDisplay>()
        const ents: LibraryEntry[] = []
        list.forEach((row, i) => {
          const fmt =
            row.book?.format === "audiobook"
              ? "audiobook"
              : row.book?.format === "magazine"
                ? "magazine"
                : "ebook"
          map.set(row.book_id, {
            title: row.book?.title ?? "Unknown",
            author: row.book?.author?.trim() ? row.book.author! : "—",
            category: row.book?.category?.trim() ? row.book.category! : "General",
            coverUrl: row.book?.cover_url?.trim() ? row.book.cover_url! : demoPic("fallback-cover"),
            format: fmt,
          })
          ents.push({
            id: `lib_${row.book_id}_${i}`,
            userId: user.id,
            bookId: row.book_id,
            source: mapApiSource(row.source),
            orderId: row.order_id,
            grantedAt: row.granted_at,
            expiresAt: null,
          })
        })
        setLiveDisplayByBookId(map)
        setEntries(ents)
        setProgress(loadProgress())
      })
      .catch(() => {
        if (!alive) return
        seedStore()
        setEntries(libraryStore.getByUser(user.id))
        setLiveDisplayByBookId(null)
        setProgress(loadProgress())
      })
      .finally(() => {
        if (alive) setLiveReady(true)
      })

    return () => {
      alive = false
    }
  }, [isLoading, isAuthenticated, user, router, useLiveApi])

  const enriched = entries
    .map(e => {
      const display = getBookDisplay(e, liveDisplayByBookId)
      const pct = progress[e.bookId]?.percent ?? 0
      const status = getReadStatus(pct)
      return { entry: e, display, pct, status }
    })
    .filter((x): x is { entry: LibraryEntry; display: BookDisplay; pct: number; status: ReadStatus } =>
      x.display !== null)

  const filtered = enriched.filter(({ entry, display, status }) => {
    const matchesSearch =
      !search ||
      display.title.toLowerCase().includes(search.toLowerCase()) ||
      display.author.toLowerCase().includes(search.toLowerCase())
    const matchesTab =
      tab === "all"
        ? true
        : tab === "purchased"
          ? entry.source === "purchase"
          : tab === "subscribed"
            ? entry.source === "subscription"
            : tab === "reading" || tab === "finished"
              ? status === tab
              : tab === "free"
                ? entry.source === "free"
                : true
    return matchesSearch && matchesTab
  })

  const counts = {
    all: enriched.length,
    purchased: enriched.filter(x => x.entry.source === "purchase").length,
    subscribed: enriched.filter(x => x.entry.source === "subscription").length,
    free: enriched.filter(x => x.entry.source === "free").length,
    reading: enriched.filter(x => x.status === "reading").length,
    finished: enriched.filter(x => x.status === "finished").length,
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  if (useLiveApi && !liveReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Library size={20} className="text-brand" />
            <h1 className="font-serif text-3xl font-bold text-foreground">My Library</h1>
          </div>
          <p className="text-muted-foreground">
            {counts.all} book{counts.all !== 1 ? "s" : ""} &mdash; {counts.purchased} purchased, {counts.subscribed} via subscription
            {counts.free > 0 ? `, ${counts.free} free` : ""}
          </p>
          {useLiveApi && (
            <p className="text-xs text-muted-foreground/90 mt-1">Showing titles from your account on the server.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/store">
            <Button variant="outline" className="gap-2 hover:border-brand hover:text-brand">
              <ShoppingBag size={14} /> Buy Books
            </Button>
          </Link>
          <Link href="/books">
            <Button variant="outline" className="gap-2 hover:border-brand hover:text-brand">
              Browse <ChevronRight size={14} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your library..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="purchased">Purchased ({counts.purchased})</TabsTrigger>
          <TabsTrigger value="subscribed">Subscribed ({counts.subscribed})</TabsTrigger>
          <TabsTrigger value="free">Free ({counts.free})</TabsTrigger>
          <TabsTrigger value="reading">Reading ({counts.reading})</TabsTrigger>
          <TabsTrigger value="finished">Finished ({counts.finished})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              {entries.length === 0 ? (
                <>
                  <Lock size={36} className="mx-auto text-muted-foreground mb-3" />
                  <p className="font-semibold text-foreground mb-1">Your library is empty</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Purchase books from the store or subscribe to start reading.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/store">
                      <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
                        <ShoppingBag size={14} /> Visit Store
                      </Button>
                    </Link>
                    <Link href="/subscription">
                      <Button variant="outline" className="gap-2 hover:border-brand hover:text-brand">
                        <Star size={14} /> Subscribe
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Library size={36} className="mx-auto text-muted-foreground mb-3" />
                  <p className="font-semibold text-foreground mb-1">No books match</p>
                  <p className="text-sm text-muted-foreground">
                    {search ? "No books match your search." : "Nothing in this category yet."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map(({ entry, display }) => (
                <LibraryCard key={entry.id} entry={entry} display={display} progress={progress} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <LibraryContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
