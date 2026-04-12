/**
 * Book/cover URLs from the API often point at private S3 objects (`403` for anonymous GET).
 * - Optional `NEXT_PUBLIC_BOOK_COVER_CDN_BASE`: rewrite virtual-hosted S3 URLs to a public CDN/CloudFront origin.
 * - UI layer (`CoverImage`) can fall back to deterministic Picsum when load still fails.
 */

const CDN_BASE = process.env.NEXT_PUBLIC_BOOK_COVER_CDN_BASE?.trim().replace(/\/$/, "")

/** Rewrite `https://bucket.s3.*.amazonaws.com/path` → `{CDN_BASE}/path` when CDN_BASE is set. */
export function rewriteS3CoverToCdn(url: string): string {
  if (!CDN_BASE || !url.trim()) return url
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith(".amazonaws.com")) return url
    return `${CDN_BASE}${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}
