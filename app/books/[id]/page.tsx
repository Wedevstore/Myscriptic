"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { booksApi, wishlistApi } from "@/lib/api"
import { syncWishlistWithServer } from "@/lib/wishlist-sync"
import { apiBookToCard, normalizeApiBookRecord, type ApiBookRecord } from "@/lib/book-mapper"
import { resolveBookSampleExcerpt } from "@/lib/book-sample-excerpts"
import type { BookCardData } from "@/components/books/book-card"
import { apiUrlConfigured, laravelAuthEnabled, laravelPhase2Enabled } from "@/lib/auth-mode"
import { addBookToCart, refreshBookInCart } from "@/lib/cart-actions"
import { wishlistStore } from "@/lib/wishlist-store"
import { WISHLIST_CHANGED } from "@/lib/wishlist-events"
import {
  BookDetailPageShell,
  BookHeroColumn,
  BookRelatedSidebar,
  BookReviewsSection,
  type BookDetailApi,
  type RelatedBook,
} from "@/components/books/book-detail-upgrade"
import { ReportButton } from "@/components/report-dialog"
import {
  Star, Heart, Share2, ShoppingCart, BookOpen, Headphones,
  Check, Users, Clock, Globe, BookMarked,
  AlertCircle, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MOCK_REVIEWS = [
  { id: "r1", user: "Amara K.", avatar: "AK", rating: 5, date: "Jan 15, 2026", comment: "Absolutely captivating! I finished it in one sitting. The characters feel so real and the writing is superb." },
  { id: "r2", user: "Tunde B.", avatar: "TB", rating: 4, date: "Dec 28, 2025", comment: "Great read overall. The plot moves at a good pace and kept me engaged throughout. Would recommend to anyone." },
  { id: "r3", user: "Fatima M.", avatar: "FM", rating: 5, date: "Dec 10, 2025", comment: "One of the best books I've read this year. The author's storytelling ability is remarkable." },
  { id: "r4", user: "Chidi O.", avatar: "CO", rating: 4, date: "Nov 22, 2025", comment: "Beautiful prose and a memorable setting. A few chapters drag slightly but the payoff is worth it." },
  { id: "r5", user: "Ngozi E.", avatar: "NE", rating: 5, date: "Oct 8, 2025", comment: "I have recommended this to my entire book club. Emotional, sharp, and impossible to put down." },
  { id: "r6", user: "Kwame A.", avatar: "KA", rating: 3, date: "Sep 1, 2025", comment: "Solid story with strong themes. I wanted a bit more depth in the secondary characters." },
] as const

const INITIAL_REVIEW_VISIBLE = 3

const BOOK_EXTRAS: Record<string, {
  description: string
  pages: number
  language: string
  publisher: string
  publishedAt: string
  isbn: string
  readCount: number
  completionRate: number
}> = {
  bk_001: {
    description: "A sweeping literary saga set across three generations of a Lagos family navigating the complex tides of modernity, tradition, and identity. Chimamanda weaves a mesmerizing tapestry of voice, ambition, and love that will linger long after the final page.",
    pages: 342,
    language: "English",
    publisher: "MyScriptic Press",
    publishedAt: "November 2025",
    isbn: "978-3-16-148410-0",
    readCount: 12400,
    completionRate: 72,
  },
  bk_016: {
    description:
      "Practical, cost-conscious guidance for shipping and running containers without overspending on cloud bills. Covers image slimming, registry choices, CI caching, and sane defaults for small teams.",
    pages: 288,
    language: "English",
    publisher: "MyScriptic Press",
    publishedAt: "January 2026",
    isbn: "978-3-16-148416-2",
    readCount: 1520,
    completionRate: 64,
  },
}

function routeBookId(params: { id?: string | string[] } | null): string {
  const raw = params?.id
  if (typeof raw === "string" && raw.length > 0) return raw
  if (Array.isArray(raw) && raw[0]) return raw[0]
  return ""
}

function cardToRelated(b: BookCardData): RelatedBook {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    coverUrl: b.coverUrl,
    accessType: b.accessType,
    rating: b.rating,
    reviewCount: b.reviewCount,
    price: b.price ?? null,
    currency: b.currency ?? null,
  }
}

