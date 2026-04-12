"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cartStore, type CartItem } from "@/lib/cart-store"
import {
  orderStore, couponStore, taxStore, seedStore,
  CURRENCY_SYMBOLS, CURRENCY_RATES,
  type PaymentGateway, type Currency, type Coupon,
} from "@/lib/store"
import { laravelPhase2Enabled } from "@/lib/auth-mode"
import { cartApi, couponsApi, ordersApiV2 } from "@/lib/api"
import {
  ShieldCheck, Check, Loader2, ChevronLeft, CreditCard,
  BookOpen, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

type PaymentProvider = PaymentGateway

const PAYMENT_PROVIDERS: {
  id: PaymentProvider
  label:       string
  currencies:  Currency[]
  description: string
  color:       string
  accent:      string
}[] = [
  { id: "paystack",    label: "Paystack",    currencies: ["NGN", "GHS", "USD"],         description: "Card, bank, USSD",          color: "hover:border-[#00C3F7]", accent: "bg-[#00C3F7]" },
  { id: "flutterwave", label: "Flutterwave", currencies: ["NGN", "GHS", "KES", "USD"],  description: "Cards, mobile money, bank", color: "hover:border-[#F5A623]", accent: "bg-[#F5A623]" },
  { id: "paypal",      label: "PayPal",      currencies: ["USD"],                        description: "Fast, secure checkout",     color: "hover:border-[#003087]", accent: "bg-[#003087]" },
  { id: "korapay",     label: "Korapay",     currencies: ["NGN"],                        description: "Bank transfer & cards (NG)",color: "hover:border-[#7F3FBF]", accent: "bg-[#7F3FBF]" },
]

const STEPS = ["Cart Review", "Payment Method", "Confirm & Pay"]

function StepIndicator({ current }: { current: number }) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-8" aria-label="Checkout steps">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className={cn(
            "flex items-center gap-2",
            i < current  ? "text-green-600 dark:text-green-400" :
            i === current ? "text-brand font-semibold" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
              i < current  ? "border-green-500 bg-green-500 text-white" :
              i === current ? "border-brand text-brand" : "border-muted-foreground/30 text-muted-foreground"
            )}>
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("flex-1 h-px max-w-[40px]", i < current ? "bg-green-500" : "bg-border")} />
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

function mapApiCouponToCoupon(c: Record<string, unknown>): Coupon {
  const pct = String(c.discount_type ?? "pct") === "pct"
  return {
    id:         String(c.id ?? c.code ?? "api"),
    code:       String(c.code ?? ""),
    discountType: pct ? "pct" : "flat",
    discount:   Number(c.discount_value ?? 0),
    maxUses:    9999,
    usedCount:  0,
    expiresAt:  "",
    isActive:   true,
    minOrderAmt: 0,
  }
}

function CheckoutContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading } = useAuth()
  const phase2 = laravelPhase2Enabled()

  const [step,       setStep]       = React.useState(1)
  const [provider,   setProvider]   = React.useState<PaymentProvider>("paystack")
  const [currency,   setCurrency]   = React.useState<Currency>("USD")
  const [processing, setProcessing] = React.useState(false)
  const [payError, setPayError] = React.useState<string | null>(null)

  const [cardNumber, setCardNumber] = React.useState("")
  const [cardExpiry, setCardExpiry] = React.useState("")
  const [cardCvv,    setCardCvv]    = React.useState("")
  const [cardName,   setCardName]   = React.useState("")

  // Resolved coupon from sessionStorage (written by cart page)
  const [couponCode,     setCouponCode]     = React.useState("")
  const [resolvedCoupon, setResolvedCoupon] = React.useState<Coupon | null>(null)
  const [serverItems,    setServerItems]    = React.useState<CartItem[]>([])
  const [apiDiscount,    setApiDiscount]    = React.useState(0)

  const items    = phase2 ? serverItems : cartStore.getAll()
  const subtotal = items.reduce((s, i) => s + i.price, 0)

  React.useEffect(() => {
    if (!phase2 || !isAuthenticated) return
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
      setServerItems(rows.map(r => ({
        id:       r.id,
        bookId:   String(r.book_id),
        title:    r.title,
        author:   r.author,
        coverUrl: r.cover_url ?? "",
        price:    r.price,
        currency: r.currency === "USD" ? "$" : r.currency,
        format:   r.format,
      })))
    }).catch(() => setServerItems([]))
  }, [phase2, isAuthenticated])

  // Seed store and resolve coupon once on mount
  React.useEffect(() => {
    seedStore()
    if (user?.name) setCardName(user.name)

    const saved = sessionStorage.getItem("ms_applied_coupon") ?? ""
    setCouponCode(saved)
    if (!saved) return
    if (phase2) return
    const res = couponStore.validate(saved, subtotal)
    if (res.valid && res.coupon) setResolvedCoupon(res.coupon)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const saved = sessionStorage.getItem("ms_applied_coupon") ?? ""
    if (!phase2 || !saved || subtotal <= 0) {
      if (phase2 && !saved) {
        setResolvedCoupon(null)
        setApiDiscount(0)
      }
      return
    }
    couponsApi.validate(saved, subtotal).then(res => {
      if (res.valid && res.coupon) {
        setResolvedCoupon(mapApiCouponToCoupon(res.coupon as Record<string, unknown>))
        setApiDiscount(Number(res.discount ?? 0))
      } else {
        setResolvedCoupon(null)
        setApiDiscount(0)
      }
    }).catch(() => {
      setResolvedCoupon(null)
      setApiDiscount(0)
    })
  }, [phase2, subtotal, couponCode])

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const q = searchParams.toString()
      const nextPath = q ? `${pathname}?${q}` : pathname
      router.replace(`/auth/login?next=${encodeURIComponent(nextPath || "/checkout")}`)
    }
  }, [isLoading, isAuthenticated, router, pathname, searchParams])

  React.useEffect(() => {
    const g = searchParams.get("gateway")
    if (g && PAYMENT_PROVIDERS.some(p => p.id === g)) {
      setProvider(g as PaymentProvider)
    }
  }, [searchParams])

  const discount   = phase2 ? apiDiscount : (resolvedCoupon ? couponStore.calcDiscount(resolvedCoupon, subtotal) : 0)
  const tax        = taxStore.calcTax(subtotal, discount)
  const total      = parseFloat((subtotal - discount + tax).toFixed(2))
  const totalLocal = parseFloat((total * CURRENCY_RATES[currency]).toFixed(2))

  const selectedProvider = PAYMENT_PROVIDERS.find(p => p.id === provider)!

  const handlePay = async () => {
    if (!user) return
    setProcessing(true)
    setPayError(null)

    if (phase2) {
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        const res = await ordersApiV2.create({
          coupon_code:     couponCode || undefined,
          payment_gateway: provider,
          currency,
          return_url:      `${origin}/order-success`,
        })
        sessionStorage.removeItem("ms_applied_coupon")
        window.location.href = res.payment_url
      } catch (e) {
        setPayError(e instanceof Error ? e.message : "Payment failed. Please try again.")
        setProcessing(false)
      }
      return
    }

    await new Promise(r => setTimeout(r, 2000))

    const orderItems = items.map(i => ({
      bookId:   i.bookId,
      title:    i.title,
      author:   i.author,
      coverUrl: i.coverUrl,
      format:   i.format,
      price:    i.price,
    }))

    const order = orderStore.create(user.id, orderItems, {
      couponCode:     couponCode || undefined,
      coupon:         resolvedCoupon,
      paymentGateway: provider,
      currency,
    })

    const paymentRef = `${provider.slice(0, 2).toUpperCase()}_REF_${Date.now()}`
    orderStore.markPaid(order.id, paymentRef)

    if (couponCode) couponStore.use(couponCode)

    cartStore.clear()
    sessionStorage.removeItem("ms_applied_coupon")

    setProcessing(false)
    router.replace(`/order-success?order=${order.id}`)
  }

  const formatCard   = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
  const formatExpiry = (v: string) => v.replace(/\D/g, "").slice(0, 4).replace(/^(.{2})(.+)/, "$1/$2")

  if (!isAuthenticated && !isLoading) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          {step > 1 ? "Back" : "Cart"}
        </button>
        <h1 className="font-serif text-2xl font-bold text-foreground">Checkout</h1>
      </div>

      <StepIndicator current={step - 1} />

      {searchParams.get("reason") === "retry" && (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100"
          role="status"
        >
          <p className="font-medium">Previous payment didn&apos;t go through</p>
          <p className="text-xs mt-1 text-amber-900/80 dark:text-amber-200/90">
            You can try again or choose a different payment method below.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        {/* Main area */}
        <div>
          {/* Step 1: Order review */}
          {step === 1 && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-foreground">Order Review</h2>
              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Your cart is empty.{" "}
                  <Link href="/store" className="text-brand hover:underline">Browse the store</Link>
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <img
                        src={item.coverUrl}
                        alt={`Cover of ${item.title}`}
                        className="w-12 h-16 object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.author}</p>
                        <Badge variant="secondary" className="text-[10px] py-0 capitalize mt-1">{item.format}</Badge>
                      </div>
                      <p className="text-sm font-bold text-brand shrink-0">{item.currency}{item.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
              <Button
                className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11"
                onClick={() => setStep(2)}
                disabled={items.length === 0}
              >
                Choose Payment Method
                <ChevronDown size={15} className="ml-2 -rotate-90" />
              </Button>
            </div>
          )}

          {/* Step 2: Currency + payment method */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold text-foreground mb-4">Choose Currency</h2>
                <div className="grid grid-cols-4 gap-2">
                  {(["USD", "NGN", "GHS", "KES"] as Currency[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={cn(
                        "py-2.5 rounded-xl border-2 text-sm font-bold transition-all",
                        currency === c
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border text-muted-foreground hover:border-brand/30"
                      )}
                    >
                      {CURRENCY_SYMBOLS[c]} {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold text-foreground mb-4">Payment Method</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PAYMENT_PROVIDERS.filter(p => p.currencies.includes(currency)).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                        provider === p.id ? "border-brand bg-brand/5" : cn("border-border", p.color)
                      )}
                    >
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0", p.accent)}>
                        {p.label.slice(0, 2)}
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", provider === p.id ? "text-brand" : "text-foreground")}>
                          {p.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                      </div>
                      {provider === p.id && <Check size={14} className="text-brand ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full mt-5 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11"
                  onClick={() => setStep(3)}
                >
                  Continue to Payment Details
                  <ChevronDown size={15} className="ml-2 -rotate-90" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm + pay */}
          {step === 3 && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold", selectedProvider.accent)}>
                  {selectedProvider.label.slice(0, 2)}
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{selectedProvider.label}</h2>
                  <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
                </div>
              </div>

              <Separator />

              {phase2 ? (
                <div className="text-center py-4 space-y-3">
                  <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <ShieldCheck size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      You&apos;ll be securely redirected to {selectedProvider.label} to complete payment.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your card details are entered directly on {selectedProvider.label}&apos;s secure page — never on our servers.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardName">Name on Card</Label>
                    <Input
                      id="cardName"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="John Doe"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="cardNumber"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCard(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="pr-10"
                      />
                      <CreditCard size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                      <Input
                        id="expiry"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <ShieldCheck size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-400">
                      256-bit SSL encryption. Your payment info is never stored on our servers.
                    </p>
                  </div>
                </div>
              )}

              {payError && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-1">
                  {payError}
                </p>
              )}

              <Button
                className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 gap-2"
                onClick={handlePay}
                disabled={processing || (!phase2 && (!cardNumber || !cardExpiry || !cardCvv))}
              >
                {processing ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing payment...</>
                ) : phase2 ? (
                  <>Continue to {selectedProvider.label} — {CURRENCY_SYMBOLS[currency]}{totalLocal.toFixed(2)}</>
                ) : (
                  <>Pay {CURRENCY_SYMBOLS[currency]}{totalLocal.toFixed(2)} via {selectedProvider.label}</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="bg-card border border-border rounded-2xl p-5 sticky top-20">
          <h2 className="font-semibold text-foreground mb-4">Summary</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount{couponCode ? ` (${couponCode})` : ""}</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base text-foreground">
              <span>Total (USD)</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {currency !== "USD" && (
              <div className="flex justify-between text-brand font-semibold">
                <span>Equivalent ({currency})</span>
                <span>{CURRENCY_SYMBOLS[currency]}{totalLocal.toFixed(2)}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check size={10} className="text-green-500 shrink-0" />
                <span className="truncate">{item.title}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-brand/5 rounded-xl border border-brand/20">
            <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
              <BookOpen size={11} className="text-brand" />
              Instant access after payment
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              All digital books are immediately available in your library.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <React.Suspense fallback={
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            </div>
          }>
            <CheckoutContent />
          </React.Suspense>
        </main>
      </div>
    </Providers>
  )
}
