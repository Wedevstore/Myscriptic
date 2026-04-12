"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus, Search, BookOpen, Headphones, MoreVertical,
  Eye, Pencil, Trash2, TrendingUp, ChevronLeft, Star, BarChart3,
} from "lucide-react"
import { authorSalesApi, booksApi } from "@/lib/api"
import { normalizeAuthorMyBooksList } from "@/lib/author-my-books"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { demoPic } from "@/lib/demo-images"
import { cn } from "@/lib/utils"
import { CoverImage } from "@/components/ui/cover-image"
import { MOCK_BOOKS } from "@/lib/mock-data"

type BookStatus = "approved" | "pending" | "rejected" | "draft"

type AuthorBookRow = {
  id: string
  title: string
  category: string
  coverUrl: string
  format: "ebook" | "audiobook" | "magazine"
  accessType: "FREE" | "PAID" | "SUBSCRIPTION"
  status: BookStatus
  reads: number
  earnings: number
  publishedAt: string
}

const MOCK_AUTHOR_ROWS: AuthorBookRow[] = MOCK_BOOKS.slice(0, 6).map((b, i) => ({
  id: b.id,
  title: b.title,
  category: b.category,
  coverUrl: b.coverUrl,
  format: b.format,
  accessType: b.accessType,
  status: (["approved", "approved", "pending", "approved", "rejected", "draft"] as const)[i],
  reads: [14200, 8900, 450, 22100, 0, 0][i],
  earnings: [284.0, 178.0, 0, 442.0, 0, 0][i],
  publishedAt: ["Jan 5, 2025", "Feb 12, 2025", "—", "Mar 1, 2025", "—", "—"][i],
}))

function mapApprovalToAuthorStatus(raw: unknown): BookStatus {
  const s = String(raw ?? "").toLowerCase()
  if (s === "approved" || s === "live" || s === "published" || s === "active") return "approved"
  if (s === "pending" || s === "in_review" || s === "review") return "pending"
  if (s === "rejected") return "rejected"
  if (s === "draft") return "draft"
  return "pending"
}

function parseSalesNetByBookId(data: unknown): Record<string, number> {
  const map: Record<string, number> = {}
  if (!Array.isArray(data)) return map
  for (const row of data) {
    if (!row || typeof row !== "object") continue
    const o = row as Record<string, unknown>
    const id = o.book_id != null ? String(o.book_id) : ""
    if (!id) continue
    const n = Number(o.net_earnings ?? 0)
    map[id] = Number.isFinite(n) ? n : 0
  }
  return map
}

function mineApiToRow(b: Record<string, unknown>, earningsByBook: Record<string, number>): AuthorBookRow {
  const fmtRaw = String(b.format ?? "ebook").toLowerCase()
  const fmt =
    fmtRaw === "audiobook" ? "audiobook" : fmtRaw === "magazine" ? "magazine" : "ebook"
  const accessRaw = String(b.accessType ?? "FREE").toUpperCase()
  const access: AuthorBookRow["accessType"] =
    accessRaw === "PAID" || accessRaw === "SUBSCRIPTION" ? accessRaw : "FREE"
  const approval = b.approvalStatus
  const st = mapApprovalToAuthorStatus(approval)
  const createdRaw = b.createdAt
  const createdMs =
    createdRaw instanceof Date
      ? createdRaw.getTime()
      : Date.parse(typeof createdRaw === "string" || typeof createdRaw === "number" ? String(createdRaw) : "")
  const approvalLc = String(approval ?? "").toLowerCase()
  const approvedLive =
    approvalLc === "approved" ||
    approvalLc === "live" ||
    approvalLc === "published" ||
    approvalLc === "active"
  const publishedAt =
    approvedLive && Number.isFinite(createdMs)
      ? new Date(createdMs).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "—"
  const eng =
    b.engagement && typeof b.engagement === "object"
      ? (b.engagement as Record<string, unknown>)
      : {}
  const pr = Number(eng.pagesRead ?? eng.pages_read ?? 0)
  const reads = Number.isFinite(pr) ? Math.max(0, Math.floor(pr)) : 0
  const id = String(b.id ?? "")
  const er = Number(earningsByBook[id] ?? 0)
  const cat = typeof b.category === "string" ? b.category.trim() : ""
  const cover = typeof b.coverUrl === "string" ? b.coverUrl.trim() : ""
  return {
    id,
    title: String(b.title ?? "Untitled"),
    category: cat || "—",
    coverUrl: cover || demoPic("fallback-cover"),
    format: fmt,
    accessType: access,
    status: st,
    reads,
    earnings: Number.isFinite(er) ? er : 0,
    publishedAt,
  }
}

