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
import { Progress } from "@/components/ui/progress"
import { BookCard } from "@/components/books/book-card"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { booksApi, wishlistApi } from "@/lib/api"
import { syncWishlistWithServer } from "@/lib/wishlist-sync"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import { resolveBookSampleExcerpt } from "@/lib/book-sample-excerpts"
import type { BookCardData } from "@/components/books/book-card"
import { apiUrlConfigured, laravelAuthEnabled, laravelPhase2Enabled } from "@/lib/auth-mode"
import { addBookToCart, refreshBookInCart } from "@/lib/cart-actions"
import { wishlistStore } from "@/lib/wishlist-store"
import { WISHLIST_CHANGED } from "@/lib/wishlist-events"
import {
  Star, Heart, Share2, ShoppingCart, BookOpen, Headphones,
  Check, Users, Clock, Globe, BookMarked,
  AlertCircle, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProtectedSurface } from "@/components/protected-surface"

// Mock reviews
const MOCK_REVIEWS = [
  { id: "r1", user: "Amara K.", avatar: "AK", rating: 5, date: "Jan 15, 2026", comment: "Absolutely captivating! I finished it in one sitting. The characters feel so real and the writing is superb." },
  { id: "r2", user: "Tunde B.", avatar: "TB", rating: 4, date: "Dec 28, 2025", comment: "Great read overall. The plot moves at a good pace and kept me engaged throughout. Would recommend to anyone." },
  { id: "r3", user: "Fatima M.", avatar: "FM", rating: 5, date: "Dec 10, 2025", comment: "One of the best books I've read this year. The author's storytelling ability is remarkable." },
  { id: "r4", user: "Chidi O.", avatar: "CO", rating: 4, date: "Nov 22, 2025", comment: "Beautiful prose and a memorable setting. A few chapters drag slightly but the payoff is worth it." },
  { id: "r5", user: "Ngozi E.", avatar: "NE", rating: 5, date: "Oct 8, 2025", comment: "I have recommended this to my entire book club. Emotional, sharp, and impossible to put down." },
  { id: "r6", user: "Kwame A.", avatar: "KA", rating: 3, date: "Sep 1, 2025", comment: "Solid story with strong themes. I wanted a bit more depth in the secondary characters." },
] as const

type ReviewItem = (typeof MOCK_REVIEWS)[number]
const INITIAL_REVIEW_VISIBLE = 3

// Mock extended book info not on BookCardData
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
}

