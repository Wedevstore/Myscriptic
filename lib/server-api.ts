/**
 * Server-only fetch for SEO (sitemap, generateMetadata).
 * Uses NEXT_PUBLIC_API_URL (same origin as the browser client).
 */

function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "https://api.myscriptic.com/api"
  return raw.replace(/\/$/, "")
}

export async function serverFetchJson<T>(
  path: string,
  revalidateSeconds: number | false = 120
): Promise<T | null> {
  const p = path.startsWith("/") ? path : `/${path}`
  const url = `${apiBase()}${p}`
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      ...(revalidateSeconds === false
        ? { cache: "no-store" as const }
        : { next: { revalidate: revalidateSeconds } }),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://myscriptic.com").replace(/\/$/, "")
}
