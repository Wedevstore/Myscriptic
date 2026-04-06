/**
 * Parse YouTube / Vimeo page URLs into iframe embed URLs.
 * Authors paste watch links only — no file uploads.
 */

export type VideoProvider = "youtube" | "vimeo"

export interface ParsedVideo {
  provider: VideoProvider
  /** YouTube 11-char id or Vimeo numeric id string */
  videoId: string
  embedUrl: string
}

function extractYoutubeId(input: string): string | null {
  try {
    const u = new URL(input.trim())
    const host = u.hostname.replace(/^www\./, "")
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname.startsWith("/watch")) {
        const v = u.searchParams.get("v")
        return v && /^[\w-]{11}$/.test(v) ? v : null
      }
      const m = u.pathname.match(/^\/embed\/([\w-]{11})/)
      if (m) return m[1]
      const m2 = u.pathname.match(/^\/shorts\/([\w-]{11})/)
      if (m2) return m2[1]
    }
  } catch {
    /* fall through */
  }
  return null
}

function extractVimeoId(input: string): string | null {
  try {
    const u = new URL(input.trim())
    const host = u.hostname.replace(/^www\./, "")
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null
    const m = u.pathname.match(/\/(?:video\/)?(\d+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

export function parseVideoUrl(url: string): ParsedVideo | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  const yt = extractYoutubeId(trimmed)
  if (yt) {
    return {
      provider: "youtube",
      videoId: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?rel=0`,
    }
  }
  const vm = extractVimeoId(trimmed)
  if (vm) {
    return {
      provider: "vimeo",
      videoId: vm,
      embedUrl: `https://player.vimeo.com/video/${vm}`,
    }
  }
  return null
}

export function isAllowedVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null
}
