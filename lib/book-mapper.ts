import type { BookCardData } from "@/components/books/book-card"
import { demoPic } from "@/lib/demo-images"

/** Shape returned by Laravel book list/search payloads (camelCase JSON). */
export type ApiBookRecord = {
  id: string | number
  title: string
  author: string
  coverUrl?: string | null
  rating?: number | null
  reviewCount?: number | null
  price?: number | null
  currency?: string | null
  accessType: BookCardData["accessType"]
  format: BookCardData["format"]
  category?: string | null
  isNew?: boolean
  isTrending?: boolean
}

export function apiBookToCard(b: ApiBookRecord): BookCardData {
  return {
    id: String(b.id),
    title: b.title,
    author: b.author,
    coverUrl: b.coverUrl || demoPic("fallback-cover"),
    rating: b.rating ?? 0,
    reviewCount: b.reviewCount ?? 0,
    price: b.price ?? undefined,
    currency: b.currency ?? undefined,
    accessType: b.accessType,
    format: b.format,
    category: b.category || "General",
    isNew: b.isNew,
    isTrending: b.isTrending,
  }
}
