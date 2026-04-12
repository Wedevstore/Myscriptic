"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen, Zap, Briefcase, Heart, Monitor, Landmark, PenLine, Smile,
  type LucideIcon,
} from "lucide-react"
import { CATEGORIES } from "@/lib/mock-data"
import { booksApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Zap, Briefcase, Heart, Monitor, Landmark, PenLine, Smile,
}

const LABEL_ICON: Record<string, string> = {
  fiction: "BookOpen", "self-help": "Zap", selfhelp: "Zap", business: "Briefcase",
  romance: "Heart", technology: "Monitor", tech: "Monitor", historical: "Landmark",
  history: "Landmark", poetry: "PenLine", children: "Smile", leadership: "Briefcase",
  finance: "Briefcase", "sci-fi": "Monitor", scifi: "Monitor", lifestyle: "Heart",
  magazine: "BookOpen",
}

const LABEL_COLOR: Record<string, string> = {
  fiction: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "self-help": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  selfhelp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  business: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  romance: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  technology: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  tech: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  historical: "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-400",
  history: "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-400",
  poetry: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  children: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  leadership: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "sci-fi": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  scifi: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  lifestyle: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  magazine: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
}

const DEFAULT_COLOR = "bg-muted text-muted-foreground"

interface CategoryItem {
  id: string
  label: string
  icon: string
  count: number | null
  color: string
}

function normalizeMockCategories(): CategoryItem[] {
  return CATEGORIES.map(c => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    count: c.count,
    color: c.color,
  }))
}

function normalizeApiCategories(
  data: (string | { name: string; slug?: string; id?: string | number; count?: number; book_count?: number })[]
): CategoryItem[] {
  return data.map((entry, i) => {
    const name = typeof entry === "string" ? entry : entry.name
    const slug = typeof entry === "string" ? entry : (entry.slug ?? entry.name)
    const count = typeof entry === "object" ? (entry.count ?? entry.book_count ?? null) : null
    const key = name.toLowerCase().replace(/\s+/g, "-")
    const icon = LABEL_ICON[key] ?? LABEL_ICON[key.replace(/-/g, "")] ?? "BookOpen"
    const color = LABEL_COLOR[key] ?? LABEL_COLOR[key.replace(/-/g, "")] ?? DEFAULT_COLOR

    return {
      id: typeof entry === "object" && entry.id ? String(entry.id) : `api_cat_${i}`,
      label: name,
      icon,
      count,
      color,
      slug,
    }
  })
}

export function CategoryStrip() {
  const [active, setActive] = React.useState<string | null>(null)
  const [categories, setCategories] = React.useState<CategoryItem[]>(normalizeMockCategories)

  React.useEffect(() => {
    if (!apiUrlConfigured()) return
    let alive = true
    booksApi.categories().then(res => {
      if (!alive || !res.data || res.data.length === 0) return
      setCategories(normalizeApiCategories(res.data))
    }).catch(() => { /* keep mock fallback */ })
    return () => { alive = false }
  }, [])

  return (
    <section className="py-12 border-b border-border/60 bg-surface-sunken" aria-label="Browse by category">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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

        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin" role="list">
          {categories.map(cat => {
            const Icon = ICON_MAP[cat.icon] ?? BookOpen
            const isActive = active === cat.id
            return (
              <Link
                key={cat.id}
                href={`/books?category=${encodeURIComponent(cat.label)}`}
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
                  {cat.count != null && (
                    <div className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {cat.count.toLocaleString()} books
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
