/** Shared with home trending authors, /authors listing, discover, and author profiles. */

export const AUTHOR_FOLLOW_STORAGE_KEY = "myscriptic_trending_author_follows"

const LEGACY_DISCOVER_FOLLOWS_KEY = "myscriptic_discover_follows"

/** Merge one-time discover author toggles into the shared set, then remove the legacy key. */
export function mergeLegacyDiscoverAuthorFollows(): void {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(LEGACY_DISCOVER_FOLLOWS_KEY)
    if (!raw) return
    const o = JSON.parse(raw) as Record<string, unknown>
    const set = loadAuthorFollowIdsFromStorage()
    for (const [k, v] of Object.entries(o)) {
      if (v === true) set.add(k)
    }
    saveAuthorFollowIdsToStorage(set)
    localStorage.removeItem(LEGACY_DISCOVER_FOLLOWS_KEY)
  } catch {
    /* ignore */
  }
}

export function loadAuthorFollowIdsFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(AUTHOR_FOLLOW_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

export function saveAuthorFollowIdsToStorage(s: Set<string>) {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTHOR_FOLLOW_STORAGE_KEY, JSON.stringify([...s]))
}

export function formatAuthorFollowerCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

type AppRouterLike = { push: (href: string) => void }

/**
 * Author follows are account-backed. When signed out, send users to login with a return path.
 * @returns true if the caller may proceed with follow/unfollow logic.
 */
export function ensureSignedInForAuthorFollow(
  router: AppRouterLike,
  isAuthenticated: boolean,
  returnPath: string
): boolean {
  if (isAuthenticated) return true
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`
  router.push(`/auth/login?next=${encodeURIComponent(path)}`)
  return false
}
