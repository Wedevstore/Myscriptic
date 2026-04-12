"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { adminReportsApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { loadLocalReports, updateLocalReportStatus } from "@/components/report-dialog"
import { cn } from "@/lib/utils"
import {
  Flag, Search, Eye, CheckCircle, XCircle,
  Clock, AlertTriangle, MessageSquare, Filter,
  ChevronLeft, ChevronRight, Loader2, ShieldAlert,
  Copyright, Ban, MessageSquareWarning,
} from "lucide-react"

interface ReportRecord {
  id: string
  target_type: string
  target_id: string
  target_title: string
  reason: string
  description: string
  reporter: { id: string; name: string; email: string } | null
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending:  { label: "Pending",  className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  reviewed: { label: "Reviewed", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",     icon: Eye },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  dismissed:{ label: "Dismissed",className: "bg-muted text-muted-foreground",                                        icon: XCircle },
}

const REASON_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  inappropriate_content: { label: "Inappropriate Content", icon: ShieldAlert },
  copyright_violation:   { label: "Copyright Violation",   icon: Copyright },
  misleading_info:       { label: "Misleading Info",       icon: AlertTriangle },
  spam_or_scam:          { label: "Spam / Scam",           icon: Ban },
  hate_speech:           { label: "Hate Speech",           icon: MessageSquareWarning },
  other:                 { label: "Other",                 icon: Flag },
}

function ReviewDialog({
  open,
  onOpenChange,
  report,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  report: ReportRecord | null
  onUpdate: (id: string, status: string, note?: string) => Promise<void>
}) {
  const [status, setStatus] = React.useState("")
  const [note, setNote] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open && report) {
      setStatus(report.status)
      setNote(report.admin_note ?? "")
    }
  }, [open, report])

  async function handleSave() {
    if (!report) return
    setSaving(true)
    await onUpdate(report.id, status, note.trim() || undefined)
    setSaving(false)
    onOpenChange(false)
  }

  if (!report) return null

  const reasonMeta = REASON_LABELS[report.reason] ?? REASON_LABELS.other

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag size={18} className="text-destructive" />
            Report Details
          </DialogTitle>
          <DialogDescription>
            Review and take action on this report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target info */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] capitalize">{report.target_type}</Badge>
              <span className="text-sm font-medium text-foreground truncate">{report.target_title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <reasonMeta.icon size={12} />
              <span>{reasonMeta.label}</span>
            </div>
          </div>

          {/* Reporter */}
          {report.reporter && (
            <div className="text-sm">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Reported by</p>
              <p className="text-foreground">{report.reporter.name}</p>
              <p className="text-xs text-muted-foreground">{report.reporter.email}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3 leading-relaxed">{report.description}</p>
          </div>

          {/* Date */}
          <p className="text-xs text-muted-foreground">
            Reported {new Date(report.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>

          {/* Status update */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-sm font-semibold">Update Status</p>
            <div className="grid grid-cols-2 gap-2">
              {(["pending", "reviewed", "resolved", "dismissed"] as const).map(s => {
                const cfg = STATUS_CONFIG[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                      status === s ? "border-brand bg-brand/5 text-brand" : "border-border text-muted-foreground hover:border-brand/20"
                    )}
                  >
                    <cfg.icon size={14} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Admin note */}
          <div className="space-y-1.5">
            <label htmlFor="admin-note" className="text-sm font-semibold">Admin Note</label>
            <Textarea
              id="admin-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Internal note about action taken..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            className="bg-brand text-primary-foreground hover:bg-brand-dark"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminReportsPage() {
  const [reports, setReports] = React.useState<ReportRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState<string>("all")
  const [filterType, setFilterType] = React.useState<string>("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<ReportRecord | null>(null)

  React.useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    setLoading(true)
    try {
      if (apiUrlConfigured()) {
        const res = await adminReportsApi.list()
        setReports(res.data)
      } else {
        await new Promise(r => setTimeout(r, 300))
        const local = loadLocalReports() as unknown as ReportRecord[]
        setReports(local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    } catch {
      const local = loadLocalReports() as unknown as ReportRecord[]
      setReports(local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(id: string, status: string, note?: string) {
    try {
      if (apiUrlConfigured()) {
        await adminReportsApi.updateStatus(id, status, note)
      } else {
        updateLocalReportStatus(id, status, note)
      }
      setReports(prev => prev.map(r =>
        r.id === id ? { ...r, status, admin_note: note ?? r.admin_note, updated_at: new Date().toISOString() } : r
      ))
    } catch { /* keep current state */ }
  }

  const filtered = reports.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false
    if (filterType !== "all" && r.target_type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.target_title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.reporter?.name?.toLowerCase().includes(q) ||
        r.reporter?.email?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const statusCounts = {
    all: reports.length,
    pending: reports.filter(r => r.status === "pending").length,
    reviewed: reports.filter(r => r.status === "reviewed").length,
    resolved: reports.filter(r => r.status === "resolved").length,
    dismissed: reports.filter(r => r.status === "dismissed").length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and moderate user-submitted reports on books, content, and authors.
          </p>
        </div>
        <Badge className="bg-brand/10 text-brand border-brand/20 shrink-0">
          {statusCounts.pending} pending
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: statusCounts.all, icon: Flag, active: filterStatus === "all" },
          { label: "Pending", value: statusCounts.pending, icon: Clock, active: filterStatus === "pending" },
          { label: "Reviewed", value: statusCounts.reviewed, icon: Eye, active: filterStatus === "reviewed" },
          { label: "Resolved", value: statusCounts.resolved, icon: CheckCircle, active: filterStatus === "resolved" },
          { label: "Dismissed", value: statusCounts.dismissed, icon: XCircle, active: filterStatus === "dismissed" },
        ].map(s => (
          <button
            key={s.label}
            type="button"
            onClick={() => setFilterStatus(s.label === "Total" ? "all" : s.label.toLowerCase())}
            className={cn(
              "bg-card border rounded-xl p-4 text-left transition-all",
              s.active ? "border-brand ring-1 ring-brand/20" : "border-border hover:border-brand/30"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className={s.active ? "text-brand" : "text-muted-foreground"} />
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "book", "content", "author"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={cn(
                "px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-all",
                filterType === t
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-border text-muted-foreground hover:border-brand/20"
              )}
            >
              {t === "all" ? "All types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 size={24} className="mx-auto animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Flag size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">{reports.length === 0 ? "No reports yet" : "No matching reports"}</p>
          <p className="text-sm mt-1">
            {reports.length === 0
              ? "Reports from readers will appear here."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const statusCfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending
            const reasonCfg = REASON_LABELS[report.reason] ?? REASON_LABELS.other
            return (
              <div
                key={report.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-brand/20 transition-colors cursor-pointer"
                onClick={() => { setSelected(report); setDialogOpen(true) }}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    report.status === "pending" ? "bg-amber-100 dark:bg-amber-900/20" : "bg-muted"
                  )}>
                    <reasonCfg.icon size={18} className={report.status === "pending" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{report.target_title}</p>
                          <Badge variant="outline" className="text-[10px] capitalize shrink-0">{report.target_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{reasonCfg.label}</p>
                      </div>
                      <Badge className={cn("text-[10px] shrink-0", statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{report.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {report.reporter && (
                        <span>by {report.reporter.name}</span>
                      )}
                      <span>{new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      {report.admin_note && (
                        <span className="flex items-center gap-1">
                          <MessageSquare size={10} /> has note
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={selected}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
