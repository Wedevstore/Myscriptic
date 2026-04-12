"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { adminApi, booksApi } from "@/lib/api"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import { apiUrlConfigured } from "@/lib/auth-mode"
import type { BookCardData } from "@/components/books/book-card"
import {
  ChevronLeft, Search, CheckCircle, XCircle, Eye,
  BookOpen, Headphones, TrendingUp, Download, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CoverImage } from "@/components/ui/cover-image"

type ApprovalStatus = "pending" | "approved" | "rejected"

type AdminBookRow = {
  id: string
  title: string
  author: string
  authorEmail: string
  coverUrl: string
  format: string
  accessType: string
  category: string
  approvalStatus: ApprovalStatus
  rejectReason?: string
  submittedAt?: string
  isTrending?: boolean
}

const ADMIN_BOOKS_MOCK: AdminBookRow[] = MOCK_BOOKS.map((b, i) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  authorEmail: `author${i + 1}@example.com`,
  coverUrl: b.coverUrl,
  format: b.format,
  accessType: b.accessType,
  category: b.category,
  approvalStatus: (["approved", "approved", "approved", "pending", "approved", "pending", "approved", "rejected", "approved", "pending", "approved", "approved"][i] ?? "approved") as ApprovalStatus,
  submittedAt: "Jan 2026",
  rejectReason: i === 7 ? "Cover image copyright issue" : undefined,
  isTrending: b.isTrending,
}))

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  pending:  { label: "Pending",  className: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
}

const ACCESS_COLORS: Record<string, string> = {
  FREE: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  SUBSCRIPTION: "bg-brand/10 text-brand",
  PAID: "bg-muted text-muted-foreground",
}

function mapModerationBook(raw: unknown): AdminBookRow {
  const b = raw as Record<string, unknown>
  const st = String(b.approvalStatus ?? "pending").toLowerCase()
  const approvalStatus: ApprovalStatus =
    st === "approved" || st === "rejected" || st === "pending" ? st : "pending"
  return {
    id: String(b.id ?? ""),
    title: String(b.title ?? ""),
    author: String(b.author ?? ""),
    authorEmail: b.authorEmail != null ? String(b.authorEmail) : `Author ID ${b.authorId ?? "—"}`,
    coverUrl: String(b.coverUrl ?? ""),
    format: String(b.format ?? "ebook"),
    accessType: String(b.accessType ?? "FREE"),
    category: String(b.category ?? "—"),
    approvalStatus,
    rejectReason: b.rejectionReason != null ? String(b.rejectionReason) : undefined,
    submittedAt: b.createdAt != null ? String(b.createdAt).slice(0, 10) : undefined,
    isTrending: Boolean(b.isTrending),
  }
}

function mapCatalogBook(card: BookCardData): AdminBookRow {
  return {
    id: card.id,
    title: card.title,
    author: card.author,
    authorEmail: "—",
    coverUrl: card.coverUrl,
    format: card.format,
    accessType: card.accessType,
    category: card.category,
    approvalStatus: "approved",
    isTrending: card.isTrending,
  }
}

