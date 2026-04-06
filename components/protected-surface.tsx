"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useContentProtection } from "@/hooks/use-content-protection"

type WatermarkVariant = "light" | "dark"

export interface ProtectedSurfaceProps {
  children: React.ReactNode
  /** When false, no listeners (e.g. gated route not ready). */
  active?: boolean
  enabled?: boolean
  userEmail?: string | null
  /** Watermark text color contrast. */
  watermarkVariant?: WatermarkVariant
  outerClassName?: string
  innerClassName?: string
  innerStyle?: React.CSSProperties
}

/**
 * Deterrent-only wrapper: blocks casual copy/select on descendants.
 * See `useContentProtection` — does not stop screenshots or recording.
 */
export function ProtectedSurface({
  children,
  active = true,
  enabled = true,
  userEmail,
  watermarkVariant = "light",
  outerClassName,
  innerClassName,
  innerStyle,
}: ProtectedSurfaceProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  useContentProtection(ref, enabled, active)

  const wmDark = watermarkVariant === "dark"

  return (
    <div className={cn("relative", outerClassName)}>
      {userEmail ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
          aria-hidden
        >
          <p
            className={cn(
              "absolute left-1/2 top-1/2 w-[min(140%,100vw)] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] text-center text-[11px] sm:text-xs font-medium",
              wmDark ? "text-white opacity-[0.12]" : "text-black opacity-[0.08]"
            )}
          >
            {userEmail}
          </p>
        </div>
      ) : null}
      <div
        ref={ref}
        className={cn(
          "relative z-10 select-none [-webkit-user-select:none] [-webkit-touch-callout:none]",
          innerClassName
        )}
        style={innerStyle}
      >
        {children}
      </div>
    </div>
  )
}
