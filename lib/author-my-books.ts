/**
 * Normalizes GET /author/my-books responses for author dashboard pages.
 *
 * Laravel may return:
 * - `[ Row, ... ]` (bare array body)
 * - `{ data: Row[] }`
 * - Paginated `{ data: { data: Row[], current_page, ... } }` or `{ data: { items: Row[] } }`
 * - `{ books: Row[] }` / `{ items: Row[] }` / `{ results: Row[] }`
 * - JSON:API-style rows `{ id, type, attributes }` or `{ data: { id, attributes } }`
 *
 * Book payloads often use snake_case (`approval_status`, `cover_url`); the UI
 * expects camelCase in several places — {@link hydrateMineBookRow} bridges that.
 */

import { unwrapBookRow } from "@/lib/book-mapper"

function firstArray(...candidates: unknown[]): unknown[] {
  for (const c of candidates) {
    if (Array.isArray(c)) return c
  }
  return []
}

export function extractAuthorMyBooksRows(response: unknown): unknown[] {
  if (Array.isArray(response)) return response
  if (response == null || typeof response !== "object") return []
  const root = response as Record<string, unknown>

  const d = root.data
  if (Array.isArray(d)) return d

  if (d != null && typeof d === "object" && !Array.isArray(d)) {
    const bag = d as Record<string, unknown>
    const nested = firstArray(bag.data, bag.items, bag.books, bag.records)
    if (nested.length) return nested
  }

  return firstArray(
    root.books,
    root.items,
    root.results,
    root.records,
    (root.payload as Record<string, unknown> | undefined)?.data,
  )
}

/** Unwrap nested Laravel / JSON:API rows, then flatten `{ id, attributes }`. */
export function flattenMineBookRow(row: unknown): Record<string, unknown> | null {
  if (row == null || typeof row !== "object") return null
  const unwrapped = unwrapBookRow(row) ?? (row as Record<string, unknown>)
  const attrs = unwrapped.attributes
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    return { id: unwrapped.id, ...(attrs as Record<string, unknown>) }
  }
  return { ...unwrapped }
}

/** Merge snake_case book fields onto camelCase keys the dashboard already reads. */
export function hydrateMineBookRow(flat: Record<string, unknown>): Record<string, unknown> {
  const approval =
    flat.approvalStatus ??
    flat.approval_status ??
    flat.publication_status ??
    flat.publicationStatus ??
    flat.status
  return {
    ...flat,
    approvalStatus: approval,
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
