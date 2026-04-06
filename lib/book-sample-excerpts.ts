/**
 * Inline samples for book detail: API `sampleExcerpt` wins; else static mock by id.
 * Copy-protected in the UI via `ProtectedSurface`, not DRM.
 */

/** Demo reader aligns with mock `bk_001` — The Lagos Chronicles */
const BK_001_OPENING = `Chapter 1: The City That Never Sleeps

The Lagos sun had already begun its lazy descent by the time Adaeze Okonkwo stepped out of the yellow danfo and onto the cracked pavement of Victoria Island. Her leather satchel — a gift from her mother, worn smooth at the straps — hung heavy across her shoulder, stuffed with the manuscripts she had been editing all afternoon.

She paused at the intersection, watching the traffic policeman in his faded white uniform perform his daily ballet, arms slicing the air in gestures that only the most seasoned Lagos drivers could interpret. A bus driver leaned on his horn. Someone shouted in Yoruba. A child pressed her face against the window of a black SUV, watching the chaos with wide, curious eyes.

Lagos. It never ceased to amaze her.`

const BK_002_OPENING = `You do not rise to the level of your goals. You fall to the level of your systems.

This edition opens with market women in Ibadan who rebuilt their savings habits one tiny stack of receipts at a time — no drama, no apps, just repetition until the behaviour felt inevitable.`

const BK_003_OPENING = `After the rains, the savanna holds its breath. Every blade of grass remembers the hoofbeats of ancestors who crossed here before maps had names.

This collection begins at dawn, with a girl who writes her dreams on the inside of seed packets so the wind cannot steal them.`

const STATIC_BY_BOOK_ID: Record<string, string> = {
  bk_001: BK_001_OPENING,
  bk_002: BK_002_OPENING,
  bk_003: BK_003_OPENING,
}

export function resolveBookSampleExcerpt(
  bookId: string,
  apiSample: string | null | undefined
): string | null {
  const trimmed = typeof apiSample === "string" ? apiSample.trim() : ""
  if (trimmed) return trimmed
  const local = STATIC_BY_BOOK_ID[bookId]
  return local?.trim() ? local.trim() : null
}
