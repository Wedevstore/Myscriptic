"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { BookCard, type BookCardData } from "@/components/books/book-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MOCK_BOOKS, CATEGORIES, TRENDING_AUTHORS } from "@/lib/mock-data"
import { booksApi, storeApi } from "@/lib/api"
import { apiBookToCard } from "@/lib/book-mapper"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { allowMockCatalogFallback } from "@/lib/catalog-mode"
import {
  TrendingUp, Sparkles, Flame, BookOpen, Headphones,
  Star, Users, ArrowRight, Globe, Award, Zap, GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CoverImage } from "@/components/ui/cover-image"
import {
  mergeLegacyDiscoverAuthorFollows,
  loadAuthorFollowIdsFromStorage,
  saveAuthorFollowIdsToStorage,
  ensureSignedInForAuthorFollow,
} from "@/lib/author-follows-client"
import { useAuth } from "@/components/providers/auth-provider"

const GENRE_SPOTLIGHTS_BASE = [
  {
    id: "spotlight_1",
    genre: "African Literature",
    description: "Celebrating voices shaping the modern African narrative",
    books: MOCK_BOOKS.slice(0, 4),
    bg: "from-amber-900 to-amber-700",
    icon: Globe,
  },
  {
    id: "spotlight_2",
    genre: "Business & Finance",
    description: "Essential reads for the modern entrepreneur",
    books: MOCK_BOOKS.slice(3, 7),
    bg: "from-blue-900 to-blue-700",
    icon: Award,
  },
  {
    id: "spotlight_3",
    genre: "Self-Help",
    description: "Level up your mindset and productivity",
    books: MOCK_BOOKS.slice(1, 5),
    bg: "from-green-900 to-green-700",
    icon: Zap,
  },
]

type SpotlightSection = (typeof GENRE_SPOTLIGHTS_BASE)[number]

function mapBookRows(rows: unknown[]): BookCardData[] {
  return rows.map(r => apiBookToCard(r))
}

const EMPTY_DISCOVER_TABS = {
  trending: [] as BookCardData[],
  new: [] as BookCardData[],
  free: [] as BookCardData[],
  audio: [] as BookCardData[],
}

function emptySpotlights(): SpotlightSection[] {
  return GENRE_SPOTLIGHTS_BASE.map(s => ({ ...s, books: [] as BookCardData[] }))
}

const READING_CHALLENGES = [
  { id: "rc1", title: "30-Day Reading Challenge", description: "Read 1 book per day for 30 days", participants: 4820, badge: "Trailblazer" },
  { id: "rc2", title: "African Authors Month", description: "Read 5 books by African authors", participants: 12300, badge: "Diaspora Reader" },
  { id: "rc3", title: "Genre Explorer", description: "Complete 1 book in 6 different genres", participants: 7410, badge: "Genre Master" },
]

const LS_DISCOVER_JOINED = "myscriptic_discover_joined"

function loadDiscoverFlags(key: string): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const o = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(o).filter(([, v]) => v === true).map(([k]) => [k, true])
    )
  } catch {
    return {}
  }
}

function saveDiscoverFlags(key: string, flags: Record<string, boolean>) {
  try {
    localStorage.setItem(key, JSON.stringify(flags))
  } catch {
    /* ignore */
  }
}

const STAFF_PICKS_MOCK = MOCK_BOOKS.filter(b => b.rating >= 4.6).slice(0, 3)

type TickerItem = { title: string; href: string }

