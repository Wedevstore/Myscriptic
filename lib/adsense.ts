"use client"

let loadedClientId: string | null = null

/** Load the AdSense script once (per tab) for the given client id. */
export function ensureAdsenseScript(clientId: string): void {
  if (typeof window === "undefined" || !clientId) return
  if (loadedClientId === clientId) return
  loadedClientId = clientId
  const s = document.createElement("script")
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`
  s.crossOrigin = "anonymous"
  document.head.appendChild(s)
}

export function pushAdsenseSlot(): void {
  try {
    const w = window as Window & { adsbygoogle?: Record<string, unknown>[] }
    w.adsbygoogle = w.adsbygoogle || []
    w.adsbygoogle.push({})
  } catch {
    /* ignore */
  }
}
