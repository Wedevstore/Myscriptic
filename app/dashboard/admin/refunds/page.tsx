"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft, Search, RefreshCw, CheckCircle2, XCircle,
  Clock, DollarSign, Filter, Download, AlertCircle,
  BookOpen, Headphones, ChevronDown, ChevronUp, Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { refundsApi } from "@/lib/api"
import { orderStore, seedStore, CURRENCY_SYMBOLS, type Order } from "@/lib/store"

// ── Refund request data model ────────────────────────────────────────────────
interface RefundRequest {
  id:           string
  orderId:      string
  orderNumber:  string
  userId:       string
  customerName: string
  amount:       number
  currency:     string
  gateway:      string
  reason:      string
  status:      "pending" | "approved" | "rejected" | "processed"
  submittedAt: string
  resolvedAt:  string | null
  items:       { title: string; price: number; format: string }[]
  type:        "full" | "partial"
  partialAmount?: number
}

// Seed refund requests from orders (simulate customer-submitted refunds)
function buildRefundRequests(orders: Order[]): RefundRequest[] {
  const refunded = orders.filter(o => o.status === "refunded")
  const paid     = orders.filter(o => o.status === "paid")

  const base: RefundRequest[] = refunded.map((o, i) => ({
    id:           `ref_${o.id}`,
    orderId:      o.id,
    orderNumber:  o.orderNumber,
    userId:       o.userId,
    customerName: ["Amara Okafor", "Tunde Mensah", "Ife Williams"][i % 3],
    amount:       o.total,
    currency:     o.currency,
    gateway:      o.paymentGateway,
    reason:       ["Content quality below expectations", "Accidental duplicate purchase", "Book not as described"][i % 3],
    status:       "processed",
    submittedAt:  o.createdAt,
    resolvedAt:   o.paidAt,
    items:        o.items.map(it => ({ title: it.title, price: it.price, format: it.format })),
    type:         "full",
  }))

  // Add some pending refund requests from paid orders
  const pendingRequests: RefundRequest[] = paid.slice(0, 2).map((o, i) => ({
    id:           `ref_pending_${i}`,
    orderId:      o.id,
    orderNumber:  o.orderNumber,
    userId:       o.userId,
    customerName: ["Kofi Asante", "Fatima Garba"][i],
    amount:       i === 0 ? o.total : o.items[0]?.price ?? o.total,
    currency:     o.currency,
    gateway:      o.paymentGateway,
    reason:       ["Technical issue — could not open ebook file", "Purchased wrong format"][i],
    status:       "pending",
    submittedAt:  new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString(),
    resolvedAt:   null,
    items:        o.items.slice(0, i === 1 ? 1 : undefined).map(it => ({ title: it.title, price: it.price, format: it.format })),
    type:         i === 0 ? "full" : "partial",
    partialAmount: i === 1 ? o.items[0]?.price : undefined,
  }))

  // Approved but not yet processed
  const approvedRequest: RefundRequest = {
    id:           "ref_approved_001",
    orderId:      "ord_seed_999",
    orderNumber:  "MS-20250310-005",
    userId:       "usr_reader_2",
    customerName: "Yemi Adeyemi",
    amount:       19.99,
    currency:     "USD",
    gateway:      "paypal",
    reason:       "Book content was not what was advertised in the description",
    status:       "approved",
    submittedAt:  new Date(Date.now() - 86400000 * 3).toISOString(),
    resolvedAt:   null,
    items:        [{ title: "Currency of Knowledge", price: 19.99, format: "audiobook" }],
    type:         "full",
  }

  return [...pendingRequests, approvedRequest, ...base]
}

function mapApiRefund(row: Record<string, unknown>): RefundRequest {
  const itemsRaw = Array.isArray(row.items) ? row.items : []
  const items = itemsRaw.map((i: Record<string, unknown>) => ({
    title: String(i.title ?? "—"),
    price: Number(i.price ?? 0),
    format: String(i.format ?? "ebook"),
  }))
  const typ = String(row.type ?? "full") === "partial" ? "partial" : "full"
  const amt = row.amount != null ? Number(row.amount) : 0
  return {
    id: String(row.id),
    orderId: String(row.order_id ?? ""),
    orderNumber: String(row.order_number ?? `#${row.order_id ?? ""}`),
    userId: String(row.user_id ?? ""),
    customerName: String(row.customer_name ?? "—"),
    amount: amt,
    currency: String(row.currency ?? "USD"),
    gateway: String(row.gateway ?? "paystack"),
    reason: String(row.reason ?? "Admin refund"),
    status: "processed",
    submittedAt: String(row.created_at ?? ""),
    resolvedAt: String(row.created_at ?? ""),
    items: items.length ? items : [{ title: "Order total", price: amt, format: "ebook" }],
    type: typ,
    partialAmount: typ === "partial" ? amt : undefined,
  }
}

