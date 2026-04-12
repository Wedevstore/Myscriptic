"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { BookCard, type BookCardData } from "@/components/books/book-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MOCK_BOOKS, CATEGORIES, resolveMockAuthorId } from "@/lib/mock-data"
import { authorsApi, booksApi } from "@/lib/api"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { allowMockCatalogFallback } from "@/lib/catalog-mode"
import {
  Search, SlidersHorizontal, X, ChevronDown, BookOpen,
  Headphones, Grid3X3, List,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SortOption = "trending" | "new" | "rating" | "price_asc" | "price_desc"
type FilterAccess = "ALL" | "FREE" | "PAID" | "SUBSCRIPTION"
type FilterFormat = "ALL" | "ebook" | "audiobook" | "magazine"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "new", label: "Newest" },
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low" },
  { value: "price_desc", label: "Price: High" },
]

function BookSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border overflow-hidden">
      <Skeleton className="aspect-[2/3] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-8 w-full mt-2" />
      </div>
    </div>
  )
}

function BooksContent() {
  const searchParams = useSearchParams()
  const rawAuthorId = React.useMemo(() => {
    const a = searchParams.get("author_id")?.trim()
    return a || null
  }, [searchParams])

  const numericAuthorId = React.useMemo(
    () => (rawAuthorId && /^\d+$/.test(rawAuthorId) ? rawAuthorId : null),
    [rawAuthorId]
  )

  const mockAuthorResolved = React.useMemo(() => {
    if (!rawAuthorId || numericAuthorId) return null
    return resolveMockAuthorId(rawAuthorId)
  }, [rawAuthorId, numericAuthorId])

  const unknownMockAuthorParam = Boolean(
    rawAuthorId && !numericAuthorId && rawAuthorId.startsWith("auth_") && !mockAuthorResolved
  )

  const authorFilterActive = Boolean(numericAuthorId || mockAuthorResolved || unknownMockAuthorParam)

  const clientOnlyMockAuthor = Boolean(mockAuthorResolved || unknownMockAuthorParam) && !numericAuthorId

  const [query, setQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<SortOption>("trending")
  const [filterAccess, setFilterAccess] = React.useState<FilterAccess>("ALL")
  const [filterFormat, setFilterFormat] = React.useState<FilterFormat>("ALL")
  const [activeCategory, setActiveCategory] = React.useState<string>("ALL")
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [apiBooks, setApiBooks] = React.useState<BookCardData[] | null>(null)
  const [apiCats, setApiCats] = React.useState<string[]>([])
  const [searchHits, setSearchHits] = React.useState<BookCardData[] | null>(null)
  const [authorFilterName, setAuthorFilterName] = React.useState<string | null>(null)

  React.useEffect(() => {
    const q = searchParams.get("q")
    if (q) setQuery(q)
    const cat = searchParams.get("category")
    if (cat) setActiveCategory(cat)
    const s = searchParams.get("sort")
    if (s && ["trending", "latest", "price_low", "price_high", "top_rated"].includes(s)) setSortBy(s as SortOption)
    const acc = searchParams.get("access")
    if (acc && ["ALL", "FREE", "PAID", "SUBSCRIPTION"].includes(acc.toUpperCase())) setFilterAccess(acc.toUpperCase() as FilterAccess)
    const fmt = searchParams.get("format")
    if (fmt && ["ALL", "ebook", "audiobook"].includes(fmt)) setFilterFormat(fmt as FilterFormat)
  }, [searchParams])

  React.useEffect(() => {
    if (!numericAuthorId) {
      setAuthorFilterName(null)
      return
    }
    if (!apiUrlConfigured()) {
      setAuthorFilterName(null)
      return
    }
    authorsApi
      .get(numericAuthorId)
      .then(res => setAuthorFilterName(res.data?.name ?? null))
      .catch(() => setAuthorFilterName(null))
  }, [numericAuthorId])

  React.useEffect(() => {
    let alive = true
    if (!clientOnlyMockAuthor) setLoading(true)
    else setLoading(false)

    if (!apiUrlConfigured()) {
      setApiBooks(null)
      setApiCats([])
      setLoading(false)
      return () => {
        alive = false
      }
    }

    const listParams: Record<string, string> = { per_page: "72" }
    if (numericAuthorId) listParams.author_id = numericAuthorId

    Promise.all([
      booksApi.list(listParams).catch(() => null),
      booksApi.categories().catch(() => null),
    ]).then(([listRes, catRes]) => {
      if (!alive) return
      if (listRes && Array.isArray(listRes.data)) {
        if (listRes.data.length > 0 || numericAuthorId) {
          setApiBooks((listRes.data as ApiBookRecord[]).map(apiBookToCard))
        } else {
          setApiBooks(null)
        }
      } else if (numericAuthorId) {
        setApiBooks([])
      } else {
        setApiBooks(null)
      }
      if (catRes?.data?.length) {
        setApiCats(catRes.data.map(c => typeof c === "string" ? c : c.name))
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [numericAuthorId, clientOnlyMockAuthor])

  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSearchHits(null)
      return
    }
    if (!apiUrlConfigured()) {
      setSearchHits(null)
      return
    }
    const t = window.setTimeout(() => {
      booksApi
        .search(q, 60, 1)
        .then(res => {
          const raw = res?.data
          const list = Array.isArray(raw) ? raw : []
          setSearchHits(list.map(row => apiBookToCard(row as ApiBookRecord)))
        })
        .catch(() => setSearchHits(null))
    }, 320)
    return () => window.clearTimeout(t)
  }, [query])

  const pool = React.useMemo(() => {
    if (mockAuthorResolved) {
      return MOCK_BOOKS.filter(b => b.author === mockAuthorResolved.name)
    }
    if (unknownMockAuthorParam) return []
    if (numericAuthorId && apiBooks !== null) return apiBooks
    return apiBooks ?? (allowMockCatalogFallback() ? MOCK_BOOKS : [])
  }, [mockAuthorResolved, unknownMockAuthorParam, numericAuthorId, apiBooks])

  const categoryChips = apiCats.length
    ? apiCats.map(c => ({ id: c, label: c }))
    : CATEGORIES.slice(0, 8).map(c => ({ id: c.label, label: c.label }))

  // Filter & sort books
  const filtered = React.useMemo(() => {
    let books =
      searchHits !== null ? [...searchHits] : [...pool]

    if (searchHits === null && query.trim()) {
      const q = query.toLowerCase()
      books = books.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      )
    }
    if (filterAccess !== "ALL") books = books.filter(b => b.accessType === filterAccess)
    if (filterFormat !== "ALL") books = books.filter(b => b.format === filterFormat)
    if (activeCategory !== "ALL") {
      books = books.filter(b => b.category === activeCategory)
    }

    switch (sortBy) {
      case "new":       books = books.filter(b => b.isNew).concat(books.filter(b => !b.isNew)); break
      case "trending":  books = books.filter(b => b.isTrending).concat(books.filter(b => !b.isTrending)); break
      case "rating":    books.sort((a, b) => b.rating - a.rating); break
      case "price_asc": books.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break
      case "price_desc":books.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break
    }

    return books
  }, [query, sortBy, filterAccess, filterFormat, activeCategory, pool, searchHits])

  const hasActiveFilters =
    filterAccess !== "ALL" ||
    filterFormat !== "ALL" ||
    activeCategory !== "ALL" ||
    Boolean(query) ||
    authorFilterActive

  const authorFilterHeading =
    mockAuthorResolved != null
      ? `Books by ${mockAuthorResolved.name}`
      : unknownMockAuthorParam
        ? "Author not found"
        : numericAuthorId && authorFilterName
          ? `Books by ${authorFilterName}`
          : numericAuthorId
            ? "Filtered by author"
            : ""

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Browse Books</h1>
        <p className="text-muted-foreground text-sm">
          {authorFilterActive && (
            <>
              <span className="text-foreground font-medium">{authorFilterHeading}</span>
              {" · "}
              <Link href="/books" className="text-brand font-semibold hover:underline">
                Clear filter
              </Link>
              {" · "}
            </>
          )}
          {filtered.length.toLocaleString()} books found
          {query && <> for &ldquo;<span className="text-foreground font-medium">{query}</span>&rdquo;</>}
        </p>
      </div>

      {/* Search + Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, author, category..."
            className="pl-9 h-10"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="h-10 pl-3 pr-8 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Filter toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen(o => !o)}
          className={cn("gap-2 h-10", filtersOpen && "border-brand text-brand")}
        >
          <SlidersHorizontal size={14} />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand" />}
        </Button>

        {/* View mode */}
        <div className="flex border border-input rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2.5 transition-colors", viewMode === "grid" ? "bg-brand text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
            aria-label="Grid view"
          >
            <Grid3X3 size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2.5 transition-colors", viewMode === "list" ? "bg-brand text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
            aria-label="List view"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Expandable filter panel */}
      {filtersOpen && (
        <div className="bg-card border border-border rounded-xl p-5 mb-5 grid sm:grid-cols-3 gap-5">
          {/* Access type */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Access</p>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "FREE", "SUBSCRIPTION", "PAID"] as FilterAccess[]).map(a => (
                <button
                  key={a}
                  onClick={() => setFilterAccess(a)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    filterAccess === a
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border hover:border-brand/30 text-muted-foreground"
                  )}
                >
                  {a === "ALL" ? "All Access" : a.charAt(0) + a.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Format</p>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "ebook", "audiobook", "magazine"] as FilterFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterFormat(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                    filterFormat === f
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border hover:border-brand/30 text-muted-foreground"
                  )}
                >
                  {f === "ebook" && <BookOpen size={11} />}
                  {f === "audiobook" && <Headphones size={11} />}
                  {f === "ALL" ? "All Formats" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  activeCategory === "ALL" ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground hover:border-brand/30"
                )}
              >
                All
              </button>
              {categoryChips.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    activeCategory === cat.id ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground hover:border-brand/30"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && !filtersOpen && (
        <div className="flex flex-wrap gap-2 mb-4">
          {query && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              &ldquo;{query}&rdquo;
              <button onClick={() => setQuery("")}><X size={10} /></button>
            </Badge>
          )}
          {filterAccess !== "ALL" && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              {filterAccess}
              <button onClick={() => setFilterAccess("ALL")}><X size={10} /></button>
            </Badge>
          )}
          {filterFormat !== "ALL" && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              {filterFormat}
              <button onClick={() => setFilterFormat("ALL")}><X size={10} /></button>
            </Badge>
          )}
          <button onClick={() => { setQuery(""); setFilterAccess("ALL"); setFilterFormat("ALL"); setActiveCategory("ALL") }} className="text-xs text-muted-foreground hover:text-destructive">
            Clear all
          </button>
        </div>
      )}

      {/* Books Grid / List */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <BookSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-serif text-xl font-semibold text-foreground mb-2">No books found</h3>
          <p className="text-muted-foreground text-sm mb-4">Try adjusting your filters or search term.</p>
          <Button variant="outline" onClick={() => { setQuery(""); setFilterAccess("ALL"); setFilterFormat("ALL"); setActiveCategory("ALL") }}>
            Clear Filters
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(book => (
            <BookCard key={book.id} book={book} variant="horizontal" />
          ))}
        </div>
      )}
    </div>
  )
}

function BooksFallback() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1 pt-16 bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </main>
      <Footer />
    </div>
  )
}

export default function BooksPage() {
  return (
    <Providers>
      <Suspense fallback={<BooksFallback />}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main id="main-content" className="flex-1 pt-16 bg-background">
            <BooksContent />
          </main>
          <Footer />
        </div>
      </Suspense>
    </Providers>
  )
}