function BooksContent() {
  const live = apiUrlConfigured()
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | ApprovalStatus>("ALL")
  const [books, setBooks] = React.useState<AdminBookRow[]>(ADMIN_BOOKS_MOCK)
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [listPage, setListPage] = React.useState(1)
  const [listMeta, setListMeta] = React.useState({ last_page: 1, total: 0 })
  const [actionId, setActionId] = React.useState<string | null>(null)
  const [rejectId, setRejectId] = React.useState<string | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")

  const loadLive = React.useCallback(async (page: number) => {
    setLoading(true)
    setLoadError(null)
    try {
      const [pendingRes, listRes] = await Promise.all([
        adminApi.pendingBooks(),
        booksApi.list({ per_page: "40", page: String(page) }),
      ])
      const pendingRows = (pendingRes.data ?? []).map(mapModerationBook)
      const listData = (listRes as { data?: unknown[]; meta?: { last_page?: number; total?: number } }).data ?? []
      const listRows = listData.map(d => mapCatalogBook(apiBookToCard(d as ApiBookRecord)))
      const pendingIds = new Set(pendingRows.map(r => r.id))
      const merged = [...pendingRows, ...listRows.filter(r => !pendingIds.has(r.id))]
      setBooks(merged)
      const meta = (listRes as { meta?: { last_page?: number; total?: number } }).meta
      setListMeta({
        last_page: Math.max(1, Number(meta?.last_page ?? 1)),
        total: Number(meta?.total ?? merged.length),
      })
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load books")
      setBooks(ADMIN_BOOKS_MOCK)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (live) void loadLive(listPage)
  }, [live, listPage, loadLive])

  const filtered = books.filter(b => {
    const matchQ =
      !query ||
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.author.toLowerCase().includes(query.toLowerCase()) ||
      b.authorEmail.toLowerCase().includes(query.toLowerCase())
    const matchS = statusFilter === "ALL" || b.approvalStatus === statusFilter
    return matchQ && matchS
  })

  const pending = books.filter(b => b.approvalStatus === "pending").length
  const approved = books.filter(b => b.approvalStatus === "approved").length
  const rejected = books.filter(b => b.approvalStatus === "rejected").length

  const handleExport = () => {
    const rows = filtered
    const head = ["id", "title", "author", "author_email", "format", "access", "category", "status"]
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
    const lines = [
      live ? "# source: API" : "# source: local demo store",
      ...(live
        ? [
            `# catalog_page: ${listPage} of ${listMeta.last_page}; pending moderation rows merged; search/filter in browser`,
          ]
        : []),
      head.join(","),
      ...rows.map(r =>
        [r.id, r.title, r.author, r.authorEmail, r.format, r.accessType, r.category, r.approvalStatus]
          .map(esc)
          .join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `books-${live ? "api" : "demo"}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleApprove(id: string) {
    if (!live) {
      setBooks(prev => prev.map(b => (b.id === id ? { ...b, approvalStatus: "approved" as const } : b)))
      return
    }
    setActionId(id)
    try {
      await adminApi.approveBook(id)
      await loadLive(listPage)
    } catch {
      /* toast optional */
    } finally {
      setActionId(null)
    }
  }

  async function confirmReject() {
    if (!rejectId) return
    const reason = rejectReason.trim() || "Does not meet platform guidelines."
    if (!live) {
      setBooks(prev =>
        prev.map(b =>
          b.id === rejectId ? { ...b, approvalStatus: "rejected" as const, rejectReason: reason } : b
        )
      )
      setRejectId(null)
      setRejectReason("")
      return
    }
    setActionId(rejectId)
    try {
      await adminApi.rejectBook(rejectId, reason)
      await loadLive(listPage)
      setRejectId(null)
      setRejectReason("")
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft size={15} /> Admin
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Books & Content</h1>
        {pending > 0 && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-0">
            {pending} pending
          </Badge>
        )}
        {live && (
          <Badge variant="outline" className="text-[10px] font-mono border-brand/30 text-brand">
            API
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Review, approve, and manage book submissions{live ? " (live catalog + moderation queue)." : " (demo data when API URL is not set)."}
      </p>

      {loadError && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "In view", value: String(books.length), cls: "text-foreground" },
          { label: "Approved", value: String(approved), cls: "text-green-600 dark:text-green-400" },
          { label: "Pending", value: String(pending), cls: "text-amber-600 dark:text-amber-400" },
          { label: "Rejected", value: String(rejected), cls: "text-red-500" },
        ].map(item => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-4">
            <div className={cn("text-2xl font-bold font-serif", item.cls)}>{item.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title or author..."
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["ALL", "approved", "pending", "rejected"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize",
                statusFilter === s ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground hover:border-brand/30"
              )}
            >
              {s === "ALL" ? "All" : s}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-2 h-10" type="button" onClick={handleExport}>
          <Download size={13} /> Export CSV
        </Button>
        {live && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-10"
            type="button"
            disabled={loading}
            onClick={() => void loadLive(listPage)}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            Refresh
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Cover", "Book", "Author", "Format", "Access", "Category", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && live && books.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="inline-block animate-spin mr-2" size={18} />
                    Loading books…
                  </td>
                </tr>
              ) : (
                filtered.map(book => {
                  const statusCfg = STATUS_CONFIG[book.approvalStatus]
                  const busy = actionId === book.id
                  return (
                    <tr key={book.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="relative w-10 h-14 shrink-0 overflow-hidden rounded-md bg-muted">
                          <CoverImage
                            src={book.coverUrl}
                            alt={`Cover of ${book.title}`}
                            sizes="40px"
                            className="rounded-md"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="font-medium text-foreground truncate">{book.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{book.authorEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{book.author}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                          {book.format === "audiobook" ? <Headphones size={12} /> : <BookOpen size={12} />}
                          {book.format}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize",
                            ACCESS_COLORS[book.accessType] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {book.accessType.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{book.category}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", statusCfg.className)}>
                          {statusCfg.label}
                        </span>
                        {book.rejectReason && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate">{book.rejectReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/books/${book.id}`}>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="View book page"
                            >
                              <Eye size={13} />
                            </button>
                          </Link>
                          <Link href={`/reader/${book.id}?preview=1`}>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Preview as reader"
                            >
                              <BookOpen size={13} />
                            </button>
                          </Link>
                          {book.approvalStatus === "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleApprove(book.id)}
                                className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/20 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50"
                                aria-label="Approve book"
                              >
                                {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setRejectId(book.id)
                                  setRejectReason("")
                                }}
                                className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 transition-colors disabled:opacity-50"
                                aria-label="Reject book"
                              >
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
                          {book.isTrending && (
                            <span className="p-1.5 text-amber-500" aria-label="Trending">
                              <TrendingUp size={13} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {live
              ? `Page ${listPage} of ${listMeta.last_page} · ${listMeta.total} books in catalog (pending rows always shown)`
              : `Showing ${filtered.length} of ${books.length} books (demo)`}
          </span>
          {live && (
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                type="button"
                disabled={listPage <= 1 || loading}
                onClick={() => setListPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-brand/10 text-brand border-brand/30" type="button" disabled>
                {listPage}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                type="button"
                disabled={listPage >= listMeta.last_page || loading}
                onClick={() => setListPage(p => Math.min(listMeta.last_page, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={rejectId !== null} onOpenChange={open => { if (!open) { setRejectId(null); setRejectReason("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject book</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Reason (sent to author records)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Cover art rights unclear; please resubmit."
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => { setRejectId(null); setRejectReason("") }}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmReject()} disabled={actionId !== null}>
              {actionId ? <Loader2 size={14} className="animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminBooksPage() {
  return <BooksContent />
}
