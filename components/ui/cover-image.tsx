"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const COVER_PLACEHOLDER = "/images/book-placeholder.svg"

type CoverImageProps = {
  src: string
  alt: string
  className?: string
  /** LCP / above-the-fold */
  priority?: boolean
  sizes?: string
}

const OPTIMIZABLE_HOSTS = [
  "amazonaws.com",
  "cloudfront.net",
  "placehold.co",
  "picsum.photos",
  "fastly.picsum.photos",
]

function canOptimize(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return OPTIMIZABLE_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))
  } catch {
    return url.startsWith("/")
  }
}

export function CoverImage({ src, alt, className, priority, sizes }: CoverImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src)

  useEffect(() => {
    setResolvedSrc(src)
  }, [src])

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 768px) 50vw, 320px"}
      className={cn("object-cover", className)}
      unoptimized={!canOptimize(resolvedSrc)}
      priority={priority}
      onError={() => setResolvedSrc(COVER_PLACEHOLDER)}
    />
  )
}