function StarFill({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          className={cn(
            "transition-colors",
            i <= value ? "fill-brand text-brand" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand/15 text-brand text-xs font-bold flex items-center justify-center">
            {review.avatar}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{review.user}</p>
            <p className="text-xs text-muted-foreground">{review.date}</p>
          </div>
        </div>
        <StarFill value={review.rating} />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
    </div>
  )
}

function BookDetailContent() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const { isAuthenticated, user } = useAuth()
  const phase2 = laravelPhase2Enabled()
  const apiWishlist = apiUrlConfigured() && laravelAuthEnabled() && isAuthenticated

  const [remote, setRemote] = React.useState<BookCardData | null>(null)
  const [remoteDesc, setRemoteDesc] = React.useState<string | null>(null)
  const [remoteSample, setRemoteSample] = React.useState<string | null>(null)

  React.useEffect(() => {
    const id = params?.id
    if (!id) return
    setRemoteSample(null)
    booksApi
      .get(id)
      .then(res => {
        const d = res.data as ApiBookRecord & { description?: string | null }
        setRemote(apiBookToCard(d))
        setRemoteDesc(d.description ?? null)
        setRemoteSample(d.sampleExcerpt ?? null)
      })
      .catch(() => {})
  }, [params?.id])

  const book = remote ?? MOCK_BOOKS.find(b => b.id === params.id) ?? MOCK_BOOKS[0]
  const extras = BOOK_EXTRAS[book.id] ?? BOOK_EXTRAS["bk_001"]
  const descriptionText = (remoteDesc ?? extras.description).trim()
  const openingExcerpt = resolveBookSampleExcerpt(book.id, remoteSample)

  const [wishlisted, setWishlisted] = React.useState(false)
  const [wishBusy,   setWishBusy]   = React.useState(false)
  const [inCart,     setInCart]     = React.useState(false)
  const [addedToast, setAddedToast] = React.useState(false)
  const [cartBusy,   setCartBusy]   = React.useState(false)
  const [shareHint,  setShareHint]  = React.useState(false)
  const [related,    setRelated]    = React.useState<BookCardData[]>([])
  const [reviewsVisible, setReviewsVisible] = React.useState(INITIAL_REVIEW_VISIBLE)

  React.useEffect(() => {
    const fb = MOCK_BOOKS.filter(b => b.category === book.category && b.id !== book.id).slice(0, 6)
    setRelated(fb)
    let cancelled = false
    booksApi
      .list({ category: book.category, per_page: "12" })
      .then(res => {
        if (cancelled) return
        const rows = (res.data as ApiBookRecord[]).map(apiBookToCard).filter(b => b.id !== book.id).slice(0, 6)
        if (rows.length) setRelated(rows)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [book.id, book.category])

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
    refreshBookInCart(book.id).then(v => { if (alive) setInCart(v) })
    return () => { alive = false }
  }, [book.id, isAuthenticated])

  React.useEffect(() => {
    setReviewsVisible(INITIAL_REVIEW_VISIBLE)
  }, [book.id])

  // Rating breakdown (mock)
  const ratingBreakdown = [
    { stars: 5, pct: 68 }, { stars: 4, pct: 20 }, { stars: 3, pct: 8 },
    { stars: 2, pct: 2 },  { stars: 1, pct: 2 },
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link href="/books" className="hover:text-foreground transition-colors">Books</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{book.title}</span>
      </nav>

      {/* Main book info */}
      <div className="grid lg:grid-cols-[auto_1fr] gap-10 mb-12">
        {/* Cover */}
        <div className="flex flex-col items-center lg:items-start gap-4">
          <div className="relative w-52 md:w-60 shrink-0">
            <img
              src={book.coverUrl}
              alt={`Book cover of ${book.title} by ${book.author}`}
              className="w-full aspect-[2/3] object-cover rounded-2xl shadow-2xl"
            />
            {book.isNew && (
              <Badge className="absolute top-3 left-3 bg-brand text-primary-foreground">New</Badge>
            )}
            {book.isTrending && (
              <Badge className="absolute top-3 right-3 bg-destructive text-white">Trending</Badge>
            )}
          </div>

          {/* Mobile actions */}
          <div className="lg:hidden w-full space-y-2">
            {book.accessType === "FREE" || (book.accessType === "SUBSCRIPTION" && user?.subscriptionPlan) ? (
              book.format === "audiobook" ? (
                <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2" onClick={handleListenNow}>
                  <Headphones size={16} /> Listen Now — Free
                </Button>
              ) : (
                <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2" onClick={handleReadNow}>
                  <BookOpen size={16} /> Read Now — Free
                </Button>
              )
            ) : book.accessType === "SUBSCRIPTION" ? (
              <Link href="/subscription" className="block">
                <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
                  <BookMarked size={16} /> Subscribe to Read
                </Button>
              </Link>
            ) : (
              <>
                <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2" onClick={handleAddToCart} disabled={inCart || cartBusy}>
                  {cartBusy ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : inCart ? <><Check size={16} /> Added to Cart</> : <><ShoppingCart size={16} /> Add to Cart — {book.currency}{book.price?.toFixed(2)}</>}
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={handleReadNow}>
                  <BookOpen size={16} /> Preview
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="hidden lg:grid grid-cols-2 gap-3 w-60">
            {[
              { icon: Users,  label: "Readers", value: extras.readCount.toLocaleString() },
              { icon: Clock,  label: "Pages",   value: extras.pages.toString() },
              { icon: Globe,  label: "Language", value: extras.language },
              { icon: Star,   label: "Rating",   value: `${book.rating}/5.0` },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 bg-muted/60 rounded-lg p-2.5">
                <s.icon size={13} className="text-brand shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{book.category}</Badge>
              <Badge variant="secondary" className="text-xs capitalize">{book.format}</Badge>
              {book.accessType === "FREE" && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs border-0">Free</Badge>}
              {book.accessType === "SUBSCRIPTION" && <Badge className="bg-brand/10 text-brand text-xs border-0">Unlimited Plan</Badge>}
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight mb-2">
              {book.title}
            </h1>
            <p className="text-muted-foreground text-base">
              by <Link href={`/authors/${book.author}`} className="text-foreground hover:text-brand font-medium transition-colors">{book.author}</Link>
            </p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <StarFill value={Math.round(book.rating)} />
              <span className="text-lg font-bold text-foreground">{book.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">({book.reviewCount.toLocaleString()} ratings)</span>
            <span className="text-sm text-muted-foreground">· {extras.completionRate}% completion rate</span>
          </div>

          {/* Marketing copy — shareable; not a substitute for protecting body text */}
          <p className="text-muted-foreground leading-relaxed text-[15px]">{descriptionText}</p>

          {openingExcerpt ? (
            <section className="mt-6" aria-labelledby="opening-excerpt-heading">
              <h2
                id="opening-excerpt-heading"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3"
              >
                Opening excerpt
              </h2>
              <ProtectedSurface
                userEmail={user?.email ?? null}
                outerClassName="block rounded-xl border border-border bg-muted/25 p-4 sm:p-5"
              >
                <p className="text-[15px] sm:text-base leading-relaxed text-foreground font-serif whitespace-pre-wrap m-0">
                  {openingExcerpt}
                </p>
              </ProtectedSurface>
            </section>
          ) : null}

          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Publisher", value: extras.publisher },
              { label: "Published",  value: extras.publishedAt },
              { label: "Pages",      value: extras.pages.toString() },
              { label: "ISBN",       value: extras.isbn },
            ].map(m => (
              <div key={m.label}>
                <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.label}</dt>
                <dd className="font-medium text-foreground text-xs mt-0.5">{m.value}</dd>
              </div>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex flex-wrap items-center gap-3 pt-2">
            {book.accessType === "FREE" || (book.accessType === "SUBSCRIPTION" && user?.subscriptionPlan) ? (
              book.format === "audiobook" ? (
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8 gap-2" onClick={handleListenNow}>
                  <Headphones size={16} /> Listen Now
                </Button>
              ) : (
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8 gap-2" onClick={handleReadNow}>
                  <BookOpen size={16} /> Read Now
                </Button>
              )
            ) : book.accessType === "SUBSCRIPTION" ? (
              <Link href="/subscription">
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8 gap-2">
                  <BookMarked size={16} /> Subscribe to Read
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8 gap-2"
                  onClick={handleAddToCart}
                  disabled={inCart || cartBusy}
                >
                  {cartBusy ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : inCart ? <><Check size={16} /> In Cart</> : <><ShoppingCart size={16} /> Buy — {book.currency}{book.price?.toFixed(2)}</>}
                </Button>
                <Button variant="outline" className="h-12 px-6 gap-2" onClick={handleReadNow}>
                  <BookOpen size={16} /> Preview
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => { void toggleWishlist() }}
              disabled={wishBusy}
              className={cn(
                "p-3 rounded-xl border transition-all",
                wishlisted ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-500" : "border-border hover:border-brand/30 text-muted-foreground"
              )}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              {wishBusy ? (
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              ) : (
                <Heart size={18} className={wishlisted ? "fill-red-500" : ""} />
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="p-3 rounded-xl border border-border hover:border-brand/30 text-muted-foreground transition-all"
              aria-label={shareHint ? "Link copied" : "Share this book"}
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* Subscription upsell */}
          {book.accessType === "SUBSCRIPTION" && !user?.subscriptionPlan && (
            <div className="flex items-start gap-3 p-4 bg-brand/5 border border-brand/20 rounded-xl">
              <AlertCircle size={16} className="text-brand shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">This book requires a subscription</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get unlimited access starting at $9.99/mo</p>
              </div>
              <Link href="/subscription" className="ml-auto shrink-0">
                <Button size="sm" className="bg-brand hover:bg-brand-dark text-primary-foreground text-xs">Subscribe</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Reviews */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-5">Reader Reviews</h2>

            {/* Rating summary */}
            <div className="bg-card border border-border rounded-xl p-5 mb-5 flex gap-6 items-center">
              <div className="text-center shrink-0">
                <div className="text-5xl font-bold font-serif text-foreground">{book.rating.toFixed(1)}</div>
                <StarFill value={Math.round(book.rating)} />
                <div className="text-xs text-muted-foreground mt-1">{book.reviewCount.toLocaleString()} ratings</div>
              </div>
              <div className="flex-1 space-y-1.5">
                {ratingBreakdown.map(r => (
                  <div key={r.stars} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 text-right">{r.stars}</span>
                    <Star size={10} className="fill-brand text-brand shrink-0" />
                    <Progress value={r.pct} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground w-7">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review list */}
            <div className="space-y-4">
              {MOCK_REVIEWS.slice(0, reviewsVisible).map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 hover:border-brand hover:text-brand"
              type="button"
              onClick={loadMoreReviews}
              disabled={reviewsVisible >= MOCK_REVIEWS.length}
            >
              {reviewsVisible >= MOCK_REVIEWS.length ? "All reviews shown" : "Load More Reviews"}
            </Button>
          </div>
        </div>

        {/* Sidebar: Related */}
        <div>
          <h3 className="font-serif text-lg font-bold text-foreground mb-4">More in {book.category}</h3>
          <div className="space-y-3">
            {related.length === 0 ? (
              <p className="text-sm text-muted-foreground">More titles in this category will appear here.</p>
            ) : (
              related.map(b => <BookCard key={b.id} book={b} variant="horizontal" />)
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium z-50 animate-in slide-in-from-bottom-4">
          <Check size={16} />
          Added to cart!
          <Link href="/cart" className="underline ml-1">View cart</Link>
        </div>
      )}
      {shareHint && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background px-5 py-3 rounded-xl shadow-2xl text-sm font-medium z-50 animate-in slide-in-from-bottom-4">
          Link copied to clipboard
        </div>
      )}
    </div>
  )
}

export default function BookDetailPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <BookDetailContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
