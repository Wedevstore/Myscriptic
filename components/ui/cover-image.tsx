"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { rewriteS3CoverToCdn } from "@/lib/cover-display"
import { demoPic } from "@/lib/demo-images"

const COVER_PLACEHOLDER = "/images/book-placeholder.svg"

type CoverImageProps = {
  src: string
  alt: string
  className?: string
  /** LCP / above-the-fold */
  priority?: boolean
  sizes?: string
  /**
   * If the URL still fails (e.g. private S3 with no CDN), show deterministic Picsum art before the SVG placeholder.
   */
  coverFallbackSeed?: string
}

/** Hosts where the Next.js image optimizer should proxy the URL (CDN / placeholders). */
const OPTIMIZER_HOSTS = ["placehold.co", "picsum.photos", "fastly.picsum.photos"]

/**
 * S3 / CloudFront: load in the browser (same as `<img src>`), not via `/_next/image`.
 * Many buckets are public for browsers but fail or 403 for the optimizer’s server-side fetch.
 */
function useImageOptimizer(url: string): boolean {
  if (!url.trim()) return false
  try {
    const hostname = new URL(url).hostname
    if (hostname.endsWith(".amazonaws.com") || hostname.endsWith(".cloudfront.net")) {
      return false
    }
    return OPTIMIZER_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))
  } catch {
    return url.startsWith("/")
  }
}

function normalizeSrc(raw: string): string {
  const t = raw?.trim()
  return t || COVER_PLACEHOLDER
}

function initialDisplaySrc(raw: string): string {
  return rewriteS3CoverToCdn(normalizeSrc(raw))
}

export function CoverImage({
  src,
  alt,
  className,
  priority,
  sizes,
  coverFallbackSeed,
}: CoverImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(() => initialDisplaySrc(src))

  useEffect(() => {
    setResolvedSrc(initialDisplaySrc(src))
  }, [src])

  return (
    <Image
      key={resolvedSrc}
      src={resolvedSrc}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 768px) 50vw, 320px"}
      className={cn("object-cover", className)}
      unoptimized={!useImageOptimizer(resolvedSrc)}
      priority={priority}
      onError={() => {
        setResolvedSrc(cur => {
          if (cur === COVER_PLACEHOLDER) return cur
          if (cur.includes("picsum.photos")) return COVER_PLACEHOLDER
          const viaCdn = rewriteS3CoverToCdn(cur)
          if (viaCdn !== cur) return viaCdn
          if (coverFallbackSeed) return demoPic(`cover-${coverFallbackSeed}`)
          return COVER_PLACEHOLDER
        })
      }}
    />
  )
}