function TrendingTicker({ items }: { items: TickerItem[] }) {
  const list: TickerItem[] =
    items.length > 0
      ? items
      : [{ title: "Discover trending books on MyScriptic", href: "/books" }]
  const summary = list.map(i => i.title).join(", ")

  const titleRow = (keyPrefix: string) =>
    list.map((item, i) => (
      <span key={`${keyPrefix}-${item.href}-${i}`} className="inline-flex shrink-0 items-center gap-2">
        <Link
          href={item.href}
          className="text-sm text-foreground/70 hover:text-brand focus-visible:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm transition-colors"
        >
          {item.title}
        </Link>
        <span className="text-brand/40 select-none" aria-hidden>
          ·
        </span>
      </span>
    ))

  return (
    <div
      role="region"
      aria-label={`Trending: ${summary}`}
      className="bg-brand/10 border-y border-brand/20 py-2.5 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 max-w-7xl mx-auto">
        <div
          className="flex items-center gap-1.5 bg-brand text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shrink-0"
          aria-hidden
        >
          <Flame size={11} aria-hidden />
          Trending
        </div>
        <div className="relative min-w-0 flex-1 trending-marquee-fade py-0.5">
          <div className="overflow-hidden motion-reduce:hidden">
            <div className="trending-marquee-track items-center gap-6">
              {titleRow("m1")}
              {titleRow("m2")}
            </div>
          </div>
          <div className="hidden motion-reduce:flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {list.map((item, i) => (
              <span key={`static-${item.href}-${i}`} className="inline-flex items-center gap-2">
                <Link
                  href={item.href}
                  className="text-foreground/70 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-colors"
                >
                  {item.title}
                </Link>
                {i < list.length - 1 ? (
                  <span className="text-brand/40 mx-1.5 select-none" aria-hidden>
                    ·
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GenreSpotlight({ spotlight }: { spotlight: SpotlightSection }) {
  return (
    <section className="mb-12">
      <div className={cn("relative rounded-3xl overflow-hidden bg-gradient-to-br p-8 mb-6", spotlight.bg)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <spotlight.icon size={18} className="text-white/80" />
              <Badge className="bg-white/20 text-white border-0 text-xs">Spotlight</Badge>
            </div>
            <h2 className="font-serif text-3xl font-bold text-white mb-2">{spotlight.genre}</h2>
            <p className="text-white/70 text-sm max-w-sm">{spotlight.description}</p>
          </div>
          <Link href={`/books?category=${spotlight.genre}`}>
            <Button className="bg-white/20 hover:bg-white/30 text-white border-0 gap-2 shrink-0 font-semibold">
              See All <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {spotlight.books.map(book => <BookCard key={book.id} book={book} />)}
      </div>
    </section>
  )
}

const MOCK_TAB_BOOKS = {
  trending: MOCK_BOOKS.filter(b => b.isTrending),
  new: MOCK_BOOKS.filter(b => b.isNew),
  free: MOCK_BOOKS.filter(b => b.accessType === "FREE"),
  audio: MOCK_BOOKS.filter(b => b.format === "audiobook"),
}

async function fetchDiscoverLive(): Promise<{
  tabBooks: typeof MOCK_TAB_BOOKS
  staffPicks: BookCardData[]
  tickerItems: TickerItem[]
  spotlights: SpotlightSection[]
}> {
  const [featRes, freeRes, wideRes] = await Promise.all([
    storeApi.featured(),
    booksApi.list({ per_page: "24", access_type: "FREE" }),
    booksApi.list({ per_page: "48" }),
  ])

  const featured = mapBookRows((featRes.data as unknown[]) ?? [])
  const freeList = mapBookRows((freeRes.data as unknown[]) ?? [])
  const wide = mapBookRows((wideRes.data as unknown[]) ?? [])

  const trending = featured.filter(b => b.isTrending)
  const newest = featured.filter(b => b.isNew)
  const audio = wide.filter(b => b.format === "audiobook")

  const tabBooks = {
    trending: trending.length ? trending : featured.slice(0, 18),
    new: newest.length ? newest : featured.slice(0, 18),
    free: freeList.slice(0, 18),
    audio: audio.slice(0, 18),
  }

  const sortedByRating = [...featured].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  )
  const staffPicks =
    sortedByRating.filter(b => (b.rating ?? 0) >= 4).slice(0, 3).length >= 3
      ? sortedByRating.filter(b => (b.rating ?? 0) >= 4).slice(0, 3)
      : featured.slice(0, 3)

  const trendingForTicker = featured.filter(b => b.isTrending)
  const tickerSource = trendingForTicker.length > 0 ? trendingForTicker : featured
  const tickerItems: TickerItem[] = tickerSource.map(b => ({
    title: b.title,
    href: `/books/${b.id}`,
  }))

  const spotlights: SpotlightSection[] = GENRE_SPOTLIGHTS_BASE.map((s, i) => {
    const slice = featured.slice(i * 4, i * 4 + 4)
    return {
      ...s,
      books: slice.length >= 4 ? slice : s.books,
    }
  })

  return { tabBooks, staffPicks, tickerItems, spotlights }
}

function DiscoverContent() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = React.useState<"trending" | "new" | "free" | "audio">("trending")
  const [joinedChallenges, setJoinedChallenges] = React.useState<Record<string, boolean>>({})
  const [followAuthorIds, setFollowAuthorIds] = React.useState<Set<string>>(() => new Set())
  const [live, setLive] = React.useState<null | Awaited<ReturnType<typeof fetchDiscoverLive>>>(null)
  const [liveReady, setLiveReady] = React.useState(() => !apiUrlConfigured())
  const [liveCats, setLiveCats] = React.useState<{ label: string; count: number | null }[] | null>(null)

  React.useEffect(() => {
    mergeLegacyDiscoverAuthorFollows()
    setJoinedChallenges(loadDiscoverFlags(LS_DISCOVER_JOINED))
  }, [])

  React.useEffect(() => {
    if (!isAuthenticated) {
      setFollowAuthorIds(new Set())
      return
    }
    setFollowAuthorIds(loadAuthorFollowIdsFromStorage())
  }, [isAuthenticated])

  React.useEffect(() => {
    if (!apiUrlConfigured()) return
    let cancelled = false
    setLiveReady(false)
    fetchDiscoverLive()
      .then(data => {
        if (!cancelled) setLive(data)
      })
      .catch(() => {
        if (!cancelled) setLive(null)
      })
      .finally(() => {
        if (!cancelled) setLiveReady(true)
      })
    booksApi.categories().then(res => {
      if (cancelled || !res.data?.length) return
      setLiveCats(res.data.map(c => {
        if (typeof c === "string") return { label: c, count: null }
        return { label: c.name, count: c.count ?? c.book_count ?? null }
      }))
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const mockFb = allowMockCatalogFallback()
  const tabBooks = live?.tabBooks ?? (mockFb ? MOCK_TAB_BOOKS : EMPTY_DISCOVER_TABS)
  const staffPicks = live?.staffPicks ?? (mockFb ? STAFF_PICKS_MOCK : [])
  const tickerItems: TickerItem[] =
    live?.tickerItems?.length
      ? live.tickerItems
      : mockFb
        ? MOCK_BOOKS.filter(b => b.isTrending).map(b => ({
            title: b.title,
            href: `/books/${b.id}`,
          }))
        : []
  const genreSpotlights = live?.spotlights ?? (mockFb ? GENRE_SPOTLIGHTS_BASE : emptySpotlights())

  if (apiUrlConfigured() && !liveReady) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <TrendingTicker items={tickerItems} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-brand" />
            <span className="text-sm font-semibold text-brand uppercase tracking-wider">Discover</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground text-pretty">
            Find Your Next<br />Favourite Read
          </h1>
          <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
            Curated picks, community favourites, and fresh discoveries — all in one place.
          </p>
        </div>

        {/* Quick category filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {(liveCats ?? CATEGORIES.map(c => ({ label: c.label, count: c.count as number | null }))).map(cat => (
            <Link
              key={cat.label}
              href={`/books?category=${encodeURIComponent(cat.label)}`}
              className={cn(
                "px-4 py-2 rounded-full border text-sm font-medium transition-all hover:border-brand hover:text-brand",
                "border-border text-muted-foreground"
              )}
            >
              {cat.label}
              {cat.count != null && (
                <span className="ml-1.5 text-xs text-muted-foreground/60">
                  {cat.count >= 1000 ? `${(cat.count / 1000).toFixed(1)}k` : cat.count}
                </span>
              )}
            </Link>
          ))}
        </div>

        <section className="mb-10 rounded-2xl border border-brand/25 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
              <GraduationCap className="h-6 w-6 text-brand" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-bold text-foreground">Learn from authors</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Browse video courses with lessons streamed from YouTube or Vimeo — no uploads on MyScriptic.
              </p>
            </div>
          </div>
          <Button asChild className="bg-brand hover:bg-brand-dark text-primary-foreground shrink-0 gap-2">
            <Link href="/courses">
              Explore courses <ArrowRight size={14} />
            </Link>
          </Button>
        </section>

        {/* Tabs: Trending / New / Free / Audio */}
        <div className="mb-8">
          <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit mb-6">
            {([
              { key: "trending", label: "Trending", icon: TrendingUp },
              { key: "new",      label: "New Arrivals", icon: Sparkles },
              { key: "free",     label: "Free Reads", icon: BookOpen },
              { key: "audio",    label: "Audiobooks", icon: Headphones },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {tabBooks[activeTab].map(book => <BookCard key={book.id} book={book} />)}
            {tabBooks[activeTab].length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p>No books in this category yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Staff picks */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-brand fill-brand" />
              <h2 className="font-serif text-2xl font-bold text-foreground">Staff Picks</h2>
            </div>
            <Link href="/books?sort=rating" className="text-sm text-brand hover:underline flex items-center gap-1">
              See all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {staffPicks.map((book, i) => (
              <div key={book.id} className={cn(
                "relative flex gap-4 p-5 rounded-2xl border transition-all hover:border-brand/30",
                i === 0 ? "bg-brand/5 border-brand/20" : "bg-card border-border"
              )}>
                {i === 0 && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-brand text-primary-foreground text-[10px] gap-1">
                      <Award size={9} /> Editor&apos;s Choice
                    </Badge>
                  </div>
                )}
                <Link href={`/books/${book.id}`} className="relative block shrink-0 w-16 h-24 overflow-hidden rounded-lg shadow bg-muted">
                  <CoverImage
                    src={book.coverUrl}
                    alt={`Cover of ${book.title}`}
                    sizes="64px"
                    className="rounded-lg"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/books/${book.id}`}>
                    <h3 className="font-semibold text-sm text-foreground hover:text-brand transition-colors line-clamp-2 mb-1">{book.title}</h3>
                  </Link>
                  <p className="text-xs text-muted-foreground mb-2">{book.author}</p>
                  <div className="flex items-center gap-1 mb-3">
                    <Star size={11} className="fill-brand text-brand" />
                    <span className="text-xs font-medium">{(book.rating ?? 0).toFixed(1)}</span>
                  </div>
                  <Link href={`/books/${book.id}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs hover:border-brand hover:text-brand gap-1">
                      <BookOpen size={11} /> Read
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Genre spotlights */}
        {genreSpotlights.map(s => <GenreSpotlight key={s.id} spotlight={s} />)}

        {/* Reading Challenges */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <Award size={18} className="text-brand" />
            <h2 className="font-serif text-2xl font-bold text-foreground">Reading Challenges</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {READING_CHALLENGES.map(ch => (
              <div key={ch.id} className="bg-card border border-border rounded-2xl p-5 hover:border-brand/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                    <Award size={18} className="text-brand" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{ch.badge}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{ch.title}</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{ch.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users size={12} />
                    {ch.participants.toLocaleString()} joined
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={joinedChallenges[ch.id] ? "secondary" : "outline"}
                    className="h-7 text-xs group-hover:border-brand group-hover:text-brand transition-colors"
                    disabled={joinedChallenges[ch.id]}
                    onClick={() => {
                      setJoinedChallenges(j => {
                        const next = { ...j, [ch.id]: true }
                        saveDiscoverFlags(LS_DISCOVER_JOINED, next)
                        return next
                      })
                    }}
                  >
                    {joinedChallenges[ch.id] ? "Joined" : "Join"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Authors */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-brand" />
              <h2 className="font-serif text-2xl font-bold text-foreground">Featured Authors</h2>
            </div>
            <Link href="/authors" className="text-sm text-brand hover:underline flex items-center gap-1">
              All authors <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRENDING_AUTHORS.map(a => (
              <div
                key={a.id}
                className="bg-card border border-border rounded-2xl p-5 text-center hover:border-brand/30 hover:shadow-md transition-all group"
              >
                <Link href={`/authors/${a.id}`} className="block">
                  <img
                    src={a.avatar}
                    alt={`Portrait of author ${a.name}`}
                    className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-border group-hover:border-brand transition-colors"
                  />
                  <p className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors">{a.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.books} books</p>
                  <p className="text-xs text-brand font-medium mt-1">{(a.followers / 1000).toFixed(1)}k followers</p>
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant={followAuthorIds.has(a.id) ? "secondary" : "outline"}
                  className="mt-3 h-7 text-xs w-full group-hover:border-brand group-hover:text-brand transition-colors"
                  aria-pressed={followAuthorIds.has(a.id)}
                  onClick={() => {
                    if (!ensureSignedInForAuthorFollow(router, isAuthenticated, "/discover")) return
                    setFollowAuthorIds(prev => {
                      const next = new Set(prev)
                      if (next.has(a.id)) next.delete(a.id)
                      else next.add(a.id)
                      saveAuthorFollowIdsToStorage(next)
                      return next
                    })
                  }}
                >
                  {followAuthorIds.has(a.id) ? "Following" : "Follow"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <DiscoverContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
