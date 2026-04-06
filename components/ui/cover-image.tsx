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

/**
 * Fills a `relative` positioned parent. Uses `unoptimized` so arbitrary cover URLs
 * (API/CDN) work without expanding `next.config` `remotePatterns` for every host.
 */
export function CoverImage({ src, alt, className, priority, sizes }: CoverImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 768px) 50vw, 320px"}
      className={cn("object-cover", className)}
      unoptimized
      priority={priority}
    />
  )
}
