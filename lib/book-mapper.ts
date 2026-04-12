import type { BookCardData, AccessType, BookFormat } from "@/components/books/book-card"
import { demoPic } from "@/lib/demo-images"

/** Local placeholder when API/CMS omits or fails to load a cover. */
export const FALLBACK_COVER = "/images/book-placeholder.svg"

/** Shape returned by Laravel book list/search payloads (camelCase JSON). */
export type ApiBookRecord = {
  id: string | number
  title: string
  author: string
  /** Optional opening lines for the book detail page (camelCase API). */
  sampleExcerpt?: string | null
  openingExcerpt?: string | null
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
  chapterCount?: number | null
  fileFormat?: string | null
  fileSizeBytes?: number | null
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s.length > 0 ? s : undefined
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function parseFormat(raw: unknown): BookFormat {
  const s = (str(raw) ?? "ebook").toLowerCase().replace(/-/g, "_")
  if (s === "audiobook" || s === "audio_book" || s === "audio") return "audiobook"
  if (s === "magazine") return "magazine"
  return "ebook"
}

function parseAccess(raw: unknown): AccessType {
  const s = (str(raw) ?? "FREE").toUpperCase().replace(/-/g, "_")
  if (s === "PAID" || s === "SUBSCRIPTION" || s === "FREE") return s
  return "FREE"
}

/**
 * Unwrap Laravel JSON:API style `{ data: { attributes } }` or flat objects.
 */
function unwrapBookRow(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const inner = o.data
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    const d = inner as Record<string, unknown>
    const attrs = d.attributes
    if (attrs != null && typeof attrs === "object" && !Array.isArray(attrs)) {
      return { id: d.id ?? o.id, ...(attrs as Record<string, unknown>) }
    }
    return d
  }
  return o
}

/**
 * Normalize Laravel snake_case, camelCase, or JSON:API rows into {@link ApiBookRecord}.
 */
export function normalizeApiBookRecord(raw: unknown): ApiBookRecord | null {
  const o = unwrapBookRow(raw)
  if (!o) return null
  const id = o.id
  if (id === undefined || id === null) return null

  const title = str(o.title) ?? "Untitled"
  const author = str(o.author) ?? "Unknown"

  return {
    id: id as string | number,
    title,
    author,
    sampleExcerpt: str(o.sample_excerpt ?? o.sampleExcerpt) ?? null,
    openingExcerpt: str(o.opening_excerpt ?? o.openingExcerpt) ?? null,
    coverUrl: str(o.cover_url ?? o.coverUrl) ?? null,
    rating: num(o.rating),
    reviewCount: num(o.review_count ?? o.reviewCount),
    price: num(o.price),
    currency: str(o.currency) ?? null,
    accessType: parseAccess(o.access_type ?? o.accessType),
    format: parseFormat(o.format),
    category: str(o.category) ?? null,
    isNew: Boolean(o.is_new ?? o.isNew),
    isTrending: Boolean(o.is_trending ?? o.isTrending),
    chapterCount: num(o.chapter_count ?? o.chapterCount),
    fileFormat: str(o.file_format ?? o.fileFormat) ?? null,
    fileSizeBytes: num(o.file_size_bytes ?? o.fileSizeBytes ?? o.file_size ?? o.fileSize),
  }
}

const STREAM_KEYS = [
  "audiobook_url",
  "audiobookUrl",
  "audio_url",
  "audioUrl",
  "stream_url",
  "streamUrl",
  "audio_stream_url",
  "audioStreamUrl",
  "signed_audio_url",
  "signedAudioUrl",
  "streaming_url",
  "streamingUrl",
  "media_url",
  "mediaUrl",
  "s3_audio_url",
  "s3AudioUrl",
] as const

/**
 * First HTTPS/audio URL from a book API payload (flat or JSON:API unwrapped).
 */
export function pickAudiobookStreamUrl(raw: unknown): string | null {
  const o = unwrapBookRow(raw)
  if (!o) return null
  for (const k of STREAM_KEYS) {
    const u = str(o[k])
    if (u && (u.startsWith("https://") || u.startsWith("http://") || u.startsWith("/"))) {
      return u
    }
  }
  return null
}

export function apiBookToCard(raw: unknown): BookCardData {
  const b = normalizeApiBookRecord(raw)
  if (!b) {
    return {
      id: "0",
      title: "Untitled",
      author: "Unknown",
      coverUrl: FALLBACK_COVER,
      rating: 0,
      reviewCount: 0,
      accessType: "FREE",
      format: "ebook",
      category: "General",
    }
  }
  return {
    id: String(b.id),
    title: b.title,
    author: b.author,
    coverUrl: b.coverUrl || FALLBACK_COVER,
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
