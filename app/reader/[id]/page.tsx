"use client"

/**
 * Reader Page — Phase 3
 *
 * With Laravel Phase 3 (`NEXT_PUBLIC_API_URL` + optional flags): numeric `/reader/:id`
 * uses `GET /api/library/:id/access`, `GET /api/books/:id` for metadata, debounced
 * `POST /api/reading-progress` and `GET /api/reading-progress/:id` for sync/restore.
 * Offline/mock routes use `engagementStore` + `MOCK_BOOKS` only.
 */

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
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
  Minus, Plus, List, X, Settings, Type, Clock,
  Lock, ShoppingCart, Crown, CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProtectedSurface } from "@/components/protected-surface"

// ── Book content (mock pages — in prod fetched from CDN per chapter) ───────────
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

const TOTAL_PAGES = 342 // the "real" book length (engagement is computed against this)

type Theme    = "light" | "dark" | "sepia"
type FontSize = 14 | 16 | 18 | 20 | 22

const THEME_STYLES: Record<Theme, { bg: string; text: string; label: string }> = {
  light: { bg: "bg-white",         text: "text-gray-900",  label: "Light" },
  dark:  { bg: "bg-gray-900",      text: "text-gray-100",  label: "Dark"  },
  sepia: { bg: "bg-amber-50",      text: "text-amber-950", label: "Sepia" },
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
  const { user, isAuthenticated, isLoading } = useAuth()
  const routeId = params?.id ?? ""

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

  /** Stable id for engagement + progress APIs (numeric Laravel id vs mock `bk_*`). */
  const engagementBookId = /^\d+$/.test(routeId) ? routeId : book.id

  // ── Access check ────────────────────────────────────────────────────────────
  const [accessState, setAccessState] = React.useState<
    "checking" | "allowed" | "denied_subscription" | "denied_paid"
  >("checking")

  React.useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      const id = routeId || book.id
      router.replace(`/auth/login?next=${encodeURIComponent(`/reader/${id}`)}`)
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
  }, [isLoading, isAuthenticated, user, book, router, routeId])

  // ── Reader state ────────────────────────────────────────────────────────────
  const [currentPage,  setCurrentPage]  = React.useState(1)
  const [theme,        setTheme]        = React.useState<Theme>("light")
  const [fontSize,     setFontSize]     = React.useState<FontSize>(18)
  const [showSettings, setShowSettings] = React.useState(false)
  const [showToc,      setShowToc]      = React.useState(false)
  const [showToolbar,  setShowToolbar]  = React.useState(true)

  // Restore last-read page from engagement record
  React.useEffect(() => {
    if (accessState !== "allowed" || !user) return
    if (laravelPhase3Enabled() && /^\d+$/.test(routeId)) {
      progressApi.get(routeId).then(r => {
        if (r.page_number > 0) {
          setCurrentPage(Math.min(r.page_number, MOCK_PAGES.length))
        }
      }).catch(() => {
        const saved = engagementStore.getByUserBook(user.id, engagementBookId)
        if (saved && saved.pagesRead > 0) {
          setCurrentPage(Math.min(saved.pagesRead, MOCK_PAGES.length))
        }
      })
      return
    }
    const saved = engagementStore.getByUserBook(user.id, engagementBookId)
    if (saved && saved.pagesRead > 0) {
      const restored = Math.min(saved.pagesRead, MOCK_PAGES.length)
      setCurrentPage(restored)
    }
  }, [accessState, user, engagementBookId, routeId])

  // Auto-hide toolbar
  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const handle = () => {
      setShowToolbar(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => setShowToolbar(false), 3500)
    }
    window.addEventListener("mousemove", handle)
    window.addEventListener("touchstart", handle)
    return () => {
      window.removeEventListener("mousemove", handle)
      window.removeEventListener("touchstart", handle)
      clearTimeout(timeout)
    }
  }, [])

  // Engagement tracker (only active when access allowed)
  const { lastSave, elapsedSecRef } = useEngagementTracker(
    user?.id ?? "anonymous",
    engagementBookId,
    currentPage,
    TOTAL_PAGES
  )

  const pageData    = MOCK_PAGES.find(p => p.page === currentPage) ?? MOCK_PAGES[MOCK_PAGES.length - 1]
  const progressPct = Math.round((currentPage / TOTAL_PAGES) * 100)
  const styles      = THEME_STYLES[theme]

  const goTo = (page: number) => setCurrentPage(Math.max(1, Math.min(page, MOCK_PAGES.length)))

  // ── Loading / Access gate renders ─────────────────────────────────────────
  if (isLoading || accessState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Checking access…</p>
        </div>
      </div>
    )
  }
  if (accessState === "denied_subscription") {
    return <AccessDeniedSubscription bookId={routeId || book.id} />
  }
  if (accessState === "denied_paid")         return <AccessDeniedPaid book={book} />

  // ── Full reader UI ─────────────────────────────────────────────────────────
  return (
    <div className={cn("min-h-screen flex flex-col transition-colors duration-300", styles.bg)}>

      {/* Top toolbar */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          showToolbar ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full",
          theme === "dark" ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200",
          "backdrop-blur-md border-b shadow-sm"
        )}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/books/${book.id}`}>
              <Button variant="ghost" size="sm" className={cn("gap-1.5", theme === "dark" ? "text-gray-300 hover:text-white hover:bg-gray-800" : "")}>
                <ChevronLeft size={15} />
                Back
              </Button>
            </Link>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold truncate max-w-[200px]" style={{ color: theme === "dark" ? "#f3f4f6" : "#111827" }}>
                {book.title}
              </p>
              <p className="text-xs flex items-center gap-1" style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }}>
                {book.author}
                {lastSave && (
                  <span className="inline-flex items-center gap-1 ml-2 text-[10px] opacity-70">
                    <CheckCircle size={9} className="text-green-500" />
                    Saved
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }}>
                {progressPct}%
              </span>
              <Progress value={progressPct} className="h-1.5" />
              <span className="text-xs shrink-0" style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }}>
                p.{currentPage}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Access type badge */}
            <Badge
              className={cn(
                "text-[10px] border-0 mr-1",
                book.accessType === "FREE"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : book.accessType === "SUBSCRIPTION"
                  ? "bg-brand/20 text-brand"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              )}
            >
              {book.accessType}
            </Badge>
            <button
              onClick={() => setShowToc(t => !t)}
              className={cn("p-2 rounded-lg transition-colors", theme === "dark" ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")}
              aria-label="Table of contents"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setShowSettings(s => !s)}
              className={cn("p-2 rounded-lg transition-colors", theme === "dark" ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")}
              aria-label="Reader settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className={cn(
            "border-t px-4 py-4 max-w-4xl mx-auto",
            theme === "dark" ? "border-gray-700 bg-gray-900" : "border-gray-100 bg-white"
          )}>
            <div className="flex flex-wrap gap-8 items-center">
              {/* Theme */}
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Theme</p>
                <div className="flex gap-2">
                  {(["light", "dark", "sepia"] as Theme[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        theme === t ? "border-brand bg-brand/10 text-brand" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      {t === "light" && <Sun size={12} className="inline mr-1" />}
                      {t === "dark"  && <Moon size={12} className="inline mr-1" />}
                      {THEME_STYLES[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Font Size</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFontSize(s => Math.max(14, s - 2) as FontSize)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{fontSize}px</span>
                  <button
                    onClick={() => setFontSize(s => Math.min(22, s + 2) as FontSize)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                  <Type size={14} className="text-muted-foreground ml-1" />
                </div>
              </div>

              {/* Reading stats */}
              <div className="ml-auto">
                <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Session</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span id="elapsed-timer">Loading…</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOC drawer */}
      {showToc && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowToc(false)}
        >
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-72 shadow-2xl overflow-y-auto",
              theme === "dark" ? "bg-gray-900" : "bg-white"
            )}
            onClick={e => e.stopPropagation()}
          >
            <div className={cn("flex items-center justify-between p-4 border-b", theme === "dark" ? "border-gray-700" : "border-gray-100")}>
              <h3 className="font-semibold" style={{ color: theme === "dark" ? "#f9fafb" : "#111827" }}>Table of Contents</h3>
              <button onClick={() => setShowToc(false)}>
                <X size={18} style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }} />
              </button>
            </div>
            <div className="p-4 space-y-1">
              {[
                "Chapter 1: The City That Never Sleeps",
                "Chapter 1 (continued)",
                "Chapter 1 (scene 3)",
                "Chapter 2: Roots and Routes",
                "Chapter 3: The Manuscript",
              ].map((ch, i) => (
                <button
                  key={ch}
                  onClick={() => { goTo(i + 1); setShowToc(false) }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                    currentPage === i + 1
                      ? "bg-brand/10 text-brand font-medium"
                      : theme === "dark" ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* Engagement mini-stats in TOC sidebar */}
            {user && (
              <div className={cn("mx-4 mb-4 p-3 rounded-xl border", theme === "dark" ? "border-gray-700 bg-gray-800/60" : "border-gray-100 bg-gray-50")}>
                <p className="text-xs font-semibold mb-2" style={{ color: theme === "dark" ? "#d1d5db" : "#374151" }}>
                  Your Progress
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }}>
                    <span>Pages read</span>
                    <span className="font-semibold">{currentPage} / {TOTAL_PAGES}</span>
                  </div>
                  <Progress value={(currentPage / TOTAL_PAGES) * 100} className="h-1.5" />
                  <div className="flex justify-between text-xs" style={{ color: theme === "dark" ? "#9ca3af" : "#6b7280" }}>
                    <span>Completion</span>
                    <span className="font-semibold">{((currentPage / TOTAL_PAGES) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reading area — copy/select deterrence only; does not block screenshots or recording */}
      <main className="flex-1 pt-20 pb-24 px-4">
        <ProtectedSurface
          active={accessState === "allowed"}
          userEmail={user?.email ?? null}
          watermarkVariant={theme === "dark" ? "dark" : "light"}
          outerClassName="max-w-2xl mx-auto"
          innerClassName="w-full leading-relaxed"
          innerStyle={{
            fontSize: `${fontSize}px`,
            lineHeight: 1.8,
            color: theme === "dark" ? "#e5e7eb" : theme === "sepia" ? "#44403c" : "#1f2937",
          }}
        >
          <article className="font-serif">
            <div className="whitespace-pre-wrap">{pageData.content}</div>
          </article>
        </ProtectedSurface>
      </main>

      {/* Bottom nav */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300",
          showToolbar ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full",
          theme === "dark" ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200",
          "backdrop-blur-md border-t"
        )}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => goTo(currentPage - 1)}
            className="gap-1.5"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground font-medium">
              Page {currentPage} of {MOCK_PAGES.length} (demo)
            </span>
            <Slider
              min={1} max={MOCK_PAGES.length} step={1}
              value={[currentPage]}
              onValueChange={([v]) => goTo(v)}
              className="w-28"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= MOCK_PAGES.length}
            onClick={() => goTo(currentPage + 1)}
            className="gap-1.5"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Elapsed timer (live updating) */}
      <ElapsedTimer elapsedSecRef={elapsedSecRef} theme={theme} />
    </div>
  )
}

// ── Live elapsed timer component ─────────────────────────────────────────────

function ElapsedTimer({
  elapsedSecRef,
  theme,
}: {
  elapsedSecRef: React.MutableRefObject<number>
  theme: Theme
}) {
  const [display, setDisplay] = React.useState("0:00")

  React.useEffect(() => {
    const interval = setInterval(() => {
      const s = elapsedSecRef.current
      const m = Math.floor(s / 60)
      const sec = s % 60
      setDisplay(`${m}:${String(sec).padStart(2, "0")}`)
      const el = document.getElementById("elapsed-timer")
      if (el) el.textContent = `${display} reading`
    }, 1000)
    return () => clearInterval(interval)
  }, [display, elapsedSecRef])

  return null // purely updates DOM element
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ReaderPage() {
  return (
    <Providers>
      <ReaderContent />
    </Providers>
  )
}
