"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { siteConfigApi } from "@/lib/api"
import { ensureAdsenseScript, pushAdsenseSlot } from "@/lib/adsense"

/**
 * In-feed / multiline display ad. Uses ads_slot_feed from site config.
 */
export function AdInFeed({ className }: { className?: string }) {
  const [ready, setReady] = React.useState(false)
  const [clientId, setClientId] = React.useState("")
  const [slot, setSlot] = React.useState("")
  const pushed = React.useRef(false)

  React.useEffect(() => {
    let alive = true
    siteConfigApi
      .get()
      .then(j => {
        if (!alive) return
        const a = j.ads
        if (a.enabled && a.client_id && a.slot_feed) {
          setClientId(a.client_id)
          setSlot(a.slot_feed)
          setReady(true)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    if (!ready || !clientId || pushed.current) return
    ensureAdsenseScript(clientId)
    const t = window.setTimeout(() => {
      pushAdsenseSlot()
      pushed.current = true
    }, 0)
    return () => window.clearTimeout(t)
  }, [ready, clientId])

  if (!ready || !slot) return null

  return (
    <div
      className={cn(
        "my-6 w-full min-h-[120px] flex justify-center items-center rounded-xl border border-dashed border-border/70 bg-muted/10 py-4",
        className
      )}
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center" }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client={clientId}
        data-ad-slot={slot}
      />
    </div>
  )
}
