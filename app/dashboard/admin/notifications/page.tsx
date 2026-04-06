"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { adminApi } from "@/lib/api"
import { seedP4, notificationStore, type Notification, type NotifTarget, type NotifType } from "@/lib/store-p4"
import {
  Bell, Send, Eye, EyeOff, Trash2, Users, BookOpen, Zap, AlertCircle, Info, Download,
} from "lucide-react"

const TYPE_META: Record<NotifType, { label: string; icon: React.ElementType; color: string }> = {
  info: { label: "Info", icon: Info, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500" },
  promo: { label: "Promo", icon: Zap, color: "bg-amber-50 dark:bg-amber-900/20 text-brand" },
  alert: { label: "Alert", icon: AlertCircle, color: "bg-red-50 dark:bg-red-900/20 text-red-500" },
  new_book: { label: "New Book", icon: BookOpen, color: "bg-green-50 dark:bg-green-900/20 text-green-500" },
  renewal: { label: "Renewal", icon: Bell, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-500" },
}

type BroadcastRow = {
  id: string
  title: string
  audience: string
  recipient_count: number | null
  status: string
  created_by: string | null
  created_at: string
}

function mapBroadcast(row: Record<string, unknown>): BroadcastRow {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    audience: String(row.audience ?? "all"),
    recipient_count: row.recipient_count != null ? Number(row.recipient_count) : null,
    status: String(row.status ?? ""),
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: String(row.created_at ?? ""),
  }
}

function escNotifCsv(s: string) {
  return `"${String(s).replace(/"/g, '""')}"`
}

function exportBroadcastsCsv(rows: BroadcastRow[]) {
  const lines = [
    "# source: API",
    ["id", "title", "audience", "recipient_count", "status", "created_by", "created_at"].join(","),
    ...rows.map(b =>
      [
        b.id,
        b.title,
        b.audience,
        b.recipient_count != null ? String(b.recipient_count) : "",
        b.status,
        b.created_by ?? "",
        b.created_at,
      ]
        .map(escNotifCsv)
        .join(","),
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `notification-broadcasts-api-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportDemoNotifsCsv(rows: Notification[]) {
  const lines = [
    "# source: local demo store",
    ["id", "title", "body", "type", "target", "is_read", "sent_at"].join(","),
    ...rows.map(n =>
      [n.id, n.title, n.body, n.type, n.target, n.isRead ? "1" : "0", n.sentAt]
        .map(escNotifCsv)
        .join(","),
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `notifications-demo-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AdminNotificationsPage() {
  const live = apiUrlConfigured()
  const [notifs, setNotifs] = React.useState<Notification[]>([])
  const [broadcasts, setBroadcasts] = React.useState<BroadcastRow[]>([])
  const [dialog, setDialog] = React.useState<"send" | null>(null)
  const [form, setForm] = React.useState({ title: "", body: "", type: "info" as NotifType, target: "all" as NotifTarget })
  const [sending, setSending] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    if (live) {
      setLoading(true)
      setError(null)
      try {
        const res = await adminApi.notificationBroadcasts()
        setBroadcasts(((res.data ?? []) as Record<string, unknown>[]).map(mapBroadcast))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load broadcasts")
        setBroadcasts([])
      } finally {
        setLoading(false)
      }
      return
    }
    seedP4()
    setNotifs(notificationStore.getAll())
  }, [live])

  React.useEffect(() => {
    void reload()
  }, [reload])

  function openSend() {
    setForm({ title: "", body: "", type: "info", target: "all" })
    setDialog("send")
  }

  async function handleSend() {
    if (!form.title.trim() || !form.body.trim()) return
    setSending(true)
    setError(null)
    try {
      if (live) {
        const audience =
          form.target === "subscribers" ? "subscribers" : "all"
        await adminApi.notificationBroadcastCreate({
          title: form.title.trim(),
          body: form.body.trim(),
          audience,
          type: form.type,
        })
        await reload()
      } else {
        await new Promise(r => setTimeout(r, 400))
        notificationStore.send({
          title: form.title,
          body: form.body,
          type: form.type,
          target: form.target,
        })
        setNotifs(notificationStore.getAll())
      }
      setDialog(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  function handleDelete(id: string) {
    notificationStore.delete(id)
    setNotifs(notificationStore.getAll())
  }

  function toggleRead(id: string) {
    const n = notifs.find(x => x.id === id)
    if (!n || n.isRead) return
    notificationStore.markRead(id)
    setNotifs(notificationStore.getAll())
  }

  const unread = notifs.filter(n => !n.isRead).length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {live
              ? "Queued broadcast jobs from Laravel. Recipients are computed server-side."
              : "Send push notifications to users or view notification history."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!live && unread > 0 && (
            <Badge className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-0 text-xs">
              {unread} unread
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={
              loading || (live ? broadcasts.length === 0 : notifs.length === 0)
            }
            onClick={() =>
              live ? exportBroadcastsCsv(broadcasts) : exportDemoNotifsCsv(notifs)
            }
          >
            <Download size={12} />
            Export CSV
          </Button>
          <Button
            onClick={openSend}
            size="sm"
            className="gap-1.5 h-8 text-xs bg-brand text-primary-foreground hover:bg-brand-dark"
          >
            <Send size={12} />
            Send Notification
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {live && loading && (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading broadcasts…</div>
        )}
        {live &&
          !loading &&
          broadcasts.map(b => (
            <div
              key={b.id}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 transition-all"
            >
              <div className={cn("p-2 rounded-lg shrink-0", TYPE_META.promo.color)}>
                <Bell size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold text-foreground">{b.title}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">
                    {b.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Audience: {b.audience}
                  {b.recipient_count != null && ` · ${b.recipient_count} recipients`}
                  {b.created_by && ` · ${b.created_by}`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(b.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        {live && !loading && broadcasts.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Bell size={28} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          </div>
        )}

        {!live && notifs.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Bell size={28} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
          </div>
        )}
        {!live &&
          notifs.map(n => {
            const meta = TYPE_META[n.type]
            return (
              <div
                key={n.id}
                className={cn(
                  "bg-card border border-border rounded-xl p-4 flex items-start gap-3 group transition-all",
                  !n.isRead && "border-brand/30 bg-brand/5"
                )}
              >
                <div className={cn("p-2 rounded-lg shrink-0", meta.color)}>
                  <meta.icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{n.title}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                      {meta.label}
                    </Badge>
                    {!n.isRead && <Badge className="text-[9px] h-4 px-1.5 bg-red-500 text-white border-0">New</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{n.body}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>To: {n.target === "all" ? "Everyone" : n.target}</span>
                    <span>•</span>
                    <span>
                      {new Date(n.sentAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleRead(n.id)}>
                    {n.isRead ? (
                      <EyeOff size={12} className="text-muted-foreground" />
                    ) : (
                      <Eye size={12} className="text-brand" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(n.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            )
          })}
      </div>

      <Dialog open={dialog === "send"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Send Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                placeholder="e.g. New Feature Launched"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Message *</Label>
              <Textarea
                placeholder="e.g. Check out our new reading analytics dashboard."
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as NotifType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_META) as [NotifType, typeof TYPE_META[NotifType]][]).map(([k, m]) => (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-1.5">
                          <m.icon size={11} />
                          {m.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target</Label>
                <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v as NotifTarget }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <Users size={11} className="inline mr-1" />
                      Everyone
                    </SelectItem>
                    {!live && <SelectItem value="readers">Readers</SelectItem>}
                    {!live && <SelectItem value="authors">Authors</SelectItem>}
                    <SelectItem value="subscribers">Subscribers</SelectItem>
                  </SelectContent>
                </Select>
                {live && (
                  <p className="text-[10px] text-muted-foreground mt-1">Live API supports all or subscribers only.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSend()}
              disabled={!form.title.trim() || !form.body.trim() || sending}
              className="bg-brand text-primary-foreground hover:bg-brand-dark gap-1.5"
            >
              {sending ? "Sending..." : (
                <>
                  <Send size={11} />
                  Send Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
