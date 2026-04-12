/**
 * Normalizes GET /author/my-books responses for author dashboard pages.
 *
 * Laravel may return:
 * - `{ data: Row[] }`
 * - Paginated `{ data: { data: Row[], current_page, ... } }`
 * - JSON:API-style rows `{ id, type, attributes: { ... } }`
 *
 * Book payloads often use snake_case (`approval_status`, `cover_url`); the UI
 * expects camelCase in several places — {@link hydrateMineBookRow} bridges that.
 */

export function extractAuthorMyBooksRows(response: unknown): unknown[] {
  if (response == null || typeof response !== "object") return []
  const root = response as Record<string, unknown>
  const d = root.data
  if (Array.isArray(d)) return d
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const inner = (d as Record<string, unknown>).data
    if (Array.isArray(inner)) return inner
  }
  return []
}

/** Unwrap `{ id, attributes }` into a flat record (id + attributes). */
export function flattenMineBookRow(row: unknown): Record<string, unknown> | null {
  if (row == null || typeof row !== "object") return null
  const o = row as Record<string, unknown>
  const attrs = o.attributes
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    return { id: o.id, ...(attrs as Record<string, unknown>) }
  }
  return { ...o }
}

/** Merge snake_case book fields onto camelCase keys the dashboard already reads. */
export function hydrateMineBookRow(flat: Record<string, unknown>): Record<string, unknown> {
  return {
    ...flat,
    approvalStatus: flat.approvalStatus ?? flat.approval_status,
    accessType: flat.accessType ?? flat.access_type,
    coverUrl: flat.coverUrl ?? flat.cover_url,
    createdAt: flat.createdAt ?? flat.created_at,
    reviewCount: flat.reviewCount ?? flat.review_count,
  }
}

export function normalizeAuthorMyBooksList(response: unknown): Record<string, unknown>[] {
  return extractAuthorMyBooksRows(response)
    .map(flattenMineBookRow)
    .filter((r): r is Record<string, unknown> => r != null)
    .map(hydrateMineBookRow)
}
