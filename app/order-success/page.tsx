"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { laravelPhase2Enabled } from "@/lib/auth-mode"
import { ordersApiV2 } from "@/lib/api"
import { CURRENCY_RATES, seedStore, orderStore } from "@/lib/store"
import {
  CheckCircle2, BookOpen, Download, Share2, Star,
  ChevronRight, ShoppingBag, Headphones, Gift,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { demoPic } from "@/lib/demo-images"
import type { Currency, Order } from "@/lib/store"

function mapApiOrder(o: Record<string, unknown>): Order | null {
  const itemsRaw = o.items
  if (!Array.isArray(itemsRaw)) return null
  const cur = (String(o.currency ?? "USD")) as Currency
  const total = Number(o.total ?? 0)
  const rate = CURRENCY_RATES[cur] ?? 1

  return {
    id: String(o.id),
    orderNumber: String(o.order_number ?? ""),
    userId: "",
    items: itemsRaw.map((it: unknown) => {
      const i = it as Record<string, unknown>
      const qty = Number(i.quantity ?? 1)
      return {
        bookId: String(i.book_id),
        title: String(i.title),
        author: String(i.author),
        coverUrl: String(i.cover_url ?? demoPic("order-thumb", 48, 64)),
        format: String(i.format),
        price: Number(i.unit_price) * qty,
      }
    }),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    tax: Number(o.tax),
    total,
    currency: cur,
    localTotal: parseFloat((total * rate).toFixed(2)),
    couponCode: null,
    paymentGateway: String(o.payment_gateway ?? "paystack") as Order["paymentGateway"],
    paymentRef: o.payment_ref ? String(o.payment_ref) : null,
    status: String(o.status ?? "paid") as Order["status"],
    createdAt: String(o.created_at ?? ""),
    paidAt: o.paid_at ? String(o.paid_at) : null,
  }
}

function SuccessContent() {
  const { user } = useAuth()
  const params   = useSearchParams()
  const orderId  = params.get("order") ?? "ord_seed_001"

  const [order, setOrder] = React.useState<Order | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [confetti, setConfetti] = React.useState(false)
  const [shareHint, setShareHint] = React.useState(false)

  const handleShareSuccess = React.useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "Order confirmed — MyScriptic",
          text: "I just grabbed new reads on MyScriptic.",
          url,
        })
        return
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setShareHint(true)
        window.setTimeout(() => setShareHint(false), 2000)
      }
    } catch {
      /* user cancelled share sheet */
    }
  }, [])

  React.useEffect(() => {
    seedStore()
    let alive = true

    if (laravelPhase2Enabled() && /^\d+$/.test(orderId)) {
      ordersApiV2.verify(orderId).then(r => {
        if (!alive) return
        if (r.verified && r.order && typeof r.order === "object") {
          setOrder(mapApiOrder(r.order as Record<string, unknown>))
        } else {
          setOrder(null)
        }
      }).catch(() => alive && setOrder(null)).finally(() => alive && setLoading(false))
    } else {
      setOrder(orderStore.getById(orderId))
      setLoading(false)
    }

    setTimeout(() => setConfetti(true), 200)
    setTimeout(() => setConfetti(false), 3000)

    return () => { alive = false }
  }, [orderId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Loading your order...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <p className="font-semibold text-foreground mb-2">We could not load this order.</p>
        <p className="text-muted-foreground text-sm mb-4">If you just paid, wait a moment and refresh, or open your library from the dashboard.</p>
        <Link href="/dashboard/reader" className="text-brand hover:underline text-sm">Go to library</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className={cn(
          "w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-5 transition-transform duration-500",
          confetti ? "scale-110" : "scale-100"
        )}>
          <CheckCircle2 size={44} className="text-green-500" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
          Payment Successful!
        </h1>
        <p className="text-muted-foreground">
          Thank you{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! Your books are ready to read instantly.
        </p>
      </div>

      {/* Order summary card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
        {/* Header */}
        <div className="bg-muted/50 px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Order number</p>
            <p className="font-mono font-semibold text-sm text-foreground">{order.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Payment via</p>
            <p className="text-sm font-semibold capitalize text-foreground">{order.paymentGateway}</p>
          </div>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 gap-1.5">
            <CheckCircle2 size={11} /> Paid
          </Badge>
        </div>

        {/* Items */}
        <div className="divide-y divide-border">
          {order.items.map(item => (
            <div key={item.bookId} className="flex items-center gap-4 px-6 py-4">
              <img
                src={item.coverUrl}
                alt={`Cover of ${item.title}`}
                className="w-12 h-16 object-cover rounded-lg shadow-sm shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Link href={`/books/${item.bookId}`}>
                  <p className="font-semibold text-sm text-foreground hover:text-brand transition-colors truncate">
                    {item.title}
                  </p>
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">{item.author}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[10px] py-0 capitalize gap-1">
                    {item.format === "audiobook" ? <Headphones size={9} /> : <BookOpen size={9} />}
                    {item.format}
                  </Badge>
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium flex items-center gap-0.5">
                    <CheckCircle2 size={9} /> Unlocked
                  </span>
                </div>
              </div>
              <p className="font-bold text-sm text-foreground shrink-0">${item.price.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
              <span>-${order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>VAT (7.5%)</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base text-foreground pt-1">
            <span>Total Paid</span>
            <span className="text-brand">${order.total.toFixed(2)}</span>
          </div>
          {order.currency !== "USD" && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Equivalent ({order.currency})</span>
              <span>{order.localTotal.toFixed(2)} {order.currency}</span>
            </div>
          )}
        </div>
      </div>

      {/* Receipt note */}
      <div className="bg-brand/5 border border-brand/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Gift size={16} className="text-brand mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Receipt sent to {user?.email ?? "your email"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            You can also download a PDF invoice from your order history anytime.
          </p>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Link href="/dashboard/reader">
          <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11 gap-2">
            <BookOpen size={15} />
            Read Now
          </Button>
        </Link>
        <Link href={`/invoice/${order.id}`}>
          <Button variant="outline" className="w-full h-11 gap-2 hover:border-brand hover:text-brand">
            <Download size={15} />
            Download Invoice
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link href="/orders">
          <Button variant="ghost" className="w-full h-9 text-sm text-muted-foreground hover:text-foreground gap-1.5">
            <ShoppingBag size={14} />
            Order History
          </Button>
        </Link>
        <Link href="/store">
          <Button variant="ghost" className="w-full h-9 text-sm text-muted-foreground hover:text-foreground gap-1.5">
            <ChevronRight size={14} />
            Browse More
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="w-full h-9 text-sm text-muted-foreground hover:text-foreground gap-1.5"
          onClick={handleShareSuccess}
        >
          <Share2 size={14} />
          {shareHint ? "Copied!" : "Share"}
        </Button>
      </div>
      {shareHint && (
        <p className="text-center text-xs text-muted-foreground -mt-2 mb-2" role="status">
          Link copied to clipboard
        </p>
      )}

      {/* Rate books prompt */}
      <div className="mt-8 border border-dashed border-border rounded-2xl p-5 text-center">
        <Star size={24} className="mx-auto text-amber-400 mb-2" />
        <p className="font-semibold text-foreground mb-1">Enjoying your books?</p>
        <p className="text-sm text-muted-foreground mb-3">Leave a review to help other readers discover great content.</p>
        <div className="flex gap-2 justify-center">
          {order.items.slice(0, 2).map(item => (
            <Link key={item.bookId} href={`/books/${item.bookId}`}>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 hover:border-brand hover:text-brand">
                <Star size={11} /> Rate {item.title.slice(0, 15)}...
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <React.Suspense fallback={<div className="flex items-center justify-center h-96"><div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" /></div>}>
            <SuccessContent />
          </React.Suspense>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