function BookDetailContent() {
  const params = useParams<{ id?: string | string[] }>()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const phase2 = laravelPhase2Enabled()
  const apiWishlist = apiUrlConfigured() && laravelAuthEnabled() && isAuthenticated
  const liveBooks = apiUrlConfigured()

  const bookId = routeBookId(params)

  const [remote, setRemote] = React.useState<BookCardData | null>(null)
  const [remoteDesc, setRemoteDesc] = React.useState<string | null>(null)
  const [remoteSample, setRemoteSample] = React.useState<string | null>(null)
  const [remoteOpeningExcerpt, setRemoteOpeningExcerpt] = React.useState<string | null>(null)
  const [remoteApiRecord, setRemoteApiRecord] = React.useState<ApiBookRecord | null>(null)

  React.useEffect(() => {
    if (!bookId) return
    setRemoteSample(null)
    setRemoteOpeningExcerpt(null)
    if (!liveBooks) {
      setRemote(null)
      setRemoteDesc(null)
      setRemoteApiRecord(null)
      return
    }
    booksApi
      .get(bookId)
      .then(res => {
        const d = res.data as ApiBookRecord & { description?: string | null }
        const normalized = normalizeApiBookRecord(d)
        setRemote(apiBookToCard(d))
        setRemoteDesc(d.description ?? null)
        setRemoteSample(d.sampleExcerpt ?? null)
        setRemoteOpeningExcerpt(d.openingExcerpt ?? null)
        setRemoteApiRecord(normalized)
      })
      .catch(() => {
        setRemote(null)
        setRemoteDesc(null)
        setRemoteApiRecord(null)
      })
  }, [bookId, liveBooks])

  const book = remote ?? MOCK_BOOKS.find(b => b.id === bookId) ?? MOCK_BOOKS[0]
  const extras = BOOK_EXTRAS[book.id] ?? BOOK_EXTRAS["bk_001"]
  const descriptionText = (remoteDesc ?? extras.description).trim()
  const resolvedSample = resolveBookSampleExcerpt(book.id, remoteSample)
  const openingLine =
    (remoteOpeningExcerpt && remoteOpeningExcerpt.trim()) || resolvedSample || null

  const detailApi: BookDetailApi = {
    id: book.id,
    title: book.title,
    author: book.author,
    description: descriptionText || null,
    openingExcerpt: openingLine,
    sampleExcerpt: null,
    category: book.category,
    format: book.format,
    accessType: book.accessType,
    rating: book.rating,
    reviewCount: book.reviewCount,
    coverUrl: book.coverUrl,
    price: book.price ?? null,
    currency: book.currency ?? null,
  }

  const [wishlisted, setWishlisted] = React.useState(false)
  const [wishBusy, setWishBusy] = React.useState(false)
  const [inCart, setInCart] = React.useState(false)
  const [addedToast, setAddedToast] = React.useState(false)
  const [cartBusy, setCartBusy] = React.useState(false)
  const [shareHint, setShareHint] = React.useState(false)
  const [related, setRelated] = React.useState<BookCardData[]>([])
  const [reviewsVisible, setReviewsVisible] = React.useState(INITIAL_REVIEW_VISIBLE)

  React.useEffect(() => {
    const fb = MOCK_BOOKS.filter(b => b.category === book.category && b.id !== book.id).slice(0, 6)
    setRelated(fb)
    if (!liveBooks) return
    let cancelled = false
    booksApi
      .list({ category: book.category, per_page: "12" })
      .then(res => {
        if (cancelled) return
        const raw = res?.data
        const list = Array.isArray(raw) ? raw : []
        const rows = list.map(row => apiBookToCard(row as ApiBookRecord)).filter(b => b.id !== book.id).slice(0, 6)
        if (rows.length) setRelated(rows)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [book.id, book.category, liveBooks])

  React.useEffect(() => {
    setWishlisted(wishlistStore.has(book.id))
    const onWl = () => setWishlisted(wishlistStore.has(book.id))
    window.addEventListener(WISHLIST_CHANGED, onWl)
    return () => window.removeEventListener(WISHLIST_CHANGED, onWl)
  }, [book.id])

  React.useEffect(() => {
    if (!isAuthenticated || !apiUrlConfigured() || !laravelAuthEnabled()) return
    let cancelled = false
    syncWishlistWithServer()
      .then(() => {
        if (!cancelled) setWishlisted(wishlistStore.has(book.id))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [book.id, isAuthenticated])

  React.useEffect(() => {
    let alive = true
    refreshBookInCart(book.id).then(v => {
      if (alive) setInCart(v)
    })
    return () => {
      alive = false
    }
  }, [book.id, isAuthenticated])

  React.useEffect(() => {
    setReviewsVisible(INITIAL_REVIEW_VISIBLE)
  }, [book.id])

  const ratingBreakdown = [
    { stars: 5, pct: 68 }, { stars: 4, pct: 20 }, { stars: 3, pct: 8 },
    { stars: 2, pct: 2 }, { stars: 1, pct: 2 },
  ]

  const handleAddToCart = async () => {
    if (!book.price || cartBusy) return
    if (phase2 && !isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(`/books/${book.id}`)}`)
      return
    }
    setCartBusy(true)
    const res = await addBookToCart({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      price: book.price,
      currency: book.currency ?? "$",
      format: book.format,
    })
    setCartBusy(false)
    if (!res.ok) return
    setInCart(true)
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 2500)
  }

  const toggleWishlist = async () => {
    if (wishBusy) return
    if (apiWishlist) {
      const want = !wishlisted
      setWishBusy(true)
      try {
        if (want) {
          await wishlistApi.add(book.id)
          wishlistStore.add(book.id)
        } else {
          await wishlistApi.remove(book.id)
          wishlistStore.remove(book.id)
        }
        setWishlisted(want)
      } catch {
        /* keep prior state */
      } finally {
        setWishBusy(false)
      }
      return
    }
    const next = wishlistStore.toggle(book.id)
    setWishlisted(next)
  }

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: book.title,
          text: `Check out “${book.title}” on MyScriptic`,
          url,
        })
        return
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setShareHint(true)
        setTimeout(() => setShareHint(false), 2000)
      }
    } catch {
      /* dismissed share sheet or clipboard denied */
    }
  }

  const loadMoreReviews = () => {
    setReviewsVisible(n => Math.min(n + 3, MOCK_REVIEWS.length))
  }

  const handleReadNow = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(`/reader/${book.id}`)}`)
      return
    }
    router.push(`/reader/${book.id}`)
  }

  const handleListenNow = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(`/audio/${book.id}`)}`)
      return
    }
    router.push(`/audio/${book.id}`)
  }

  const metaRight = (
    <div className="hidden lg:grid grid-cols-2 gap-3 w-full max-w-[220px]">
      {[
        { icon: Users, label: "Readers", value: extras.readCount.toLocaleString() },
        { icon: Clock, label: remoteApiRecord?.chapterCount ? "Chapters" : "Pages", value: remoteApiRecord?.chapterCount ? String(remoteApiRecord.chapterCount) : extras.pages.toString() },
        { icon: Globe, label: "Language", value: extras.language },
        { icon: Star, label: "Rating", value: `${book.rating}/5.0` },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <s.icon size={13} className="shrink-0 text-amber-600 dark:text-amber-500" />
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{s.value}</div>
            <div className="text-[10px] text-zinc-500">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  )

  const desktopCta = (
    <div className="hidden lg:flex flex-wrap items-center gap-3">
      {book.accessType === "FREE" || (book.accessType === "SUBSCRIPTION" && user?.subscriptionPlan) ? (
        book.format === "audiobook" ? (
          <Button className="h-12 gap-2 bg-brand px-8 font-semibold text-primary-foreground hover:bg-brand-dark" onClick={handleListenNow}>
            <Headphones size={16} /> Listen Now
          </Button>
        ) : (
          <Button className="h-12 gap-2 bg-brand px-8 font-semibold text-primary-foreground hover:bg-brand-dark" onClick={handleReadNow}>
            <BookOpen size={16} /> Read Now
          </Button>
        )
      ) : book.accessType === "SUBSCRIPTION" ? (
        <Link href="/subscription">
          <Button className="h-12 gap-2 bg-brand px-8 font-semibold text-primary-foreground hover:bg-brand-dark">
            <BookMarked size={16} /> Subscribe to Read
          </Button>
        </Link>
      ) : (
        <>
          <Button
            className="h-12 gap-2 bg-brand px-8 font-semibold text-primary-foreground hover:bg-brand-dark"
            onClick={handleAddToCart}
            disabled={inCart || cartBusy}
          >
            {cartBusy ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : inCart ? <><Check size={16} /> In Cart</> : <><ShoppingCart size={16} /> Buy — {book.currency}{book.price?.toFixed(2)}</>}
          </Button>
          <Button variant="outline" className="h-12 gap-2 px-6" onClick={handleReadNow}>
            <BookOpen size={16} /> Preview
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          void toggleWishlist()
        }}
        disabled={wishBusy}
        className={cn(
          "rounded-xl border p-3 transition-all",
          wishlisted ? "border-red-400 bg-red-50 text-red-500 dark:bg-red-900/20" : "border-zinc-200 text-zinc-500 hover:border-amber-300/50 dark:border-zinc-700",
        )}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        {wishBusy ? (
          <Loader2 size={18} className="animate-spin text-zinc-400" />
        ) : (
          <Heart size={18} className={wishlisted ? "fill-red-500" : ""} />
        )}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="rounded-xl border border-zinc-200 p-3 text-zinc-500 transition-all hover:border-amber-300/50 dark:border-zinc-700"
        aria-label={shareHint ? "Link copied" : "Share this book"}
      >
        <Share2 size={18} />
      </button>
      <ReportButton targetType="book" targetId={book.id} targetTitle={book.title} />
    </div>
  )

  const coverSlot = (
    <div className="flex flex-col items-center gap-4 lg:items-start">
      <div className="relative w-full shrink-0">
        <img
          src={book.coverUrl}
          alt={`Book cover of ${book.title} by ${book.author}`}
          className="aspect-[2/3] w-full rounded-2xl object-cover shadow-2xl"
        />
        {book.isNew && (
          <Badge className="absolute left-3 top-3 bg-brand text-primary-foreground">New</Badge>
        )}
        {book.isTrending && (
          <Badge className="absolute right-3 top-3 bg-destructive text-white">Trending</Badge>
        )}
      </div>

      <div className="w-full space-y-2 lg:hidden">
        {book.accessType === "FREE" || (book.accessType === "SUBSCRIPTION" && user?.subscriptionPlan) ? (
          book.format === "audiobook" ? (
            <Button className="w-full gap-2 bg-brand font-semibold text-primary-foreground hover:bg-brand-dark" onClick={handleListenNow}>
              <Headphones size={16} /> Listen Now — Free
            </Button>
          ) : (
            <Button className="w-full gap-2 bg-brand font-semibold text-primary-foreground hover:bg-brand-dark" onClick={handleReadNow}>
              <BookOpen size={16} /> Read Now — Free
            </Button>
          )
        ) : book.accessType === "SUBSCRIPTION" ? (
          <Link href="/subscription" className="block">
            <Button className="w-full gap-2 bg-brand font-semibold text-primary-foreground hover:bg-brand-dark">
              <BookMarked size={16} /> Subscribe to Read
            </Button>
          </Link>
        ) : (
          <>
            <Button className="w-full gap-2 bg-brand font-semibold text-primary-foreground hover:bg-brand-dark" onClick={handleAddToCart} disabled={inCart || cartBusy}>
              {cartBusy ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : inCart ? <><Check size={16} /> Added to Cart</> : <><ShoppingCart size={16} /> Add to Cart — {book.currency}{book.price?.toFixed(2)}</>}
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={handleReadNow}>
              <BookOpen size={16} /> Preview
            </Button>
          </>
        )}
        <div className="pt-1">
          <ReportButton targetType="book" targetId={book.id} targetTitle={book.title} />
        </div>
      </div>
    </div>
  )

  const patchReviews = MOCK_REVIEWS.slice(0, reviewsVisible).map(r => ({
    id: r.id,
    authorName: r.user,
    authorInitials: r.avatar,
    dateLabel: r.date,
    body: r.comment,
  }))

  const metaGrid = (
    <div className="grid grid-cols-2 gap-3 border-t border-zinc-200/80 pt-6 text-sm dark:border-zinc-800 sm:grid-cols-4">
      {[
        { label: "Publisher", value: extras.publisher },
        { label: "Published", value: extras.publishedAt },
        { label: remoteApiRecord?.chapterCount ? "Chapters" : "Pages", value: remoteApiRecord?.chapterCount ? String(remoteApiRecord.chapterCount) : extras.pages.toString() },
        { label: "ISBN", value: extras.isbn },
        ...(remoteApiRecord?.fileFormat ? [{ label: "Format", value: remoteApiRecord.fileFormat.toUpperCase() }] : []),
        ...(remoteApiRecord?.fileSizeBytes ? [{ label: "File Size", value: `${(remoteApiRecord.fileSizeBytes / 1024 / 1024).toFixed(1)} MB` }] : []),
      ].map(m => (
        <div key={m.label}>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{m.label}</dt>
          <dd className="mt-0.5 text-xs font-medium text-zinc-900 dark:text-zinc-100">{m.value}</dd>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <nav className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-2 pt-0 text-sm text-muted-foreground sm:px-6" aria-label="Breadcrumb">
        <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href="/books" className="transition-colors hover:text-foreground">Books</Link>
        <span>/</span>
        <span className="max-w-[200px] truncate font-medium text-foreground">{book.title}</span>
      </nav>

      <BookDetailPageShell
        cover={coverSlot}
        hero={(
          <div className="flex min-w-0 flex-col gap-6">
            <BookHeroColumn
              book={detailApi}
              authorHref={`/authors/${book.author}`}
              userEmail={user?.email ?? null}
              metaRight={metaRight}
              cta={desktopCta}
              completionRatePct={extras.completionRate}
            />
            {metaGrid}
          </div>
        )}
        main={(
          <div className="space-y-6">
            {book.accessType === "SUBSCRIPTION" && !user?.subscriptionPlan ? (
              <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-brand" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">This book requires a subscription</p>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">Get unlimited access starting at $9.99/mo</p>
                </div>
                <Link href="/subscription" className="ml-auto shrink-0">
                  <Button size="sm" className="bg-brand text-xs text-primary-foreground hover:bg-brand-dark">Subscribe</Button>
                </Link>
              </div>
            ) : null}
            <BookReviewsSection
              rating={book.rating}
              reviewCount={book.reviewCount}
              distribution={ratingBreakdown}
              reviews={patchReviews}
              onLoadMore={reviewsVisible < MOCK_REVIEWS.length ? loadMoreReviews : undefined}
            />
          </div>
        )}
        sidebar={(
          <BookRelatedSidebar
            categoryLabel={book.category}
            books={related.length ? related.map(cardToRelated) : []}
          />
        )}
      />

      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-2xl animate-in slide-in-from-bottom-4">
          <Check size={16} />
          Added to cart!
          <Link href="/cart" className="ml-1 underline">View cart</Link>
        </div>
      )}
      {shareHint && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background shadow-2xl animate-in slide-in-from-bottom-4">
          Link copied to clipboard
        </div>
      )}
    </>
  )
}

export default function BookDetailPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 bg-background pt-16">
          <BookDetailContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
