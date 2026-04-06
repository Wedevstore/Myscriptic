"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft, Search, Download, CheckCircle2, Clock,
  XCircle, RefreshCw, Filter, DollarSign, Activity,
  ChevronDown, ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { transactionsApi } from "@/lib/api"
import { seedStore, transactionStore, type Transaction, type PaymentGateway, type Currency } from "@/lib/store"

type TxnStatus = Transaction["status"]

const VALID_GATEWAYS: PaymentGateway[] = ["paystack", "flutterwave", "paypal", "korapay"]

function normalizeGateway(g: string | undefined): PaymentGateway {
  const s = String(g ?? "").toLowerCase()
  return VALID_GATEWAYS.includes(s as PaymentGateway) ? (s as PaymentGateway) : "paystack"
}

function mapApiTransaction(row: Record<string, unknown>): Transaction {
  const cur = String(row.currency ?? "USD")
  const st = String(row.status ?? "pending")
  const status: TxnStatus = (["success", "failed", "pending", "refunded"] as const).includes(st as TxnStatus)
    ? (st as TxnStatus)
    : "pending"
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    orderId: String(row.order_id ?? ""),
    gateway: normalizeGateway(row.gateway as string | undefined),
    amount: Number(row.amount ?? 0),
    currency: (["USD", "NGN", "GHS", "KES"].includes(cur) ? cur : "USD") as Currency,
    status,
    referenceId: String(row.reference_id ?? ""),
    rawResponse: {},
    createdAt: String(row.created_at ?? ""),
  }
}

