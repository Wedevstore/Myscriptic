"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Slider,
} from "@/components/ui/slider"
import { useAuth } from "@/components/providers/auth-provider"
import { cartStore } from "@/lib/cart-store"
import { addBookToCart } from "@/lib/cart-actions"
import { apiUrlConfigured, laravelPhase2Enabled } from "@/lib/auth-mode"
import { allowMockCatalogFallback } from "@/lib/catalog-mode"
import { cartApi, storeApi } from "@/lib/api"
import { seedStore, CURRENCY_SYMBOLS } from "@/lib/store"
import { MOCK_BOOKS } from "@/lib/mock-data"
import {
  ShoppingCart, Search, Filter, Star, BookOpen, Headphones,
  Tag, TrendingUp, Zap, SlidersHorizontal, Check, X,
  ChevronRight, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { demoPic } from "@/lib/demo-images"
import { AdInFeed } from "@/components/ads/ad-in-feed"

// ── Paid books catalog ────────────────────────────────────────────────────────
const PAID_BOOKS = MOCK_BOOKS.filter(b => b.accessType === "PAID").map(b => ({
  ...b,
  originalPrice: b.price ? parseFloat((b.price * 1.3).toFixed(2)) : undefined,
  discount: [25, 20, 15, 10, 0][Math.floor(Math.random() * 5)],
  soldCount: Math.floor(Math.random() * 2000) + 100,
  category: b.category,
}))

// Extend with more paid books for a richer store
const EXTENDED_STORE: typeof PAID_BOOKS = [
  ...PAID_BOOKS,
  {
    id: "bk_p_001", title: "The Art of Digital Marketing", author: "Funmi Adebayo",
    coverUrl: demoPic("store-ext-digital-mkt"),
    rating: 4.6, reviewCount: 890, price: 16.99, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Business",
    isTrending: true, isNew: false, originalPrice: 22.99, discount: 26, soldCount: 1340,
  },
  {
    id: "bk_p_002", title: "Cooking Across Africa", author: "Chef Adaeze Okonkwo",
    coverUrl: demoPic("store-ext-cookbook"),
    rating: 4.9, reviewCount: 2340, price: 14.99, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Lifestyle",
    isTrending: false, isNew: true, originalPrice: 14.99, discount: 0, soldCount: 3450,
  },
  {
    id: "bk_p_003", title: "JavaScript Mastery 2025", author: "Emeka Techson",
    coverUrl: demoPic("store-ext-javascript"),
    rating: 4.8, reviewCount: 4100, price: 29.99, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Technology",
    isTrending: true, isNew: false, originalPrice: 39.99, discount: 25, soldCount: 5670,
  },
  {
    id: "bk_p_004", title: "Raising African Leaders", author: "Dr. Ngozi Osei",
    coverUrl: demoPic("store-ext-parenting"),
    rating: 4.7, reviewCount: 670, price: 11.99, currency: "$",
    accessType: "PAID" as const, format: "audiobook" as const, category: "Self-Help",
    isTrending: false, isNew: true, originalPrice: 11.99, discount: 0, soldCount: 890,
  },
  {
    id: "bk_p_005", title: "Financial Freedom Blueprint", author: "Tobi Adesope",
    coverUrl: demoPic("store-ext-finance"),
    rating: 4.5, reviewCount: 1230, price: 21.99, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Finance",
    isTrending: false, isNew: false, originalPrice: 27.99, discount: 21, soldCount: 2100,
  },
  {
    id: "bk_p_006", title: "Eclipse over Addis", author: "Amina Diallo",
    coverUrl: demoPic("core-bk-036-eclipse"),
    rating: 4.7, reviewCount: 1450, price: 12.49, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Sci-Fi",
    isTrending: true, isNew: true, originalPrice: 15.99, discount: 18, soldCount: 2890,
  },
  {
    id: "bk_p_007", title: "The Taxman's Daughter", author: "Dr. Amaka Eze",
    coverUrl: demoPic("core-bk-014-taxman"),
    rating: 4.4, reviewCount: 412, price: 11.99, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Finance",
    isTrending: false, isNew: false, originalPrice: 14.99, discount: 20, soldCount: 560,
  },
  {
    id: "bk_p_008", title: "African SF Anthology Vol. 1", author: "Seun Adesanya",
    coverUrl: demoPic("core-bk-027-sf-anth"),
    rating: 4.8, reviewCount: 1890, price: 16.99, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Sci-Fi",
    isTrending: true, isNew: true, originalPrice: 21.99, discount: 23, soldCount: 4100,
  },
  {
    id: "bk_p_009", title: "Coffee Table Africa", author: "Wanjiru Mwangi",
    coverUrl: demoPic("core-bk-033-mag"),
    rating: 4.6, reviewCount: 890, price: 4.99, currency: "$",
    accessType: "PAID" as const, format: "magazine" as const, category: "Magazine",
    isTrending: false, isNew: true, originalPrice: 6.99, discount: 29, soldCount: 1200,
  },
  {
    id: "bk_p_010", title: "Grain Routes", author: "Bisi Ogunwale",
    coverUrl: demoPic("core-bk-020-grain"),
    rating: 4.6, reviewCount: 743, price: 13.99, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Historical",
    isTrending: false, isNew: false, originalPrice: 17.99, discount: 22, soldCount: 980,
  },
  {
    id: "bk_p_011", title: "Velvet Visa Run", author: "Demo Author Collective",
    coverUrl: demoPic("demo-book-velvet"),
    rating: 4.5, reviewCount: 210, price: 8.49, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Romance",
    isTrending: true, isNew: false, originalPrice: 10.99, discount: 23, soldCount: 450,
  },
  {
    id: "bk_p_012", title: "Starship Adabraka", author: "Kofi Mensah",
    coverUrl: demoPic("demo-book-starship"),
    rating: 4.7, reviewCount: 620, price: 13.99, currency: "$",
    accessType: "PAID" as const, format: "ebook" as const, category: "Sci-Fi",
    isTrending: true, isNew: true, originalPrice: 18.99, discount: 26, soldCount: 1780,
  },
]

type StoreGridBook = (typeof EXTENDED_STORE)[number]

function apiBookToGrid(b: Record<string, unknown>): StoreGridBook {
  const fmt = b.format === "audiobook" ? "audiobook" as const : "ebook" as const
  const cur = (String(b.currency ?? "USD")) as keyof typeof CURRENCY_SYMBOLS
  const sym = CURRENCY_SYMBOLS[cur] ?? "$"
  const price = typeof b.price === "number" ? b.price : parseFloat(String(b.price ?? 0))
  return {
    id: String(b.id),
    title: String(b.title),
    author: String(b.author ?? ""),
    coverUrl: String(b.coverUrl ?? b.cover_url ?? ""),
    rating: typeof b.rating === "number" ? b.rating : 4.5,
    reviewCount: Number(b.reviewCount ?? b.review_count ?? 0),
    price,
    currency: sym,
    accessType: "PAID" as const,
    format: fmt,
    category: String(b.category ?? "Fiction"),
    isTrending: Boolean(b.isTrending ?? b.is_trending),
    isNew: Boolean(b.isNew ?? b.is_new),
    originalPrice: undefined,
    discount: 0,
    soldCount: 0,
  }
}

const CATEGORIES = ["All", "Business", "Technology", "Self-Help", "Finance", "Fiction", "Romance", "Lifestyle", "Sci-Fi", "Historical", "Magazine"]
const SORT_OPTIONS = [
  { value: "popular",    label: "Most Popular" },
  { value: "newest",     label: "Newest First" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating",     label: "Top Rated" },
]

function BookCard({ book, onAddToCart, inCart }: {
  book: StoreGridBook
  onAddToCart: (b: StoreGridBook) => void | Promise<void>
  inCart: boolean
}) {
  return (
    <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-brand/30 transition-all duration-200 flex flex-col">
      <Link href={`/books/${book.id}`} className="relative block shrink-0 overflow-hidden">
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title} by ${book.author}`}
          className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {book.discount > 0 && (
          <div className="absolute top-2.5 left-2.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">
            -{book.discount}%
          </div>
        )}
        {book.isNew && (
          <div className="absolute top-2.5 right-2.5 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
            NEW
          </div>
        )}
        {book.isTrending && !book.isNew && (
          <div className="absolute top-2.5 right-2.5 bg-brand text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <TrendingUp size={8} /> HOT
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div>
          <Link href={`/books/${book.id}`}>
            <h3 className="font-semibold text-sm text-foreground hover:text-brand transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Star size={11} className="fill-amber-400 text-amber-400" />
          <span className="font-semibold text-foreground">{book.rating}</span>
          <span className="text-muted-foreground">({book.reviewCount.toLocaleString()})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] py-0 gap-1 capitalize">
            {book.format === "audiobook" ? <Headphones size={9} /> : <BookOpen size={9} />}
            {book.format}
          </Badge>
          <Badge variant="secondary" className="text-[10px] py-0">{book.category}</Badge>
        </div>

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-brand">
                {book.currency ?? "$"}
                {book.price!.toFixed(2)}
              </span>
              {book.originalPrice && book.originalPrice > book.price! && (
                <span className="text-xs text-muted-foreground line-through">
                  {book.currency ?? "$"}
                  {book.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{book.soldCount.toLocaleString()} sold</p>
          </div>
          <Button
            size="sm"
            onClick={() => onAddToCart(book)}
            disabled={inCart}
            className={cn(
              "h-8 text-xs gap-1.5 shrink-0 transition-all",
              inCart
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 border border-green-200"
                : "bg-brand hover:bg-brand-dark text-primary-foreground"
            )}
          >
            {inCart ? <><Check size={12} />In Cart</> : <><ShoppingCart size={12} />Add</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StoreContent() {
  const router = useRouter()
  const { user } = useAuth()
  const phase2 = laravelPhase2Enabled()
  const useLiveCatalog = apiUrlConfigured()

  React.useEffect(() => { seedStore() }, [])

  const [search,     setSearch]     = React.useState("")
  const [category,   setCategory]   = React.useState("All")
  const [sort,       setSort]       = React.useState("popular")
  const [priceRange, setPriceRange] = React.useState([0, 50])
  const [formatFilter, setFormatFilter] = React.useState<"all" | "ebook" | "audiobook">("all")
  const [cartItems,  setCartItems]  = React.useState<string[]>([])
  const [catalog,    setCatalog]    = React.useState<StoreGridBook[]>(EXTENDED_STORE)
  const [catalogLoading, setCatalogLoading] = React.useState(() => useLiveCatalog)
  const [showFilters, setShowFilters] = React.useState(false)
  const [addedFlash, setAddedFlash] = React.useState<string | null>(null)

  React.useEffect(() => {
    setCartItems(cartStore.getAll().map(i => i.bookId))

    if (!useLiveCatalog) {
      setCatalog(EXTENDED_STORE)
      setCatalogLoading(false)
      return
    }

    let alive = true
    setCatalogLoading(true)
    storeApi
      .books({ per_page: "100" })
      .then(res => {
        if (!alive) return
        const rows = (res.data as Record<string, unknown>[]).map(apiBookToGrid)
        const fallback = allowMockCatalogFallback() ? EXTENDED_STORE : []
        setCatalog(rows.length ? rows : fallback)
      })
      .catch(() => {
        if (alive) setCatalog(allowMockCatalogFallback() ? EXTENDED_STORE : [])
      })
      .finally(() => {
        if (alive) setCatalogLoading(false)
      })

    return () => {
      alive = false
    }
  }, [useLiveCatalog])

  React.useEffect(() => {
    if (!phase2) {
      setCartItems(cartStore.getAll().map(i => i.bookId))
      return
    }
    let alive = true
    cartApi
      .get()
      .then(r => {
        if (!alive) return
        setCartItems((r.data as { book_id: string }[]).map(i => String(i.book_id)))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [phase2])

  const handleAddToCart = async (book: StoreGridBook) => {
    if (!book.price) return
    if (phase2 && !user) {
      router.push(`/auth/login?next=${encodeURIComponent("/store")}`)
      return
    }
    const res = await addBookToCart({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      price: book.price,
      currency: book.currency ?? "$",
      format: book.format,
    })
    if (!res.ok) return
    setAddedFlash(book.id)
    setTimeout(() => setAddedFlash(null), 2000)
    if (phase2) {
      setCartItems(prev => [...new Set([...prev, book.id])])
    } else {
      setCartItems(cartStore.getAll().map(i => i.bookId))
    }
  }

  const filtered = catalog.filter(b => {
    if (category !== "All" && b.category !== category) return false
    if (formatFilter !== "all" && b.format !== formatFilter) return false
    if (b.price! < priceRange[0] || b.price! > priceRange[1]) return false
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) &&
        !b.author.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    if (sort === "price_asc")  return a.price! - b.price!
    if (sort === "price_desc") return b.price! - a.price!
    if (sort === "rating")     return b.rating - a.rating
    if (sort === "newest")     return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)
    return b.soldCount - a.soldCount // popular
  })

  const cartCount = cartItems.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-brand" />
            <h1 className="font-serif text-3xl font-bold text-foreground">Book Store</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {catalog.length} premium books — lifetime ownership, instant access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cartCount > 0 && (
            <Link href="/cart">
              <Button variant="outline" className="gap-2 relative hover:border-brand hover:text-brand">
                <ShoppingCart size={15} />
                View Cart
                <span className="absolute -top-2 -right-2 bg-brand text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </Button>
            </Link>
          )}
          <Link href="/subscription">
            <Button variant="outline" className="gap-2 hover:border-brand hover:text-brand">
              <Zap size={14} />
              Unlimited Plan
            </Button>
          </Link>
        </div>
      </div>

      <AdInFeed />

      {/* Flash sale banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand/90 to-brand mb-8 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Tag size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg font-serif">Limited Time: Use code READ20</p>
            <p className="text-white/80 text-sm">Save 20% on your entire order today only</p>
          </div>
        </div>
        <Link href="/cart">
          <Button variant="secondary" className="bg-white text-brand hover:bg-white/90 font-semibold gap-1.5">
            Shop Now <ChevronRight size={14} />
          </Button>
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title or author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
          {search && (
            <button
              type="button"
              title="Clear search"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className={cn("h-10 gap-2", showFilters && "border-brand text-brand")}
          onClick={() => setShowFilters(s => !s)}
        >
          <SlidersHorizontal size={15} />
          Filters
          {(category !== "All" || formatFilter !== "all" || priceRange[0] > 0 || priceRange[1] < 50) && (
            <span className="w-2 h-2 rounded-full bg-brand" />
          )}
        </Button>
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6 grid sm:grid-cols-3 gap-6">
          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                    category === c
                      ? "bg-brand text-primary-foreground border-brand"
                      : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Format</p>
            <div className="flex gap-2">
              {(["all", "ebook", "audiobook"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormatFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize flex items-center gap-1.5",
                    formatFilter === f
                      ? "bg-brand text-primary-foreground border-brand"
                      : "border-border text-muted-foreground hover:border-brand/40"
                  )}
                >
                  {f === "ebook" && <BookOpen size={10} />}
                  {f === "audiobook" && <Headphones size={10} />}
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Price Range: ${priceRange[0]} — ${priceRange[1]}
            </p>
            <Slider
              min={0} max={50} step={1}
              value={priceRange}
              onValueChange={setPriceRange}
              className="mt-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>Free</span><span>$50</span>
            </div>
          </div>
        </div>
      )}

      {/* Category pills (quick filter) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
              category === c
                ? "bg-brand text-primary-foreground border-brand"
                : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span> books found
        </p>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Showing {filtered.length} of {catalog.length}</span>
        </div>
      </div>

      {/* Grid */}
      {catalogLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border overflow-hidden bg-card animate-pulse">
              <div className="h-52 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-4/5" />
                <div className="h-3 bg-muted rounded w-3/5" />
                <div className="h-8 bg-muted rounded w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl">
          <Search size={36} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground mb-1">No books found</p>
          <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search query.</p>
          <Button variant="outline" onClick={() => { setSearch(""); setCategory("All"); setFormatFilter("all"); setPriceRange([0, 50]) }}>
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filtered.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onAddToCart={handleAddToCart}
              inCart={cartItems.includes(book.id)}
            />
          ))}
        </div>
      )}

      {/* Added to cart toast */}
      {addedFlash && (
        <div className="fixed bottom-6 right-6 z-50 bg-card border border-green-500/30 shadow-xl rounded-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check size={14} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Added to cart!</p>
            <Link href="/cart" className="text-xs text-brand hover:underline">View cart →</Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StorePage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <StoreContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
