"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, Printer, Download, BookOpen, Headphones,
  CheckCircle2, Clock, XCircle, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { orderStore, seedStore, CURRENCY_SYMBOLS, type Order } from "@/lib/store"
import { ordersApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { apiOrderToStore } from "@/lib/order-mapper"

// ── status display ────────────────────────────────────────────────────────────

const STATUS_META = {
  paid:     { label: "PAID",     icon: CheckCircle2, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", border: "border-green-200 dark:border-green-800" },
  pending:  { label: "PENDING",  icon: Clock,        cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  failed:   { label: "FAILED",   icon: XCircle,      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",         border: "border-red-200 dark:border-red-800" },
  refunded: { label: "REFUNDED", icon: RefreshCw,    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",     border: "border-blue-200 dark:border-blue-800" },
}

// ── invoice component ─────────────────────────────────────────────────────────

function InvoiceContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router  = useRouter()
  const params  = useParams()
  const orderId = params.orderId as string
  const useLiveApi = apiUrlConfigured()

  const [order, setOrder] = React.useState<Order | null>(null)
  const [notFound, setNotFound] = React.useState(false)
  const [liveReady, setLiveReady] = React.useState(() => !useLiveApi)
  const [pdfBusy, setPdfBusy] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/invoice/${orderId}`)}`)
      return
    }
    if (!user || isLoading) return

    if (!useLiveApi) {
      seedStore()
      const found = orderStore.getById(orderId)
      setNotFound(!found)
      setOrder(found ?? null)
      setLiveReady(true)
      return
    }

    let alive = true
    setLiveReady(false)
    ordersApi
      .get(orderId)
      .then(res => {
        if (!alive) return
        const row = res.data as Record<string, unknown>
        setOrder(apiOrderToStore(row, user.id))
        setNotFound(false)
      })
      .catch(() => {
        if (!alive) return
        seedStore()
        const found = orderStore.getById(orderId)
        setNotFound(!found)
        setOrder(found ?? null)
      })
      .finally(() => {
        if (alive) setLiveReady(true)
      })

    return () => {
      alive = false
    }
  }, [isLoading, isAuthenticated, user, orderId, router, useLiveApi])

  const handlePrint = () => window.print()

  const handleDownloadPdf = async () => {
    if (!order || pdfBusy) return
    if (!useLiveApi) {
      handlePrint()
      return
    }
    setPdfBusy(true)
    try {
      await ordersApi.downloadInvoice(order.id)
    } catch {
      /* ignore */
    } finally {
      setPdfBusy(false)
    }
  }

  if (isLoading || !user || (useLiveApi && !liveReady)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto py-24 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
          <XCircle size={28} className="text-muted-foreground" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Invoice Not Found</h2>
        <p className="text-muted-foreground mb-6">
          Order <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{orderId}</code> does not exist or you don&apos;t have access to it.
        </p>
        <Link href="/orders">
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2">
            <ChevronLeft size={15} /> View All Orders
          </Button>
        </Link>
      </div>
    )
  }

  const statusMeta = STATUS_META[order!.status]
  const StatusIcon = statusMeta.icon
  const sym = CURRENCY_SYMBOLS[order!.currency]
  const paidDate = order!.paidAt
    ? new Date(order!.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—"
  const createdDate = new Date(order!.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Actions — hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href="/orders">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ChevronLeft size={15} /> Back to Orders
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 hover:border-brand hover:text-brand" onClick={handlePrint}>
            <Printer size={15} /> Print
          </Button>
          <Button
            className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2"
            onClick={() => { void handleDownloadPdf() }}
            disabled={pdfBusy}
          >
            <Download size={15} /> {useLiveApi ? (pdfBusy ? "Preparing…" : "Download PDF") : "Save as PDF"}
          </Button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden print:border-0 print:rounded-none print:shadow-none">

        {/* Header */}
        <div className="bg-brand px-8 py-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={20} className="text-white" />
              <span className="font-serif text-xl font-bold text-white">MyScriptic</span>
            </div>
            <p className="text-white/70 text-xs">Digital Book Marketplace</p>
            <p className="text-white/70 text-xs mt-0.5">Lagos, Nigeria · support@myscriptic.com</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs uppercase tracking-wider">INVOICE</p>
            <p className="font-mono font-bold text-white text-lg">{order!.orderNumber}</p>
            <p className="text-white/70 text-xs mt-0.5">{createdDate}</p>
          </div>
        </div>

        <div className="p-8">
          {/* Billing to + payment info */}
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billed To</p>
              <p className="font-semibold text-foreground">{user?.name ?? "Customer"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-sm text-muted-foreground">
                Account ID: {String(user?.id ?? "").slice(0, 12)}
                {String(user?.id ?? "").length > 12 ? "…" : ""}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Info</p>
              <div className="space-y-1">
                <div className="flex sm:justify-end items-center gap-2">
                  <span className="text-sm text-muted-foreground">Gateway:</span>
                  <span className="text-sm font-semibold capitalize text-foreground">{order!.paymentGateway}</span>
                </div>
                <div className="flex sm:justify-end items-center gap-2">
                  <span className="text-sm text-muted-foreground">Currency:</span>
                  <span className="text-sm font-semibold text-foreground">{order!.currency}</span>
                </div>
                {order!.paymentRef && (
                  <div className="flex sm:justify-end items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ref:</span>
                    <span className="text-xs font-mono text-foreground">{order!.paymentRef}</span>
                  </div>
                )}
                <div className="flex sm:justify-end items-center gap-2">
                  <span className="text-sm text-muted-foreground">Paid on:</span>
                  <span className="text-sm font-semibold text-foreground">{paidDate}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Items table */}
          <div className="overflow-hidden rounded-xl border border-border mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Item</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Format</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Type</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order!.items.map((item, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">by {item.author}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                        {item.format === "audiobook"
                          ? <Headphones size={12} />
                          : <BookOpen size={12} />
                        }
                        {item.format}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="secondary" className="text-[10px]">One-time Purchase</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {order!.currency === "USD" ? "$" : sym}
                      {item.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{order!.currency === "USD" ? "$" : sym}{order!.subtotal.toFixed(2)}</span>
              </div>
              {order!.discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount{order!.couponCode ? ` (${order!.couponCode})` : ""}</span>
                  <span>-{order!.currency === "USD" ? "$" : sym}{order!.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>VAT (7.5%)</span>
                <span>{order!.currency === "USD" ? "$" : sym}{order!.tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base text-foreground">
                <span>Total ({order!.currency})</span>
                <span>{order!.currency === "USD" ? "$" : sym}{order!.total.toFixed(2)}</span>
              </div>
              {order!.currency !== "USD" && (
                <div className="flex justify-between text-sm text-brand font-semibold">
                  <span>Charged in {order!.currency}</span>
                  <span>{sym}{order!.localTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status stamp */}
          <div className={cn("border-2 rounded-xl p-4 flex items-center gap-3", statusMeta.border, statusMeta.cls)}>
            <StatusIcon size={18} />
            <div>
              <p className="font-bold text-sm">{statusMeta.label}</p>
              <p className="text-xs opacity-80">
                {order!.status === "paid"
                  ? `Payment confirmed on ${paidDate} via ${order!.paymentGateway}`
                  : order!.status === "refunded"
                  ? "This order has been refunded. Allow 3–5 business days."
                  : order!.status === "pending"
                  ? "Payment is being processed. Books will unlock shortly."
                  : "Payment could not be completed for this order."
                }
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Footer note */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>
              Thank you for your purchase on <strong className="text-foreground">MyScriptic</strong>.
              Your digital books are available in your library immediately after payment.
            </p>
            <p>
              Questions? Contact us at <span className="text-brand">support@myscriptic.com</span>
            </p>
            <p className="pt-1 opacity-60">
              MyScriptic Ltd · VAT ID: NG-0000-0000 · This is a computer-generated invoice and requires no signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InvoicePage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <InvoiceContent />
        </main>
      </div>
    </Providers>
  )
}
