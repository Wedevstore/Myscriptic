"use client"

/**
 * Reader Page — Phase 3
 *
 * With Laravel Phase 3 (`NEXT_PUBLIC_API_URL` + optional flags): numeric `/reader/:id`
 * uses `GET /api/library/:id/access`, `GET /api/books/:id` for metadata, debounced
 * `POST /api/reading-progress` and `GET /api/reading-progress/:id` for sync/restore.
 * Ebook body: after local cache, `POST /api/library/:id/signed-url` then browser fetch of the
 * EPUB/PDF from S3; `GET /api/books/:id/chapters` is only a fallback when S3 is unavailable.
 * Offline/mock routes use `engagementStore` + `MOCK_BOOKS` only.
 */

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { addBookToCart } from "@/lib/cart-actions"
import { booksApi, libraryApi, progressApi } from "@/lib/api"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import type { BookCardData } from "@/components/books/book-card"
import { laravelPhase3Enabled } from "@/lib/auth-mode"
import {
  engagementStore, subscriptionStore,
} from "@/lib/store"
import {
  ChevronLeft, ChevronRight, BookOpen, Sun, Moon,
  Minus, Plus,   List, X, Settings, Type, Clock,
  Lock, ShoppingCart, Crown, CheckCircle,
  Library, PanelTopOpen, Bookmark, Search,
  Palette, Sparkles, Rows3, ScrollText, GalleryHorizontal, Play, Pause, HelpCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProtectedSurface } from "@/components/protected-surface"
import {
  loadParsedBook,
  saveParsedBook,
  fetchAndParseBook,
  type ParsedChapter,
  type ParsedBook,
} from "@/lib/book-parser"

// ── Fallback mock content (shown when no parsed book is available) ────────────
const MOCK_PAGES = [
  {
    page: 1,
    content: `Chapter 1: The City That Never Sleeps

The Lagos sun had already begun its lazy descent by the time Adaeze Okonkwo stepped out of the yellow danfo and onto the cracked pavement of Victoria Island. Her leather satchel — a gift from her mother, worn smooth at the straps — hung heavy across her shoulder, stuffed with the manuscripts she had been editing all afternoon.

She paused at the intersection, watching the traffic policeman in his faded white uniform perform his daily ballet, arms slicing the air in gestures that only the most seasoned Lagos drivers could interpret. A bus driver leaned on his horn. Someone shouted in Yoruba. A child pressed her face against the window of a black SUV, watching the chaos with wide, curious eyes.

Lagos. It never ceased to amaze her.

She had grown up in Enugu, where the evenings were quiet and the air carried the scent of harmattan dust and groundnut soup from the neighbour's compound. Lagos was different. Lagos was relentless. Lagos demanded that you show up every day and prove, again and again, that you had earned your place within its impossible, glittering circuits.`,
  },
  {
    page: 2,
    content: `Chapter 1 (continued)

Three years ago she had arrived here with two thousand naira, a degree in English Literature, and the kind of determination that only desperation can produce. Now she was assistant editor at Limelight Press, the only publishing house in Nigeria that still paid its advances on time and commissioned local voices without packaging them for foreign eyes.

Her phone buzzed. Emeka again.

"Where are you? The meeting started ten minutes ago."

She quickened her pace, heels clicking against the tiles of the shopping complex arcade that offered the only shortcut to the office. The evening air was thick with exhaust and fried plantain and the distant music of an Afrobeats track floating from a phone shop window.

The publishing house occupied the third floor of a colonial-era building that the owners had never gotten around to renovating. The elevator was perpetually broken. Adaeze took the stairs two at a time.`,
  },
  {
    page: 3,
    content: `The conference room was already full when she entered. Around the oval table sat the senior editors, the sales director — a small, precise woman named Funke — and, at the head of the table, the publisher himself: Chief Balogun Adesanya, sixty-three years old and still the most well-read person in any room he entered.

"Adaeze," he said, without looking up from the manuscript in his hands. "Sit."

She sat.

"We have a problem," said Funke, sliding a printed spreadsheet across the table. The numbers were underlined in red. Adaeze had seen enough profit-and-loss statements in three years to understand immediately. Sales were down. Not catastrophically — not yet — but enough to matter.

"Digital," said the publisher, finally setting down his manuscript. "Everyone wants to read on their phones now. We need to adapt or we disappear. I am too old to disappear."

There was laughter around the table. Cautious, polite laughter.

"We are launching an app," he continued. "And we need the right editor to run it."

Every pair of eyes in the room turned, slowly, toward Adaeze.`,
  },
  {
    page: 4,
    content: `Chapter 2: Roots and Routes

The app went live on a Thursday. Adaeze had barely slept in two weeks — coordinating with the developers in Abuja, writing content policy, building a catalogue from scratch that didn't simply replicate the Eurocentric bestseller lists she had grown up seeing in secondhand bookshops.

She wanted local. She wanted specific. She wanted Wole Soyinka sitting beside Teju Cole. She wanted Akwaeke Emezi on the same shelf as Ben Okri. She wanted the girl in Maiduguri who had never seen herself in a book to find herself there, on page one, in the very first sentence.

"You're going to burn out before the beta is over," said Emeka. He was standing at her office door with two cups of tea.

She accepted one without looking up from her screen. "I'll burn out after the launch."

"What if the launch fails?"

She finally looked at him. "Then I'll burn out anyway."

He laughed. She didn't.`,
  },
  {
    page: 5,
    content: `Chapter 3: The Manuscript

The package arrived on a Monday morning — a thick padded envelope with no return address, postmarked Kano. Inside was a manuscript. Six hundred handwritten pages, bound in twine, written in a compact, careful script that suggested someone who had spent years practising their letters in the margins of exercise books.

The title page read: THE WEIGHT OF HARMATTAN. Below it: a name.

Adaeze read the first ten pages standing at her desk, still wearing her coat.

By page fifty she had cancelled her afternoon meetings.

By page one hundred she had called Emeka into her office, thrust the manuscript into his hands, and said: "Read."

He read for two hours without speaking. When he finally set it down, his eyes were wet.

"We need to find this person," Adaeze said.

"Who is she?"

Adaeze turned to the title page. The name written there was simply: ZARA.`,
  },
]

/** Convert parsed chapters to the page shape the reader uses internally. */
function chaptersToPages(chapters: ParsedChapter[], contentType?: "html" | "text"): { page: number; content: string; contentType?: "html" | "text" }[] {
  return chapters.map((ch, i) => ({
    page: i + 1,
    content: contentType === "html"
      ? `<h2>${escapeHtml(ch.title)}</h2>${ch.content}`
      : `${ch.title}\n\n${ch.content}`,
    contentType,
  }))
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const TOTAL_PAGES_FALLBACK = 342

type Theme    = "light" | "dark" | "sepia"
type FontSize = 14 | 16 | 18 | 20 | 22
type FontFamily = "serif" | "sans"
type LineHeightPreset = "compact" | "comfortable" | "spacious"
/** Vertical = continuous scroll; horizontal = paginated swipe carousel. */
type ReadingLayout = "vertical" | "horizontal"

const READING_LAYOUT_KEY = "myscriptic-reader-layout"
const AUTO_SCROLL_ON_KEY = "myscriptic-reader-autoscroll-on"
const AUTO_SCROLL_SPEED_KEY = "myscriptic-reader-autoscroll-speed"
/** Pixels per second at slider midpoint; range tuned for comfortable reading. */
const AUTO_SCROLL_SPEED_MIN = 12
const AUTO_SCROLL_SPEED_MAX = 96
const AUTO_SCROLL_SPEED_DEFAULT = 38

const READER_PREF_THEME_KEY = "myscriptic-reader-pref-theme"
const READER_PREF_FONT_SIZE_KEY = "myscriptic-reader-pref-font-size"
const READER_PREF_FONT_FAMILY_KEY = "myscriptic-reader-pref-font-family"
const READER_PREF_LINE_HEIGHT_KEY = "myscriptic-reader-pref-line-height"
const READER_PREF_IMMERSIVE_KEY = "myscriptic-reader-pref-immersive"

function readStoredReaderTheme(): Theme {
  if (typeof window === "undefined") return "light"
  try {
    const v = sessionStorage.getItem(READER_PREF_THEME_KEY)
    if (v === "light" || v === "dark" || v === "sepia") return v
  } catch {
    /* ignore */
  }
  return "light"
}

function readStoredReaderFontSize(): FontSize {
  if (typeof window === "undefined") return 18
  try {
    const n = Number(sessionStorage.getItem(READER_PREF_FONT_SIZE_KEY))
    if (n === 14 || n === 16 || n === 18 || n === 20 || n === 22) return n
  } catch {
    /* ignore */
  }
  return 18
}

function readStoredReaderFontFamily(): FontFamily {
  if (typeof window === "undefined") return "serif"
  try {
    const v = sessionStorage.getItem(READER_PREF_FONT_FAMILY_KEY)
    if (v === "serif" || v === "sans") return v
  } catch {
    /* ignore */
  }
  return "serif"
}

function readStoredReaderLineHeight(): LineHeightPreset {
  if (typeof window === "undefined") return "comfortable"
  try {
    const v = sessionStorage.getItem(READER_PREF_LINE_HEIGHT_KEY)
    if (v === "compact" || v === "comfortable" || v === "spacious") return v
  } catch {
    /* ignore */
  }
  return "comfortable"
}

function readStoredReaderImmersive(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(READER_PREF_IMMERSIVE_KEY) === "1"
  } catch {
    return false
  }
}

const LINE_HEIGHTS: Record<LineHeightPreset, number> = {
  compact: 1.55,
  comfortable: 1.8,
  spacious: 2.15,
}

const THEME_STYLES: Record<Theme, { bg: string; text: string; label: string }> = {
  light: { bg: "bg-white",         text: "text-gray-900",  label: "Light" },
  dark:  { bg: "bg-gray-900",      text: "text-gray-100",  label: "Dark"  },
  sepia: { bg: "bg-amber-50",      text: "text-amber-950", label: "Sepia" },
}

function readerToolbarBar(theme: Theme) {
  if (theme === "dark") {
    return "bg-gray-950/90 border-gray-700/80 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)]"
  }
  if (theme === "sepia") {
    return "bg-amber-50/95 border-amber-200/90 shadow-[0_8px_30px_-8px_rgba(120,53,15,0.12)]"
  }
  return "bg-white/95 border-gray-200/90 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.08)]"
}

