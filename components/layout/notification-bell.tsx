"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { userNotificationsApi } from "@/lib/api"
import { notificationStore, seedP4, type Notification, type NotifType } from "@/lib/store-p4"
import {
  Bell, Info, Zap, AlertCircle, BookOpen, RefreshCw, Check, ChevronRight, X,
} from "lucide-react"

function hasSanctumToken(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("myscriptic_auth")
    if (!raw) return false
    return Boolean(JSON.parse(raw)?.token)
  } catch {
    return false
  }
}

const TYPE_META: Record<NotifType, { icon: React.ElementType; cls: string }> = {
  info:     { icon: Info,        cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-500"    },
  promo:    { icon: Zap,         cls: "bg-amber-50 dark:bg-amber-900/20 text-brand"     },
  alert:    { icon: AlertCircle, cls: "bg-red-50 dark:bg-red-900/20 text-red-500"       },
  new_book: { icon: BookOpen,    cls: "bg-green-50 dark:bg-green-900/20 text-green-500" },
  renewal:  { icon: Bell,        cls: "bg-purple-50 dark:bg-purple-900/20 text-purple-500" },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface Props { userId?: string }

export function NotificationBell({ userId }: Props) {
  const [open,    setOpen]    = React.useState(false)
  const [notifs,  setNotifs]  = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(false)
  const [fromApi, setFromApi] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  async function load() {
    if (!hasSanctumToken()) {
      setFromApi(false)
      seedP4()
      const uid = userId ?? "guest"
      setNotifs(notificationStore.getForUser(uid).slice(0, 8))
      return
    }
    try {
      const res = await userNotificationsApi.list({ per_page: "12" })
      const rows = res.data as {
        id: string
        type: string
        title: string
        body: string | null
        read_at: string | null
        created_at: string
      }[]
      setFromApi(true)
      setNotifs(
        rows.slice(0, 8).map(r => ({
          id: r.id,
          type: (["info", "promo", "alert", "new_book", "renewal"].includes(r.type) ? r.type : "info") as NotifType,
          title: r.title,
          body: r.body ?? "",
          target: "all" as const,
          sentAt: r.created_at,
          isRead: r.read_at != null,
        }))
      )
      return
    } catch {
      setFromApi(false)
      /* fall back to local demo store */
    }
    seedP4()
    const uid = userId ?? "guest"
    setNotifs(notificationStore.getForUser(uid).slice(0, 8))
  }

  React.useEffect(() => { load() }, [userId])

  // close on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const unread = notifs.filter(n => !n.isRead).length

  async function handleMarkAll() {
    try {
      await userNotificationsApi.markAllRead()
    } catch {
      notificationStore.markAllRead(userId ?? "guest")
    }
    void load()
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (fromApi) return
    notificationStore.delete(id)
    void load()
  }

  async function handleMarkRead(id: string) {
    try {
      await userNotificationsApi.markRead(id)
    } catch {
      notificationStore.markRead(id)
    }
    void load()
  }

  function handleRefresh() {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        className={cn(
          "relative p-2 rounded-xl transition-all",
          open
            ? "bg-brand/10 text-brand"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-80 bg-card border border-border rounded-2xl shadow-xl shadow-black/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              {unread > 0 && (
                <Badge className="bg-red-500 text-white border-0 text-[9px] h-4 px-1.5">{unread}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleRefresh}
                aria-label="Refresh"
              >
                <RefreshCw size={11} className={cn(loading && "animate-spin")} />
              </Button>
              {unread > 0 && (
                <Button
                  variant="ghost" size="sm"
                  className="h-6 px-2 text-[10px] text-brand hover:text-brand hover:bg-brand/10 font-medium"
                  onClick={handleMarkAll}
                >
                  <Check size={10} className="mr-1" />Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="max-h-72 overflow-y-auto divide-y divide-border">
            {notifs.length === 0 ? (
              <li className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Bell size={22} className="opacity-25" />
                <p className="text-xs">No notifications yet</p>
              </li>
            ) : notifs.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.info
              const Icon = meta.icon
              return (
                <li
                  key={n.id}
                  onClick={() => { if (!n.isRead) handleMarkRead(n.id) }}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer group transition-colors hover:bg-muted/40",
                    !n.isRead && "bg-brand/5"
                  )}
                >
                  <div className={cn("p-1.5 rounded-lg mt-0.5 shrink-0", meta.cls)}>
                    <Icon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={cn("text-xs leading-snug", n.isRead ? "text-foreground" : "font-semibold text-foreground")}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.sentAt)}</p>
                  </div>
                  {!fromApi && (
                    <button
                      onClick={e => handleDelete(n.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                      aria-label="Dismiss notification"
                    >
                      <X size={11} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 text-[11px] text-brand font-medium hover:underline"
            >
              View all notifications <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