const STATUS_META: Record<TxnStatus, { label: string; icon: React.ElementType; cls: string }> = {
  success: { label: "Success", icon: CheckCircle2, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  pending: { label: "Pending", icon: Clock, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  failed: { label: "Failed", icon: XCircle, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  refunded: { label: "Refunded", icon: RefreshCw, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
}

const GATEWAY_BADGE: Record<string, string> = {
  paystack: "bg-[#00C3F7]/10 text-[#00C3F7] border border-[#00C3F7]/30",
  flutterwave: "bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/30",
  paypal: "bg-[#003087]/10 text-[#003087] dark:text-blue-300 border border-[#003087]/20",
  korapay: "bg-[#7F3FBF]/10 text-[#7F3FBF] dark:text-purple-300 border border-[#7F3FBF]/20",
}

function TxnRow({ txn, live }: { txn: Transaction; live: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [raw, setRaw] = React.useState<Record<string, unknown>>(txn.rawResponse)
  const [loadingDetail, setLoadingDetail] = React.useState(false)
  const meta = STATUS_META[txn.status]
  const StatusIcon = meta.icon

  React.useEffect(() => {
    if (!open || !live) return
    let cancelled = false
    ;(async () => {
      setLoadingDetail(true)
      try {
        const res = await transactionsApi.get(txn.id)
        const d = res.data as Record<string, unknown>
        const rr = d.raw_response ?? d.rawResponse
        if (!cancelled && rr && typeof rr === "object" && !Array.isArray(rr)) {
          setRaw(rr as Record<string, unknown>)
        }
      } catch {
        if (!cancelled) setRaw({ error: "Could not load gateway payload" })
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, live, txn.id])

  React.useEffect(() => {
    setRaw(txn.rawResponse)
  }, [txn.id, txn.rawResponse])

  return (
    <React.Fragment>
      <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-foreground">{txn.id}</span>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {new Date(txn.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "text-xs font-semibold px-2 py-1 rounded-md capitalize",
              GATEWAY_BADGE[txn.gateway] ?? "bg-muted text-muted-foreground"
            )}
          >
            {txn.gateway}
          </span>
        </td>
        <td className="px-4 py-3 font-bold text-foreground font-mono">
          {txn.currency === "NGN" ? "₦" : txn.currency === "GHS" ? "₵" : txn.currency === "KES" ? "KSh" : "$"}
          {txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-muted-foreground font-mono">{txn.currency}</span>
        </td>
        <td className="px-4 py-3">
          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium", meta.cls)}>
            <StatusIcon size={9} />
            {meta.label}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-[11px] text-muted-foreground">{txn.referenceId}</span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
      </tr>

      {open && (
        <tr>
          <td colSpan={8} className="bg-muted/20 px-6 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Raw Gateway Response</p>
                <pre className="text-xs font-mono bg-card border border-border rounded-lg p-3 overflow-auto max-h-32 text-muted-foreground">
                  {loadingDetail ? "Loading…" : JSON.stringify(raw, null, 2)}
                </pre>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono text-foreground">{txn.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-foreground">{txn.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-brand">{txn.referenceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp</span>
                  <span className="text-foreground">{new Date(txn.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}

function exportTxnCsv(rows: Transaction[]) {
  const header = ["id", "created_at", "gateway", "amount", "currency", "status", "reference_id", "order_id", "user_id"]
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const lines = [
    header.join(","),
    ...rows.map(t =>
      [t.id, t.createdAt, t.gateway, String(t.amount), t.currency, t.status, t.referenceId, t.orderId, t.userId]
        .map(esc)
        .join(",")
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "transactions-export.csv"
  a.click()
  URL.revokeObjectURL(a.href)
}

function TransactionsContent() {
  const live = apiUrlConfigured()
  const [txns, setTxns] = React.useState<Transaction[]>([])
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [gatewayFilter, setGatewayFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [lastPage, setLastPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadLive = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { page: String(page), per_page: "40" }
      if (statusFilter !== "all") params.status = statusFilter
      if (gatewayFilter !== "all") params.gateway = gatewayFilter
      const res = await transactionsApi.list(params)
      const rows = (res.data ?? []) as Record<string, unknown>[]
      setTxns(rows.map(mapApiTransaction))
      setLastPage(Math.max(1, Number((res.meta as { last_page?: number })?.last_page ?? 1)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, gatewayFilter])

  React.useEffect(() => {
    if (live) void loadLive()
    else {
      seedStore()
      setTxns(transactionStore.getAll())
    }
  }, [live, loadLive])

  React.useEffect(() => {
    if (live) setPage(1)
  }, [statusFilter, gatewayFilter, live])

  const filtered = txns
    .filter(t => {
      const matchSearch =
        !search ||
        t.referenceId.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || t.status === statusFilter
      const matchGateway = gatewayFilter === "all" || t.gateway === gatewayFilter
      return matchSearch && matchStatus && matchGateway
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalSuccess = txns.filter(t => t.status === "success" && t.currency === "USD").reduce((s, t) => s + t.amount, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft size={15} /> Admin
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Transaction Log</h1>
        {live && (
          <Badge variant="outline" className="text-[10px]">
            Live · p.{page}/{lastPage}
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Complete audit trail of payment gateway transactions. Click a row to see raw response.
      </p>

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Transactions", value: txns.length, icon: Activity, color: "text-brand", bg: "bg-brand/10" },
          {
            label: "Successful (USD)",
            value: `$${totalSuccess.toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-900/20",
          },
          {
            label: "Pending",
            value: txns.filter(t => t.status === "pending").length,
            icon: Clock,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
          {
            label: "Refunded",
            value: txns.filter(t => t.status === "refunded").length,
            icon: RefreshCw,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-900/20",
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

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reference or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Gateways</SelectItem>
            <SelectItem value="paystack">Paystack</SelectItem>
            <SelectItem value="flutterwave">Flutterwave</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="korapay">Korapay</SelectItem>
          </SelectContent>
        </Select>
        {live && page > 1 && (
          <Button variant="outline" size="sm" className="h-9" onClick={() => setPage(p => Math.max(1, p - 1))}>
            Previous
          </Button>
        )}
        {live && page < lastPage && (
          <Button variant="outline" size="sm" className="h-9" onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Filter size={13} />
          {filtered.length} of {txns.length}
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => exportTxnCsv(filtered)}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["TXN ID", "Date", "Gateway", "Amount", "Currency", "Status", "Reference", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground text-sm">
                    Loading transactions…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground text-sm">
                    No transactions match your filters.
                  </td>
                </tr>
              )}
              {!loading && filtered.map(txn => <TxnRow key={txn.id} txn={txn} live={live} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AdminTransactionsPage() {
  return <TransactionsContent />
}
