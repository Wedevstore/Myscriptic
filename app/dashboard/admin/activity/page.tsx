"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { adminApi } from "@/lib/api"
import { seedP4, activityLogStore, type ActivityLog } from "@/lib/store-p4"
import {
  CreditCard, Shield, BookOpen, Percent, Server, Zap, User,
  Search, RefreshCw, Download, Trash2, Clock,
} from "lucide-react"

const CAT_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  payment: { icon: CreditCard, color: "bg-green-50 dark:bg-green-900/20 text-green-500", label: "Payment" },
  subscription: { icon: Zap, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-500", label: "Subscription" },
  auth: { icon: Shield, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500", label: "Auth" },
  admin: { icon: User, color: "bg-amber-50 dark:bg-amber-900/20 text-brand", label: "Admin" },
  book: { icon: BookOpen, color: "bg-sky-50 dark:bg-sky-900/20 text-sky-500", label: "Book" },
  coupon: { icon: Percent, color: "bg-red-50 dark:bg-red-900/20 text-red-500", label: "Coupon" },
  system: { icon: Server, color: "bg-muted text-muted-foreground", label: "System" },
}

type CatFilter = "ALL" | ActivityLog["category"]

function mapActionToCategory(action: string): ActivityLog["category"] {
  const a = action.toLowerCase()
  if (a.startsWith("book.")) return "book"
  if (a.includes("user.") || a.includes("blocked") || a.includes("author.application")) return "admin"
  if (a.includes("payment") || a.includes("payout") || a.includes("refund")) return "payment"
  if (a.includes("subscription")) return "subscription"
  if (a.includes("coupon")) return "coupon"
  if (a.includes("auth") || a.includes("login")) return "auth"
  return "system"
}

function mapPlatformActivity(row: Record<string, unknown>): ActivityLog {
  const action = String(row.action ?? "")
  const actor = row.actor as Record<string, unknown> | null | undefined
  const subj = row.subject_user as Record<string, unknown> | null | undefined
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  return {
    id: String(row.id ?? ""),
    userId: String(actor?.id ?? subj?.id ?? ""),
    userName: String(actor?.name ?? subj?.name ?? "System"),
    action,
    category: mapActionToCategory(action),
    metadata: {
      ...meta,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      ip_address: row.ip_address,
    },
    createdAt: String(row.created_at ?? ""),
  }
}

function exportActivityCsv(rows: ActivityLog[]) {
  const header = ["created_at", "user", "user_id", "action", "category"]
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const lines = [
    header.join(","),
    ...rows.map(r =>
      [r.createdAt, r.userName, r.userId, r.action, r.category].map(esc).join(",")
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "platform-activity.csv"
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AdminActivityPage() {
  const live = apiUrlConfigured()
  const [logs, setLogs] = React.useState<ActivityLog[]>([])
  const [query, setQuery] = React.useState("")
  const [cat, setCat] = React.useState<CatFilter>("ALL")
  const [refreshing, setRefreshing] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [lastPage, setLastPage] = React.useState(1)

  const reload = React.useCallback(async () => {
    if (live) {
      setLoading(true)
      setError(null)
      try {
        const res = await adminApi.platformActivities({ page: String(page), per_page: "40" })
        setLogs(((res.data ?? []) as Record<string, unknown>[]).map(mapPlatformActivity))
        setLastPage(Math.max(1, Number((res.meta as { last_page?: number })?.last_page ?? 1)))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load activity")
        setLogs([])
      } finally {
        setLoading(false)
      }
      return
    }
    seedP4()
    setLogs(activityLogStore.getAll())
  }, [live, page])

  React.useEffect(() => {
    void reload()
  }, [reload])

  async function handleRefresh() {
    setRefreshing(true)
    await reload()
    setRefreshing(false)
  }

  function handleClear() {
    activityLogStore.clear()
    setLogs([])
  }

  const filtered = logs.filter(l => {
    const q = query.toLowerCase()
    const matchQ =
      l.userName.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.userId.toLowerCase().includes(q)
    const matchC = cat === "ALL" || l.category === cat
    return matchQ && matchC
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {live
              ? `Platform activity from the API · page ${page} of ${lastPage}`
              : "Full audit trail of platform events — payments, auth, admin actions, and more."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => void handleRefresh()} disabled={refreshing || loading}>
            <RefreshCw size={12} className={cn((refreshing || loading) && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportActivityCsv(filtered)}>
            <Download size={12} />
            Export
          </Button>
          {!live && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
              onClick={handleClear}
            >
              <Trash2 size={12} />
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user or action..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select value={cat} onValueChange={v => setCat(v as CatFilter)}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {Object.entries(CAT_META).map(([k, m]) => (
              <SelectItem key={k} value={k}>
                <span className="flex items-center gap-1.5">
                  <m.icon size={10} />
                  {m.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <span className="text-[11px] text-muted-foreground">{filtered.length} events</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Time", "User", "Action", "Category", "Metadata"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map(log => {
                  const meta = CAT_META[log.category] ?? CAT_META.system
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock size={10} />
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-foreground">{log.userName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{log.userId || "—"}</p>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-foreground truncate">{log.action}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("text-[9px] border-0 h-5 px-2 gap-1", meta.color)}>
                          <meta.icon size={9} />
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px] block">
                          {Object.entries(log.metadata)
                            .filter(([k]) => k !== "ip_address" || log.metadata.ip_address)
                            .map(([k, v]) => `${k}:${String(v)}`)
                            .join(", ") || "—"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                    No activity found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
