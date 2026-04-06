"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"
import { userNotificationsApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { notificationStore, seedP4, type Notification, type NotifType } from "@/lib/store-p4"
import {
  Bell, Info, Zap, AlertCircle, BookOpen, Check, Trash2, RefreshCw,
} from "lucide-react"

const TYPE_META: Record<NotifType, { icon: React.ElementType; cls: string; label: string }> = {
  info:     { icon: Info,        cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-500",     label: "Info"     },
  promo:    { icon: Zap,         cls: "bg-amber-50 dark:bg-amber-900/20 text-brand",      label: "Promo"    },
  alert:    { icon: AlertCircle, cls: "bg-red-50 dark:bg-red-900/20 text-red-500",        label: "Alert"    },
  new_book: { icon: BookOpen,    cls: "bg-green-50 dark:bg-green-900/20 text-green-500",  label: "New Book" },
  renewal:  { icon: Bell,        cls: "bg-purple-50 dark:bg-purple-900/20 text-purple-500",label: "Renewal" },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? "yesterday" : `${d} days ago`
}

/** Map Laravel `GET /notifications` row to local notification UI type. */
function mapApiNotification(row: Record<string, unknown>): Notification {
  const raw = String(row.type ?? "info")
  const type: NotifType =
    raw === "info" || raw === "promo" || raw === "alert" || raw === "new_book" || raw === "renewal"
      ? raw
      : "info"
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    type,
    target: "readers",
    isRead: row.read_at != null && String(row.read_at).length > 0,
    sentAt: String(row.created_at ?? new Date().toISOString()),
  }
}

function NotificationCenter() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const useLiveApi = apiUrlConfigured()
  const [notifs, setNotifs]   = React.useState<Notification[]>([])
  const [filter, setFilter]   = React.useState<"all" | "unread">("all")
  const [refreshing, setRefreshing] = React.useState(false)
  const [liveReady, setLiveReady] = React.useState(() => !useLiveApi)

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent("/notifications")}`)
    }
  }, [isLoading, isAuthenticated, router])

  function syncFromSource() {
    if (!user?.id) return
    if (!useLiveApi) {
      seedP4()
      setNotifs(notificationStore.getForUser(user.id))
      return
    }
    setRefreshing(true)
    userNotificationsApi
      .list({ per_page: "60" })
      .then(res => {
        const rows = (Array.isArray(res.data) ? res.data : []) as Record<string, unknown>[]
        setNotifs(rows.map(mapApiNotification))
      })
      .catch(() => {
        seedP4()
        setNotifs(notificationStore.getForUser(user.id))
      })
      .finally(() => setRefreshing(false))
  }

  React.useEffect(() => {
    if (isLoading || !user?.id || !isAuthenticated) return
    if (!useLiveApi) {
      seedP4()
      setNotifs(notificationStore.getForUser(user.id))
      setLiveReady(true)
      return
    }
    let alive = true
    setLiveReady(false)
    userNotificationsApi
      .list({ per_page: "60" })
      .then(res => {
        if (!alive) return
        const rows = (Array.isArray(res.data) ? res.data : []) as Record<string, unknown>[]
        setNotifs(rows.map(mapApiNotification))
      })
      .catch(() => {
        if (!alive) return
        seedP4()
        setNotifs(notificationStore.getForUser(user.id))
      })
      .finally(() => {
        if (alive) setLiveReady(true)
      })
    return () => {
      alive = false
    }
  }, [isLoading, user?.id, isAuthenticated, useLiveApi])

  function markAll() {
    if (!user?.id) return
    if (useLiveApi) {
      userNotificationsApi.markAllRead().then(() => syncFromSource()).catch(() => syncFromSource())
      return
    }
    notificationStore.markAllRead(user.id)
    syncFromSource()
  }
  function markRead(id: string) {
    if (!user?.id) return
    if (useLiveApi) {
      userNotificationsApi.markRead(id).then(() => syncFromSource()).catch(() => syncFromSource())
      return
    }
    notificationStore.markRead(id)
    syncFromSource()
  }
  function remove(id: string) {
    if (useLiveApi) return
    notificationStore.delete(id)
    syncFromSource()
  }
  function refresh() {
    if (!useLiveApi) {
      setRefreshing(true)
      setTimeout(() => {
        syncFromSource()
        setRefreshing(false)
      }, 400)
      return
    }
    syncFromSource()
  }

  const displayed = filter === "unread" ? notifs.filter(n => !n.isRead) : notifs
  const unread    = notifs.filter(n => !n.isRead).length

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  if (useLiveApi && !liveReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unread > 0 ? `${unread} unread message${unread !== 1 ? "s" : ""}` : "You're all caught up."}
          </p>
          {useLiveApi && (
            <p className="text-xs text-muted-foreground/90 mt-1">Synced from your account.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={refresh} aria-label="Refresh">
            <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
          </Button>
          {unread > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 hover:border-brand hover:text-brand" onClick={markAll}>
              <Check size={12} /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 bg-muted/50 p-1 rounded-xl w-fit">
        {(["all","unread"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
              filter === f
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
            {f === "unread" && unread > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 border-2 border-dashed border-border rounded-2xl">
            <Bell size={36} className="text-muted-foreground/25" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filter === "unread"
                  ? "Switch to 'All' to see past notifications."
                  : "We'll notify you about new books, promotions, and account activity."}
              </p>
            </div>
          </div>
        ) : displayed.map(n => {
          const meta = TYPE_META[n.type] ?? TYPE_META.info
          const Icon = meta.icon
          return (
            <div
              key={n.id}
              className={cn(
                "group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                n.isRead
                  ? "bg-card border-border hover:bg-muted/30"
                  : "bg-brand/5 border-brand/25 hover:bg-brand/10"
              )}
              onClick={() => { if (!n.isRead) markRead(n.id) }}
            >
              <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5", meta.cls)}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm", !n.isRead ? "font-bold text-foreground" : "font-semibold text-foreground")}>
                      {n.title}
                    </p>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">{meta.label}</Badge>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                    )}
                  </div>
                  {!useLiveApi && (
                    <button
                      onClick={e => { e.stopPropagation(); remove(n.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded-md shrink-0"
                      aria-label="Delete notification"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-muted-foreground/60">{timeAgo(n.sentAt)}</span>
                  {!n.isRead && (
                    <button
                      onClick={e => { e.stopPropagation(); markRead(n.id) }}
                      className="text-[11px] text-brand font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <Check size={10} /> Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      {notifs.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-8">
          Showing {displayed.length} of {notifs.length} notifications.
          {useLiveApi
            ? " Server-side retention applies."
            : " Demo notifications are stored in this browser only."}
        </p>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <NotificationCenter />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
