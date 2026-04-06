"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronLeft, ChevronRight, GraduationCap, Loader2, ExternalLink, Search } from "lucide-react"
import { adminApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { cn } from "@/lib/utils"
import type { CourseAccessType } from "@/lib/course-access"
import { formatCourseAccessLabel } from "@/lib/course-access"

type Row = {
  id: string
  slug: string
  title: string
  published: boolean
  access_type: string
  price: number | null
  currency: string | null
  author: { id: string; name: string | null; email: string | null }
  lessons_count: number
  updated_at: string | null
}

type ListMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type PublishedFilter = "all" | "published" | "draft"

export default function AdminAuthorCoursesPage() {
  const live = apiUrlConfigured()
  const [rows, setRows] = React.useState<Row[]>([])
  const [meta, setMeta] = React.useState<ListMeta | null>(null)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [debouncedQ, setDebouncedQ] = React.useState("")
  const [publishedFilter, setPublishedFilter] = React.useState<PublishedFilter>("all")

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 350)
    return () => window.clearTimeout(t)
  }, [query])

  React.useEffect(() => {
    if (!live) return
    let cancelled = false
    setLoading(true)
    const params: Record<string, string> = {
      page: String(page),
      per_page: "30",
    }
    if (debouncedQ) params.q = debouncedQ
    if (publishedFilter === "published") params.published = "1"
    if (publishedFilter === "draft") params.published = "0"

    void adminApi
      .authorCourses(params)
      .then(res => {
        if (cancelled) return
        setRows(res.data)
        setMeta(res.meta)
      })
      .catch(() => {
        if (!cancelled) {
          setRows([])
          setMeta(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [live, page, debouncedQ, publishedFilter])

  const hasFilters = debouncedQ.length > 0 || publishedFilter !== "all"

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-6"
      >
        <ChevronLeft size={14} /> Admin dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-brand" />
            Author video courses
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Published and draft courses created by authors (YouTube / Vimeo lesson links). Read-only overview; authors
            edit from their dashboard.
          </p>
        </div>
      </div>

      {!live ? (
        <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-8 text-center">
          Set <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_API_URL</code> and sign in as admin to load
          courses from the API.
        </p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Label htmlFor="admin-courses-q" className="text-xs text-muted-foreground mb-1.5 block">
                Search title or slug
              </Label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
                <Input
                  id="admin-courses-q"
                  type="search"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Filter…"
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="admin-courses-status" className="text-xs text-muted-foreground mb-1.5 block">
                Status
              </Label>
              <select
                id="admin-courses-status"
                value={publishedFilter}
                onChange={e => {
                  setPublishedFilter(e.target.value as PublishedFilter)
                  setPage(1)
                }}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                <option value="all">All</option>
                <option value="published">Published only</option>
                <option value="draft">Draft only</option>
              </select>
            </div>
          </div>

          {loading && rows.length === 0 ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-xl">
              {hasFilters ? "No courses match these filters." : "No courses found."}
            </p>
          ) : (
            <div className="relative rounded-xl">
              {loading ? (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]"
                  aria-busy
                >
                  <Loader2 className="h-8 w-8 animate-spin text-brand" />
                </div>
              ) : null}
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-center">Lessons</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium text-foreground line-clamp-2">{r.title}</div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">/{r.slug}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(() => {
                            const raw = r.access_type
                            const access: CourseAccessType =
                              raw === "FREE" || raw === "PAID" || raw === "SUBSCRIPTION" ? raw : "SUBSCRIPTION"
                            return formatCourseAccessLabel(access, r.price, r.currency ?? undefined)
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.author.name ?? "—"}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {r.author.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{r.lessons_count}</TableCell>
                        <TableCell className="text-center">
                          {r.published ? (
                            <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0">
                              Live
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Draft
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
                            <a href={`/courses/${r.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink size={12} /> View
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {meta && meta.last_page > 1 ? (
                <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
                  <span>
                    Page {meta.current_page} of {meta.last_page} ({meta.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.last_page || loading}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  )
}