function readerToolCluster(theme: Theme) {
  return cn(
    "flex items-center gap-0.5 rounded-2xl border p-1 shrink-0",
    theme === "dark" && "border-gray-600/45 bg-gray-900/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    theme === "sepia" && "border-amber-300/50 bg-amber-100/40 shadow-sm",
    theme === "light" && "border-gray-200/90 bg-white/70 shadow-sm"
  )
}

function readerSettingsCard(theme: Theme) {
  return cn(
    "rounded-2xl border p-4 sm:p-5 transition-shadow",
    theme === "dark" &&
      "border-gray-700/80 bg-gradient-to-br from-gray-800/80 to-gray-900/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    theme === "sepia" && "border-amber-200/90 bg-gradient-to-br from-amber-100/90 to-amber-50/95 shadow-sm",
    theme === "light" && "border-gray-200 bg-gradient-to-br from-white to-gray-50/90 shadow-sm"
  )
}

function readerBookChip(theme: Theme) {
  return cn(
    "rounded-2xl border px-3 py-2 sm:px-4 sm:py-2.5 min-w-0 flex-1 max-w-xl mx-auto backdrop-blur-md",
    theme === "dark" &&
      "border-gray-600/50 bg-gradient-to-br from-gray-800/95 via-gray-900/90 to-gray-950/95 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.5)]",
    theme === "sepia" &&
      "border-amber-200/80 bg-gradient-to-br from-amber-100/95 to-amber-50/90 shadow-md shadow-amber-900/5",
    theme === "light" &&
      "border-gray-200/90 bg-gradient-to-br from-white to-gray-50/95 shadow-md shadow-gray-900/5"
  )
}

function readerTocAside(theme: Theme) {
  if (theme === "dark") return "bg-gray-900"
  if (theme === "sepia") return "bg-amber-50"
  return "bg-white"
}

function buildToc(pages: { page: number; content: string }[]) {
  return pages.map(p => ({
    page: p.page,
    label: (p.content.split("\n")[0] ?? `Page ${p.page}`).trim().slice(0, 96),
  }))
}

// ── Access Denied Screens ─────────────────────────────────────────────────────

