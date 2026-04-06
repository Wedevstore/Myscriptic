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
  ChevronLeft, Search, Download, ShoppingBag, CheckCircle2,
  Clock, XCircle, RefreshCw, BookOpen, Headphones, Eye,
  DollarSign, Package, Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { adminApi, refundsApi } from "@/lib/api"
import { seedStore, orderStore, type Order, type OrderStatus, type PaymentGateway } from "@/lib/store"

type OrderStatusFilter = "all" | OrderStatus

const STATUS_META: Record<OrderStatus, { label: string; icon: React.ElementType; cls: string }> = {
  paid: { label: "Paid", icon: CheckCircle2, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  pending: { label: "Pending", icon: Clock, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  refunded: { label: "Refunded", icon: RefreshCw, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  failed: { label: "Failed", icon: XCircle, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

const GATEWAY_COLORS: Record<string, string> = {
  paystack: "bg-[#00C3F7]/10 text-[#00C3F7] border border-[#00C3F7]/30",
  flutterwave: "bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/30",
  paypal: "bg-[#003087]/10 text-[#003087] dark:text-blue-300 border border-[#003087]/20",
  korapay: "bg-[#7F3FBF]/10 text-[#7F3FBF] dark:text-purple-300 border border-[#7F3FBF]/20",
}

const VALID_GATEWAYS: PaymentGateway[] = ["paystack", "flutterwave", "paypal", "korapay"]

function normalizeGateway(g: string | undefined): PaymentGateway {
  const s = String(g ?? "").toLowerCase()
  return VALID_GATEWAYS.includes(s as PaymentGateway) ? (s as PaymentGateway) : "paystack"
}

function mapApiOrder(row: Record<string, unknown>): Order {
  const itemsRaw = Array.isArray(row.items) ? row.items : []
  const items = itemsRaw.map((i: Record<string, unknown>) => {
    const qty = Math.max(1, Number(i.quantity ?? 1))
    const unit = Number(i.unit_price ?? 0)
    return {
      bookId: String(i.book_id ?? ""),
      title: String(i.title ?? ""),
      author: String(i.author ?? ""),
      coverUrl: String(i.cover_url ?? ""),
      format: String(i.format ?? "ebook"),
      price: unit * qty,
    }
  })
  const currency = String(row.currency ?? "USD")
  const cur = ["USD", "NGN", "GHS", "KES"].includes(currency) ? currency : "USD"

  return {
    id: String(row.id ?? ""),
    orderNumber: String(row.order_number ?? ""),
    userId: String(row.user_id ?? ""),
    items,
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    tax: Number(row.tax ?? 0),
    total: Number(row.total ?? 0),
    currency: cur as Order["currency"],
    localTotal: row.local_total != null ? Number(row.local_total) : Number(row.total ?? 0),
    couponCode: row.coupon_code != null ? String(row.coupon_code) : null,
    paymentGateway: normalizeGateway(row.payment_gateway as string | undefined),
    paymentRef: row.payment_ref != null ? String(row.payment_ref) : null,
    status: String(row.status ?? "pending") as OrderStatus,
    createdAt: String(row.created_at ?? ""),
    paidAt: row.paid_at != null ? String(row.paid_at) : null,
  }
}

function OrderRow({ order, onRefund }: { order: Order; onRefund: (id: string) => void }) {
  const [expanded, setExpanded] = React.useState(false)
  const meta = STATUS_META[order.status]
  const StatusIcon = meta.icon

  return (
    <React.Fragment>
      <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-muted-foreground shrink-0" />
            <span className="font-mono text-xs font-semibold text-foreground">{order.orderNumber}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-muted-foreground font-mono">{order.userId.slice(0, 12)}...</span>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {order.items.length} item{order.items.length !== 1 ? "s" : ""}
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "text-xs font-semibold px-2 py-1 rounded-md capitalize",
              GATEWAY_COLORS[order.paymentGateway] ?? "bg-muted text-muted-foreground"
            )}
          >
            {order.paymentGateway}
          </span>
        </td>
        <td className="px-4 py-3 font-bold text-foreground font-mono">
          {order.currency} {order.total.toFixed(2)}
        </td>
        <td className="px-4 py-3">
          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium", meta.cls)}>
            <StatusIcon size={9} />
            {meta.label}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="p-1.5 rounded-md bg-muted hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
              aria-label="View order"
            >
              <Eye size={13} />
            </button>
            {order.status === "paid" && (
              <button
                type="button"
                onClick={() => onRefund(order.id)}
                className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 text-blue-600 dark:text-blue-400 transition-colors"
                aria-label="Issue refund"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} className="bg-muted/20 px-6 py-4">
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {(
                [
                  { label: "Subtotal", value: `${order.currency} ${order.subtotal.toFixed(2)}` },
                  {
                    label: "Discount",
                    value: order.discount > 0 ? `-${order.currency} ${order.discount.toFixed(2)}` : "—",
                    red: order.discount > 0,
                  },
                  { label: "Tax", value: `${order.currency} ${order.tax.toFixed(2)}` },
                  { label: "Total", value: `${order.currency} ${order.total.toFixed(2)}`, brand: true },
                ] as const
              ).map(d => (
                <div key={d.label} className="bg-card border border-border rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">{d.label}</p>
                  <p
                    className={cn(
                      "text-sm font-bold",
                      "brand" in d && d.brand ? "text-brand" : "red" in d && d.red ? "text-green-600" : "text-foreground"
                    )}
                  >
                    {d.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  {item.format === "audiobook" ? (
                    <Headphones size={12} className="text-muted-foreground shrink-0" />
                  ) : (
                    <BookOpen size={12} className="text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="text-muted-foreground">by {item.author}</span>
                  <span className="ml-auto font-semibold text-foreground">
                    {order.currency} {item.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            {order.couponCode && (
              <p className="text-xs text-muted-foreground mt-3">
                Coupon applied: <span className="font-mono font-semibold text-brand">{order.couponCode}</span>
              </p>
            )}
            {order.paymentRef && (
              <p className="text-xs text-muted-foreground mt-1">
                Payment ref: <span className="font-mono text-foreground">{order.paymentRef}</span>
              </p>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}

function exportOrdersCsv(rows: Order[], live: boolean, page: number, lastPage: number) {
  const header = ["order_number", "created_at", "user_id", "status", "gateway", "currency", "total"]
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const lines = [
    live ? "# source: API" : "# source: local demo store",
    ...(live ? [`# api_page: ${page} of ${lastPage} (search/filter applied in browser)`] : []),
    header.join(","),
    ...rows.map(o =>
      [o.orderNumber, o.createdAt, o.userId, o.status, o.paymentGateway, o.currency, String(o.total)].map(esc).join(",")
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `orders-${live ? "api" : "demo"}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function AdminOrdersContent() {
  const live = apiUrlConfigured()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatusFilter>("all")
  const [gatewayFilter, setGatewayFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [lastPage, setLastPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [refundBusy, setRefundBusy] = React.useState<string | null>(null)

  const loadLive = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: "30",
      }
      if (statusFilter !== "all") params.status = statusFilter
      const res = await adminApi.orders(params)
      const rows = (res.data ?? []) as Record<string, unknown>[]
      setOrders(rows.map(mapApiOrder))
      setLastPage(Math.max(1, Number((res.meta as { last_page?: number })?.last_page ?? 1)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  React.useEffect(() => {
    if (live) {
      void loadLive()
    } else {
      seedStore()
      setOrders(orderStore.getAll())
    }
  }, [live, loadLive])

  React.useEffect(() => {
    if (live) setPage(1)
  }, [statusFilter, live])

  const handleRefund = async (orderId: string) => {
    if (!confirm("Issue a full refund for this order?")) return
    if (live) {
      setRefundBusy(orderId)
      try {
        await refundsApi.create(orderId, "full")
        await loadLive()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refund failed")
      } finally {
        setRefundBusy(null)
      }
      return
    }
    orderStore.markRefunded(orderId, "full")
    setOrders(orderStore.getAll())
  }

  const filtered = orders
    .filter(o => {
      const matchSearch =
        !search ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.userId.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || o.status === statusFilter
      const matchGateway = gatewayFilter === "all" || o.paymentGateway === gatewayFilter
      return matchSearch && matchStatus && matchGateway
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalRevenue = orders.filter(o => o.status === "paid").reduce((s, o) => s + o.total, 0)
  const paidCount = orders.filter(o => o.status === "paid").length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft size={15} /> Admin
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Order Management</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        All platform orders. Click a row to expand details.
        {live && (
          <Badge variant="outline" className="ml-2 text-[10px]">
            Live API · page {page}/{lastPage}
          </Badge>
        )}
      </p>

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Orders", value: live ? orders.length : orders.length, color: "text-brand", bg: "bg-brand/10", icon: ShoppingBag },
          {
            label: "Paid",
            value: paidCount,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-900/20",
            icon: CheckCircle2,
          },
          {
            label: "Pending",
            value: orders.filter(o => o.status === "pending").length,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            icon: Clock,
          },
          { label: "Total (page)", value: `${orders[0]?.currency ?? "USD"} ${totalRevenue.toFixed(2)}`, color: "text-foreground", bg: "bg-muted", icon: DollarSign },
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
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search order # or user ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as OrderStatusFilter)}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Gateway" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Gateways</SelectItem>
            <SelectItem value="paystack">Paystack</SelectItem>
            <SelectItem value="flutterwave">Flutterwave</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="korapay">Korapay</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Filter size={13} />
          {filtered.length} of {orders.length} orders
        </div>
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
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => exportOrdersCsv(filtered, live, page, lastPage)}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Order #", "Date", "User ID", "Items", "Gateway", "Total", "Status", "Actions"].map(h => (
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
                    Loading orders…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground text-sm">
                    No orders match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onRefund={id => {
                      if (refundBusy) return
                      void handleRefund(id)
                    }}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AdminOrdersPage() {
  return <AdminOrdersContent />
}
