"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { emitCartChanged } from "@/lib/cart-events"
import { cartStore, type CartItem } from "@/lib/cart-store"
import { couponStore, taxStore, seedStore, type Coupon } from "@/lib/store"
import { laravelPhase2Enabled } from "@/lib/auth-mode"
import { cartApi, couponsApi } from "@/lib/api"
import {
  ShoppingCart, X, Tag, ChevronRight, BookOpen, Headphones,
  ShieldCheck, Info, Loader2, Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"

function mapApiCouponToCoupon(c: Record<string, unknown>): Coupon {
  const pct = String(c.discount_type ?? "pct") === "pct"
  return {
    id: String(c.id ?? c.code ?? "api"),
    code: String(c.code ?? ""),
    discountType: pct ? "pct" : "flat",
    discount: Number(c.discount_value ?? 0),
    maxUses: 9999,
    usedCount: 0,
    expiresAt: "",
    isActive: true,
    minOrderAmt: 0,
  }
}

function CartItemRow({
  item,
  onRemove,
}: {
  item: CartItem
  onRemove: (bookId: string) => void
}) {
  return (
    <div className="flex items-start gap-4 py-5">
      <Link href={`/books/${item.bookId}`} className="shrink-0">
        <img
          src={item.coverUrl}
          alt={`Cover of ${item.title}`}
          className="w-16 h-24 object-cover rounded-xl shadow-sm"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/books/${item.bookId}`}>
              <h3 className="font-semibold text-sm text-foreground hover:text-brand transition-colors line-clamp-2">
                {item.title}
              </h3>
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">{item.author}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-[10px] capitalize gap-1 py-0">
                {item.format === "audiobook" ? <Headphones size={9} /> : <BookOpen size={9} />}
                {item.format}
              </Badge>
              <Badge variant="secondary" className="text-[10px] py-0">One-time purchase</Badge>
            </div>
          </div>
          <button
            onClick={() => onRemove(item.bookId)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            aria-label={`Remove ${item.title} from cart`}
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">Digital download — instant access</p>
          <p className="text-base font-bold text-brand">{item.currency}{item.price.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}

function CartContent() {
  const router = useRouter()
  const phase2 = laravelPhase2Enabled()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const serverCart = phase2 && isAuthenticated
  const [items,       setItems]       = React.useState<CartItem[]>([])
  const [couponInput, setCouponInput] = React.useState("")
  const [applied,     setApplied]     = React.useState<Coupon | null>(null)
  const [couponError, setCouponError] = React.useState("")
  const [loading,     setLoading]     = React.useState(false)

  const loadServerCart = React.useCallback(() => {
    cartApi.get().then(res => {
      const rows = res.data as {
        id: string
        book_id: string
        title: string
        author: string
        cover_url?: string
        price: number
        currency: string
        format: string
      }[]
      setItems(rows.map(r => ({
        id:       r.id,
        bookId:   String(r.book_id),
        title:    r.title,
        author:   r.author,
        coverUrl: r.cover_url ?? "",
        price:    r.price,
        currency: r.currency === "USD" ? "$" : r.currency,
        format:   r.format,
      })))
    }).catch(() => setItems([]))
  }, [])

  // Seed store; Phase 2 + logged in → API cart; otherwise local cartStore
  React.useEffect(() => {
    if (phase2 && authLoading) return
    seedStore()
    if (serverCart) {
      loadServerCart()
      const saved = sessionStorage.getItem("ms_applied_coupon")
      if (saved) setCouponInput(saved)
      return
    }
    setItems(cartStore.getAll())
    const saved = sessionStorage.getItem("ms_applied_coupon")
    if (saved) {
      const res = couponStore.validate(saved, cartStore.total())
      if (res.valid && res.coupon) setApplied(res.coupon)
    }
  }, [phase2, authLoading, serverCart, loadServerCart])

  React.useEffect(() => {
    if (!serverCart || items.length === 0) return
    const saved = sessionStorage.getItem("ms_applied_coupon")
    if (!saved) return
    const sub = items.reduce((s, i) => s + i.price, 0)
    couponsApi.validate(saved, sub).then(res => {
      if (res.valid && res.coupon) setApplied(mapApiCouponToCoupon(res.coupon as Record<string, unknown>))
    }).catch(() => {})
  }, [serverCart, items])

  const removeItem = (bookId: string) => {
    if (serverCart) {
      cartApi.remove(bookId).then(() => {
        loadServerCart()
        emitCartChanged()
      })
      return
    }
    cartStore.remove(bookId)
    setItems(cartStore.getAll())
  }

  const subtotal = items.reduce((s, i) => s + i.price, 0)
  const discount = applied ? couponStore.calcDiscount(applied, subtotal) : 0
  const tax      = taxStore.calcTax(subtotal, discount)
  const total    = parseFloat((subtotal - discount + tax).toFixed(2))
  const activeTax = taxStore.getActive()

  const applyCoupon = () => {
    setCouponError("")
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    if (serverCart) {
      couponsApi.validate(code, subtotal).then(result => {
        if (!result.valid || !result.coupon) {
          setCouponError("Invalid coupon code.")
          return
        }
        setApplied(mapApiCouponToCoupon(result.coupon as Record<string, unknown>))
        sessionStorage.setItem("ms_applied_coupon", code)
        setCouponInput("")
      }).catch(() => setCouponError("Could not validate coupon."))
      return
    }
    const result = couponStore.validate(code, subtotal)
    if (!result.valid || !result.coupon) {
      setCouponError(result.error ?? "Invalid coupon code.")
      return
    }
    setApplied(result.coupon)
    sessionStorage.setItem("ms_applied_coupon", code)
    setCouponInput("")
  }

  const removeCoupon = () => {
    setApplied(null)
    sessionStorage.removeItem("ms_applied_coupon")
  }

  const handleCheckout = () => {
    setLoading(true)
    setTimeout(() => { router.push("/checkout"); setLoading(false) }, 300)
  }

  if (phase2 && authLoading) {
    return (
      <div className="flex justify-center items-center py-24" aria-busy="true" aria-label="Loading cart">
        <Loader2 className="w-9 h-9 animate-spin text-brand" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
          <ShoppingCart size={32} className="text-muted-foreground/50" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">Browse thousands of ebooks and audiobooks to get started.</p>
        <Link href="/store">
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
            <BookOpen size={16} />
            Browse Store
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Shopping Cart</h1>
      <p className="text-muted-foreground text-sm mb-8">
        {items.length} item{items.length !== 1 ? "s" : ""}
      </p>

      {phase2 && !isAuthenticated && items.length > 0 && (
        <Alert className="mb-6 border-brand/25 bg-brand/5">
          <Info size={14} className="text-brand" />
          <AlertDescription className="text-sm text-foreground ml-1">
            You&apos;re browsing with a local cart.{" "}
            <Link href={`/auth/login?next=${encodeURIComponent("/cart")}`} className="font-semibold text-brand hover:underline">
              Sign in
            </Link>{" "}
            to sync it with your account for checkout.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Cart items */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border px-5">
            {items.map(item => (
              <CartItemRow key={item.id} item={item} onRemove={removeItem} />
            ))}
          </div>

          {/* Coupon */}
          <div className="px-5 py-4 border-t border-border bg-muted/30">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              <Tag size={12} className="inline mr-1.5" />
              Coupon Code
            </Label>
            {applied ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <ShieldCheck size={16} className="text-green-600 dark:text-green-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {applied.code} — {applied.discountType === "pct"
                      ? `${applied.discount}% off`
                      : `$${applied.discount.toFixed(2)} off`}
                  </p>
                  <p className="text-xs text-green-600/70 dark:text-green-500/70">
                    Saving ${discount.toFixed(2)} on this order
                  </p>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-green-600/60 hover:text-green-700 dark:text-green-500/60 dark:hover:text-green-400 p-1"
                  aria-label="Remove coupon"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError("") }}
                  onKeyDown={e => e.key === "Enter" && applyCoupon()}
                  placeholder="Enter code (try: READ20)"
                  className={cn("flex-1 h-9 text-sm", couponError && "border-destructive")}
                />
                <Button onClick={applyCoupon} variant="outline" size="sm" className="h-9 hover:border-brand hover:text-brand">
                  Apply
                </Button>
              </div>
            )}
            {couponError && (
              <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                <Info size={11} />{couponError}
              </p>
            )}
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 sticky top-20">
          <h2 className="font-serif text-lg font-bold text-foreground">Order Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            {applied && discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount ({applied.code})</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            {activeTax && (
              <div className="flex justify-between text-muted-foreground">
                <span>{activeTax.name} ({(activeTax.rate * 100).toFixed(1)}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold text-foreground pt-1">
              <span>Total</span>
              <span className="text-brand">${total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 gap-2"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Processing...</>
            ) : (
              <><Lock size={15} /> Secure Checkout</>
            )}
          </Button>

          {/* Payment logos */}
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center mb-2.5">Secured payments via</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {["Paystack", "Flutterwave", "PayPal", "Korapay"].map(p => (
                <span key={p} className="text-[10px] font-bold text-muted-foreground px-2 py-1 bg-muted rounded border border-border">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <Alert className="border-brand/20 bg-brand/5 p-3">
            <ShieldCheck size={13} className="text-brand" />
            <AlertDescription className="text-xs text-foreground ml-1">
              All purchases include lifetime access to your digital library.
            </AlertDescription>
          </Alert>

          <Link href="/store" className="block">
            <Button variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground gap-1.5">
              <BookOpen size={14} />
              Continue Shopping
              <ChevronRight size={13} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <CartContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
