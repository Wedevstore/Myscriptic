"use client"

import * as React from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { BookCardData } from "@/components/books/book-card"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { booksApi } from "@/lib/api"
import { apiBookToCard } from "@/lib/book-mapper"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { allowMockCatalogFallback } from "@/lib/catalog-mode"
import { Headphones, Play, Clock, Star, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const MOCK_AUDIOBOOKS = MOCK_BOOKS.filter(b => b.format === "audiobook")

const GENRES = ["All", "Business", "Fiction", "Self-Help", "Finance", "Technology", "Historical"]

function AudiobookCard({ book }: { book: BookCardData }) {
  const durations: Record<string, string> = {
    bk_004: "8h 42m",
    bk_008: "11h 15m",
    bk_011: "7h 03m",
  }
  const narrators: Record<string, string> = {
    bk_004: "Emeka Chibuzo",
    bk_008: "Funke Akindele",
    bk_011: "Seun Williams",
  }
  const duration  = durations[book.id]  ?? "9h 30m"
  const narrator  = narrators[book.id]  ?? "Professional Narrator"

  return (
    <div className="book-card bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={book.coverUrl}
          alt={`Cover art of audiobook ${book.title}`}
          className="w-full h-full object-cover"
        />
        {/* Play overlay */}
        <Link
          href={`/audio/${book.id}`}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-all group"
          aria-label={`Play ${book.title}`}
        >
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all shadow-2xl">
            <Play size={20} className="fill-primary-foreground text-primary-foreground ml-1" />
          </div>
        </Link>
        {/* Access badge */}
        <div className="absolute top-2 left-2">
          {book.accessType === "FREE" && (
            <Badge className="bg-green-600 text-white text-[10px]">Free</Badge>
          )}
          {book.accessType === "SUBSCRIPTION" && (
            <Badge className="bg-brand text-primary-foreground text-[10px]">Unlimited</Badge>
          )}
          {book.accessType === "PAID" && book.price && (
            <Badge className="bg-background/90 text-foreground text-[10px]">
              {book.currency ?? "$"}{book.price.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <Link href={`/books/${book.id}`}>
          <h3 className="font-semibold text-sm text-foreground hover:text-brand transition-colors line-clamp-2 leading-snug">
            {book.title}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground">{book.author}</p>

        <div className="text-xs text-muted-foreground">
          Narrated by <span className="text-foreground font-medium">{narrator}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={11} /> {duration}
          </span>
          <span className="flex items-center gap-1">
            <Star size={11} className="fill-brand text-brand" /> {(book.rating ?? 0).toFixed(1)}
          </span>
        </div>

        <div className="mt-auto pt-2 border-t border-border">
          <Link href={`/audio/${book.id}`}>
            <Button className="w-full h-8 text-xs bg-brand/10 text-brand hover:bg-brand hover:text-primary-foreground gap-1.5 transition-colors">
              <Play size={12} className="fill-current" /> Listen Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function AudiobookListItem({ book }: { book: BookCardData }) {
  const duration = "9h 30m"
  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-brand/30 transition-all group">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <Link href={`/books/${book.id}`}>
          <h3 className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors truncate">
            {book.title}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground">{book.author}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock size={11} />{duration}</span>
          <Badge variant="secondary" className="text-[10px]">{book.category}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {book.accessType === "PAID" && book.price ? (
          <span className="text-sm font-bold text-brand">{book.currency ?? "$"}{book.price.toFixed(2)}</span>
        ) : (
          <span className="text-xs font-semibold text-green-600">
            {book.accessType === "FREE" ? "Free" : "With Plan"}
          </span>
        )}
        <Link href={`/audio/${book.id}`}>
          <Button size="sm" className="h-8 text-xs bg-brand hover:bg-brand-dark text-primary-foreground gap-1.5">
            <Play size={12} className="fill-current" /> Play
          </Button>
        </Link>
      </div>
    </div>
  )
}

function AudiobooksContent() {
  const useLiveApi = apiUrlConfigured()
  const mockFallback = allowMockCatalogFallback()
  const [activeGenre, setActiveGenre] = React.useState("All")
  const [books, setBooks] = React.useState<BookCardData[]>(() =>
    mockFallback ? MOCK_AUDIOBOOKS : []
  )
  const [loading, setLoading] = React.useState(useLiveApi)

  React.useEffect(() => {
    if (!useLiveApi) {
      setBooks(MOCK_AUDIOBOOKS)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    booksApi
      .list({ per_page: "96" })
      .then(res => {
        if (cancelled) return
        const rows = (res.data as unknown[]) ?? []
        const audio = rows
          .map(r => apiBookToCard(r))
          .filter(b => b.format === "audiobook")
        if (audio.length) setBooks(audio)
        else if (mockFallback) setBooks(MOCK_AUDIOBOOKS)
        else setBooks([])
      })
      .catch(() => {
        if (!cancelled) setBooks(mockFallback ? MOCK_AUDIOBOOKS : [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [useLiveApi, mockFallback])

  const filtered = activeGenre === "All"
    ? books
    : books.filter(b => b.category === activeGenre)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-sidebar to-sidebar/80 rounded-2xl overflow-hidden mb-10 p-8 md:p-12">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-brand/20">
              <Headphones size={20} className="text-brand" />
            </div>
            <Badge className="bg-brand text-primary-foreground text-xs">New Releases</Badge>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-sidebar-foreground mb-3 text-pretty">
            Listen to the World&apos;s Best Stories
          </h1>
          <p className="text-sidebar-foreground/60 mb-6 leading-relaxed">
            Thousands of audiobooks narrated by professional voices. Perfect for commutes, workouts, and winding down.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/subscription">
              <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
                <Headphones size={15} /> Start Listening Free
              </Button>
            </Link>
            <Link href="/books?format=audiobook">
              <Button variant="outline" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent gap-2">
                <BookOpen size={15} /> Browse All
              </Button>
            </Link>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex gap-3 opacity-30">
          {["180x240", "180x240", "180x240"].map((size, i) => (
            <div
              key={i}
              className="w-28 h-36 rounded-xl bg-sidebar-accent"
              style={{ transform: `rotate(${[-6, 2, 8][i]}deg) translateY(${[-8, 0, 6][i]}px)` }}
            />
          ))}
        </div>
      </div>

      {/* Genre filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {GENRES.map(genre => (
          <button
            key={genre}
            onClick={() => setActiveGenre(genre)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              activeGenre === genre
                ? "bg-brand text-primary-foreground border-brand"
                : "border-border text-muted-foreground hover:border-brand/30 hover:text-foreground"
            )}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Heading */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl font-bold text-foreground">
          {activeGenre === "All" ? "All Audiobooks" : `${activeGenre} Audiobooks`}
        </h2>
        <span className="text-sm text-muted-foreground">
          {filtered.length} titles
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Headphones size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No audiobooks found in this genre.</p>
          <Button variant="outline" className="mt-4" onClick={() => setActiveGenre("All")}>
            Show All Genres
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {filtered.map(book => (
            <AudiobookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Recently added list */}
      {!loading && (
        <section className="mt-14">
          <h2 className="font-serif text-xl font-bold text-foreground mb-5">Recently Added</h2>
          <div className="space-y-3">
            {books.slice(0, 4).map(book => (
              <AudiobookListItem key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function AudiobooksPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AudiobooksContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
