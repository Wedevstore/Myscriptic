"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

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
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 768px) 50vw, 320px"}
      className={cn("object-cover", className)}
      unoptimized={!canOptimize(src)}
      priority={priority}
    />
  )
}