// ── Status meta ───────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", icon: Clock },
  approved:  { label: "Approved",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",   icon: CheckCircle2 },
  rejected:  { label: "Rejected",  cls: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",       icon: XCircle },
  processed: { label: "Processed", cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", icon: CheckCircle2 },
}

const GATEWAY_BADGE: Record<string, string> = {
  paystack:    "bg-[#00C3F7]/10 text-[#00C3F7] border border-[#00C3F7]/30",
  flutterwave: "bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/30",
  paypal:      "bg-[#003087]/10 text-[#003087] dark:text-blue-300 border border-[#003087]/20",
  korapay:     "bg-[#7F3FBF]/10 text-[#7F3FBF] dark:text-purple-300 border border-[#7F3FBF]/20",
}

// ── Refund row ────────────────────────────────────────────────────────────────
function RefundRow({
  req,
  onApprove,
  onReject,
  onProcess,
  readOnly,
}: {
  req: RefundRequest
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onProcess: (id: string) => void
  readOnly?: boolean
}) {
  const [expanded, setExpanded] = React.useState(false)
  const meta = STATUS_META[req.status]
  const StatusIcon = meta.icon
  const sym = CURRENCY_SYMBOLS[req.currency as keyof typeof CURRENCY_SYMBOLS] ?? "$"
  const dateStr = new Date(req.submittedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })
  const refundAmount = req.type === "partial" && req.partialAmount
    ? req.partialAmount
    : req.amount

  return (
    <React.Fragment>
      <tr
        className="hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3">
          <p className="font-medium text-sm text-foreground">{req.customerName}</p>
          <p className="text-xs text-muted-foreground font-mono">{req.userId.slice(0, 14)}...</p>
        </td>
        <td className="px-4 py-3">
          <p className="font-mono text-xs font-semibold text-foreground">{req.orderNumber}</p>
          <p className="text-[10px] text-muted-foreground">{dateStr}</p>
        </td>
        <td className="px-4 py-3">
          <p className="font-bold text-foreground">{sym}{refundAmount.toFixed(2)}</p>
          {req.type === "partial" && (
            <p className="text-[10px] text-muted-foreground">Partial refund</p>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-md capitalize",
            GATEWAY_BADGE[req.gateway] ?? "bg-muted text-muted-foreground"
          )}>
            {req.gateway}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="text-xs text-muted-foreground max-w-[180px] truncate">{req.reason}</p>
        </td>
        <td className="px-4 py-3">
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium",
            meta.cls
          )}>
            <StatusIcon size={9} />
            {meta.label}
          </span>
        </td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex gap-1.5 items-center">
            {!readOnly && req.status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(req.id)}
                  className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/20 text-green-600 hover:bg-green-200 transition-colors"
                  aria-label="Approve refund"
                >
                  <CheckCircle2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onReject(req.id)}
                  className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 transition-colors"
                  aria-label="Reject refund"
                >
                  <XCircle size={13} />
                </button>
              </>
            )}
            {!readOnly && req.status === "approved" && (
              <button
                type="button"
                onClick={() => onProcess(req.id)}
                className="p-1.5 rounded-md bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                aria-label="Process refund"
                title="Trigger gateway refund"
              >
                <RefreshCw size={13} />
              </button>
            )}
            {expanded
              ? <ChevronUp size={14} className="text-muted-foreground" />
              : <ChevronDown size={14} className="text-muted-foreground" />
            }
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="bg-muted/20 px-6 py-4">
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Items breakdown */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Items in Order
                </p>
                <div className="space-y-2">
                  {req.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg p-2.5">
                      {item.format === "audiobook"
                        ? <Headphones size={12} className="text-muted-foreground shrink-0" />
                        : <BookOpen size={12} className="text-muted-foreground shrink-0" />
                      }
                      <span className="flex-1 text-foreground font-medium truncate">{item.title}</span>
                      <span className="font-bold text-brand shrink-0">
                    {sym}
                    {item.price.toFixed(2)}
                  </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund details */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Refund Details
                </p>
                <div className="space-y-1.5 text-xs bg-card border border-border rounded-lg p-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refund Type</span>
                    <span className="font-semibold capitalize text-foreground">{req.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refund Amount</span>
                    <span className="font-bold text-brand">{sym}{refundAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gateway</span>
                    <span className="font-semibold capitalize text-foreground">{req.gateway}</span>
                  </div>
                  {req.resolvedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolved</span>
                      <span className="text-foreground">
                        {new Date(req.resolvedAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    <p className="text-muted-foreground">Reason:</p>
                    <p className="text-foreground">{req.reason}</p>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
function RefundsContent() {
  const live = apiUrlConfigured()
  const [requests, setRequests] = React.useState<RefundRequest[]>([])
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<RefundRequest | null>(null)
  const [action, setAction] = React.useState<"reject" | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    if (live) {
      setLoading(true)
      setError(null)
      try {
        const res = await refundsApi.list()
        setRequests(((res.data ?? []) as Record<string, unknown>[]).map(mapApiRefund))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load refunds")
        setRequests([])
      } finally {
        setLoading(false)
      }
      return
    }
    seedStore()
    setRequests(buildRefundRequests(orderStore.getAll()))
  }, [live])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r))
  }

  const handleReject = (id: string) => {
    const req = requests.find(r => r.id === id)
    if (req) { setSelected(req); setAction("reject") }
  }

  const confirmReject = () => {
    if (!selected) return
    setRequests(prev => prev.map(r => r.id === selected.id
      ? { ...r, status: "rejected", resolvedAt: new Date().toISOString() }
      : r
    ))
    setSelected(null); setAction(null); setRejectReason("")
  }

  const handleProcess = (id: string) => {
    // Trigger gateway refund (simulated)
    setRequests(prev => prev.map(r => r.id === id
      ? { ...r, status: "processed", resolvedAt: new Date().toISOString() }
      : r
    ))
    // Also update order in store
    const req = requests.find(r => r.id === id)
    if (req) orderStore.markRefunded(req.orderId, "full")
  }

  const filtered = requests
    .filter(r => {
      const matchSearch =
        !search ||
        r.customerName.toLowerCase().includes(search.toLowerCase()) ||
        r.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.userId.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || r.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  const pendingCount = requests.filter(r => r.status === "pending").length
  const approvedCount = requests.filter(r => r.status === "approved").length
  const processedTotal = requests
    .filter(r => r.status === "processed")
    .reduce((s, r) => s + (r.type === "partial" && r.partialAmount ? r.partialAmount : r.amount), 0)

  function exportCsv() {
    const header = ["id", "order_number", "customer", "amount", "currency", "gateway", "status", "created_at"]
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
    const lines = [
      header.join(","),
      ...filtered.map(r =>
        [
          r.id,
          r.orderNumber,
          r.customerName,
          String(r.type === "partial" && r.partialAmount ? r.partialAmount : r.amount),
          r.currency,
          r.gateway,
          r.status,
          r.submittedAt,
        ]
          .map(esc)
          .join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "refunds-export.csv"
    a.click()
    URL.revokeObjectURL(a.href)
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
        <h1 className="font-serif text-2xl font-bold text-foreground">Refund Management</h1>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-0">
            {pendingCount} pending
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        {live
          ? "Refunds recorded in Laravel (admin-issued). Issue new refunds from Order Management."
          : "Review and process customer refund requests. Approved refunds are forwarded to the payment gateway."}
      </p>

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Requests",  value: requests.length,            icon: RefreshCw,    color: "text-brand",                                bg: "bg-brand/10" },
          { label: "Pending Review",  value: pendingCount,               icon: Clock,        color: "text-amber-600 dark:text-amber-400",         bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Awaiting Process",value: approvedCount,              icon: CheckCircle2, color: "text-blue-600 dark:text-blue-400",           bg: "bg-blue-50 dark:bg-blue-900/20" },
          {
            label: "Total Refunded",
            value: live ? `${processedTotal.toFixed(2)} (mixed CCY)` : `$${processedTotal.toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-900/20",
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", kpi.bg, kpi.color)}>
              <kpi.icon size={16} />
            </div>
            <div className={cn("text-xl font-bold font-serif", kpi.color)}>{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Policy note */}
      <div className="flex items-start gap-3 p-4 bg-brand/5 border border-brand/20 rounded-xl mb-6">
        <AlertCircle size={15} className="text-brand shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Refund Policy:</strong> Full refunds are processed within 3–5 business days.
          Partial refunds apply only to specific items in a multi-book order.
          Once processed, the reader loses access to refunded books.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer or order..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Filter size={13} />
          {filtered.length} of {requests.length}
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportCsv}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Customer", "Order", "Refund Amount", "Gateway", "Reason", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                    Loading refunds…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                    No refund requests match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(req => (
                  <RefundRow
                    key={req.id}
                    req={req}
                    readOnly={live}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onProcess={handleProcess}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject reason dialog */}
      <Dialog open={action === "reject" && !!selected} onOpenChange={v => { if (!v) { setSelected(null); setAction(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Reject Refund Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejection. This will be sent to the customer.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Purchase was more than 30 days ago. Refund window has expired."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSelected(null); setAction(null) }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminRefundsPage() {
  return <RefundsContent />
}
