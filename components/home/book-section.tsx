"use client"

import * as React from "react"
import Link from "next/link"
import { BookCard, type BookCardData } from "@/components/books/book-card"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BookSectionProps {
  title: string
  subtitle?: string
  books: BookCardData[]
  seeAllHref?: string
  variant?: "grid" | "scroll"
  columns?: 2 | 3 | 4 | 5 | 6
  loading?: boolean
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      <div className="aspect-[2/3] skeleton-shimmer" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-3 bg-muted rounded-md w-3/4" />
        <div className="h-2.5 bg-muted rounded-md w-1/2" />
        <div className="h-2 bg-muted rounded-md w-2/3" />
        <div className="h-8 bg-muted rounded-lg mt-4" />
      </div>
    </div>
  )
}

export function BookSection({
  title,
  subtitle,
  books,
  seeAllHref,
  variant = "grid",
  columns = 4,
  loading = false,
}: BookSectionProps) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  }[columns]

  return (
    <section className="py-12 section-divider last:border-0" aria-labelledby={`section-${title}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <h2
              id={`section-${title}`}
              className="font-serif text-2xl font-bold text-foreground leading-tight"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="group flex items-center gap-1 text-sm text-brand font-semibold shrink-0 hover:gap-2 transition-all"
            >
              See all
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className={cn("grid gap-4 sm:gap-5", colClass)}>
            {Array.from({ length: columns as number }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : variant === "scroll" ? (
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6 scrollbar-thin">
            {books.map(book => (
              <div key={book.id} className="flex-shrink-0 w-[150px] sm:w-[165px]">
                <BookCard book={book} variant="compact" />
              </div>
            ))}
          </div>
        ) : (
          <div className={cn("grid gap-4 sm:gap-5", colClass)}>
            {books.map(book => (
              <BookCard key={book.id} book={book} variant="default" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
