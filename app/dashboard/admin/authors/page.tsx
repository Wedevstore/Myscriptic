"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { adminApi, authorApi } from "@/lib/api"
import { seedP4, activityLogStore } from "@/lib/store-p4"
import { Search, CheckCircle2, XCircle, Clock, Download, BookOpen, Eye, Star } from "lucide-react"

interface Author {
  id: string
  /** Present for pending rows from author applications API */
  applicationId?: string
  name: string
  email: string
  status: "approved" | "pending" | "rejected"
  books: number
  totalReads: number
  totalEarned: number
  joinedAt: string
  genres: string[]
  bio: string
  rating: number
}

const MOCK_AUTHORS: Author[] = [
  { id: "a01", name: "Chimamanda A.", email: "chimamanda@example.com", status: "approved", books: 12, totalReads: 48200, totalEarned: 4210, joinedAt: "Jan 2024", genres: ["Fiction", "Literary"], bio: "Award-winning novelist known for her powerful narratives on African womanhood.", rating: 4.9 },
  { id: "a02", name: "Tunde Balogun", email: "tunde@example.com", status: "approved", books: 8, totalReads: 27400, totalEarned: 2780, joinedAt: "Feb 2024", genres: ["Business", "Self-Help"], bio: "Serial entrepreneur and bestselling author of The Entrepreneur's Code.", rating: 4.7 },
  { id: "a03", name: "Kofi Mensah", email: "kofi@example.com", status: "approved", books: 6, totalReads: 18200, totalEarned: 1920, joinedAt: "May 2024", genres: ["Technology", "Science"], bio: "Data scientist and tech educator building accessible STEM content for Africa.", rating: 4.6 },
  { id: "a04", name: "Seun Williams", email: "seun@example.com", status: "pending", books: 2, totalReads: 0, totalEarned: 0, joinedAt: "Jul 2024", genres: ["Poetry", "Fiction"], bio: "Debut author with two completed manuscripts currently under editorial review.", rating: 0 },
  { id: "a05", name: "Bisi Ogunwale", email: "bisi.o@example.com", status: "pending", books: 3, totalReads: 0, totalEarned: 0, joinedAt: "Aug 2024", genres: ["Romance", "Fiction"], bio: "Romance writer from Lagos. Her novel 'Daughters of Abuja' has a devoted fan base.", rating: 0 },
  { id: "a06", name: "Aisha Hassan", email: "aisha@example.com", status: "pending", books: 1, totalReads: 0, totalEarned: 0, joinedAt: "Sep 2024", genres: ["History", "Non-Fiction"], bio: "Historian and cultural commentator with a focus on pre-colonial West Africa.", rating: 0 },
  { id: "a07", name: "Emeka Osei", email: "emeka.o@example.com", status: "rejected", books: 0, totalReads: 0, totalEarned: 0, joinedAt: "Oct 2024", genres: ["Business"], bio: "Application rejected due to incomplete submission and missing sample chapters.", rating: 0 },
]

const STATUS_CLS: Record<string, string> = {
  approved: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  pending: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  rejected: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
}
const STATUS_ICON: Record<string, React.ElementType> = {
  approved: CheckCircle2,
  pending: Clock,
  rejected: XCircle,
}

function formatJoined(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" })
  } catch {
    return "—"
  }
}

function mapStatRow(row: Record<string, unknown>): Author {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    status: "approved",
    books: Number(row.books_count ?? 0),
    totalReads: Math.max(0, Math.round(Number(row.total_read_seconds ?? 0) / 60)),
    totalEarned: Number(row.total_earnings_usd ?? 0),
    joinedAt: formatJoined(String(row.created_at ?? "")),
    genres: [],
    bio: "",
    rating: 0,
  }
}

