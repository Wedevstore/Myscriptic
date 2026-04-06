"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MOCK_BOOKS } from "@/lib/mock-data"
import {
  ChevronLeft, Search, CheckCircle, XCircle, Eye,
  BookOpen, Headphones, TrendingUp, Download, Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ApprovalStatus = "pending" | "approved" | "rejected"

// Add approval status to mock books
const ADMIN_BOOKS = MOCK_BOOKS.map((b, i) => ({
  ...b,
  approvalStatus: (["approved", "approved", "approved", "pending", "approved", "pending", "approved", "rejected", "approved", "pending", "approved", "approved"][i] ?? "approved") as ApprovalStatus,
  submittedAt: "Jan 2026",
  authorEmail: `author${i + 1}@example.com`,
  rejectReason: i === 7 ? "Cover image copyright issue" : undefined,
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

function BooksContent() {
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | ApprovalStatus>("ALL")
  const [books, setBooks] = React.useState(ADMIN_BOOKS)

  const filtered = books.filter(b => {
    const matchQ = !query || b.title.toLowerCase().includes(query.toLowerCase()) || b.author.toLowerCase().includes(query.toLowerCase())
    const matchS = statusFilter === "ALL" || b.approvalStatus === statusFilter
    return matchQ && matchS
  })

  const pending = books.filter(b => b.approvalStatus === "pending").length

  const handleApprove = (id: string) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, approvalStatus: "approved" as ApprovalStatus } : b))
  }
  const handleReject = (id: string) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, approvalStatus: "rejected" as ApprovalStatus } : b))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
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
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Review, approve, and manage all book submissions across the platform.
      </p>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Books",  value: "52,410", cls: "text-foreground" },
          { label: "Approved",     value: books.filter(b => b.approvalStatus === "approved").length.toString(), cls: "text-green-600 dark:text-green-400" },
          { label: "Pending",      value: pending.toString(), cls: "text-amber-600 dark:text-amber-400" },
          { label: "Rejected",     value: books.filter(b => b.approvalStatus === "rejected").length.toString(), cls: "text-red-500" },
        ].map(item => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-4">
            <div className={cn("text-2xl font-bold font-serif", item.cls)}>{item.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
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
        <div className="flex gap-1.5">
          {(["ALL", "approved", "pending", "rejected"] as const).map(s => (
            <button
              key={s}
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
        <Button variant="outline" size="sm" className="gap-2 h-10">
          <Download size={13} /> Export
        </Button>
      </div>

      {/* Books table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Cover", "Book", "Author", "Format", "Access", "Category", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(book => {
                const statusCfg = STATUS_CONFIG[book.approvalStatus]
                return (
                  <tr key={book.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <img
                        src={book.coverUrl}
                        alt={`Cover of ${book.title}`}
                        className="w-10 h-14 object-cover rounded-md shrink-0"
                      />
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
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize", ACCESS_COLORS[book.accessType])}>
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
                          <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Preview book">
                            <Eye size={13} />
                          </button>
                        </Link>
                        {book.approvalStatus === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(book.id)}
                              className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/20 text-green-600 hover:bg-green-200 transition-colors"
                              aria-label="Approve book"
                            >
                              <CheckCircle size={13} />
                            </button>
                            <button
                              onClick={() => handleReject(book.id)}
                              className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 transition-colors"
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
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filtered.length} of 52,410 books (demo data)</span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs bg-brand/10 text-brand border-brand/30">1</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">Next</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminBooksPage() {
  return <BooksContent />
}