function AccessDeniedSubscription({ bookId }: { bookId: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto">
          <Crown size={32} className="text-brand" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
            Subscription Required
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This book is available exclusively to subscribers. Subscribe now for unlimited access to thousands of books.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/subscription">
            <Button className="w-full h-12 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
              <Crown size={15} /> View Subscription Plans
            </Button>
          </Link>
          <Link href={`/books/${bookId}`}>
            <Button variant="outline" className="w-full h-12">
              <ChevronLeft size={15} className="mr-1" /> Back to Book
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function AccessDeniedPaid({ book }: { book: BookCardData }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [formError, setFormError] = React.useState("")

  const handleAddAndCheckout = async () => {
    setFormError("")
    if (!book.price) {
      router.push(`/books/${book.id}`)
      return
    }
    setBusy(true)
    const res = await addBookToCart({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      price: book.price,
      currency: book.currency ?? "$",
      format: book.format,
    })
    setBusy(false)
    if (!res.ok) {
      setFormError(res.error)
      return
    }
    router.push("/cart")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
          <Lock size={32} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
            Purchase Required
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This is a premium title. It must be purchased individually. Subscriptions do not cover PAID books.
          </p>
        </div>
        {formError && (
          <p className="text-sm text-destructive text-center">{formError}</p>
        )}
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className="w-full h-12 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2"
            onClick={handleAddAndCheckout}
            disabled={busy}
          >
            <ShoppingCart size={15} />
            {busy ? "Adding…" : "Add to cart & checkout"}
          </Button>
          <Link href={`/books/${book.id}`}>
            <Button variant="outline" className="w-full h-12">
              View book details
            </Button>
          </Link>
          <Link href="/books">
            <Button variant="ghost" className="w-full h-12">
              Browse Free &amp; Subscription Books
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Engagement Tracker Hook ───────────────────────────────────────────────────

const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const DEBOUNCE_MS = 10_000 // 10-second debounce on progress saves

function useEngagementTracker(userId: string, bookId: string, currentPage: number, totalPages: number) {
  const startTimeRef   = React.useRef<number>(Date.now())
  const lastSavedRef   = React.useRef<number>(0)
  const timerRef       = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedSecRef  = React.useRef<number>(0)
  const debounceRef    = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastSave, setLastSave] = React.useState<Date | null>(null)

  // Accumulate reading time every second the tab is active
  React.useEffect(() => {
    timerRef.current = setInterval(() => {
      elapsedSecRef.current += 1
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Debounced save on page change
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveProgress()
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  // Save on unmount (e.g. user closes tab)
  React.useEffect(() => {
    return () => { saveProgress() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function saveProgress() {
    const elapsed = elapsedSecRef.current
    if (elapsed < 5) return // too short, skip

    const result = engagementStore.upsert(userId, bookId, {
      pagesRead:      currentPage,
      totalPages,
      readingTimeSec: elapsed,
      sessionId:      SESSION_ID,
    })

    if (result.ok) {
      lastSavedRef.current = Date.now()
      setLastSave(new Date())
      if (laravelPhase3Enabled() && /^\d+$/.test(bookId)) {
        progressApi.sync(bookId, currentPage, totalPages, elapsed).catch(() => {})
        elapsedSecRef.current = 0
      }
    }
  }

  return { lastSave, elapsedSecRef }
}

// ── Main Reader ───────────────────────────────────────────────────────────────

function ReaderContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const sp = useSearchParams()
  const { user, isAuthenticated, isLoading } = useAuth()
  const routeId = params?.id ?? ""
  const isPreview = sp?.get("preview") === "1"

  const [remoteBook, setRemoteBook] = React.useState<BookCardData | null>(null)

  React.useEffect(() => {
    if (!laravelPhase3Enabled() || !/^\d+$/.test(routeId)) {
      setRemoteBook(null)
      return
    }
    let alive = true
    booksApi
      .get(routeId)
      .then(res => {
        if (!alive) return
        setRemoteBook(apiBookToCard(res.data as ApiBookRecord))
      })
      .catch(() => {
        if (alive) setRemoteBook(null)
      })
    return () => {
      alive = false
    }
  }, [routeId])

  const book = remoteBook ?? MOCK_BOOKS.find(b => b.id === routeId) ?? MOCK_BOOKS[0]

  /** Audiobooks live in S3 and use `/audio/[id]`; skip ebook fetch/parse pipeline. */
  React.useEffect(() => {
    if (book.format !== "audiobook") return
    router.replace(`/audio/${routeId}`)
  }, [book.format, routeId, router])

  /** Stable id for engagement + progress APIs (numeric Laravel id vs mock `bk_*`). */
  const engagementBookId = /^\d+$/.test(routeId) ? routeId : book.id

  // ── Load parsed chapters: localStorage → API chapters → S3 fetch+parse ───
  const [readerPages, setReaderPages] = React.useState<{ page: number; content: string; contentType?: "html" | "text" }[]>(() => MOCK_PAGES)
  const [hasParsedContent, setHasParsedContent] = React.useState(false)
  const [contentLoading, setContentLoading] = React.useState(false)
  const [contentProgress, setContentProgress] = React.useState<string | null>(null)
  const [contentError, setContentError] = React.useState<string | null>(null)
  const totalPages = hasParsedContent ? readerPages.length : TOTAL_PAGES_FALLBACK
  const tocEntries = React.useMemo(() => buildToc(readerPages), [readerPages])

  const applyParsed = React.useCallback((parsed: ParsedBook) => {
    setReaderPages(chaptersToPages(parsed.chapters, parsed.contentType))
    setHasParsedContent(true)
    setContentLoading(false)
    setContentProgress(null)
    setContentError(null)
  }, [])

  React.useEffect(() => {
    let alive = true

    async function loadChapters() {
      // 1. Check IndexedDB first, then localStorage
      try {
        const { idbLoadParsedBook } = await import("@/lib/chapter-store")
        const idbCached = await idbLoadParsedBook(engagementBookId)
        if (idbCached && idbCached.chapters.length > 0 && alive) { applyParsed(idbCached); return }
      } catch { /* fallback */ }
      const localCached = loadParsedBook(engagementBookId)
      if (localCached && localCached.chapters.length > 0 && alive) { applyParsed(localCached); return }

      const isLive = laravelPhase3Enabled() && /^\d+$/.test(routeId) && book.format !== "audiobook"
      if (!isLive) {
        if (alive) { setReaderPages(MOCK_PAGES); setHasParsedContent(false) }
        return
      }

      if (alive) { setContentLoading(true); setContentProgress("Loading book…") }

      const applyFromChapters = async (rows: { index: number; title: string; content: string }[]) => {
        const looksLikeHtml = /<[a-z][\s\S]*>/i.test(rows[0]?.content ?? "")
        const rebuilt: ParsedBook = {
          format: "epub", title: null, author: null,
          chapters: rows,
          totalCharacters: rows.reduce((s, c) => s + c.content.length, 0),
          parsedAt: new Date().toISOString(),
          contentType: looksLikeHtml ? "html" : "text",
        }
        try {
          const { idbSaveParsedBook } = await import("@/lib/chapter-store")
          await idbSaveParsedBook(engagementBookId, rebuilt)
        } catch { saveParsedBook(engagementBookId, rebuilt) }
        if (alive) applyParsed(rebuilt)
      }

      // 2. Direct S3 (author EPUB/PDF is stored in S3; reader downloads via signed GET)
      let s3Error: string | null = null
      try {
        setContentProgress("Fetching book file…")
        const { url } = await libraryApi.getSignedUrl(routeId)
        if (!alive) return
        const parsed = await fetchAndParseBook(engagementBookId, url, alive ? setContentProgress : undefined)
        if (!alive) return
        applyParsed(parsed)
        try {
          await booksApi.saveChapters(routeId, parsed.chapters.map((ch, i) => ({ index: i, title: ch.title, content: ch.content })))
        } catch { /* best-effort server cache */ }
        return
      } catch (e) {
        s3Error = e instanceof Error ? e.message : "S3 fetch failed"
      }

      if (!alive) return

      // 3. Fallback: server-stored chapters
      let chaptersError: string | null = null
      try {
        setContentProgress("Loading chapters…")
        const chaptersRes = await booksApi.getChapters(routeId)
        if (!alive) return
        if (chaptersRes.data && chaptersRes.data.length > 0) {
          await applyFromChapters(chaptersRes.data)
          return
        }
        chaptersError = "No chapters available yet"
      } catch (e) {
        chaptersError = e instanceof Error ? e.message : "Chapters API failed"
      }

      if (!alive) return
      setContentLoading(false)
      setContentProgress(null)

      const reason = chaptersError?.toLowerCase().includes("not found") || chaptersError?.toLowerCase().includes("404")
        ? "This book's content hasn't been uploaded yet."
        : s3Error?.toLowerCase().includes("not found") || s3Error?.toLowerCase().includes("404") || s3Error?.toLowerCase().includes("no access")
          ? "Book file not available. It may still be processing."
          : "Could not reach the server. Check your connection and try again."
      setContentError(reason)
    }

    loadChapters()
    return () => { alive = false }
  }, [engagementBookId, routeId, applyParsed, book.format])

  // ── Access check ────────────────────────────────────────────────────────────
  const [accessState, setAccessState] = React.useState<
    "checking" | "allowed" | "denied_subscription" | "denied_paid"
  >("checking")

  React.useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      const id = routeId || book.id
      const nextPath = book.format === "audiobook" ? `/audio/${id}` : `/reader/${id}`
      router.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`)
      return
    }

    // Preview mode bypasses access check for authors/admins
    if (isPreview && user && (user.role === "admin" || user.role === "staff" || user.role === "author")) {
      setAccessState("allowed")
      return
    }

    if (laravelPhase3Enabled() && /^\d+$/.test(routeId)) {
      let alive = true
      Promise.all([
        libraryApi.checkAccess(routeId),
        booksApi.get(routeId),
      ]).then(([access, wrap]) => {
        if (!alive) return
        const d = wrap.data as { accessType?: string }
        if (access.has_access) setAccessState("allowed")
        else if (d.accessType === "PAID") setAccessState("denied_paid")
        else setAccessState("denied_subscription")
      }).catch(() => {
        if (alive) setAccessState("denied_subscription")
      })
      return () => { alive = false }
    }

    const accessType = book.accessType as "FREE" | "PAID" | "SUBSCRIPTION"
    const userId     = user!.id
    const result     = subscriptionStore.checkBookAccess(userId, book.id, accessType)

    if (result.allowed) {
      setAccessState("allowed")
    } else if (accessType === "PAID") {
      setAccessState("denied_paid")
    } else {
      setAccessState("denied_subscription")
    }
  }, [isLoading, isAuthenticated, user, book, router, routeId, isPreview])

  // ── Reader state ────────────────────────────────────────────────────────────
  const [currentPage,  setCurrentPage]  = React.useState(1)
  const [theme,        setTheme]        = React.useState<Theme>(readStoredReaderTheme)
  const [fontSize,     setFontSize]     = React.useState<FontSize>(readStoredReaderFontSize)
  const [fontFamily,   setFontFamily]   = React.useState<FontFamily>(readStoredReaderFontFamily)
  const [lineHeight,   setLineHeight]   = React.useState<LineHeightPreset>(readStoredReaderLineHeight)
  const [showSettings, setShowSettings] = React.useState(false)
  const [showToc,      setShowToc]      = React.useState(false)
  const [showToolbar,  setShowToolbar]  = React.useState(true)
  const [readerHelpOpen, setReaderHelpOpen] = React.useState(false)
  /** When off (default), top/bottom bars stay visible so navigation and settings are always discoverable. */
  const [immersiveMode, setImmersiveMode] = React.useState(readStoredReaderImmersive)
  const [bookmarkPage, setBookmarkPage] = React.useState<number | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    const results: { page: number; snippet: string; chapterLabel: string }[] = []
    for (const p of readerPages) {
      const plainContent = p.contentType === "html"
        ? p.content.replace(/<[^>]+>/g, "")
        : p.content
      const idx = plainContent.toLowerCase().indexOf(q)
      if (idx === -1) continue
      const start = Math.max(0, idx - 40)
      const end = Math.min(plainContent.length, idx + q.length + 40)
      const snippet = (start > 0 ? "…" : "") + plainContent.slice(start, end) + (end < plainContent.length ? "…" : "")
      const label = hasParsedContent ? `Chapter ${p.page}` : `Page ${p.page}`
      results.push({ page: p.page, snippet, chapterLabel: label })
    }
    return results
  }, [searchQuery, readerPages, hasParsedContent])
  const [readingLayout, setReadingLayoutState] = React.useState<ReadingLayout>(() => {
    if (typeof window === "undefined") return "vertical"
    try {
      const v = sessionStorage.getItem(READING_LAYOUT_KEY)
      return v === "horizontal" ? "horizontal" : "vertical"
    } catch {
      return "vertical"
    }
  })
  const horizontalScrollRef = React.useRef<HTMLDivElement>(null)
  const readerHelpPanelRef = React.useRef<HTMLDivElement>(null)
  const readerHelpCloseRef = React.useRef<HTMLButtonElement>(null)
  const readerTocPanelRef = React.useRef<HTMLDivElement>(null)
  const readerTocCloseRef = React.useRef<HTMLButtonElement>(null)
  const readingLayoutRef = React.useRef<ReadingLayout>(readingLayout)
  readingLayoutRef.current = readingLayout
  const currentPageRef = React.useRef(currentPage)
  currentPageRef.current = currentPage
  const readerPagesRef = React.useRef(readerPages)
  readerPagesRef.current = readerPages
  const readerHelpOpenRef = React.useRef(readerHelpOpen)
  const showTocRef = React.useRef(showToc)
  readerHelpOpenRef.current = readerHelpOpen
  showTocRef.current = showToc
  const bodyOverflowBackupRef = React.useRef<string | null>(null)

  const [autoScrollOn, setAutoScrollOn] = React.useState(false)
  const [autoScrollSpeed, setAutoScrollSpeed] = React.useState(AUTO_SCROLL_SPEED_DEFAULT)
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  // Virtualization: only mount chapters near the viewport (vertical mode)
  const VIRTUAL_BUFFER = 2
  const [mountedRange, setMountedRange] = React.useState<[number, number]>([0, Math.min(4, 999)])
  React.useEffect(() => {
    if (readingLayout !== "vertical" || readerPages.length <= 8) return
    const sentinels = readerPages.map((_, i) => document.getElementById(`reader-sentinel-${i + 1}`)).filter(Boolean) as HTMLElement[]
    if (sentinels.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        const visibleIndices = entries.filter(e => e.isIntersecting).map(e => {
          const id = e.target.id
          return Number(id.replace("reader-sentinel-", "")) - 1
        }).filter(n => Number.isFinite(n))
        if (visibleIndices.length === 0) return
        const minVis = Math.min(...visibleIndices)
        const maxVis = Math.max(...visibleIndices)
        setMountedRange([Math.max(0, minVis - VIRTUAL_BUFFER), Math.min(readerPages.length - 1, maxVis + VIRTUAL_BUFFER)])
      },
      { rootMargin: "200% 0px 200% 0px" }
    )
    sentinels.forEach(s => io.observe(s))
    return () => io.disconnect()
  }, [readingLayout, readerPages])
  const autoScrollSpeedRef = React.useRef(AUTO_SCROLL_SPEED_DEFAULT)
  autoScrollSpeedRef.current = autoScrollSpeed

  const setReadingLayout = React.useCallback((next: ReadingLayout) => {
    setReadingLayoutState(next)
    try {
      sessionStorage.setItem(READING_LAYOUT_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const scrollVerticalToSection = React.useCallback(
    (page: number, behavior: ScrollBehavior = "smooth") => {
      const b: ScrollBehavior = prefersReducedMotion ? "auto" : behavior
      document.getElementById(`reader-section-${page}`)?.scrollIntoView({ behavior: b, block: "start" })
    },
    [prefersReducedMotion]
  )

  // Restore last-read page from engagement record
  React.useEffect(() => {
    if (accessState !== "allowed" || !user) return
    if (laravelPhase3Enabled() && /^\d+$/.test(routeId)) {
      progressApi.get(routeId).then(r => {
        if (r.page_number > 0) {
          const p = Math.min(r.page_number, readerPages.length)
          setCurrentPage(p)
          requestAnimationFrame(() => {
            if (readingLayoutRef.current === "vertical") scrollVerticalToSection(p, "auto")
          })
        }
      }).catch(() => {
        const saved = engagementStore.getByUserBook(user.id, engagementBookId)
        if (saved && saved.pagesRead > 0) {
          const restored = Math.min(saved.pagesRead, readerPages.length)
          setCurrentPage(restored)
          requestAnimationFrame(() => {
            if (readingLayoutRef.current === "vertical") scrollVerticalToSection(restored, "auto")
          })
        }
      })
      return
    }
    const saved = engagementStore.getByUserBook(user.id, engagementBookId)
    if (saved && saved.pagesRead > 0) {
      const restored = Math.min(saved.pagesRead, readerPages.length)
      setCurrentPage(restored)
      requestAnimationFrame(() => {
        if (readingLayoutRef.current === "vertical") scrollVerticalToSection(restored, "auto")
      })
    }
  }, [accessState, user, engagementBookId, routeId, scrollVerticalToSection, readerPages])

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`myscriptic-reader-bm-${engagementBookId}`)
      if (raw == null) {
        setBookmarkPage(null)
        return
      }
      const n = Number(raw)
      setBookmarkPage(Number.isFinite(n) ? n : null)
    } catch {
      setBookmarkPage(null)
    }
  }, [engagementBookId])

  React.useEffect(() => {
    try {
      sessionStorage.setItem(READER_PREF_THEME_KEY, theme)
      sessionStorage.setItem(READER_PREF_FONT_SIZE_KEY, String(fontSize))
      sessionStorage.setItem(READER_PREF_FONT_FAMILY_KEY, fontFamily)
      sessionStorage.setItem(READER_PREF_LINE_HEIGHT_KEY, lineHeight)
      sessionStorage.setItem(READER_PREF_IMMERSIVE_KEY, immersiveMode ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [theme, fontSize, fontFamily, lineHeight, immersiveMode])

  React.useEffect(() => {
    try {
      const on = sessionStorage.getItem(AUTO_SCROLL_ON_KEY)
      if (on === "1") setAutoScrollOn(true)
      const s = sessionStorage.getItem(AUTO_SCROLL_SPEED_KEY)
      if (s != null) {
        const n = Number(s)
        if (Number.isFinite(n) && n >= AUTO_SCROLL_SPEED_MIN && n <= AUTO_SCROLL_SPEED_MAX) {
          setAutoScrollSpeed(n)
        }
      }
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    try {
      sessionStorage.setItem(AUTO_SCROLL_ON_KEY, autoScrollOn ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [autoScrollOn])

  React.useEffect(() => {
    try {
      sessionStorage.setItem(AUTO_SCROLL_SPEED_KEY, String(autoScrollSpeed))
    } catch {
      /* ignore */
    }
  }, [autoScrollSpeed])

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setPrefersReducedMotion(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  React.useEffect(() => {
    if (readingLayout !== "vertical") setAutoScrollOn(false)
  }, [readingLayout])

  React.useEffect(() => {
    if (prefersReducedMotion) setAutoScrollOn(false)
  }, [prefersReducedMotion])

  // Optional immersive mode: hide chrome after idle. Default keeps bars visible.
  React.useEffect(() => {
    if (!immersiveMode) {
      setShowToolbar(true)
      return
    }
    let timeout: ReturnType<typeof setTimeout>
    const handle = () => {
      setShowToolbar(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => setShowToolbar(false), 3500)
    }
    window.addEventListener("mousemove", handle)
    window.addEventListener("touchstart", handle)
    handle()
    return () => {
      window.removeEventListener("mousemove", handle)
      window.removeEventListener("touchstart", handle)
      clearTimeout(timeout)
    }
  }, [immersiveMode])

  const goTo = React.useCallback(
    (page: number) => {
      setAutoScrollOn(false)
      const p = Math.max(1, Math.min(page, readerPagesRef.current.length))
      setCurrentPage(p)
      queueMicrotask(() => {
        if (readingLayoutRef.current === "vertical") scrollVerticalToSection(p, "smooth")
      })
    },
    [scrollVerticalToSection]
  )

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('[role="slider"]') || el.tagName === "INPUT" || el.tagName === "TEXTAREA") return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setCurrentPage(p => {
          const next = Math.max(1, p - 1)
          queueMicrotask(() => {
            if (readingLayoutRef.current === "vertical") scrollVerticalToSection(next, "smooth")
          })
          return next
        })
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setCurrentPage(p => {
          const next = Math.min(readerPagesRef.current.length, p + 1)
          queueMicrotask(() => {
            if (readingLayoutRef.current === "vertical") scrollVerticalToSection(next, "smooth")
          })
          return next
        })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [scrollVerticalToSection])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const inField =
        el.closest('[role="slider"]') != null || el.tagName === "INPUT" || el.tagName === "TEXTAREA"

      if (e.key === "Escape") {
        if (readerHelpOpen) {
          e.preventDefault()
          setReaderHelpOpen(false)
          return
        }
        if (showToc) {
          e.preventDefault()
          setShowToc(false)
          return
        }
        if (showSettings) {
          e.preventDefault()
          setShowSettings(false)
          return
        }
        return
      }

      if (inField) return
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault()
        setReaderHelpOpen(v => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [readerHelpOpen, showToc, showSettings])

  React.useEffect(() => {
    if (!readerHelpOpen) return
    const previous = document.activeElement as HTMLElement | null
    const id = requestAnimationFrame(() => {
      readerHelpCloseRef.current?.focus()
    })
    return () => {
      cancelAnimationFrame(id)
      if (previous && document.body.contains(previous) && typeof previous.focus === "function") {
        try {
          previous.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [readerHelpOpen])

  React.useEffect(() => {
    if (!readerHelpOpen) return
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const panel = readerHelpPanelRef.current
      if (!panel) return
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter(el => !el.closest("[aria-hidden='true']"))
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onTab)
    return () => document.removeEventListener("keydown", onTab)
  }, [readerHelpOpen])

  React.useEffect(() => {
    if (!showToc) return
    const previous = document.activeElement as HTMLElement | null
    const id = requestAnimationFrame(() => {
      readerTocCloseRef.current?.focus()
    })
    return () => {
      cancelAnimationFrame(id)
      if (previous && document.body.contains(previous) && typeof previous.focus === "function") {
        try {
          previous.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [showToc])

  React.useEffect(() => {
    if (!showToc) return
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const panel = readerTocPanelRef.current
      if (!panel) return
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter(el => !el.closest("[aria-hidden='true']"))
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onTab)
    return () => document.removeEventListener("keydown", onTab)
  }, [showToc])

  React.useEffect(() => {
    const locked = readerHelpOpen || showToc
    if (!locked) return
    if (bodyOverflowBackupRef.current === null) {
      bodyOverflowBackupRef.current = document.body.style.overflow || ""
    }
    document.body.style.overflow = "hidden"
    return () => {
      if (!readerHelpOpenRef.current && !showTocRef.current && bodyOverflowBackupRef.current !== null) {
        document.body.style.overflow = bodyOverflowBackupRef.current
        bodyOverflowBackupRef.current = null
      }
    }
  }, [readerHelpOpen, showToc])

  /** Horizontal carousel: sync page from swipe / scroll. */
  React.useEffect(() => {
    if (readingLayout !== "horizontal") return
    const el = horizontalScrollRef.current
    if (!el) return
    const onScroll = () => {
      const w = el.clientWidth
      if (w <= 0) return
      const idx = Math.round(el.scrollLeft / w)
      const page = Math.min(readerPagesRef.current.length, Math.max(1, idx + 1))
      setCurrentPage(prev => (prev === page ? prev : page))
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [readingLayout])

  /** Horizontal: keep carousel aligned when page changes (buttons, slider, TOC, keyboard). */
  React.useEffect(() => {
    if (readingLayout !== "horizontal") return
    const el = horizontalScrollRef.current
    if (!el) return
    const w = el.clientWidth
    if (w <= 0) return
    const target = (currentPage - 1) * w
    if (Math.abs(el.scrollLeft - target) > 3) {
      el.scrollTo({ left: target, behavior: prefersReducedMotion ? "auto" : "smooth" })
    }
  }, [currentPage, readingLayout, prefersReducedMotion])

  React.useLayoutEffect(() => {
    const el = horizontalScrollRef.current
    if (!el || readingLayout !== "horizontal") return
    const w = el.clientWidth
    if (w > 0) el.scrollLeft = (currentPage - 1) * w
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only snap when toggling layout; page changes use scroll effect
  }, [readingLayout])

  /** Keep horizontal page aligned when the carousel width changes (resize, rotation). */
  React.useEffect(() => {
    if (readingLayout !== "horizontal") return
    const el = horizontalScrollRef.current
    if (!el) return
    const sync = () => {
      const w = el.clientWidth
      if (w <= 0) return
      el.scrollLeft = (currentPageRef.current - 1) * w
    }
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    window.addEventListener("resize", sync)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", sync)
    }
  }, [readingLayout])

  /** When switching from horizontal → vertical, align scroll with the active section. */
  const prevReadingLayoutRef = React.useRef<ReadingLayout | null>(null)
  React.useEffect(() => {
    const prev = prevReadingLayoutRef.current
    prevReadingLayoutRef.current = readingLayout
    if (readingLayout !== "vertical" || prev !== "horizontal") return
    requestAnimationFrame(() => {
      scrollVerticalToSection(currentPage, "auto")
    })
  }, [readingLayout, currentPage, scrollVerticalToSection])

  /** Vertical scroll: update current section from viewport (no scroll — avoids fighting the reader). */
  React.useEffect(() => {
    if (readingLayout !== "vertical") return
    const roots = readerPagesRef.current.map(p => document.getElementById(`reader-section-${p.page}`)).filter(
      (n): n is HTMLElement => n != null
    )
    if (roots.length === 0) return
    let raf = 0
    const io = new IntersectionObserver(
      entries => {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
          const visible = entries
            .filter(e => e.isIntersecting && e.target instanceof HTMLElement)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
          const id = visible?.target?.id
          if (!id?.startsWith("reader-section-")) return
          const n = Number(id.slice("reader-section-".length))
          if (!Number.isFinite(n)) return
          setCurrentPage(prev => (prev === n ? prev : n))
        })
      },
      { root: null, rootMargin: "-18% 0px -40% 0px", threshold: [0, 0.2, 0.4, 0.6, 0.85, 1] }
    )
    roots.forEach(node => io.observe(node))
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [readingLayout, readerPages])

  /** Vertical continuous scroll: smooth auto-advance at user-chosen px/s. */
  React.useEffect(() => {
    if (!autoScrollOn || readingLayout !== "vertical") return
    let last = performance.now()
    let rafId = 0
    const tick = (now: number) => {
      const dt = Math.min(80, now - last) / 1000
      last = now
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (maxScroll <= 0 || window.scrollY >= maxScroll - 2) {
        setAutoScrollOn(false)
        return
      }
      window.scrollBy({ top: autoScrollSpeedRef.current * dt, left: 0, behavior: "auto" })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [autoScrollOn, readingLayout])

  /** Stop auto-scroll when the reader scrolls or pages manually. */
  React.useEffect(() => {
    if (!autoScrollOn) return
    const cancel = () => setAutoScrollOn(false)
    window.addEventListener("wheel", cancel, { passive: true })
    window.addEventListener("touchmove", cancel, { passive: true })
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('[role="slider"]') || el.tagName === "INPUT" || el.tagName === "TEXTAREA") return
      const k = e.key
      if (
        k === "ArrowUp" ||
        k === "ArrowDown" ||
        k === "ArrowLeft" ||
        k === "ArrowRight" ||
        k === "PageUp" ||
        k === "PageDown" ||
        k === "Home" ||
        k === "End" ||
        k === " "
      ) {
        cancel()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("wheel", cancel)
      window.removeEventListener("touchmove", cancel)
      window.removeEventListener("keydown", onKey)
    }
  }, [autoScrollOn])

  // Engagement tracker (only active when access allowed)
  const { lastSave, elapsedSecRef } = useEngagementTracker(
    user?.id ?? "anonymous",
    engagementBookId,
    currentPage,
    totalPages
  )

  const progressPct = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0
  const styles      = THEME_STYLES[theme]

  const saveBookmark = React.useCallback(() => {
    try {
      sessionStorage.setItem(`myscriptic-reader-bm-${engagementBookId}`, String(currentPage))
      setBookmarkPage(currentPage)
    } catch {
      /* ignore */
    }
  }, [engagementBookId, currentPage])

  const goToBookmark = React.useCallback(() => {
    if (bookmarkPage == null) return
    goTo(Math.max(1, Math.min(bookmarkPage, readerPagesRef.current.length)))
  }, [bookmarkPage, goTo])

  const toggleAutoScroll = React.useCallback(() => {
    if (prefersReducedMotion || readingLayout !== "vertical") return
    setAutoScrollOn(v => !v)
  }, [prefersReducedMotion, readingLayout])

  // ── Loading / Access gate renders ─────────────────────────────────────────
  if (book.format === "audiobook") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" aria-hidden />
        <p className="text-sm text-muted-foreground">Opening audiobook player…</p>
      </div>
    )
  }

  if (isLoading || accessState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Checking access…</p>
        </div>
      </div>
    )
  }
  if (accessState === "denied_subscription") {
    return <AccessDeniedSubscription bookId={routeId || book.id} />
  }
  if (accessState === "denied_paid")         return <AccessDeniedPaid book={book} />

  if (contentLoading && !hasParsedContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" role="status" aria-live="polite">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto">
            <BookOpen size={28} className="text-brand animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground mb-1">
              Preparing your book
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {contentProgress || "Loading content from the cloud…"}
            </p>
          </div>
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-brand border-t-transparent animate-spin" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            Chapters are extracted on first read and cached for instant access next time.
          </p>
        </div>
      </div>
    )
  }

  // ── Full reader UI ─────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col",
        prefersReducedMotion ? "transition-none" : "transition-colors duration-300",
        styles.bg
      )}
    >
      {/* Content fetch error banner */}
      {isPreview && (
        <div className={cn(
          "fixed top-0 left-0 right-0 z-[70] px-4 py-1.5 text-center text-xs font-medium",
          theme === "dark" ? "bg-amber-900/60 text-amber-200" : "bg-amber-50 text-amber-800 border-b border-amber-200"
        )}>
          Preview Mode — you are viewing this book as a reader would see it
        </div>
      )}
      {contentError && (
        <div className={cn(
          "fixed left-0 right-0 z-[70] px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-3 flex-wrap",
          isPreview ? "top-7" : "top-0",
          contentError.includes("hasn't been uploaded") || contentError.includes("not available") || contentError.includes("processing")
            ? (theme === "dark" ? "bg-amber-900/60 text-amber-200 border-b border-amber-700" : "bg-amber-50 text-amber-800 border-b border-amber-200")
            : (theme === "dark" ? "bg-red-900/80 text-red-200" : "bg-red-50 text-red-700 border-b border-red-200")
        )}>
          <span>{contentError}</span>
          <button
            type="button"
            onClick={() => {
              setContentError(null)
              setContentLoading(true)
              setContentProgress("Retrying…")
              const isLiveEbook =
                laravelPhase3Enabled() && /^\d+$/.test(routeId) && book.format !== "audiobook"
              if (!isLiveEbook) {
                setContentLoading(false)
                setContentProgress(null)
                return
              }
              void (async () => {
                try {
                  const { url } = await libraryApi.getSignedUrl(routeId)
                  const parsed = await fetchAndParseBook(engagementBookId, url, setContentProgress)
                  applyParsed(parsed)
                  try {
                    await booksApi.saveChapters(
                      routeId,
                      parsed.chapters.map((ch, i) => ({ index: i, title: ch.title, content: ch.content }))
                    )
                  } catch { /* best-effort */ }
                } catch (s3Err) {
                  try {
                    const chaptersRes = await booksApi.getChapters(routeId)
                    if (chaptersRes.data && chaptersRes.data.length > 0) {
                      const rows = chaptersRes.data
                      const looksLikeHtml = /<[a-z][\s\S]*>/i.test(rows[0]?.content ?? "")
                      const rebuilt: ParsedBook = {
                        format: "epub", title: null, author: null,
                        chapters: rows,
                        totalCharacters: rows.reduce((s, c) => s + c.content.length, 0),
                        parsedAt: new Date().toISOString(),
                        contentType: looksLikeHtml ? "html" : "text",
                      }
                      try {
                        const { idbSaveParsedBook } = await import("@/lib/chapter-store")
                        await idbSaveParsedBook(engagementBookId, rebuilt)
                      } catch { saveParsedBook(engagementBookId, rebuilt) }
                      applyParsed(rebuilt)
                      return
                    }
                  } catch { /* noop */ }
                  setContentLoading(false)
                  setContentProgress(null)
                  const msg = s3Err instanceof Error ? s3Err.message : ""
                  const reason = msg.includes("404") || msg.includes("not found")
                    ? "Book file not available yet."
                    : "Could not reach the server. Try again later."
                  setContentError(reason)
                }
              })()
            }}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
              contentError.includes("hasn't been uploaded") || contentError.includes("not available") || contentError.includes("processing")
                ? (theme === "dark" ? "bg-amber-800 hover:bg-amber-700 text-amber-100" : "bg-amber-100 hover:bg-amber-200 text-amber-800")
                : (theme === "dark" ? "bg-red-800 hover:bg-red-700 text-red-100" : "bg-red-100 hover:bg-red-200 text-red-800")
            )}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => setContentError(null)}
            className="text-xs opacity-70 hover:opacity-100 underline transition-opacity"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Always-visible book progress (full title length) */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[60] h-1 overflow-hidden",
          theme === "dark" ? "bg-gray-800" : theme === "sepia" ? "bg-amber-200/80" : "bg-gray-200"
        )}
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress in this title"
      >
        <div
          className={cn(
            "h-full bg-brand ease-out",
            prefersReducedMotion ? "transition-none" : "transition-[width] duration-300"
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Top toolbar — layered reader chrome */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 pt-1",
          prefersReducedMotion ? "transition-none" : "transition-all duration-300",
          showToolbar ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none",
          readerToolbarBar(theme),
          "backdrop-blur-xl border-b"
        )}
      >
        <span id="elapsed-timer" className="sr-only">
          0:00 reading
        </span>
        <div className="max-w-5xl mx-auto px-3 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-3 min-h-[3.25rem] py-1">
            <div className={readerToolCluster(theme)}>
              <Link href={`/books/${book.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1.5 h-9 rounded-xl px-2.5",
                    theme === "dark" && "text-gray-200 hover:text-white hover:bg-gray-700/80",
                    theme === "sepia" && "text-amber-950 hover:bg-amber-200/60",
                    theme === "light" && "text-gray-800 hover:bg-gray-100"
                  )}
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline text-xs font-medium">Back</span>
                </Button>
              </Link>
              <Link href="/library">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1.5 h-9 rounded-xl px-2.5 hidden sm:inline-flex",
                    theme === "dark" && "text-gray-200 hover:text-white hover:bg-gray-700/80",
                    theme === "sepia" && "text-amber-950 hover:bg-amber-200/60",
                    theme === "light" && "text-gray-800 hover:bg-gray-100"
                  )}
                >
                  <Library size={15} />
                  <span className="text-xs font-medium">Library</span>
                </Button>
              </Link>
            </div>

            <div className="flex-1 min-w-0 flex sm:hidden items-center gap-2 px-1">
              <span
                className={cn(
                  "text-[10px] font-semibold tabular-nums shrink-0",
                  theme === "dark" && "text-brand",
                  theme === "sepia" && "text-brand",
                  theme === "light" && "text-brand"
                )}
              >
                {progressPct}%
              </span>
              <Progress value={progressPct} className="h-1 flex-1 min-w-0 [&>div]:bg-brand" />
              <span
                className={cn(
                  "text-[10px] tabular-nums shrink-0",
                  theme === "dark" && "text-gray-400",
                  theme === "sepia" && "text-amber-900/70",
                  theme === "light" && "text-gray-500"
                )}
              >
                p.{currentPage}
              </span>
            </div>

            <div className={cn("hidden sm:flex min-w-0 flex-1", readerBookChip(theme))}>
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1
                      className={cn(
                        "text-sm sm:text-[0.95rem] font-serif font-semibold leading-snug tracking-tight truncate",
                        theme === "dark" && "text-gray-50",
                        theme === "sepia" && "text-amber-950",
                        theme === "light" && "text-gray-900"
                      )}
                    >
                      {book.title}
                    </h1>
                    <p
                      className={cn(
                        "text-[11px] mt-0.5 truncate flex items-center gap-2",
                        theme === "dark" && "text-gray-400",
                        theme === "sepia" && "text-amber-900/75",
                        theme === "light" && "text-gray-600"
                      )}
                    >
                      <span>{book.author}</span>
                      {lastSave ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-500/90 shrink-0">
                          <CheckCircle size={10} />
                          <span className="text-[10px] font-medium">Synced</span>
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 text-[9px] uppercase tracking-wide px-2 py-0.5 border-0 font-semibold",
                      book.accessType === "FREE"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : book.accessType === "SUBSCRIPTION"
                          ? "bg-brand/25 text-brand"
                          : "bg-amber-500/15 text-amber-400"
                    )}
                  >
                    {book.accessType}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-bold tabular-nums w-8 shrink-0",
                      theme === "dark" && "text-brand",
                      theme === "sepia" && "text-brand",
                      theme === "light" && "text-brand"
                    )}
                  >
                    {progressPct}%
                  </span>
                  <Progress value={progressPct} className="h-1.5 flex-1 min-w-0 [&>div]:shadow-[0_0_12px_rgba(249,115,22,0.35)]" />
                  <span
                    className={cn(
                      "text-[10px] tabular-nums shrink-0 w-14 text-right",
                      theme === "dark" && "text-gray-400",
                      theme === "sepia" && "text-amber-900/70",
                      theme === "light" && "text-gray-500"
                    )}
                  >
                    p.{currentPage}/{readerPages.length}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums shrink-0 border",
                      theme === "dark" && "border-gray-600/60 bg-gray-950/50 text-gray-300",
                      theme === "sepia" && "border-amber-300/60 bg-amber-200/40 text-amber-950",
                      theme === "light" && "border-gray-200 bg-white/80 text-gray-700"
                    )}
                  >
                    <Clock size={11} className="opacity-80" aria-hidden />
                    <span id="elapsed-toolbar">0:00</span>
                  </span>
                </div>
              </div>
            </div>

            <div className={cn(readerToolCluster(theme))}>
              {readingLayout === "vertical" && (
                <button
                  type="button"
                  onClick={toggleAutoScroll}
                  disabled={prefersReducedMotion}
                  aria-pressed={autoScrollOn}
                  className={cn(
                    "p-2 rounded-xl transition-all disabled:opacity-35",
                    autoScrollOn && "text-brand bg-brand/15 ring-1 ring-brand/35",
                    !autoScrollOn &&
                      (theme === "dark"
                        ? "text-gray-400 hover:text-white hover:bg-gray-700/80"
                        : theme === "sepia"
                          ? "text-amber-900 hover:bg-amber-200/50"
                          : "text-gray-600 hover:bg-gray-100")
                  )}
                  title={
                    prefersReducedMotion
                      ? "Auto-scroll off (reduced motion)"
                      : autoScrollOn
                        ? "Pause auto-scroll"
                        : "Auto-scroll — hands-free reading (vertical mode)"
                  }
                  aria-label={autoScrollOn ? "Pause auto-scroll" : "Start auto-scroll"}
                >
                  {autoScrollOn ? <Pause size={17} /> : <Play size={17} />}
                </button>
              )}
              <button
                type="button"
                onClick={saveBookmark}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  bookmarkPage === currentPage
                    ? "text-brand bg-brand/15 ring-1 ring-brand/30"
                    : theme === "dark"
                      ? "text-gray-400 hover:text-white hover:bg-gray-700/80"
                      : theme === "sepia"
                        ? "text-amber-900 hover:bg-amber-200/50"
                        : "text-gray-600 hover:bg-gray-100"
                )}
                title="Bookmark this section"
                aria-label="Bookmark this page"
              >
                <Bookmark size={17} className={bookmarkPage === currentPage ? "fill-current" : ""} />
              </button>
              <button
                type="button"
                onClick={goToBookmark}
                disabled={bookmarkPage == null}
                className={cn(
                  "p-2 rounded-xl transition-all disabled:opacity-35",
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-700/80"
                    : theme === "sepia"
                      ? "text-amber-900 hover:bg-amber-200/50"
                      : "text-gray-600 hover:bg-gray-100"
                )}
                title={bookmarkPage != null ? `Jump to bookmark (section ${bookmarkPage})` : "No bookmark"}
                aria-label="Go to bookmarked page"
              >
                <BookOpen size={17} />
              </button>
              <button
                type="button"
                onClick={() => setShowToc(t => !t)}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-700/80"
                    : theme === "sepia"
                      ? "text-amber-900 hover:bg-amber-200/50"
                      : "text-gray-600 hover:bg-gray-100"
                )}
                aria-label="Table of contents"
              >
                <List size={17} />
              </button>
              <button
                type="button"
                onClick={() => setReaderHelpOpen(v => !v)}
                aria-expanded={readerHelpOpen}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  readerHelpOpen && "ring-2 ring-brand/40 ring-offset-2 ring-offset-transparent",
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-700/80"
                    : theme === "sepia"
                      ? "text-amber-900 hover:bg-amber-200/50"
                      : "text-gray-600 hover:bg-gray-100"
                )}
                title="Shortcuts (?)"
                aria-label="Keyboard shortcuts"
              >
                <HelpCircle size={17} />
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(s => !s)}
                aria-expanded={showSettings}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  showSettings && "ring-2 ring-brand/50 ring-offset-2 ring-offset-transparent",
                  theme === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-gray-700/80"
                    : theme === "sepia"
                      ? "text-amber-900 hover:bg-amber-200/50"
                      : "text-gray-600 hover:bg-gray-100"
                )}
                aria-label="Reader settings"
              >
                <Settings size={17} />
              </button>
            </div>
          </div>
        </div>

        {showSettings && (
          <div
            className={cn(
              "border-t px-3 sm:px-5 py-4 sm:py-5 bg-gradient-to-b from-transparent to-black/[0.08] dark:to-black/20 max-h-[min(26rem,58vh)] sm:max-h-[min(32rem,64vh)] overflow-y-auto overscroll-y-contain",
              theme === "sepia" && "to-amber-900/[0.04]",
              theme === "light" && "to-gray-900/[0.03]"
            )}
          >
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-brand shrink-0" aria-hidden />
                <div>
                  <p
                    className={cn(
                      "text-xs font-bold uppercase tracking-[0.2em]",
                      theme === "dark" && "text-gray-400",
                      theme === "sepia" && "text-amber-800/80",
                      theme === "light" && "text-gray-500"
                    )}
                  >
                    Reading studio
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      theme === "dark" && "text-gray-100",
                      theme === "sepia" && "text-amber-950",
                      theme === "light" && "text-gray-900"
                    )}
                  >
                    Tune how this book feels on your screen
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <section className={readerSettingsCard(theme)}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl",
                        theme === "dark" ? "bg-orange-500/15 text-orange-400" : "bg-brand/10 text-brand"
                      )}
                    >
                      <Palette size={18} aria-hidden />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          theme === "dark" && "text-gray-400",
                          theme === "sepia" && "text-amber-800/90",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Appearance
                      </h3>
                      <p
                        className={cn(
                          "text-xs",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/70",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Page atmosphere
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex gap-1 p-1 rounded-xl",
                      theme === "dark" && "bg-gray-950/50",
                      theme === "sepia" && "bg-amber-200/30",
                      theme === "light" && "bg-gray-100/80"
                    )}
                    role="group"
                    aria-label="Color theme"
                  >
                    {(["light", "dark", "sepia"] as Theme[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-semibold transition-all border border-transparent",
                          theme === t
                            ? "bg-brand text-primary-foreground shadow-md shadow-brand/25 border-brand"
                            : theme === "dark"
                              ? "text-gray-400 hover:bg-gray-800/80 hover:text-gray-200"
                              : theme === "sepia"
                                ? "text-amber-900/70 hover:bg-amber-100/80"
                                : "text-gray-600 hover:bg-white"
                        )}
                      >
                        {t === "light" && <Sun size={18} strokeWidth={2} />}
                        {t === "dark" && <Moon size={18} strokeWidth={2} />}
                        {t === "sepia" && <span className="text-sm leading-none">☕</span>}
                        {THEME_STYLES[t].label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className={readerSettingsCard(theme)}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl",
                        theme === "dark" ? "bg-sky-500/15 text-sky-400" : "bg-sky-500/10 text-sky-600"
                      )}
                    >
                      <Type size={18} aria-hidden />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          theme === "dark" && "text-gray-400",
                          theme === "sepia" && "text-amber-800/90",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Typography
                      </h3>
                      <p
                        className={cn(
                          "text-xs",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/70",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Font & size
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-1.5">
                      {(["serif", "sans"] as FontFamily[]).map(ff => (
                        <button
                          key={ff}
                          type="button"
                          onClick={() => setFontFamily(ff)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-semibold capitalize border transition-all",
                            fontFamily === ff
                              ? "border-brand bg-brand/12 text-brand ring-1 ring-brand/20"
                              : theme === "dark"
                                ? "border-gray-600 text-gray-400 hover:border-gray-500"
                                : theme === "sepia"
                                  ? "border-amber-200 text-amber-900/80"
                                  : "border-gray-200 text-gray-600"
                          )}
                        >
                          {ff}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setFontSize(s => Math.max(14, s - 2) as FontSize)}
                        className={cn(
                          "p-2 rounded-xl border transition-colors",
                          theme === "dark" ? "border-gray-600 hover:border-brand" : theme === "sepia" ? "border-amber-200 hover:border-brand" : "border-gray-200 hover:border-brand"
                        )}
                        aria-label="Smaller text"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="text-center">
                        <span
                          className={cn(
                            "text-lg font-bold tabular-nums",
                            theme === "dark" && "text-white",
                            theme === "sepia" && "text-amber-950",
                            theme === "light" && "text-gray-900"
                          )}
                        >
                          {fontSize}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] block uppercase tracking-wide",
                            theme === "dark" && "text-gray-500",
                            theme === "sepia" && "text-amber-800/70",
                            theme === "light" && "text-gray-500"
                          )}
                        >
                          px size
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFontSize(s => Math.min(22, s + 2) as FontSize)}
                        className={cn(
                          "p-2 rounded-xl border transition-colors",
                          theme === "dark" ? "border-gray-600 hover:border-brand" : theme === "sepia" ? "border-amber-200 hover:border-brand" : "border-gray-200 hover:border-brand"
                        )}
                        aria-label="Larger text"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </section>

                <section className={readerSettingsCard(theme)}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl",
                        theme === "dark" ? "bg-violet-500/15 text-violet-400" : "bg-violet-500/10 text-violet-600"
                      )}
                    >
                      <Rows3 size={18} aria-hidden />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          theme === "dark" && "text-gray-400",
                          theme === "sepia" && "text-amber-800/90",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Line height
                      </h3>
                      <p
                        className={cn(
                          "text-xs",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/70",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Breathing room
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(
                      [
                        ["compact", "Tight"],
                        ["comfortable", "Balanced"],
                        ["spacious", "Airy"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLineHeight(key)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                          lineHeight === key
                            ? "border-brand bg-brand/12 text-brand"
                            : theme === "dark"
                              ? "border-gray-600 text-gray-400 hover:bg-gray-800/50"
                              : theme === "sepia"
                                ? "border-amber-200 text-amber-900/80 hover:bg-amber-100/50"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {label}
                        <span
                          className={cn(
                            "block text-[10px] font-normal mt-0.5 opacity-70",
                            theme === "dark" && "text-gray-500",
                            theme === "sepia" && "text-amber-800/60",
                            theme === "light" && "text-gray-500"
                          )}
                        >
                          {key === "compact" && "Dense paragraphs"}
                          {key === "comfortable" && "Default comfort"}
                          {key === "spacious" && "Extra line space"}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={readerSettingsCard(theme)}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl",
                        theme === "dark" ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-500/10 text-emerald-600"
                      )}
                    >
                      <Clock size={18} aria-hidden />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          theme === "dark" && "text-gray-400",
                          theme === "sepia" && "text-amber-800/90",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Session & view
                      </h3>
                      <p
                        className={cn(
                          "text-xs",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/70",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Time on book · chrome
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2.5 mb-3 border",
                      theme === "dark" && "border-gray-600/60 bg-gray-950/40",
                      theme === "sepia" && "border-amber-200/80 bg-amber-100/40",
                      theme === "light" && "border-gray-200 bg-gray-50/90"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider mb-1",
                        theme === "dark" && "text-gray-500",
                        theme === "sepia" && "text-amber-800/80",
                        theme === "light" && "text-gray-500"
                      )}
                    >
                      This session
                    </p>
                    <p
                      className={cn(
                        "text-base font-semibold tabular-nums",
                        theme === "dark" && "text-gray-100",
                        theme === "sepia" && "text-amber-950",
                        theme === "light" && "text-gray-900"
                      )}
                      data-elapsed-session
                    >
                      0:00 reading
                    </p>
                  </div>
                  <label
                    className={cn(
                      "flex items-start gap-3 cursor-pointer rounded-xl p-2 -m-2 transition-colors",
                      theme === "dark" && "hover:bg-gray-800/40",
                      theme === "sepia" && "hover:bg-amber-100/50",
                      theme === "light" && "hover:bg-gray-100/80"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-400 text-brand focus:ring-brand"
                      checked={immersiveMode}
                      onChange={e => setImmersiveMode(e.target.checked)}
                    />
                    <span>
                      <span
                        className={cn(
                          "text-sm font-medium block",
                          theme === "dark" && "text-gray-200",
                          theme === "sepia" && "text-amber-950",
                          theme === "light" && "text-gray-800"
                        )}
                      >
                        Immersive reading
                      </span>
                      <span
                        className={cn(
                          "text-[11px] leading-snug block mt-0.5",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/65",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Auto-hide top and bottom bars after idle. Tap “Show controls” to bring them back.
                      </span>
                    </span>
                  </label>
                </section>
              </div>

              <section className={cn(readerSettingsCard(theme), "mt-1 sm:mt-2")} aria-label="Reading layout">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "rounded-xl p-2.5",
                        theme === "dark" ? "bg-fuchsia-500/15 text-fuchsia-400" : "bg-fuchsia-500/10 text-fuchsia-700"
                      )}
                    >
                      <GalleryHorizontal size={18} aria-hidden />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          theme === "dark" && "text-gray-400",
                          theme === "sepia" && "text-amber-800/90",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Reading layout
                      </h3>
                      <p
                        className={cn(
                          "text-xs",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/70",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Scroll the page, or swipe between sections like slides
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex gap-1 rounded-xl p-1 sm:max-w-md sm:flex-1",
                      theme === "dark" && "bg-gray-950/50",
                      theme === "sepia" && "bg-amber-200/30",
                      theme === "light" && "bg-gray-100/80"
                    )}
                    role="group"
                    aria-label="Choose vertical or horizontal reading"
                  >
                    <button
                      type="button"
                      onClick={() => setReadingLayout("vertical")}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-lg border border-transparent py-2.5 text-[10px] font-semibold transition-all sm:flex-row sm:justify-center sm:gap-2 sm:py-2",
                        readingLayout === "vertical"
                          ? "bg-brand text-primary-foreground shadow-md shadow-brand/25"
                          : theme === "dark"
                            ? "text-gray-400 hover:bg-gray-800/80 hover:text-gray-200"
                            : theme === "sepia"
                              ? "text-amber-900/70 hover:bg-amber-100/80"
                              : "text-gray-600 hover:bg-white"
                      )}
                    >
                      <ScrollText size={18} strokeWidth={2} aria-hidden />
                      Vertical
                      <span className="hidden text-[9px] font-normal opacity-90 sm:inline">Continuous scroll</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingLayout("horizontal")}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-lg border border-transparent py-2.5 text-[10px] font-semibold transition-all sm:flex-row sm:justify-center sm:gap-2 sm:py-2",
                        readingLayout === "horizontal"
                          ? "bg-brand text-primary-foreground shadow-md shadow-brand/25"
                          : theme === "dark"
                            ? "text-gray-400 hover:bg-gray-800/80 hover:text-gray-200"
                            : theme === "sepia"
                              ? "text-amber-900/70 hover:bg-amber-100/80"
                              : "text-gray-600 hover:bg-white"
                      )}
                    >
                      <GalleryHorizontal size={18} strokeWidth={2} aria-hidden />
                      Horizontal
                      <span className="hidden text-[9px] font-normal opacity-90 sm:inline">Swipe pages</span>
                    </button>
                  </div>
                </div>
              </section>

              <section className={cn(readerSettingsCard(theme), "mt-1 sm:mt-2")} aria-label="Auto-scroll">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "rounded-xl p-2.5",
                        theme === "dark" ? "bg-cyan-500/15 text-cyan-400" : "bg-cyan-500/10 text-cyan-700"
                      )}
                    >
                      {autoScrollOn ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          theme === "dark" && "text-gray-400",
                          theme === "sepia" && "text-amber-800/90",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Auto-scroll
                      </h3>
                      <p
                        className={cn(
                          "text-xs",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/70",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Steady downward scroll while you read (vertical layout)
                      </p>
                    </div>
                  </div>
                  <div className="w-full min-w-0 sm:max-w-xs sm:flex-1">
                    {readingLayout !== "vertical" ? (
                      <p
                        className={cn(
                          "text-xs leading-snug",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/70",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Switch to <span className="font-semibold">Vertical</span> layout above to enable auto-scroll.
                      </p>
                    ) : prefersReducedMotion ? (
                      <p
                        className={cn(
                          "text-xs leading-snug",
                          theme === "dark" && "text-gray-500",
                          theme === "sepia" && "text-amber-900/70",
                          theme === "light" && "text-gray-500"
                        )}
                      >
                        Unavailable while <span className="font-semibold">Reduce motion</span> is enabled in your system settings.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl p-2 -m-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
                          <input
                            type="checkbox"
                            className="rounded border-gray-400 text-brand focus:ring-brand"
                            checked={autoScrollOn}
                            onChange={e => setAutoScrollOn(e.target.checked)}
                          />
                          <span
                            className={cn(
                              "text-sm font-medium",
                              theme === "dark" && "text-gray-200",
                              theme === "sepia" && "text-amber-950",
                              theme === "light" && "text-gray-800"
                            )}
                          >
                            Enable auto-scroll
                          </span>
                        </label>
                        <div>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                theme === "dark" && "text-gray-500",
                                theme === "sepia" && "text-amber-800/80",
                                theme === "light" && "text-gray-500"
                              )}
                            >
                              Speed
                            </span>
                            <span
                              className={cn(
                                "text-xs font-semibold tabular-nums",
                                theme === "dark" && "text-gray-300",
                                theme === "sepia" && "text-amber-950",
                                theme === "light" && "text-gray-800"
                              )}
                            >
                              {autoScrollSpeed}px/s
                            </span>
                          </div>
                          <Slider
                            min={AUTO_SCROLL_SPEED_MIN}
                            max={AUTO_SCROLL_SPEED_MAX}
                            step={2}
                            value={[autoScrollSpeed]}
                            onValueChange={([v]) => setAutoScrollSpeed(v as number)}
                            aria-label="Auto-scroll speed"
                          />
                          <div
                            className={cn(
                              "mt-1.5 flex justify-between text-[10px]",
                              theme === "dark" && "text-gray-500",
                              theme === "sepia" && "text-amber-800/70",
                              theme === "light" && "text-gray-500"
                            )}
                          >
                            <span>Slower</span>
                            <span>Faster</span>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "text-[11px] leading-snug",
                            theme === "dark" && "text-gray-500",
                            theme === "sepia" && "text-amber-900/65",
                            theme === "light" && "text-gray-500"
                          )}
                        >
                          Wheel, touch-drag, space, arrows, or the page slider pauses auto-scroll. Stops at the end of the book.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* TOC drawer */}
      {showToc && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowToc(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reader-toc-title"
        >
          <div
            ref={readerTocPanelRef}
            className={cn("absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] shadow-2xl overflow-y-auto", readerTocAside(theme))}
            onClick={e => e.stopPropagation()}
          >
            <div
              className={cn(
                "flex items-center justify-between p-4 border-b",
                theme === "dark" ? "border-gray-700" : theme === "sepia" ? "border-amber-200" : "border-gray-100"
              )}
            >
              <h3
                id="reader-toc-title"
                className={cn(
                  "font-semibold",
                  theme === "dark" && "text-gray-100",
                  theme === "sepia" && "text-amber-950",
                  theme === "light" && "text-gray-900"
                )}
              >
                Table of Contents
              </h3>
              <button
                ref={readerTocCloseRef}
                type="button"
                onClick={() => setShowToc(false)}
                aria-label="Close contents"
              >
                <X
                  size={18}
                  className={cn(
                    theme === "dark" && "text-gray-400",
                    theme === "sepia" && "text-amber-800",
                    theme === "light" && "text-gray-500"
                  )}
                />
              </button>
            </div>
            {hasParsedContent && (
              <div className={cn(
                "mx-4 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                theme === "dark" ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-50 text-emerald-700"
              )}>
                <CheckCircle size={13} />
                {readerPages.length} chapter{readerPages.length !== 1 ? "s" : ""} extracted from file
              </div>
            )}
            {/* In-book search */}
            <div className="mx-4 mt-3">
              <div className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2",
                theme === "dark" ? "border-gray-700 bg-gray-800/50" : theme === "sepia" ? "border-amber-200 bg-amber-100/50" : "border-gray-200 bg-gray-50"
              )}>
                <Search size={14} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search in book…"
                  className={cn(
                    "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
                    theme === "dark" ? "text-gray-100" : theme === "sepia" ? "text-amber-950" : "text-gray-900"
                  )}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search">
                    <X size={14} className="text-muted-foreground" />
                  </button>
                )}
              </div>
              {searchQuery.trim().length >= 2 && (
                <p className={cn("text-xs mt-1.5 px-1", theme === "dark" ? "text-gray-400" : "text-muted-foreground")}>
                  {searchResults.length} match{searchResults.length !== 1 ? "es" : ""} found
                </p>
              )}
            </div>
            {searchQuery.trim().length >= 2 && searchResults.length > 0 ? (
              <div className="p-4 space-y-1">
                {searchResults.map((r, i) => (
                  <button
                    key={`${r.page}-${i}`}
                    type="button"
                    onClick={() => { goTo(r.page); setShowToc(false) }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                      theme === "dark" ? "text-gray-300 hover:bg-gray-800" : theme === "sepia" ? "text-amber-950 hover:bg-amber-100" : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <span className="text-[10px] text-brand font-medium block">{r.chapterLabel}</span>
                    <span className="text-xs opacity-75 line-clamp-2">{r.snippet}</span>
                  </button>
                ))}
              </div>
            ) : (
            <div className="p-4 space-y-1">
              {tocEntries.map((entry, i) => (
                <button
                  key={entry.page}
                  type="button"
                  onClick={() => {
                    goTo(entry.page)
                    setShowToc(false)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                    currentPage === entry.page
                      ? "bg-brand/10 text-brand font-medium"
                      : theme === "dark"
                        ? "text-gray-300 hover:bg-gray-800"
                        : theme === "sepia"
                          ? "text-amber-950 hover:bg-amber-100"
                          : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <span className="text-[10px] text-muted-foreground block tabular-nums">
                    {hasParsedContent ? `Chapter ${i + 1}` : `Page ${entry.page}`}
                  </span>
                  {entry.label}
                </button>
              ))}
            </div>
            )}

            {/* Engagement mini-stats in TOC sidebar */}
            {user && (
              <div
                className={cn(
                  "mx-4 mb-4 p-3 rounded-xl border",
                  theme === "dark" ? "border-gray-700 bg-gray-800/60" : theme === "sepia" ? "border-amber-200 bg-amber-100/50" : "border-gray-100 bg-gray-50"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-semibold mb-2",
                    theme === "dark" && "text-gray-300",
                    theme === "sepia" && "text-amber-950",
                    theme === "light" && "text-gray-700"
                  )}
                >
                  Your Progress
                </p>
                <div className="space-y-1.5">
                  <div
                    className={cn(
                      "flex justify-between text-xs",
                      theme === "dark" && "text-gray-400",
                      theme === "sepia" && "text-amber-900/80",
                      theme === "light" && "text-gray-500"
                    )}
                  >
                    <span>{hasParsedContent ? "Chapter" : "Sample section"}</span>
                    <span className="font-semibold tabular-nums">
                      {currentPage} / {readerPages.length}
                    </span>
                  </div>
                  <Progress value={(currentPage / totalPages) * 100} className="h-1.5" />
                  <div
                    className={cn(
                      "flex justify-between text-xs",
                      theme === "dark" && "text-gray-400",
                      theme === "sepia" && "text-amber-900/80",
                      theme === "light" && "text-gray-500"
                    )}
                  >
                    <span>Title progress</span>
                    <span className="font-semibold tabular-nums">{((currentPage / totalPages) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reading area — copy/select deterrence only; does not block screenshots or recording */}
      <main
        className={cn(
          "flex-1 pb-28 px-4 sm:px-6",
          prefersReducedMotion ? "transition-none" : "transition-[padding-top] duration-300",
          showSettings
            ? "pt-[calc(4.5rem+min(26rem,58vh))] sm:pt-[calc(4.5rem+min(32rem,64vh))]"
            : "pt-[4.75rem]",
          readingLayout === "horizontal" && "flex min-h-0 flex-col"
        )}
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {readingLayout === "horizontal"
            ? `Section ${currentPage} of ${readerPages.length}. Swipe horizontally or use arrow keys.`
            : `Scroll to read. Active section ${currentPage} of ${readerPages.length}. Arrow keys jump between sections.`}
        </p>
        <ProtectedSurface
          active={accessState === "allowed"}
          userEmail={user?.email ?? null}
          watermarkVariant={theme === "dark" ? "dark" : "light"}
          outerClassName={cn(
            readingLayout === "horizontal"
              ? "flex min-h-0 w-full max-w-none flex-1 flex-col"
              : "max-w-2xl mx-auto w-full"
          )}
          innerClassName={cn(
            "w-full leading-relaxed",
            readingLayout === "horizontal" && "flex min-h-0 flex-1 flex-col"
          )}
          innerStyle={{
            fontSize: `${fontSize}px`,
            lineHeight: LINE_HEIGHTS[lineHeight],
            color: theme === "dark" ? "#e5e7eb" : theme === "sepia" ? "#44403c" : "#1f2937",
          }}
        >
          {readingLayout === "vertical" ? (
            <article dir="auto" className={cn(fontFamily === "serif" ? "font-serif" : "font-sans", "reader-typography")}>
              {readerPages.map((p, idx) => {
                const isMounted = readerPages.length <= 8 || (idx >= mountedRange[0] && idx <= mountedRange[1])
                return (
                  <section
                    key={p.page}
                    id={`reader-section-${p.page}`}
                    className="mb-14 scroll-mt-28 last:mb-8 sm:scroll-mt-32"
                  >
                    <div id={`reader-sentinel-${p.page}`} />
                    {isMounted ? (
                      p.contentType === "html" ? (
                        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-serif prose-img:rounded-lg" dangerouslySetInnerHTML={{ __html: p.content }} />
                      ) : (
                        <div className="whitespace-pre-wrap">{p.content}</div>
                      )
                    ) : (
                      <div className="h-[60vh]" aria-hidden="true" />
                    )}
                  </section>
                )
              })}
            </article>
          ) : (
            <div
              ref={horizontalScrollRef}
              className={cn(
                "flex min-h-0 min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden",
                !prefersReducedMotion && "scroll-smooth",
                "overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]",
                "pb-1"
              )}
              aria-label="Paginated sections — swipe left or right"
            >
              {readerPages.map(p => (
                <div
                  key={p.page}
                  className={cn(
                    "max-h-[min(72dvh,calc(100dvh-10.5rem))] min-h-0 min-w-full shrink-0 snap-center snap-always",
                    "overflow-y-auto overscroll-y-contain pr-1"
                  )}
                >
                  <div className="mx-auto max-w-2xl">
                    <article dir="auto" className={cn(fontFamily === "serif" ? "font-serif" : "font-sans", "reader-typography")}>
                      {p.contentType === "html" ? (
                        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-serif prose-img:rounded-lg" dangerouslySetInnerHTML={{ __html: p.content }} />
                      ) : (
                        <div className="whitespace-pre-wrap">{p.content}</div>
                      )}
                    </article>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProtectedSurface>
      </main>

      {readerHelpOpen ? (
        <div
          className="fixed inset-0 z-[65] flex items-end justify-center p-4 pb-24 sm:items-center sm:pb-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reader-help-title"
        >
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close shortcuts"
            onClick={() => setReaderHelpOpen(false)}
          />
          <div
            ref={readerHelpPanelRef}
            className={cn(
              "relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-2xl",
              readerSettingsCard(theme)
            )}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                id="reader-help-title"
                className={cn(
                  "text-base font-semibold",
                  theme === "dark" && "text-gray-100",
                  theme === "sepia" && "text-amber-950",
                  theme === "light" && "text-gray-900"
                )}
              >
                Reader shortcuts
              </h2>
              <button
                ref={readerHelpCloseRef}
                type="button"
                onClick={() => setReaderHelpOpen(false)}
                className={cn(
                  "rounded-lg p-1.5 transition-colors",
                  theme === "dark" && "text-gray-400 hover:bg-gray-700 hover:text-white",
                  theme === "sepia" && "text-amber-800 hover:bg-amber-200/60",
                  theme === "light" && "text-gray-500 hover:bg-gray-100"
                )}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ul
              className={cn(
                "space-y-3 text-sm leading-snug",
                theme === "dark" && "text-gray-300",
                theme === "sepia" && "text-amber-950",
                theme === "light" && "text-gray-700"
              )}
            >
              <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="inline-flex gap-1 font-mono text-xs">
                  <kbd className="rounded border border-current/25 bg-black/10 px-1.5 py-0.5 dark:bg-white/10">←</kbd>
                  <kbd className="rounded border border-current/25 bg-black/10 px-1.5 py-0.5 dark:bg-white/10">→</kbd>
                </span>
                <span>Previous / next section</span>
              </li>
              <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <kbd className="rounded border border-current/25 bg-black/10 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">?</kbd>
                <span>Open or close this panel</span>
              </li>
              <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <kbd className="rounded border border-current/25 bg-black/10 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">Esc</kbd>
                <span>
                  Close overlays in order: shortcuts, then table of contents, then reading settings
                </span>
              </li>
              <li>
                Bottom bar and table of contents jump between sections; the contents drawer traps keyboard focus while
                open. Settings hold theme, fonts, layout, and auto-scroll (vertical mode).
              </li>
              <li>
                With <span className="font-medium">auto-scroll</span> on: wheel, touch-drag, space, or arrow keys pause it.
              </li>
              <li>
                If your device uses <span className="font-medium">Reduce motion</span>, page transitions and auto-scroll
                follow that setting.
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      {immersiveMode && !showToolbar && (
        <button
          type="button"
          onClick={() => setShowToolbar(true)}
          className={cn(
            "fixed bottom-20 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border text-sm font-medium",
            theme === "dark" && "bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700",
            theme === "sepia" && "bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-50",
            theme === "light" && "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
          )}
        >
          <PanelTopOpen size={16} aria-hidden />
          Show controls
        </button>
      )}

      {/* Bottom nav */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          prefersReducedMotion ? "transition-none" : "transition-all duration-300",
          showToolbar ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none",
          readerToolbarBar(theme),
          "backdrop-blur-md border-t"
        )}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => goTo(currentPage - 1)}
            className={cn(
              "gap-1.5",
              theme === "dark" && "text-gray-200 hover:text-white hover:bg-gray-800",
              theme === "sepia" && "text-amber-950 hover:bg-amber-100"
            )}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex flex-col items-center gap-0.5 min-w-0 max-w-[45vw] sm:max-w-none">
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                theme === "dark" && "text-gray-400",
                theme === "sepia" && "text-amber-900/75",
                theme === "light" && "text-gray-500"
              )}
            >
              Page {currentPage} of {readerPages.length}
              <span className="hidden sm:inline text-muted-foreground font-normal"> · {progressPct}% of title</span>
            </span>
            <Slider
              min={1}
              max={readerPages.length}
              step={1}
              value={[currentPage]}
              onValueChange={([v]) => goTo(v)}
              className="w-28 sm:w-36"
              aria-label="Jump to section"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= readerPages.length}
            onClick={() => goTo(currentPage + 1)}
            className={cn(
              "gap-1.5",
              theme === "dark" && "text-gray-200 hover:text-white hover:bg-gray-800",
              theme === "sepia" && "text-amber-950 hover:bg-amber-100"
            )}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Elapsed timer (live updating) */}
      <ElapsedTimer elapsedSecRef={elapsedSecRef} />
    </div>
  )
}

// ── Live elapsed timer component ─────────────────────────────────────────────

function ElapsedTimer({ elapsedSecRef }: { elapsedSecRef: React.MutableRefObject<number> }) {
  React.useEffect(() => {
    const interval = setInterval(() => {
      const s = elapsedSecRef.current
      const m = Math.floor(s / 60)
      const sec = s % 60
      const short = `${m}:${String(sec).padStart(2, "0")}`
      const text = `${short} reading`
      document.getElementById("elapsed-timer")?.replaceChildren(document.createTextNode(text))
      document.querySelector("[data-elapsed-session]")?.replaceChildren(document.createTextNode(text))
      document.getElementById("elapsed-toolbar")?.replaceChildren(document.createTextNode(short))
    }, 1000)
    return () => clearInterval(interval)
  }, [elapsedSecRef])

  return null
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ReaderPage() {
  return (
    <Providers>
      <React.Suspense fallback={null}>
        <ReaderContent />
      </React.Suspense>
    </Providers>
  )
}
