"use client"

import * as React from "react"
import { parseVideoUrl } from "@/lib/video-embed"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

export function VideoEmbedFrame({ url, title }: { url: string; title?: string }) {
  const parsed = React.useMemo(() => parseVideoUrl(url), [url])

  if (!parsed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5",
          "aspect-video text-center p-6"
        )}
      >
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground max-w-sm">
          This lesson URL is not a supported YouTube or Vimeo link. Edit the course and paste a valid watch URL.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg border border-border">
      <iframe
        title={title ?? "Video lesson"}
        src={parsed.embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}
