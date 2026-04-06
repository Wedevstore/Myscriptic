"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Zap, ArrowRight } from "lucide-react"

function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = React.useState(targetMs)
  React.useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  const s = Math.floor((remaining % 60_000) / 1_000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return { h: pad(h), m: pad(m), s: pad(s) }
}

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative overflow-hidden">
        <span className="font-mono text-3xl md:text-4xl font-extrabold text-white tabular-nums">
          {value}
        </span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</span>
    </div>
  )
}

export function FlashSaleBanner() {
  const { h, m, s } = useCountdown(8 * 3_600_000)

  return (
    <section className="py-5 bg-sidebar" aria-label="Flash sale">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Full-width strip */}
        <div className="relative rounded-2xl overflow-hidden border border-brand/20">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand to-amber-400" />
          {/* Noise */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
            aria-hidden
          />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 px-6 md:px-10 py-6">
            {/* Left */}
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Zap size={22} className="text-white" fill="currentColor" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/65">Flash Sale</span>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Up to 60% off
                  </span>
                </div>
                <h3 className="font-serif text-xl md:text-2xl font-bold text-white text-balance leading-tight">
                  Weekend Reading Deals
                </h3>
                <p className="text-sm text-white/60 mt-0.5">
                  Hundreds of titles discounted for a limited time.
                </p>
              </div>
            </div>

            {/* Center: Timer */}
            <div className="flex items-center gap-1 md:gap-2">
              <TimeUnit value={h} label="hours" />
              <span className="text-3xl font-bold text-white/40 pb-4 mx-0.5">:</span>
              <TimeUnit value={m} label="mins" />
              <span className="text-3xl font-bold text-white/40 pb-4 mx-0.5">:</span>
              <TimeUnit value={s} label="secs" />
            </div>

            {/* Right: CTA */}
            <div className="flex-shrink-0">
              <Link href="/sales">
                <Button className="bg-white hover:bg-white/90 text-brand font-bold px-7 h-12 gap-2 shadow-xl shadow-black/20">
                  Shop Now <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
