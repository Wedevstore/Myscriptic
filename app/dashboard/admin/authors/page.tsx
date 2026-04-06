"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { seedP4, activityLogStore } from "@/lib/store-p4"
import {
  Search, CheckCircle2, XCircle, Clock, Download,
  BookOpen, DollarSign, Eye, Star, MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Author {
  id:           string
  name:         string
  email:        string
  status:       "approved" | "pending" | "rejected"
  books:        number
  totalReads:   number
  totalEarned:  number
  joinedAt:     string
  genres:       string[]
  bio:          string
  rating:       number
}

const MOCK_AUTHORS: Author[] = [
  { id: "a01", name: "Chimamanda A.",  email: "chimamanda@example.com", status: "approved",  books: 12, totalReads: 48200, totalEarned: 4210,  joinedAt: "Jan 2024", genres: ["Fiction","Literary"],    bio: "Award-winning novelist known for her powerful narratives on African womanhood.",             rating: 4.9 },
  { id: "a02", name: "Tunde Balogun",  email: "tunde@example.com",      status: "approved",  books: 8,  totalReads: 27400, totalEarned: 2780,  joinedAt: "Feb 2024", genres: ["Business","Self-Help"], bio: "Serial entrepreneur and bestselling author of The Entrepreneur's Code.",                   rating: 4.7 },
  { id: "a03", name: "Kofi Mensah",    email: "kofi@example.com",       status: "approved",  books: 6,  totalReads: 18200, totalEarned: 1920,  joinedAt: "May 2024", genres: ["Technology","Science"], bio: "Data scientist and tech educator building accessible STEM content for Africa.",           rating: 4.6 },
  { id: "a04", name: "Seun Williams",  email: "seun@example.com",       status: "pending",   books: 2,  totalReads: 0,     totalEarned: 0,     joinedAt: "Jul 2024", genres: ["Poetry","Fiction"],     bio: "Debut author with two completed manuscripts currently under editorial review.",            rating: 0 },
  { id: "a05", name: "Bisi Ogunwale",  email: "bisi.o@example.com",     status: "pending",   books: 3,  totalReads: 0,     totalEarned: 0,     joinedAt: "Aug 2024", genres: ["Romance","Fiction"],    bio: "Romance writer from Lagos. Her novel 'Daughters of Abuja' has a devoted fan base.",        rating: 0 },
  { id: "a06", name: "Aisha Hassan",   email: "aisha@example.com",      status: "pending",   books: 1,  totalReads: 0,     totalEarned: 0,     joinedAt: "Sep 2024", genres: ["History","Non-Fiction"],"bio": "Historian and cultural commentator with a focus on pre-colonial West Africa.",         rating: 0 },
  { id: "a07", name: "Emeka Osei",     email: "emeka.o@example.com",    status: "rejected",  books: 0,  totalReads: 0,     totalEarned: 0,     joinedAt: "Oct 2024", genres: ["Business"],            bio: "Application rejected due to incomplete submission and missing sample chapters.",          rating: 0 },
]

const STATUS_CLS: Record<string, string> = {
  approved: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  pending:  "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  rejected: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
}
const STATUS_ICON: Record<string, React.ElementType> = {
  approved: CheckCircle2, pending: Clock, rejected: XCircle,
}

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = React.useState(MOCK_AUTHORS)
  const [query,   setQuery]   = React.useState("")
  const [filter,  setFilter]  = React.useState<"ALL"|"approved"|"pending"|"rejected">("ALL")
  const [viewing, setViewing] = React.useState<Author | null>(null)

  React.useEffect(() => { seedP4() }, [])

  const filtered = authors.filter(a => {
    const q = query.toLowerCase()
    return (
      (a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)) &&
      (filter === "ALL" || a.status === filter)
    )
  })

  function approve(id: string) {
    setAuthors(prev => prev.map(a => {
      if (a.id !== id) return a
      activityLogStore.log({ userId: id, userName: a.name, action: "Author application approved", category: "admin", metadata: {} })
      return { ...a, status: "approved" as const }
    }))
    setViewing(null)
  }

  function reject(id: string) {
    setAuthors(prev => prev.map(a => {
      if (a.id !== id) return a
      activityLogStore.log({ userId: id, userName: a.name, action: "Author application rejected", category: "admin", metadata: {} })
      return { ...a, status: "rejected" as const }
    }))
    setViewing(null)
  }

  const pendingCount = authors.filter(a => a.status === "pending").length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Authors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{authors.length} registered authors · {pendingCount} pending approval</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Download size={12} /> Export
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["ALL","approved","pending","rejected"] as const).map(s => {
          const count = s === "ALL" ? authors.length : authors.filter(a => a.status === s).length
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1",
                filter === s
                  ? "bg-brand border-brand text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground"
              )}>
              {s !== "ALL" && count > 0 && s === "pending" && (
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">{count}</span>
              )}
              {s === "ALL" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search authors…" className="pl-8 h-9 text-sm" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Author","Status","Books","Total Reads","Earned","Joined","Actions"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(a => {
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
                        <StatusIcon size={9} />{a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-foreground font-semibold">
                        <BookOpen size={11} className="text-muted-foreground" />{a.books}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{a.totalReads > 0 ? a.totalReads.toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-green-500">{a.totalEarned > 0 ? `$${a.totalEarned.toLocaleString()}` : "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">{a.joinedAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {a.status === "pending" && (
                          <>
                            <Button size="sm" className="h-6 px-2 text-[10px] bg-green-500 hover:bg-green-600 text-white gap-1" onClick={() => approve(a.id)}>
                              <CheckCircle2 size={10} /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => reject(a.id)}>
                              <XCircle size={10} /> Reject
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-brand" onClick={() => setViewing(a)}>
                          <Eye size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-xs text-muted-foreground">No authors match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
          Showing {filtered.length} of {authors.length} authors
        </div>
      </div>

      {/* Author detail dialog */}
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
              <p className="text-sm text-muted-foreground leading-relaxed">{viewing.bio}</p>
              <div className="flex flex-wrap gap-1.5">
                {viewing.genres.map(g => (
                  <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Books",   value: viewing.books },
                  { label: "Reads",   value: viewing.totalReads > 0 ? viewing.totalReads.toLocaleString() : "—" },
                  { label: "Earned",  value: viewing.totalEarned > 0 ? `$${viewing.totalEarned.toLocaleString()}` : "—" },
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
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => reject(viewing.id)}>
                  <XCircle size={12} /> Reject
                </Button>
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-1" onClick={() => approve(viewing.id)}>
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
