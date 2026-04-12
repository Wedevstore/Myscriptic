import { libraryApi } from "@/lib/api"
import { apiBookToCard, pickAudiobookStreamUrl } from "@/lib/book-mapper"

/**
 * Resolves a playable URL for an audiobook.
 *
 * 1. Uses any direct URL on the book payload (`audio_url`, `audiobook_url`, `stream_url`, …)
 *    — e.g. public CDN or a short-lived URL returned by Laravel.
 * 2. If the book is an audiobook and no URL is present, calls
 *    `POST /api/library/:bookId/signed-url` so the browser can stream the MP3/M4A
 *    object stored in S3 (same flow as ebook file downloads).
 */
export async function resolveAudiobookStreamUrl(
  bookPayload: unknown,
  bookId: string,
  options: { tryLibrarySignedUrl: boolean }
): Promise<string | null> {
  const direct = pickAudiobookStreamUrl(bookPayload)
  if (direct) return direct

  const card = apiBookToCard(bookPayload)
  if (card.format !== "audiobook") return null

  if (!options.tryLibrarySignedUrl) return null

  try {
    const res = await libraryApi.getSignedUrl(bookId)
    const url = res?.url?.trim()
    return url && (url.startsWith("https://") || url.startsWith("http://")) ? url : null
  } catch {
    return null
  }
}