const STATUS_BADGE: Record<BookStatus, { label: string; className: string }> = {
  approved: { label: "Published", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  pending:  { label: "In Review", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  rejected: { label: "Rejected",  className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  draft:    { label: "Draft",     className: "bg-muted text-muted-foreground" },
}

const MOCK_STATS = [
  { label: "Total Books", value: "6", icon: BookOpen, color: "text-brand" },
  { label: "Total Reads", value: "45.7K", icon: TrendingUp, color: "text-blue-500" },
  { label: "Avg. Rating", value: "4.7", icon: Star, color: "text-yellow-500" },
  { label: "Est. Earnings", value: "$904", icon: BarChart3, color: "text-green-500" },
]

function AuthorBooksContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [liveBooks, setLiveBooks] = React.useState<AuthorBookRow[] | null>(null)
  const [liveLoading, setLiveLoading] = React.useState(false)

  const useLiveApi =
    Boolean(user && apiUrlConfigured() && (user.role === "author" || user.role === "admin"))

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Fauthor%2Fbooks")
    }
  }, [isLoading, isAuthenticated, router])

  React.useEffect(() => {
    if (!useLiveApi || !user) return
    let alive = true
    setLiveLoading(true)
    Promise.all([
      booksApi.listMine({ per_page: "96" }).catch(() => ({ data: [] as unknown[] })),
      authorSalesApi.books().catch(() => ({ data: [] as unknown[] })),
    ])
      .then(([mineRes, salesRes]) => {
        if (!alive) return
        const earnMap = parseSalesNetByBookId(salesRes.data)
        const rows = normalizeAuthorMyBooksList(mineRes)
        setLiveBooks(rows.map(b => mineApiToRow(b, earnMap)))
      })
      .catch(() => {
        if (alive) setLiveBooks([])
      })
      .finally(() => {
        if (alive) setLiveLoading(false)
      })
    return () => {
      alive = false
    }
  }, [useLiveApi, user])

  const tableRows = useLiveApi ? (liveBooks ?? []) : MOCK_AUTHOR_ROWS
  const tableBootstrapping = useLiveApi && liveLoading && liveBooks === null

  const filtered = tableRows.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || b.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = React.useMemo(() => {
    if (!useLiveApi) return MOCK_STATS
    if (tableBootstrapping) {
      return [
        { label: "Total Books", value: "—", icon: BookOpen, color: "text-brand" },
        { label: "Total Reads", value: "—", icon: TrendingUp, color: "text-blue-500" },
        { label: "Avg. Rating", value: "—", icon: Star, color: "text-yellow-500" },
        { label: "Est. Earnings", value: "—", icon: BarChart3, color: "text-green-500" },
      ]
    }
    const rows = liveBooks ?? []
    const total = rows.length
    const readsSum = rows.reduce((a, b) => a + b.reads, 0)
    const readsLabel = readsSum >= 1000 ? `${(readsSum / 1000).toFixed(1)}K` : String(readsSum)
    const earningsSum = rows.reduce((a, b) => a + b.earnings, 0)
    const earningsLabel =
      earningsSum > 0 ? `$${earningsSum.toFixed(2)}` : total > 0 ? "$0.00" : "—"
    return [
      { label: "Total Books", value: String(total), icon: BookOpen, color: "text-brand" },
      { label: "Total Reads", value: readsSum > 0 ? readsLabel : "—", icon: TrendingUp, color: "text-blue-500" },
      { label: "Avg. Rating", value: "—", icon: Star, color: "text-yellow-500" },
      {
        label: "Est. Earnings",
        value: earningsLabel,
        icon: BarChart3,
        color: "text-green-500",
      },
    ]
  }, [useLiveApi, tableBootstrapping, liveBooks])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/author"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-brand transition-colors"
            >
              <ChevronLeft size={14} /> Author Dashboard
            </Link>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">My Books</h1>
          <p className="text-muted-foreground mt-1">Manage, track, and publish your content.</p>
        </div>
        <Link href="/dashboard/author/books/new">
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
            <Plus size={16} /> Upload New Book
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl bg-muted", s.color)}>
              <s.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold font-serif text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Published</SelectItem>
            <SelectItem value="pending">In Review</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[300px]">Book</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Reads</TableHead>
              <TableHead className="text-right">Earnings</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableBootstrapping ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    <span className="text-sm">Loading your books…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {useLiveApi && tableRows.length === 0
                    ? "No books yet. Upload your first title to get started."
                    : "No books found matching your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(book => {
                const statusBadge = STATUS_BADGE[book.status]
                return (
                  <TableRow key={book.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-14 shrink-0 overflow-hidden rounded-md shadow-sm bg-muted">
                          <CoverImage
                            src={book.coverUrl}
                            alt={`Cover of ${book.title}`}
                            sizes="40px"
                            className="rounded-md"
                            coverFallbackSeed={book.id}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground line-clamp-1">{book.title}</p>
                          <p className="text-xs text-muted-foreground">{book.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {book.format === "audiobook" ? (
                          <><Headphones size={13} /> Audio</>
                        ) : book.format === "magazine" ? (
                          <><BookOpen size={13} /> Magazine</>
                        ) : (
                          <><BookOpen size={13} /> eBook</>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        book.accessType === "FREE" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        book.accessType === "SUBSCRIPTION" && "bg-brand/10 text-brand",
                        book.accessType === "PAID" && "bg-muted text-muted-foreground",
                      )}>
                        {book.accessType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", statusBadge.className)}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground">
                      {book.reads > 0 ? book.reads.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm text-foreground">
                      {book.earnings > 0
                        ? `$${book.earnings.toFixed(2)}`
                        : useLiveApi
                          ? "$0.00"
                          : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {book.publishedAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/books/${book.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Eye size={13} /> View Public Page
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/reader/${book.id}?preview=1`} className="flex items-center gap-2 cursor-pointer">
                              <BookOpen size={13} /> Preview as Reader
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/author/books/new?edit=${book.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Pencil size={13} /> Edit Book
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => {
                              setDeleteError(null)
                              setDeleteId(book.id)
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Rejection notices */}
      {tableRows.some(b => b.status === "rejected") && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Rejection Notice</p>
          <p className="text-sm text-red-600 dark:text-red-400/80">
            One or more of your books were rejected by the admin team. Common reasons include low-quality
            content, copyright violations, or incomplete metadata. Edit and resubmit to be reviewed again.
          </p>
        </div>
      )}

      {/* Delete confirmation dialog placeholder */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !deleteBusy && setDeleteId(null)}
        >
          <div
            className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-bold text-foreground mb-2">Delete this book?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This action is permanent and cannot be undone. All reading progress and reviews for this book
              will also be removed.
            </p>
            {deleteError && (
              <p className="text-sm text-destructive mb-4" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" disabled={deleteBusy} onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={deleteBusy}
                onClick={() => {
                  void (async () => {
                    if (!deleteId) return
                    if (useLiveApi && /^\d+$/.test(deleteId)) {
                      setDeleteError(null)
                      setDeleteBusy(true)
                      try {
                        await booksApi.delete(deleteId)
                        setLiveBooks(prev => (prev ?? []).filter(b => b.id !== deleteId))
                        setDeleteId(null)
                      } catch (e) {
                        setDeleteError(e instanceof Error ? e.message : "Delete failed.")
                      } finally {
                        setDeleteBusy(false)
                      }
                      return
                    }
                    setDeleteId(null)
                  })()
                }}
              >
                {deleteBusy ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuthorBooksPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AuthorBooksContent />
        </main>
      </div>
    </Providers>
  )
}
