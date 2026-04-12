"use client"

import * as React from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { BookCard } from "@/components/books/book-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { BookCardData } from "@/components/books/book-card"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { storeApi } from "@/lib/api"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { Zap, Clock, Tag, ChevronRight, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

type SaleBook = BookCardData & {
  originalPrice?: number
  discountPct: number
}

/** Mock flash-sale grid (offline / API failure). */
function mockSaleBooks(): SaleBook[] {
  const salePaid = MOCK_BOOKS.filter(b => b.accessType === "PAID").map(b => ({
    ...b,
    originalPrice: b.price,
    price: b.price ? Math.round(b.price * 0.5 * 100) / 100 : undefined,
    discountPct: 50,
  }))
  return [
    ...salePaid,
    ...MOCK_BOOKS.filter(b => b.accessType === "SUBSCRIPTION").slice(0, 4).map(b => ({
      ...b,
      originalPrice: 12.99,
      price: 5.99,
      discountPct: 54,
      accessType: "PAID" as const,
    })),
  ]
}

/** Store catalog: show 50% off promotional pricing (UI-only; checkout uses real prices). */
function storeRowsToSaleBooks(rows: unknown[]): SaleBook[] {
  return rows.map(r => {
    const card = apiBookToCard(r as ApiBookRecord)
    const orig = card.price ?? 0
    const sale = orig ? Math.round(orig * 0.5 * 100) / 100 : 0
    return {
      ...card,
      price: sale || undefined,
      originalPrice: orig || undefined,
      discountPct: 50,
    }
  })
}

function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = React.useState(targetMs)
  React.useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  const s = Math.floor((remaining % 60_000) / 1_000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return { h: pad(h), m: pad(m), s: pad(s) }
}

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="font-mono text-4xl font-black text-sidebar-foreground tabular-nums bg-sidebar-accent border border-sidebar-border rounded-xl px-5 py-3 min-w-[5rem] text-center leading-none">
        {value}
      </div>
      <span className="text-xs text-sidebar-foreground/40 uppercase tracking-wider mt-2">{label}</span>
    </div>
  )
}

function SalesContent() {
  const { h, m, s } = useCountdown(8 * 3_600_000)
  const [activeFilter, setActiveFilter] = React.useState("all")
  const [saleBooks, setSaleBooks] = React.useState<SaleBook[]>(() => mockSaleBooks())
  const [loading, setLoading] = React.useState(() => apiUrlConfigured())

  React.useEffect(() => {
    if (!apiUrlConfigured()) {
      setSaleBooks(mockSaleBooks())
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    storeApi
      .books({ per_page: "48" })
      .then(res => {
        if (cancelled) return
        const rows = (res.data as unknown[]) ?? []
        const mapped = storeRowsToSaleBooks(rows)
        setSaleBooks(mapped.length ? mapped : mockSaleBooks())
      })
      .catch(() => {
        if (!cancelled) setSaleBooks(mockSaleBooks())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filters = [
    { id: "all", label: "All Deals" },
    { id: "ebook", label: "eBooks" },
    { id: "audiobook", label: "Audiobooks" },
  ]

  const filtered = activeFilter === "all"
    ? saleBooks
    : saleBooks.filter(b => b.format === activeFilter)

  return (
    <div>
      {/* Hero banner */}
      <section className="bg-sidebar py-16 md:py-20" aria-labelledby="flash-sale-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-brand/20 text-brand px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-6">
            <Zap size={16} className="fill-brand" />
            Flash Sale — Live Now
          </div>
          <h1
            id="flash-sale-heading"
            className="font-serif text-4xl md:text-6xl font-black text-sidebar-foreground mb-4 text-balance leading-tight"
          >
            Up to <span className="text-brand">60% Off</span><br />
            Weekend Reading Deals
          </h1>
          <p className="text-sidebar-foreground/60 text-lg mb-10 max-w-xl mx-auto">
            Hundreds of premium ebooks and audiobooks at massive discounts. Limited time — grab yours before they&apos;re gone.
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3">
            <TimeUnit value={h} label="Hours" />
            <span className="text-3xl font-black text-sidebar-foreground/30 mb-6">:</span>
            <TimeUnit value={m} label="Mins" />
            <span className="text-3xl font-black text-sidebar-foreground/30 mb-6">:</span>
            <TimeUnit value={s} label="Secs" />
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
            {[
              { icon: Tag, label: "Featured store titles" },
              { icon: Flame, label: "Up to 60% off" },
              { icon: Clock, label: "Limited time only" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-sidebar-foreground/60 text-sm">
                <s.icon size={15} className="text-brand" />
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter + books */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Filter pills */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              {filtered.length} deals available
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Prices reduced for this sale period only</p>
          </div>
          <div className="flex gap-2">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                  activeFilter === f.id
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-muted-foreground hover:border-brand/30"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Book grid — with sale overlay */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden animate-pulse">
                <div className="aspect-[2/3] bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-4/5" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(book => (
              <div key={book.id} className="relative">
                {/* Discount badge */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge className="bg-destructive text-white text-[10px] px-1.5 py-0.5 font-bold">
                    -{book.discountPct}%
                  </Badge>
                </div>
                <BookCard book={book} />
                {/* Original price strikethrough */}
                {book.originalPrice != null && book.originalPrice > 0 && (
                  <div className="px-3 pb-2 -mt-2">
                    <span className="text-xs text-muted-foreground line-through">
                      Was {book.currency ?? "$"}
                      {book.originalPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        <div className="text-center mt-10">
          <Link href="/books">
            <Button variant="outline" className="gap-2 hover:border-brand hover:text-brand px-8">
              Browse All Books <ChevronRight size={14} />
            </Button>
          </Link>
        </div>

        {/* Coupon section */}
        <div className="mt-14 bg-card border border-brand/20 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <Badge className="bg-brand/15 text-brand border-0 mb-3 text-xs">Exclusive Coupon</Badge>
              <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
                Get an extra 20% off
              </h3>
              <p className="text-muted-foreground text-sm">
                Use code <strong className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">FLASH20</strong> at checkout to save an additional 20% on top of the sale prices. One use per account.
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-3">
              <div className="font-mono text-3xl font-black text-brand bg-brand/10 border-2 border-brand/20 border-dashed rounded-xl px-8 py-4 tracking-widest">
                FLASH20
              </div>
              <Link href="/books">
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
                  Shop Now <ChevronRight size={14} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SalesPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">
          <SalesContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
