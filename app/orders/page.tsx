"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ShoppingBag, Search, Download, Eye, RefreshCw,
  CheckCircle2, Clock, XCircle, Package, BookOpen, Headphones,
} from "lucide-react"
import {
  orderStore, seedStore, CURRENCY_SYMBOLS,
  type Order, type OrderStatus,
} from "@/lib/store"
import { ordersApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { apiOrderToStore } from "@/lib/order-mapper"
import { cn } from "@/lib/utils"

// ── status meta ───────────────────────────────────────────────────────────────

const STATUS_META: Record<OrderStatus, { label: string; icon: React.ElementType; className: string }> = {
  paid:     { label: "Paid",     icon: CheckCircle2, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  pending:  { label: "Pending",  icon: Clock,        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  refunded: { label: "Refunded", icon: RefreshCw,    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  failed:   { label: "Failed",   icon: XCircle,      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

// ── order card ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status]
  const StatusIcon = meta.icon
  const sym = CURRENCY_SYMBOLS[order.currency]
  const dateStr = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Order header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-3">
          <Package size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Order number</p>
            <p className="text-sm font-mono font-semibold text-foreground">{order.orderNumber}</p>
          </div>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="text-sm font-medium text-foreground">{dateStr}</p>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs text-muted-foreground">Payment</p>
          <p className="text-sm font-medium text-foreground capitalize">{order.paymentGateway}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-bold text-foreground font-mono">
            {order.currency === "USD" ? "$" : sym}
            {order.currency === "USD" ? order.total.toFixed(2) : order.localTotal.toFixed(2)}
          </p>
        </div>
        <Badge className={cn("flex items-center gap-1.5 text-xs border-0", meta.className)}>
          <StatusIcon size={11} />
          {meta.label}
        </Badge>
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <img
              src={item.coverUrl}
              alt={`Cover of ${item.title}`}
              className="w-12 h-16 object-cover rounded-lg shadow-sm shrink-0"
            />
            <div className="flex-1 min-w-0">
              <Link href={`/books/${item.bookId}`}>
                <p className="font-semibold text-sm text-foreground hover:text-brand transition-colors line-clamp-1">
                  {item.title}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground">{item.author}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 capitalize">
                {item.format === "audiobook" ? <Headphones size={11} /> : <BookOpen size={11} />}
                {item.format}
              </div>
            </div>
            <p className="font-semibold text-sm text-foreground shrink-0 font-mono">
              ${item.price.toFixed(2)}
            </p>
            {order.status === "paid" && (
              <Link href={`/reader/${item.bookId}`}>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 hover:border-brand hover:text-brand gap-1 shrink-0">
                  <Eye size={12} /> Read
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-border bg-muted/20">
        <Link href={`/invoice/${order.id}`} className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline font-medium">
          <Download size={13} /> View Invoice
        </Link>
        {order.status === "paid" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5"
          >
            <RefreshCw size={12} /> Request Refund
          </Button>
        )}
        {order.status === "pending" && (
          <p className="text-xs text-muted-foreground italic">
            Payment being processed. Books will unlock shortly.
          </p>
        )}
        {order.status === "refunded" && (
          <p className="text-xs text-muted-foreground">
            Refunded. Allow 3–5 business days.
          </p>
        )}
      </div>
    </div>
  )
}

// ── page content ──────────────────────────────────────────────────────────────

function OrdersContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const useLiveApi = apiUrlConfigured()
  const [liveReady, setLiveReady] = React.useState(() => !useLiveApi)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Forders")
      return
    }
    if (!user || isLoading) return

    if (!useLiveApi) {
      seedStore()
      setOrders(orderStore.getByUser(user.id))
      setLiveReady(true)
      return
    }

    let alive = true
    setLiveReady(false)
    ordersApi
      .list()
      .then(res => {
        if (!alive) return
        const rows = (Array.isArray(res.data) ? res.data : []) as Record<string, unknown>[]
        setOrders(rows.map(r => apiOrderToStore(r, user.id)))
      })
      .catch(() => {
        if (!alive) return
        seedStore()
        setOrders(orderStore.getByUser(user.id))
      })
      .finally(() => {
        if (alive) setLiveReady(true)
      })

    return () => {
      alive = false
    }
  }, [isLoading, isAuthenticated, user, router, useLiveApi])

  const filtered = orders.filter(o => {
    const matchesSearch = !search || o.orderNumber.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || o.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalSpent = orders
    .filter(o => o.status === "paid")
    .reduce((sum, o) => sum + o.total, 0)

  const counts = {
    all:      orders.length,
    paid:     orders.filter(o => o.status === "paid").length,
    pending:  orders.filter(o => o.status === "pending").length,
    refunded: orders.filter(o => o.status === "refunded").length,
    failed:   orders.filter(o => o.status === "failed").length,
  }

  if (isLoading || !user) {
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={20} className="text-brand" />
            <h1 className="font-serif text-3xl font-bold text-foreground">Order History</h1>
          </div>
          <p className="text-muted-foreground">
            {counts.all} order{counts.all !== 1 ? "s" : ""} &middot; ${totalSpent.toFixed(2)} total spent
          </p>
          {useLiveApi && (
            <p className="text-xs text-muted-foreground/90 mt-1">Showing orders from your account.</p>
          )}
        </div>
        <Link href="/store">
          <Button variant="outline" className="gap-2 hover:border-brand hover:text-brand">
            Shop Books
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Orders", value: counts.all,      color: "text-brand" },
          { label: "Paid",         value: counts.paid,     color: "text-green-500" },
          { label: "Pending",      value: counts.pending,  color: "text-yellow-500" },
          { label: "Refunded",     value: counts.refunded, color: "text-blue-500" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={cn("text-2xl font-bold font-serif mb-1", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search order number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders ({counts.all})</SelectItem>
            <SelectItem value="paid">Paid ({counts.paid})</SelectItem>
            <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
            <SelectItem value="refunded">Refunded ({counts.refunded})</SelectItem>
            <SelectItem value="failed">Failed ({counts.failed})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <ShoppingBag size={36} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground mb-1">No orders found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {search || statusFilter !== "all" ? "Try adjusting your filters." : "You haven't made any purchases yet."}
          </p>
          <Link href="/store">
            <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold">
              Browse Books
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <OrdersContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
