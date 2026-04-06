/**
 * Server-only fetch for SEO (sitemap, generateMetadata).
 * Only calls the network when NEXT_PUBLIC_API_URL is set (matches client {@link apiUrlConfigured}).
 * Paths are appended under `/api` (same as {@link ./api.ts}).
 */

import { apiUrlConfigured } from "@/lib/auth-mode"

function laravelApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!raw) return ""
  let base = raw.replace(/\/+$/, "")
  if (!base.endsWith("/api")) {
    base = `${base}/api`
  }
  return base
}

const SERVER_FETCH_MS = 8000

export async function serverFetchJson<T>(
  path: string,
  revalidateSeconds: number | false = 120
): Promise<T | null> {
  if (!apiUrlConfigured()) return null
  const base = laravelApiBaseUrl()
  if (!base) return null

  const p = path.startsWith("/") ? path : `/${path}`
  const url = `${base}${p}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), SERVER_FETCH_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      ...(revalidateSeconds === false
        ? { cache: "no-store" as const }
        : { next: { revalidate: revalidateSeconds } }),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.myscriptic.com").replace(/\/$/, "")
}
