"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CmsHomepageItem } from "@/lib/cms-homepage"
import { resolveCmsLink } from "@/lib/cms-homepage"

interface Props {
  items: CmsHomepageItem[]
}

export function CmsHeroCarousel({ items }: Props) {
  const banners = items.filter(i => i.item_type === "banner" && (i.title || i.image_url))
  const [active, setActive] = React.useState(0)
  const [anim, setAnim] = React.useState(false)
  const [dir, setDir] = React.useState<"next" | "prev">("next")

  if (banners.length === 0) return null

  const go = React.useCallback(
    (idx: number, direction: "next" | "prev" = "next") => {
      if (anim) return
      setDir(direction)
      setAnim(true)
      setTimeout(() => {
        setActive(idx)
        setAnim(false)
      }, 280)
    },
    [anim]
  )

  const prev = () => go((active - 1 + banners.length) % banners.length, "prev")
  const next = () => go((active + 1) % banners.length, "next")

  React.useEffect(() => {
    const id = setInterval(() => {
      setActive(a => (a + 1) % banners.length)
    }, 7000)
    return () => clearInterval(id)
  }, [banners.length])

  const b = banners[active]
  const href = resolveCmsLink(b.link_type, b.link_value)
  const external = b.link_type === "external"

  return (
    <section
      className="relative bg-sidebar overflow-hidden min-h-[520px] md:min-h-[580px] flex items-center"
      aria-label="Featured promotions"
    >
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, oklch(0.769 0.188 70.08 / 0.10) 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
        aria-hidden
      />

      <div
        className={cn(
          "max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-18 w-full transition-all duration-300",
          anim
            ? dir === "next"
              ? "opacity-0 translate-x-4"
              : "opacity-0 -translate-x-4"
            : "opacity-100 translate-x-0"
        )}
      >
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <h1
              className="font-serif font-bold text-sidebar-foreground leading-[1.1] text-pretty mb-6"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
            >
              {b.title ?? "Welcome"}
            </h1>
            {b.subtitle && (
              <p className="text-sidebar-foreground/55 leading-relaxed mb-8 max-w-[480px] text-[15px]">
                {b.subtitle}
              </p>
            )}
            {b.cta_label && (
              <div className="flex flex-wrap gap-3">
                {external ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8">
                      {b.cta_label}
                    </Button>
                  </a>
                ) : (
                  <Link href={href}>
                    <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8">
                      {b.cta_label}
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="relative hidden md:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-sidebar-border/30 aspect-[4/3]">
              {b.image_url ? (
                <img src={b.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <button
          type="button"
          onClick={prev}
          className="w-8 h-8 rounded-full bg-sidebar-accent/80 border border-sidebar-border/60 flex items-center justify-center"
          aria-label="Previous"
        >
          <ChevronLeft size={16} />
        </button>
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            className={cn(
              "rounded-full transition-all",
              i === active ? "w-7 h-2 bg-brand" : "w-2 h-2 bg-sidebar-border/60"
            )}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
        <button
          type="button"
          onClick={next}
          className="w-8 h-8 rounded-full bg-sidebar-accent/80 border border-sidebar-border/60 flex items-center justify-center"
          aria-label="Next"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  )
}
