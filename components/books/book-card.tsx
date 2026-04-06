"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Headphones, BookOpen, Heart, ShoppingCart, Play, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CoverImage } from "@/components/ui/cover-image"
import { apiUrlConfigured, laravelAuthEnabled, laravelPhase2Enabled } from "@/lib/auth-mode"
import { wishlistApi } from "@/lib/api"
import { addBookToCart } from "@/lib/cart-actions"
import { wishlistStore } from "@/lib/wishlist-store"
import { WISHLIST_CHANGED } from "@/lib/wishlist-events"

export type AccessType = "FREE" | "PAID" | "SUBSCRIPTION"
export type BookFormat = "ebook" | "audiobook" | "magazine"

export interface BookCardData {
  id: string
  title: string
  author: string
  coverUrl: string
  rating: number
  reviewCount: number
  price?: number
  currency?: string
  accessType: AccessType
  format: BookFormat
  category: string
  isNew?: boolean
  isTrending?: boolean
  isWishlisted?: boolean
}

interface BookCardProps {
  book: BookCardData
  variant?: "default" | "horizontal" | "compact"
  className?: string
}

const ACCESS_BADGE: Record<AccessType, { label: string; className: string }> = {
  FREE:         { label: "Free",      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0" },
  SUBSCRIPTION: { label: "Unlimited", className: "bg-brand/12 text-brand border-brand/25" },
  PAID:         { label: "Buy",       className: "bg-muted text-muted-foreground border-0" },
}

function StarRating({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star size={11} className="fill-brand text-brand shrink-0" />
      <span className="text-xs font-semibold text-foreground tabular-nums">{value.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count.toLocaleString()})</span>
    </div>
  )
}

