"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen, Zap, Briefcase, Heart, Monitor, Landmark, PenLine, Smile,
  type LucideIcon,
} from "lucide-react"
import { CATEGORIES } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Zap, Briefcase, Heart, Monitor, Landmark, PenLine, Smile,
}

export function CategoryStrip() {
  const [active, setActive] = React.useState<string | null>(null)

  return (
    <section className="py-12 border-b border-border/60 bg-surface-sunken" aria-label="Browse by category">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Explore</p>
            <h2 className="font-serif text-2xl font-bold text-foreground leading-tight">Browse Categories</h2>
          </div>
          <Link
            href="/books"
            className="brand-link text-sm hidden sm:inline-flex items-center gap-1 pb-0.5"
          >
            View all genres
          </Link>
        </div>

        {/* Category pills */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin" role="list">
          {CATEGORIES.map(cat => {
            const Icon = ICON_MAP[cat.icon] ?? BookOpen
            const isActive = active === cat.id
            return (
              <Link
                key={cat.id}
                href={`/books?category=${cat.id}`}
                role="listitem"
                onClick={() => setActive(isActive ? null : cat.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 group min-w-max",
                  isActive
                    ? "bg-brand text-primary-foreground border-brand shadow-md shadow-brand/25"
                    : "bg-card border-border hover:border-brand/40 hover:shadow-sm hover:bg-brand/5"
                )}
              >
                <span className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-white/20" : cn(cat.color, "group-hover:scale-110 transition-transform")
                )}>
                  <Icon size={14} aria-hidden className={isActive ? "text-primary-foreground" : ""} />
                </span>
                <div>
                  <div className={cn(
                    "text-sm font-semibold leading-tight transition-colors",
                    isActive ? "text-primary-foreground" : "text-foreground group-hover:text-brand"
                  )}>
                    {cat.label}
                  </div>
                  <div className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {cat.count.toLocaleString()} books
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
