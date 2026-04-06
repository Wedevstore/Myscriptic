"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { siteConfigApi } from "@/lib/api"
import { ensureAdsenseScript, pushAdsenseSlot } from "@/lib/adsense"

type AdsCfg = {
  enabled: boolean
  client_id: string
  slot_banner: string
}

/**
 * Responsive display ad (banner placement). Controlled by GET /api/site-config and admin toggles.
 */
export function AdBanner({ className }: { className?: string }) {
  const [cfg, setCfg] = React.useState<AdsCfg | null>(null)
  const pushed = React.useRef(false)

  React.useEffect(() => {
    let alive = true
    siteConfigApi
      .get()
      .then(j => {
        if (!alive) return
        const a = j.ads
        setCfg({
          enabled: !!a.enabled && !!a.client_id && !!a.slot_banner,
          client_id: a.client_id,
          slot_banner: a.slot_banner,
        })
      })
      .catch(() => alive && setCfg(null))
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    if (!cfg?.enabled || pushed.current) return
    ensureAdsenseScript(cfg.client_id)
    const t = window.setTimeout(() => {
      pushAdsenseSlot()
      pushed.current = true
    }, 0)
    return () => window.clearTimeout(t)
  }, [cfg])

  if (!cfg?.enabled) return null

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl min-h-[90px] flex justify-center items-center overflow-hidden rounded-xl border border-border/60 bg-muted/20",
        className
      )}
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={cfg.client_id}
        data-ad-slot={cfg.slot_banner}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  )
}
