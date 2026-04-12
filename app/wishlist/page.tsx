"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { BookCard } from "@/components/books/book-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, Search, ShoppingCart, BookOpen, Trash2, ChevronRight, Loader2 } from "lucide-react"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { allowMockCatalogFallback } from "@/lib/catalog-mode"
import type { BookCardData } from "@/components/books/book-card"
import { wishlistStore } from "@/lib/wishlist-store"
import { WISHLIST_CHANGED } from "@/lib/wishlist-events"
import { addBookToCart } from "@/lib/cart-actions"
import { apiUrlConfigured, laravelAuthEnabled, laravelPhase2Enabled } from "@/lib/auth-mode"
import { booksApi, wishlistApi } from "@/lib/api"
import { syncWishlistWithServer } from "@/lib/wishlist-sync"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"

function WishlistContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const phase2 = laravelPhase2Enabled()
  const [wishlistIds, setWishlistIds] = React.useState<string[]>([])
  const [search, setSearch] = React.useState("")
  const [addAllBusy, setAddAllBusy] = React.useState(false)

  const syncIds = React.useCallback(() => {
    setWishlistIds(wishlistStore.getIds())
  }, [])

  React.useEffect(() => {
    syncIds()
    window.addEventListener(WISHLIST_CHANGED, syncIds)
    return () => window.removeEventListener(WISHLIST_CHANGED, syncIds)
  }, [syncIds])

  React.useEffect(() => {
    if (isLoading || !isAuthenticated || !apiUrlConfigured() || !laravelAuthEnabled()) return
    let cancelled = false
    syncWishlistWithServer()
      .then(() => {
        if (!cancelled) syncIds()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isLoading, isAuthenticated, syncIds])

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent("/wishlist")}`)
    }
  }, [isLoading, isAuthenticated, router])

  const [resolvedBooks, setResolvedBooks] = React.useState<BookCardData[]>([])

  React.useEffect(() => {
    if (wishlistIds.length === 0) {
      setResolvedBooks([])
      return
    }
    const mockFb = allowMockCatalogFallback()
    const fromMock = mockFb
      ? wishlistIds.map(id => MOCK_BOOKS.find(b => b.id === id)).filter((b): b is BookCardData => b != null)
      : []

    if (mockFb && fromMock.length === wishlistIds.length) {
      setResolvedBooks(fromMock)
      return
    }

    if (!apiUrlConfigured()) {
      setResolvedBooks(fromMock)
      return
    }

    let cancelled = false
    Promise.all(
      wishlistIds.map(id =>
        booksApi.get(id).then(r => apiBookToCard(r.data as ApiBookRecord)).catch(() => null)
      )
    ).then(rows => {
      if (cancelled) return
      const merged = wishlistIds
        .map((id, i) => {
          const fromApi = rows[i]
          if (fromApi) return fromApi
          return allowMockCatalogFallback() ? (MOCK_BOOKS.find(b => b.id === id) ?? null) : null
        })
        .filter((b): b is BookCardData => b != null)
      setResolvedBooks(merged.length ? merged : fromMock)
    })
    return () => { cancelled = true }
  }, [wishlistIds])

  const wishlistBooks = resolvedBooks.length
    ? resolvedBooks
    : allowMockCatalogFallback()
      ? wishlistIds.map(id => MOCK_BOOKS.find(b => b.id === id)).filter((b): b is BookCardData => b != null)
      : []

  const filtered = wishlistBooks.filter(b =>
    !search ||
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  )

  const removeFromWishlist = async (id: string) => {
    if (apiUrlConfigured() && laravelAuthEnabled()) {
      try {
        await wishlistApi.remove(id)
      } catch {
        return
      }
    }
    wishlistStore.remove(id)
  }

  const paidBooks = wishlistBooks.filter(b => b.accessType === "PAID" && b.price)

  const totalPaid = paidBooks.reduce((sum, b) => sum + (b.price ?? 0), 0)

  const handleAddAllPaidToCart = async () => {
    if (addAllBusy || paidBooks.length === 0) return
    if (phase2 && !isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent("/wishlist")}`)
      return
    }
    setAddAllBusy(true)
    for (const b of paidBooks) {
      const res = await addBookToCart({
        bookId: b.id,
        title: b.title,
        author: b.author,
        coverUrl: b.coverUrl,
        price: b.price!,
        currency: b.currency ?? "$",
        format: b.format,
      })
      if (!res.ok) break
    }
    setAddAllBusy(false)
    router.push("/cart")
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={20} className="text-red-500 fill-red-500" />
            <h1 className="font-serif text-3xl font-bold text-foreground">My Wishlist</h1>
          </div>
          <p className="text-muted-foreground">
            {wishlistIds.length} {wishlistIds.length === 1 ? "book" : "books"} saved
          </p>
        </div>

        {paidBooks.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {paidBooks.length} paid {paidBooks.length === 1 ? "title" : "titles"} ·{" "}
              <span className="font-semibold text-foreground">${totalPaid.toFixed(2)}</span>
            </span>
            <Button
              type="button"
              className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2"
              onClick={handleAddAllPaidToCart}
              disabled={addAllBusy}
            >
              {addAllBusy ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
              Add All to Cart
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      {wishlistIds.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search wishlist..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {wishlistIds.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-red-400" />
          </div>
          <h3 className="font-serif text-xl font-bold text-foreground mb-2">Your wishlist is empty</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Save books you&apos;re interested in by clicking the heart icon on any book card.
          </p>
          <Link href="/books">
            <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
              <BookOpen size={16} /> Browse Books
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(book => (
            <div key={book.id} className="relative group">
              <BookCard book={{ ...book, isWishlisted: true }} />
              {/* Remove button overlay */}
              <button
                type="button"
                onClick={() => removeFromWishlist(book.id)}
                className="absolute top-2 left-2 p-1.5 rounded-lg bg-background/90 border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-muted-foreground"
                aria-label={`Remove ${book.title} from wishlist`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {filtered.length === 0 && search && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No wishlist items match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {wishlistIds.length > 0 && (
        <section className="mt-14" aria-label="You might also like">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-xl font-bold text-foreground">You Might Also Like</h2>
            <Link href="/discover" className="flex items-center gap-1 text-sm text-brand hover:underline">
              Discover more <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(allowMockCatalogFallback() ? MOCK_BOOKS : resolvedBooks).filter(b => !wishlistIds.includes(b.id)).slice(0, 4).map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function WishlistPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <WishlistContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