// ── Horizontal variant ─────────────────────────────────────────────────────────
function HorizontalCard({ book }: { book: BookCardData }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const phase2 = laravelPhase2Enabled()
  const [buyBusy, setBuyBusy] = React.useState(false)
  const badge = ACCESS_BADGE[book.accessType]

  const handleAddPaid = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!book.price || book.accessType !== "PAID" || buyBusy) return
    if (phase2 && !isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(`/books/${book.id}`)}`)
      return
    }
    setBuyBusy(true)
    await addBookToCart({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      price: book.price,
      currency: book.currency ?? "$",
      format: book.format,
    })
    setBuyBusy(false)
  }

  return (
    <div className="flex gap-4 p-3.5 rounded-xl border border-border bg-card hover:border-brand/30 hover:shadow-md transition-all duration-200 group card-lift">
      <Link href={`/books/${book.id}`} className="shrink-0">
        <div className="w-16 h-24 rounded-lg overflow-hidden shadow-sm relative">
          <CoverImage
            src={book.coverUrl}
            alt={`Book cover of ${book.title}`}
            sizes="64px"
            className="group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/books/${book.id}`}>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
          </Link>
          <Badge className={cn("text-[10px] px-2 py-0.5 rounded-md shrink-0 font-medium", badge.className)}>
            {badge.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{book.author}</p>
        <StarRating value={book.rating} count={book.reviewCount} />
        {book.accessType === "PAID" && book.price && (
          <div className="flex items-center justify-between gap-2 mt-auto">
            <p className="text-sm font-bold text-brand">
              {book.currency ?? "$"}{book.price.toFixed(2)}
            </p>
            <button
              type="button"
              onClick={handleAddPaid}
              disabled={buyBusy}
              className="p-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand hover:text-primary-foreground transition-colors disabled:opacity-50"
              aria-label={`Add ${book.title} to cart`}
            >
              {buyBusy ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Compact variant ────────────────────────────────────────────────────────────
function CompactCard({ book }: { book: BookCardData }) {
  return (
    <Link href={`/books/${book.id}`} className="block group">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-sm ring-1 ring-border/50">
        <CoverImage
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          className="group-hover:scale-105 transition-transform duration-350"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-2 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="inline-flex items-center gap-1 bg-brand text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full shadow">
            <Play size={8} fill="currentColor" /> Read
          </span>
        </div>
      </div>
      <div className="mt-2.5 px-0.5">
        <p className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-1 leading-snug">{book.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{book.author}</p>
      </div>
    </Link>
  )
}

// ── Default card ───────────────────────────────────────────────────────────────
function DefaultCard({ book, className }: { book: BookCardData; className?: string }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const apiWishlist = apiUrlConfigured() && laravelAuthEnabled() && isAuthenticated
  const phase2 = laravelPhase2Enabled()
  const [wishlisted, setWishlisted] = React.useState(false)
  const [wishBusy, setWishBusy] = React.useState(false)
  const [buyBusy, setBuyBusy] = React.useState(false)
  const [justAdded, setJustAdded] = React.useState(false)
  const badge = ACCESS_BADGE[book.accessType]

  React.useEffect(() => {
    setWishlisted(wishlistStore.has(book.id))
    const onWl = () => setWishlisted(wishlistStore.has(book.id))
    window.addEventListener(WISHLIST_CHANGED, onWl)
    return () => window.removeEventListener(WISHLIST_CHANGED, onWl)
  }, [book.id])

  const onWishClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

  const onBuy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!book.price || buyBusy) return
    if (phase2 && !isAuthenticated) {
      const next =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search || ""}`
          : "/books"
      router.push(`/auth/login?next=${encodeURIComponent(next)}`)
      return
    }
    setBuyBusy(true)
    const res = await addBookToCart({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      price: book.price,
      currency: book.currency ?? "$",
      format: book.format,
    })
    setBuyBusy(false)
    if (!res.ok) return
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 2000)
  }

  return (
    <div className={cn("book-card flex flex-col rounded-2xl border border-border bg-card overflow-hidden", className)}>
      {/* Cover */}
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        <Link href={`/books/${book.id}`} className="absolute inset-0 block" tabIndex={-1} aria-hidden>
          <CoverImage
            src={book.coverUrl}
            alt={`Book cover of ${book.title} by ${book.author}`}
            className="hover:scale-105 transition-transform duration-500"
          />
          {/* Cover sheen */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        </Link>

        {/* Top-left badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 pointer-events-none">
          {book.isNew && (
            <Badge className="bg-brand text-primary-foreground text-[10px] px-2 py-0.5 font-bold shadow-sm">New</Badge>
          )}
          {book.isTrending && !book.isNew && (
            <Badge className="bg-red-500 text-white text-[10px] px-2 py-0.5 font-bold shadow-sm">Hot</Badge>
          )}
          <Badge className={cn("text-[10px] px-2 py-0.5 font-medium shadow-sm", badge.className)}>
            {badge.label}
          </Badge>
        </div>

        {/* Format chip — top right */}
        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/45 backdrop-blur-sm flex items-center justify-center text-white shadow-sm">
          {book.format === "audiobook" ? <Headphones size={13} /> : <BookOpen size={13} />}
        </div>

        {/* Wishlist — bottom right */}
        <button
          type="button"
          onClick={onWishClick}
          className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/45 backdrop-blur-sm hover:bg-black/65 flex items-center justify-center transition-colors group/wish"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={13}
            className={cn(
              "transition-all duration-200",
              wishlisted
                ? "fill-red-500 text-red-500 scale-110"
                : "text-white group-hover/wish:text-red-400"
            )}
          />
        </button>

        {/* Hover overlay with read button */}
        <Link href={`/books/${book.id}`}>
          <div className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 bg-white/95 text-foreground text-xs font-semibold px-4 py-2 rounded-full shadow-lg transform scale-95 hover:scale-100 transition-transform">
              <BookOpen size={12} /> View Book
            </span>
          </div>
        </Link>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div>
          <Link href={`/books/${book.id}`}>
            <h3 className="font-semibold text-sm text-foreground hover:text-brand transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
        </div>

        <div className="flex items-center justify-between gap-1">
          <StarRating value={book.rating} count={book.reviewCount} />
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md truncate max-w-[70px]">
            {book.category}
          </span>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-2.5 border-t border-border/60">
          {book.accessType === "FREE" ? (
            <Link href={`/reader/${book.id}`}>
              <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all font-medium">
                <BookOpen size={12} /> Read Free
              </Button>
            </Link>
          ) : book.accessType === "SUBSCRIPTION" ? (
            <Link href={`/reader/${book.id}`}>
              <Button size="sm" className="w-full h-8 text-xs gap-1.5 bg-brand/10 text-brand hover:bg-brand hover:text-primary-foreground border border-brand/25 hover:border-transparent transition-all font-medium">
                <BookOpen size={12} /> Read with Plan
              </Button>
            </Link>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-base font-bold text-brand font-serif">
                  {book.currency ?? "$"}{book.price?.toFixed(2) ?? "0.00"}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-brand hover:bg-brand-dark text-primary-foreground shadow-sm hover:shadow-brand/30 transition-all font-medium"
                onClick={onBuy}
                disabled={buyBusy || justAdded}
              >
                {buyBusy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : justAdded ? (
                  <Check size={12} />
                ) : (
                  <ShoppingCart size={12} />
                )}
                {justAdded ? "Added" : "Buy"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Public export ──────────────────────────────────────────────────────────────
export function BookCard({ book, variant = "default", className }: BookCardProps) {
  if (variant === "horizontal") return <HorizontalCard book={book} />
  if (variant === "compact")   return <CompactCard book={book} />
  return <DefaultCard book={book} className={className} />
}
