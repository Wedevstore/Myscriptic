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
import { seedP4, notificationStore, type Notification, type NotifTarget, type NotifType } from "@/lib/store-p4"
import {
  Bell, Send, Eye, EyeOff, Trash2, Plus, Users, BookOpen, Zap, AlertCircle, Info,
} from "lucide-react"

const TYPE_META: Record<NotifType, { label: string; icon: React.ElementType; color: string }> = {
  info:     { label: "Info",     icon: Info,        color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500"    },
  promo:    { label: "Promo",    icon: Zap,         color: "bg-amber-50 dark:bg-amber-900/20 text-brand"     },
  alert:    { label: "Alert",    icon: AlertCircle, color: "bg-red-50 dark:bg-red-900/20 text-red-500"       },
  new_book: { label: "New Book", icon: BookOpen,    color: "bg-green-50 dark:bg-green-900/20 text-green-500" },
  renewal:  { label: "Renewal",  icon: Bell,        color: "bg-purple-50 dark:bg-purple-900/20 text-purple-500" },
}

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = React.useState<Notification[]>([])
  const [dialog, setDialog] = React.useState<"send" | null>(null)
  const [form, setForm] = React.useState({ title: "", body: "", type: "info" as NotifType, target: "all" as NotifTarget })
  const [sending, setSending] = React.useState(false)

  React.useEffect(() => { seedP4(); setNotifs(notificationStore.getAll()) }, [])

  function openSend() {
    setForm({ title: "", body: "", type: "info", target: "all" })
    setDialog("send")
  }

  async function handleSend() {
    if (!form.title.trim() || !form.body.trim()) return
    setSending(true)
    await new Promise(r => setTimeout(r, 600))
    notificationStore.send({ title: form.title, body: form.body, type: form.type, target: form.target })
    setNotifs(notificationStore.getAll())
    setSending(false)
    setDialog(null)
  }

  function handleDelete(id: string) {
    notificationStore.delete(id)
    setNotifs(notificationStore.getAll())
  }

  function toggleRead(id: string) {
    const n = notifs.find(x => x.id === id)
    if (!n) return
    if (n.isRead) notificationStore.markRead(id) // toggle back
    else notificationStore.markRead(id)
    setNotifs(notificationStore.getAll())
  }

  const unread = notifs.filter(n => !n.isRead).length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Send push notifications to users or view notification history.</p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <Badge className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-0 text-xs">
              {unread} unread
            </Badge>
          )}
          <Button onClick={openSend} size="sm" className="gap-1.5 h-8 text-xs bg-brand text-primary-foreground hover:bg-brand-dark">
            <Send size={12} />Send Notification
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {notifs.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Bell size={28} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
          </div>
        )}
        {notifs.map(n => {
          const meta = TYPE_META[n.type]
          return (
            <div key={n.id} className={cn(
              "bg-card border border-border rounded-xl p-4 flex items-start gap-3 group transition-all",
              !n.isRead && "border-brand/30 bg-brand/5"
            )}>
              <div className={cn("p-2 rounded-lg shrink-0", meta.color)}>
                <meta.icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold text-foreground">{n.title}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">{meta.label}</Badge>
                  {!n.isRead && <Badge className="text-[9px] h-4 px-1.5 bg-red-500 text-white border-0">New</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mb-1.5">{n.body}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>To: {n.target === "all" ? "Everyone" : n.target}</span>
                  <span>•</span>
                  <span>{new Date(n.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleRead(n.id)}>
                  {n.isRead ? <EyeOff size={12} className="text-muted-foreground" /> : <Eye size={12} className="text-brand" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(n.id)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Send dialog */}
      <Dialog open={dialog === "send"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Send Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input placeholder="e.g. New Feature Launched" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Message *</Label>
              <Textarea placeholder="e.g. Check out our new reading analytics dashboard." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as NotifType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_META) as [NotifType, typeof TYPE_META[NotifType]][]).map(([k, m]) => (
                      <SelectItem key={k} value={k}><span className="flex items-center gap-1.5"><m.icon size={11} />{m.label}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target</Label>
                <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v as NotifTarget }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><Users size={11} className="inline mr-1" />Everyone</SelectItem>
                    <SelectItem value="readers">Readers</SelectItem>
                    <SelectItem value="authors">Authors</SelectItem>
                    <SelectItem value="subscribers">Subscribers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSend} disabled={!form.title.trim() || !form.body.trim() || sending}
              className="bg-brand text-primary-foreground hover:bg-brand-dark gap-1.5">
              {sending ? "Sending..." : <><Send size={11} />Send Now</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
