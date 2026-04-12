"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Star, Users, BookOpen, Headphones, TrendingUp } from "lucide-react"
import { HERO_BANNERS } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { CoverImage } from "@/components/ui/cover-image"

const STATS = [
  { icon: BookOpen,   label: "Books",      value: "50K+" },
  { icon: Users,      label: "Readers",    value: "2M+"  },
  { icon: Headphones, label: "Audiobooks", value: "5K+"  },
  { icon: Star,       label: "Avg Rating", value: "4.9"  },
]

export function HeroSection() {
  const [active, setActive] = React.useState(0)
  const [dir,    setDir]    = React.useState<"next" | "prev">("next")
  const [anim,   setAnim]   = React.useState(false)

  const go = React.useCallback((idx: number, direction: "next" | "prev" = "next") => {
    if (anim) return
    setDir(direction)
    setAnim(true)
    setTimeout(() => {
      setActive(idx)
      setAnim(false)
    }, 300)
  }, [anim])

  const prev = () => go((active - 1 + HERO_BANNERS.length) % HERO_BANNERS.length, "prev")
  const next = () => go((active + 1) % HERO_BANNERS.length, "next")

  React.useEffect(() => {
    const t = setTimeout(next, 7000)
    return () => clearTimeout(t)
  })

  const banner = HERO_BANNERS[active]

  return (
    <section
      className="relative bg-sidebar overflow-hidden min-h-[580px] md:min-h-[640px] flex items-center"
      aria-label="Featured promotions"
    >
      {/* Ambient light blobs */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, oklch(0.769 0.188 70.08 / 0.10) 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, oklch(0.656 0.168 232.0 / 0.07) 0%, transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
        aria-hidden
      />

      {/* Grid lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />

      <div
        className={cn(
          "max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-20 w-full transition-all duration-300",
          anim
            ? dir === "next" ? "opacity-0 translate-x-4" : "opacity-0 -translate-x-4"
            : "opacity-100 translate-x-0"
        )}
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Left: Copy ─────────────────────────────────────────── */}
          <div>
            {banner.badge && (
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="flex h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                <Badge className="bg-brand/15 text-brand border-brand/25 text-xs px-3 py-1 font-semibold tracking-wide uppercase">
                  {banner.badge} — {banner.badgeText}
                </Badge>
              </div>
            )}

            <h1 className="font-serif font-bold text-sidebar-foreground leading-[1.1] text-pretty mb-6"
              style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}
            >
              {banner.title}
            </h1>

            <p className="text-sidebar-foreground/55 leading-relaxed mb-8 max-w-[480px]"
              style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)" }}
            >
              {banner.subtitle}
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link href={banner.ctaHref}>
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8 text-[15px] shadow-lg shadow-brand/25 transition-all hover:shadow-brand/40 hover:-translate-y-0.5">
                  {banner.cta}
                </Button>
              </Link>
              {banner.secondaryCta && banner.secondaryCtaHref && (
                <Link href={banner.secondaryCtaHref}>
                  <Button
                    variant="outline"
                    className="h-12 px-8 text-[15px] border-sidebar-border/60 text-sidebar-foreground hover:bg-sidebar-accent hover:border-brand/40 transition-all"
                  >
                    {banner.secondaryCta}
                  </Button>
                </Link>
              )}
            </div>

            {/* ── Stats row ──────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-3 pt-8 border-t border-sidebar-border/40">
              {STATS.map((s, i) => (
                <div key={s.label} className="text-center group">
                  <div className="w-8 h-8 rounded-xl bg-sidebar-accent border border-sidebar-border/60 flex items-center justify-center mx-auto mb-2 group-hover:bg-brand/15 group-hover:border-brand/30 transition-colors">
                    <s.icon size={15} className="text-brand" />
                  </div>
                  <div className="font-serif text-lg font-bold text-sidebar-foreground leading-none">{s.value}</div>
                  <div className="text-[11px] text-sidebar-foreground/40 mt-0.5 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Visual ──────────────────────────────────────── */}
          <div className="relative hidden md:block">
            {/* Main cover */}
            <div className="relative rounded-2xl overflow-hidden shadow-[0_32px_80px_-12px_oklch(0_0_0/0.55)] border border-sidebar-border/30 aspect-[4/3]">
              <CoverImage
                src={banner.image}
                alt="Featured reading content"
                priority
                sizes="(min-width: 768px) 42vw, 100vw"
                coverFallbackSeed={banner.id}
              />
              {/* Dark gradient overlay for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* Trending card overlay */}
              <div className="absolute bottom-4 left-4 right-4 glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/90 flex items-center justify-center shrink-0 shadow-md">
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/50 uppercase tracking-wider mb-0.5">Trending Now</p>
                    <p className="text-sm font-semibold text-white truncate">The Lagos Chronicles</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={9} className={cn(n <= 4 ? "fill-brand text-brand" : "fill-sidebar-border text-sidebar-border")} />
                      ))}
                      <span className="text-[11px] text-white/50 ml-1">4.8 · 1,240 reviews</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating book tile — top right */}
            <div className="absolute -top-5 -right-5 glass rounded-xl p-2.5 shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="relative w-14 h-20 rounded-lg overflow-hidden">
                <CoverImage
                  src="https://placehold.co/56x80?text=Cover"
                  alt="Trending ebook cover editorial dark style"
                  sizes="56px"
                  className="rounded-lg"
                  coverFallbackSeed={`${banner.id}-floating`}
                />
              </div>
            </div>

            {/* Floating stats badge — left */}
            <div className="absolute -left-6 top-1/3 glass rounded-xl px-4 py-3 shadow-xl -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <BookOpen size={13} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">1.2M reads</div>
                  <div className="text-[10px] text-white/40">This month</div>
                </div>
              </div>
            </div>

            {/* Floating reader count — bottom right */}
            <div className="absolute -bottom-4 -right-3 glass rounded-xl px-4 py-3 shadow-xl rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {["bg-brand", "bg-blue-400", "bg-emerald-400"].map((c, i) => (
                    <div key={i} className={cn("w-6 h-6 rounded-full border-2 border-sidebar", c)} />
                  ))}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">2M+ readers</div>
                  <div className="text-[10px] text-white/40">Active this week</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide controls ─────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
        <button
          onClick={prev}
          className="w-7 h-7 rounded-full bg-sidebar-accent/80 border border-sidebar-border/60 text-sidebar-foreground/60 hover:text-brand hover:border-brand/40 flex items-center justify-center transition-all backdrop-blur-sm"
          aria-label="Previous slide"
        >
          <ChevronLeft size={14} />
        </button>
        {HERO_BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={cn(
              "rounded-full transition-all duration-300",
              i === active ? "w-7 h-2 bg-brand" : "w-2 h-2 bg-sidebar-border/60 hover:bg-brand/40"
            )}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === active ? "true" : undefined}
          />
        ))}
        <button
          onClick={next}
          className="w-7 h-7 rounded-full bg-sidebar-accent/80 border border-sidebar-border/60 text-sidebar-foreground/60 hover:text-brand hover:border-brand/40 flex items-center justify-center transition-all backdrop-blur-sm"
          aria-label="Next slide"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </section>
  )
}
