"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ProtectedSurface } from "@/components/protected-surface"

/** Shape compatible with GET /api/books/:id — from [myscriptic-ui-patches](https://github.com/Wedevstore/myscriptic-ui-patches). */
export type BookDetailApi = {
  id: string
  title: string
  author: string
  description?: string | null
  sampleExcerpt?: string | null
  openingExcerpt?: string | null
  category?: string | null
  format?: string | null
  accessType?: string | null
  rating?: number | null
  reviewCount?: number | null
  coverUrl?: string | null
  price?: number | null
  currency?: string | null
}

export type RelatedBook = {
  id: string
  title: string
  author: string
  coverUrl?: string | null
  accessType?: string | null
  rating?: number | null
  reviewCount?: number | null
  price?: number | null
  currency?: string | null
}

export type ReviewItem = {
  id: string
  authorName: string
  authorInitials: string
  dateLabel: string
  body: string
}

const fmtStars = (n: number) => n.toFixed(1)

function Badge({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 ${className}`}
    >
      {children}
    </span>
  )
}

/**
 * Left column: metadata + title + excerpt (replaces plain `div.flex.flex-col.gap-5`).
 */
export function BookHeroColumn({
  book,
  metaRight,
  cta,
  completionRatePct = 72,
  authorHref,
  userEmail,
}: {
  book: BookDetailApi
  metaRight?: ReactNode
  cta?: ReactNode
  /** Omit or pass null to hide the “completion rate” chip. */
  completionRatePct?: number | null
  authorHref?: string
  userEmail?: string | null
}) {
  const excerpt =
    book.openingExcerpt?.trim() ||
    book.sampleExcerpt?.trim() ||
    null
  const dupBlurb =
    excerpt !== null &&
    book.description?.trim() &&
    excerpt.trim() === book.description.trim()

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {book.category ? <Badge>{book.category}</Badge> : null}
        {book.format ? (
          <Badge className="capitalize">{book.format}</Badge>
        ) : null}
        {book.accessType ? (
          <Badge className="border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            {book.accessType === "SUBSCRIPTION"
              ? "Unlimited plan"
              : book.accessType === "FREE"
                ? "Free"
                : book.accessType === "PAID"
                  ? "Buy"
                  : book.accessType}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1 space-y-3">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            {book.title}
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              by{" "}
              {authorHref ? (
                <Link
                  href={authorHref}
                  className="transition-colors hover:text-amber-700 dark:hover:text-amber-400"
                >
                  {book.author}
                </Link>
              ) : (
                book.author
              )}
            </span>
            {book.rating != null ? (
              <>
                <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                <span className="tabular-nums">{fmtStars(book.rating)}</span>
                <span className="text-zinc-500">
                  {" "}
                  ({(book.reviewCount ?? 0).toLocaleString()} ratings)
                </span>
                {completionRatePct != null ? (
                  <>
                    <span className="mx-2 text-zinc-300 dark:text-zinc-600">
                      ·
                    </span>
                    <span className="text-zinc-500">
                      {completionRatePct}% completion rate
                    </span>
                  </>
                ) : null}
              </>
            ) : null}
          </p>
          {book.description ? (
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
              {book.description}
            </p>
          ) : null}
        </div>
        {metaRight ? (
          <div className="shrink-0 sm:max-w-[220px]">{metaRight}</div>
        ) : null}
      </div>

      {cta ? <div className="flex flex-wrap gap-3">{cta}</div> : null}

      {excerpt && !dupBlurb ? (
        <section
          className="rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50/80 to-white p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-900/50 dark:to-zinc-950 sm:p-6"
          aria-labelledby="opening-excerpt-heading"
        >
          <h2
            id="opening-excerpt-heading"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
          >
            Opening excerpt
          </h2>
          <ProtectedSurface
            userEmail={userEmail}
            watermarkVariant="dark"
            outerClassName="mt-3 block max-w-3xl rounded-xl border border-zinc-200/60 bg-white/50 p-4 dark:border-zinc-700/80 dark:bg-zinc-950/40 sm:p-5"
          >
            <p className="m-0 whitespace-pre-wrap text-base leading-[1.75] text-zinc-800 dark:text-zinc-200">
              {excerpt}
            </p>
          </ProtectedSurface>
        </section>
      ) : excerpt && dupBlurb ? (
        <section
          className="rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30"
          aria-label="Preview"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Full sample chapter appears after you unlock this book.
          </p>
        </section>
      ) : null}
    </div>
  )
}

function RatingBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-3 shrink-0 font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="presentation"
      >
        <div
          className="h-full rounded-full bg-amber-500 dark:bg-amber-600"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums text-zinc-500">
        {pct}%
      </span>
    </div>
  )
}

/**
 * Main column: reviews + distribution (lg:col-span-2).
 */
export function BookReviewsSection({
  rating,
  reviewCount,
  distribution = [
    { stars: 5, pct: 68 },
    { stars: 4, pct: 20 },
    { stars: 3, pct: 8 },
    { stars: 2, pct: 2 },
    { stars: 1, pct: 2 },
  ],
  reviews,
  onLoadMore,
}: {
  rating: number
  reviewCount: number
  distribution?: { stars: number; pct: number }[]
  reviews: ReviewItem[]
  onLoadMore?: () => void
}) {
  return (
    <div className="space-y-8 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="lg:w-52 lg:shrink-0">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Reader reviews
          </h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {fmtStars(rating)}
            </span>
            <span className="text-sm text-zinc-500">
              {reviewCount.toLocaleString()} ratings
            </span>
          </div>
        </div>
        <div
          className="min-w-0 flex-1 space-y-2"
          aria-label="Rating breakdown"
        >
          {distribution.map((row) => (
            <RatingBar
              key={row.stars}
              label={String(row.stars)}
              pct={row.pct}
            />
          ))}
        </div>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {reviews.map((r) => (
          <li key={r.id} className="flex gap-4 py-6 first:pt-2">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              aria-hidden
            >
              {r.authorInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {r.authorName}
                </span>
                <time className="text-sm text-zinc-500">{r.dateLabel}</time>
              </div>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {r.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {onLoadMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Load more reviews
        </button>
      ) : null}
    </div>
  )
}

function RelatedRow({ b }: { b: RelatedBook }) {
  const label =
    b.accessType === "FREE"
      ? "Free"
      : b.accessType === "SUBSCRIPTION"
        ? "Unlimited"
        : b.price != null && b.currency
          ? `${b.currency}${b.price.toFixed(2)}`
          : "Buy"

  return (
    <Link
      href={`/books/${b.id}`}
      className="group flex gap-3 rounded-xl p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
    >
      <div className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
        {b.coverUrl ? (
          <img
            src={b.coverUrl}
            alt={b.title ?? "Book cover"}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 group-hover:text-amber-700 dark:text-zinc-100 dark:group-hover:text-amber-400">
          {b.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{b.author}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-zinc-600 dark:text-zinc-400">
          {b.rating != null ? (
            <span className="tabular-nums">{fmtStars(b.rating)}</span>
          ) : null}
          {b.reviewCount != null ? (
            <span>({b.reviewCount.toLocaleString()})</span>
          ) : null}
          <Badge className="text-[10px]">{label}</Badge>
        </div>
      </div>
    </Link>
  )
}

/**
 * Sidebar: more in category.
 */
export function BookRelatedSidebar({
  categoryLabel,
  books,
}: {
  categoryLabel: string
  books: RelatedBook[]
}) {
  return (
    <aside className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        More in {categoryLabel}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Hand-picked from the same category
      </p>
      {books.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          More titles in this category will appear here.
        </p>
      ) : (
        <nav
          className="mt-4 space-y-1"
          aria-label={`More books in ${categoryLabel}`}
        >
          {books.map((b) => (
            <RelatedRow key={b.id} b={b} />
          ))}
        </nav>
      )}
    </aside>
  )
}

/**
 * Full grid shell matching: hero (cover + column) then lg:grid-cols-3 content + sidebar.
 */
export function BookDetailPageShell({
  cover,
  hero,
  main,
  sidebar,
}: {
  cover: ReactNode
  hero: ReactNode
  main: ReactNode
  sidebar: ReactNode
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-12 grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="mx-auto w-full max-w-[200px] sm:max-w-[240px] lg:mx-0">
          {cover}
        </div>
        <div className="min-w-0">{hero}</div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">{main}</div>
        <div className="min-w-0">{sidebar}</div>
      </div>
    </div>
  )
}
