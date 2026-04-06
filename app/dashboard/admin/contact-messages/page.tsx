"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Mail, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { adminApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"

type ContactRow = {
  id: string
  name: string
  email: string
  topic: string
  message: string
  author_ref: string | null
  ip_address: string | null
  created_at: string | null
}

type ListMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const MOCK_ROWS: ContactRow[] = [
  {
    id: "m1",
    name: "Demo Reader",
    email: "reader@example.com",
    topic: "General Enquiry",
    message: "This is sample inbox data when the API URL is not configured.",
    author_ref: null,
    ip_address: "192.168.1.1",
    created_at: new Date().toISOString(),
  },
  {
    id: "m2",
    name: "Author Hope",
    email: "hope@example.com",
    topic: "Author / Publishing",
    message: "Question about royalties and payout schedule.",
    author_ref: "auth_demo",
    ip_address: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

function isContactRow(v: unknown): v is ContactRow {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.email === "string" &&
    typeof o.topic === "string" &&
    typeof o.message === "string"
  )
}

export default function AdminContactMessagesPage() {
  const live = apiUrlConfigured()
  const [rows, setRows] = React.useState<ContactRow[]>(() => (live ? [] : MOCK_ROWS))
  const [meta, setMeta] = React.useState<ListMeta | null>(() =>
    live ? null : { current_page: 1, last_page: 1, per_page: 40, total: MOCK_ROWS.length },
  )
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(live)
  const [error, setError] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    if (!live) return
    let cancelled = false
    setLoading(true)
    setError(null)
    adminApi
      .contactSubmissions({ per_page: "40", page: String(page) })
      .then((res) => {
        if (cancelled) return
        const raw = res.data
        const list = Array.isArray(raw) ? raw.filter(isContactRow) : []
        setRows(list)
        const m = res.meta
        if (m && typeof m === "object" && !Array.isArray(m)) {
          const o = m as Record<string, unknown>
          setMeta({
            current_page: Number(o.current_page) || 1,
            last_page: Number(o.last_page) || 1,
            per_page: Number(o.per_page) || 40,
            total: Number(o.total) ?? list.length,
          })
        } else {
          setMeta({ current_page: 1, last_page: 1, per_page: 40, total: list.length })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load contact messages. Check that you are signed in as an admin.")
          setRows([])
          setMeta(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [live, page])

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">Contact inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Messages from the public contact form.
            {!live && " Demo data is shown until `NEXT_PUBLIC_API_URL` is set."}
          </p>
        </div>
        {meta && (
          <Badge variant="outline" className="font-mono text-[11px]">
            {meta.total} total
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No messages yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead className="w-[160px]">Topic</TableHead>
                <TableHead className="w-[100px] text-right">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const open = expanded[r.id]
                const dateStr = r.created_at
                  ? new Date(r.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
                return (
                  <React.Fragment key={r.id}>
                    <TableRow className="align-top">
                      <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {dateStr}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{r.name}</div>
                        <a
                          href={`mailto:${encodeURIComponent(r.email)}`}
                          className="text-xs text-brand hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Mail size={11} />
                          {r.email}
                        </a>
                        {r.author_ref && (
                          <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                            author_ref: {r.author_ref}
                          </div>
                        )}
                        {r.ip_address && (
                          <div className="text-[10px] text-muted-foreground font-mono">{r.ip_address}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{r.topic}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => toggleExpand(r.id)}
                        >
                          {open ? "Hide" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={4} className="text-sm text-foreground/90 whitespace-pre-wrap py-4">
                          {r.message}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {live && meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            Page {meta.current_page} / {meta.last_page}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.current_page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} className="mr-1" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.current_page >= meta.last_page || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