function mapPendingApp(row: Record<string, unknown>): Author {
  const u = row.user as Record<string, unknown> | undefined
  return {
    id: `app:${String(row.id ?? "")}`,
    applicationId: String(row.id ?? ""),
    name: String(u?.name ?? ""),
    email: String(u?.email ?? ""),
    status: "pending",
    books: 0,
    totalReads: 0,
    totalEarned: 0,
    joinedAt: formatJoined(String(row.created_at ?? "")),
    genres: [],
    bio: String(row.bio ?? ""),
    rating: 0,
  }
}

export default function AdminAuthorsPage() {
  const live = apiUrlConfigured()
  const [authors, setAuthors] = React.useState<Author[]>(MOCK_AUTHORS)
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [filter, setFilter] = React.useState<"ALL" | "approved" | "pending" | "rejected">("ALL")
  const [viewing, setViewing] = React.useState<Author | null>(null)
  const [page, setPage] = React.useState(1)
  const [lastPage, setLastPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const reload = React.useCallback(async () => {
    if (!live) {
      seedP4()
      setAuthors(MOCK_AUTHORS)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { page: String(page), per_page: "25" }
      if (debouncedQuery) params.search = debouncedQuery
      const [statsRes, pendingRes] = await Promise.all([
        adminApi.authorStats(params),
        adminApi.authorsPendingApplications(),
      ])
      const statRows = (statsRes.data ?? []) as Record<string, unknown>[]
      const fromStats = statRows.map(mapStatRow)
      const pendingRows = (pendingRes.data ?? []) as Record<string, unknown>[]
      const fromApps = pendingRows.map(mapPendingApp)
      setAuthors([...fromApps, ...fromStats])
      setLastPage(Math.max(1, Number((statsRes.meta as { last_page?: number })?.last_page ?? 1)))
      setTotal(Number((statsRes.meta as { total?: number })?.total ?? fromStats.length))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load authors")
      setAuthors([])
    } finally {
      setLoading(false)
    }
  }, [live, page, debouncedQuery])

  React.useEffect(() => {
    void reload()
  }, [reload])

  React.useEffect(() => {
    if (live) setPage(1)
  }, [debouncedQuery, live])

  const filtered = authors.filter(a => {
    const q = query.toLowerCase()
    const matchQ = !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    const matchF = filter === "ALL" || a.status === filter
    return matchQ && matchF
  })

  async function approve(id: string) {
    const a = authors.find(x => x.id === id)
    if (live && a?.applicationId) {
      setBusyId(id)
      try {
        await authorApi.adminApprove(a.applicationId)
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Approve failed")
      } finally {
        setBusyId(null)
      }
      setViewing(null)
      return
    }
    setAuthors(prev =>
      prev.map(au => {
        if (au.id !== id) return au
        activityLogStore.log({
          userId: id,
          userName: au.name,
          action: "Author application approved",
          category: "admin",
          metadata: {},
        })
        return { ...au, status: "approved" as const }
      })
    )
    setViewing(null)
  }

  async function reject(id: string) {
    const a = authors.find(x => x.id === id)
    if (live && a?.applicationId) {
      setBusyId(id)
      try {
        await authorApi.adminReject(a.applicationId, "Rejected in admin dashboard")
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reject failed")
      } finally {
        setBusyId(null)
      }
      setViewing(null)
      return
    }
    setAuthors(prev =>
      prev.map(au => {
        if (au.id !== id) return au
        activityLogStore.log({
          userId: id,
          userName: au.name,
          action: "Author application rejected",
          category: "admin",
          metadata: {},
        })
        return { ...au, status: "rejected" as const }
      })
    )
    setViewing(null)
  }

  const pendingCount = authors.filter(a => a.status === "pending").length

  function exportCsv() {
    const header = ["id", "name", "email", "status", "books", "read_minutes", "earnings_usd", "joined"]
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
    const lines = [
      live ? "# source: API" : "# source: local demo store",
      ...(live
        ? [`# api_page: ${page} of ${lastPage}; pending applications merged on first rows; filter applied in browser`]
        : []),
      header.join(","),
      ...filtered.map(a =>
        [a.id, a.name, a.email, a.status, String(a.books), String(a.totalReads), String(a.totalEarned), a.joinedAt]
          .map(esc)
          .join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const el = document.createElement("a")
    el.href = URL.createObjectURL(blob)
    el.download = `authors-${live ? "api" : "demo"}-${new Date().toISOString().slice(0, 10)}.csv`
    el.click()
    URL.revokeObjectURL(el.href)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Authors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {live
              ? `${total.toLocaleString()} authors in directory · ${pendingCount} pending application${pendingCount !== 1 ? "s" : ""}`
              : `${authors.length} registered authors · ${pendingCount} pending approval`}
          </p>
        </div>
        <div className="flex gap-2">
          {live && page > 1 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
          )}
          {live && page < lastPage && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={exportCsv}>
            <Download size={12} /> Export
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {live && filter === "rejected" && (
        <p className="text-xs text-muted-foreground">Rejected applications are not listed via the API; use mock mode for that filter.</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(["ALL", "approved", "pending", "rejected"] as const).map(s => {
          const count =
            s === "ALL"
              ? authors.length
              : live && s === "rejected"
                ? 0
                : authors.filter(a => a.status === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1",
                filter === s
                  ? "bg-brand border-brand text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground"
              )}
            >
              {s !== "ALL" && count > 0 && s === "pending" && (
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
              {s === "ALL" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search authors…"
          className="pl-8 h-9 text-sm"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Author", "Status", "Books", live ? "Read (min)" : "Total Reads", "Earned", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map(a => {
                  const StatusIcon = STATUS_ICON[a.status]
                  return (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-brand">{a.name[0]}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{a.name}</p>
                            <p className="text-[10px] text-muted-foreground">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("border-0 text-[10px] py-0 gap-1", STATUS_CLS[a.status])}>
                          <StatusIcon size={9} />
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-foreground font-semibold">
                          <BookOpen size={11} className="text-muted-foreground" />
                          {a.books}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">
                        {live ? (a.totalReads > 0 ? a.totalReads.toLocaleString() : "—") : a.totalReads > 0 ? a.totalReads.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-green-500">
                          {a.totalEarned > 0 ? `$${a.totalEarned.toLocaleString()}` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">{a.joinedAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {a.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px] bg-green-500 hover:bg-green-600 text-white gap-1"
                                disabled={busyId === a.id}
                                onClick={() => void approve(a.id)}
                              >
                                <CheckCircle2 size={10} /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                                disabled={busyId === a.id}
                                onClick={() => void reject(a.id)}
                              >
                                <XCircle size={10} /> Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-brand"
                            onClick={() => setViewing(a)}
                          >
                            <Eye size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                    No authors match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
          Showing {filtered.length} of {authors.length} rows
          {live && " (pending apps + current stats page)"}
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        {viewing && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand">{viewing.name[0]}</span>
                </div>
                {viewing.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{viewing.bio || "—"}</p>
              <div className="flex flex-wrap gap-1.5">
                {viewing.genres.map(g => (
                  <Badge key={g} variant="secondary" className="text-[10px]">
                    {g}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Books", value: viewing.books },
                  {
                    label: live ? "Min read" : "Reads",
                    value: viewing.totalReads > 0 ? viewing.totalReads.toLocaleString() : "—",
                  },
                  { label: "Earned", value: viewing.totalEarned > 0 ? `$${viewing.totalEarned.toLocaleString()}` : "—" },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-sm font-bold text-foreground">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              {viewing.rating > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star size={13} className="text-brand fill-brand" />
                  <span className="font-bold text-foreground">{viewing.rating}</span>
                  <span className="text-muted-foreground text-xs">avg. rating</span>
                </div>
              )}
            </div>
            {viewing.status === "pending" && (
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                  disabled={busyId === viewing.id}
                  onClick={() => void reject(viewing.id)}
                >
                  <XCircle size={12} /> Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white gap-1"
                  disabled={busyId === viewing.id}
                  onClick={() => void approve(viewing.id)}
                >
                  <CheckCircle2 size={12} /> Approve Author
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
