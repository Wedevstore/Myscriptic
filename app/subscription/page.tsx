"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/providers/auth-provider"
import { subscriptionsApi } from "@/lib/api"
import { laravelPhase3Enabled } from "@/lib/auth-mode"
import {
  subPlanStore, subscriptionStore,
  type SubscriptionPlan, type Currency,
} from "@/lib/store"
import {
  Check, Zap, BookOpen, Headphones, Download, Globe, Shield,
  Crown, CreditCard, Loader2, CheckCircle, XCircle, RefreshCw,
  AlertTriangle, Lock, Infinity,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Static content ────────────────────────────────────────────────────────────

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. You retain access until the end of the billing period." },
  { q: "What formats are supported?", a: "PDF, EPUB for ebooks; MP3 streaming + offline for audiobooks." },
  { q: "Can I switch plans?", a: "Upgrade or downgrade anytime. Changes take effect at the next cycle." },
  { q: "What currencies do you accept?", a: "USD, NGN, GHS, KES via Paystack, Flutterwave, Korapay, and PayPal." },
  { q: "Is there a free trial?", a: "New subscribers get their first month free. No credit card required." },
  { q: "Do PAID books count under my subscription?", a: "No. Subscription unlocks FREE and SUBSCRIPTION books only. PAID titles must be purchased separately." },
]

const FEATURES_DETAIL = [
  { icon: BookOpen,    title: "Entire Library",          desc: "50,000+ ebooks in every genre — fiction, self-help, finance, tech & more." },
  { icon: Headphones,  title: "Audiobook Streaming",     desc: "Thousands of audiobooks, high-quality audio. Stream or download offline." },
  { icon: Download,    title: "Offline Downloads",        desc: "Take your reading offline. Annual plan: unlimited downloads." },
  { icon: Globe,       title: "Multi-device Sync",        desc: "Progress syncs across all your devices instantly." },
  { icon: Zap,         title: "Early Access",             desc: "Annual plan holders read new releases before general availability." },
  { icon: Shield,      title: "Ad-Free",                  desc: "A completely ad-free reading experience on all plans." },
]

const GATEWAYS = [
  { id: "paystack",    label: "Paystack"    },
  { id: "flutterwave", label: "Flutterwave" },
  { id: "paypal",      label: "PayPal"      },
  { id: "korapay",     label: "Korapay"     },
]

function mapApiPlanToUi(p: Record<string, unknown>): SubscriptionPlan {
  const dur = Number(p.duration_days ?? 30)
  const cur = (String(p.currency ?? "USD")) as Currency
  return {
    id:               String(p.id),
    name:             String(p.name),
    price:            Number(p.price),
    currency:         cur === "NGN" || cur === "GHS" || cur === "KES" || cur === "USD" ? cur : "USD",
    durationDays:     dur,
    unlimitedReading: Boolean(p.unlimited_reading),
    isActive:         true,
    isPopular:        dur >= 365,
    features:         [
      "Subscription catalog (FREE + SUBSCRIPTION titles)",
      "Progress sync & engagement-based author support",
      "Read on any device",
    ],
    createdAt:        new Date().toISOString(),
  }
}

const CURRENCIES: { id: Currency; label: string }[] = [
  { id: "USD", label: "USD ($)" },
  { id: "NGN", label: "NGN (₦)" },
  { id: "GHS", label: "GHS (₵)" },
  { id: "KES", label: "KES (KSh)" },
]

// ── Active Subscription Banner ────────────────────────────────────────────────

function ActiveSubBanner({ expiresAt, planName }: { expiresAt: string; planName: string }) {
  const exp  = new Date(expiresAt)
  const now  = new Date()
  const days = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / 86400000))
  const pct  = Math.min(100, Math.max(0, 100 - (days / 365) * 100))

  return (
    <div className="max-w-2xl mx-auto mt-6 mb-4 px-4">
      <div className="rounded-2xl border border-brand/40 bg-brand/5 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand/10">
              <Crown size={18} className="text-brand" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{planName}</p>
              <p className="text-xs text-muted-foreground">Subscription active</p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 gap-1.5 px-3 py-1">
            <CheckCircle size={11} /> Active
          </Badge>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Days remaining</span>
            <span className="font-semibold text-foreground">{days} days left</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Expires {exp.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="mt-4 flex gap-3 flex-wrap">
          <Link href="/subscription/library">
            <Button size="sm" className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2 h-9 text-xs font-semibold">
              <BookOpen size={13} /> Browse Subscription Library
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Checkout Modal ────────────────────────────────────────────────────────────

type CheckoutStep = "config" | "processing" | "success" | "failed"

function CheckoutModal({
  plan,
  onClose,
  onSuccess,
}: {
  plan: SubscriptionPlan
  onClose: () => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [gateway, setGateway]   = React.useState<string>("paystack")
  const [currency, setCurrency] = React.useState<Currency>("USD")
  const [step, setStep]         = React.useState<CheckoutStep>("config")
  const [error, setError]       = React.useState<string | null>(null)

  async function handleSubmit() {
    if (!user) return
    setStep("processing")
    setError(null)

    if (laravelPhase3Enabled() && /^\d+$/.test(String(plan.id))) {
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        const res = await subscriptionsApi.checkout({
          plan_id:   String(plan.id),
          payment_gateway: gateway,
          return_url: `${origin}/subscription`,
        })
        window.location.href = res.payment_url
      } catch {
        setError("Could not start checkout. Try again.")
        setStep("failed")
      }
      return
    }

    const result = await subscriptionStore.purchase(user.id, plan.id, gateway as "paystack" | "flutterwave" | "paypal" | "korapay", currency)
    if (result.success) {
      setStep("success")
      setTimeout(() => { onSuccess(); onClose() }, 2200)
    } else {
      setError(result.error ?? "Payment failed.")
      setStep("failed")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-foreground">Subscribe to {plan.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              ${plan.price} / {plan.durationDays === 30 ? "month" : "year"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="p-6">
          {step === "config" && (
            <div className="space-y-5">
              {/* Plan summary */}
              <div className="bg-muted/60 rounded-xl p-4 space-y-2">
                {plan.features.slice(0, 3).map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check size={13} className="text-brand shrink-0" />
                    {f}
                  </div>
                ))}
                {plan.unlimitedReading && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Infinity size={13} className="text-brand shrink-0" />
                    Unlimited reading access
                  </div>
                )}
              </div>

              {/* Currency */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Currency</p>
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCurrency(c.id)}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                        currency === c.id
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border text-muted-foreground hover:border-brand/40"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gateway */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {GATEWAYS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGateway(g.id)}
                      className={cn(
                        "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-2",
                        gateway === g.id
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border text-muted-foreground hover:border-brand/40"
                      )}
                    >
                      <CreditCard size={13} /> {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total today</span>
                <span className="font-bold font-serif text-xl text-foreground">${plan.price}</span>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full h-12 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2"
              >
                <Lock size={14} /> Confirm Subscription
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                SSL-encrypted. Cancel anytime. No hidden fees.
              </p>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-brand border-t-transparent animate-spin" />
              <p className="font-semibold text-foreground">Processing payment…</p>
              <p className="text-xs text-muted-foreground text-center">
                Please wait. Do not close this window.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="font-serif text-xl font-bold text-foreground">You&apos;re subscribed!</p>
              <p className="text-sm text-muted-foreground">
                Welcome to {plan.name}. Enjoy unlimited reading.
              </p>
            </div>
          )}

          {step === "failed" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle size={32} className="text-red-500" />
              </div>
              <p className="font-serif text-lg font-bold text-foreground">Payment Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                onClick={() => { setStep("config"); setError(null) }}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw size={13} /> Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  activePlanId,
  onSubscribe,
}: {
  plan: SubscriptionPlan
  /** When set, the matching card is the subscriber's current plan. */
  activePlanId: string | null
  onSubscribe: (plan: SubscriptionPlan) => void
}) {
  const isCurrentPlan = activePlanId !== null && plan.id === activePlanId
  const hasOtherPlan  = activePlanId !== null && plan.id !== activePlanId
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border-2 p-8 transition-all",
        plan.isPopular
          ? "border-brand bg-brand/5 shadow-xl shadow-brand/10"
          : "border-border bg-card hover:border-brand/30"
      )}
    >
      {plan.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-brand text-primary-foreground px-4 py-1 text-xs font-bold uppercase tracking-wider gap-1">
            <Crown size={10} /> Most Popular
          </Badge>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-serif text-xl font-bold text-foreground">{plan.name}</h3>
        <div className="flex items-baseline gap-1.5 mt-3">
          <span className="text-4xl font-bold text-foreground font-serif">${plan.price}</span>
          <span className="text-muted-foreground text-sm">/ {plan.durationDays === 30 ? "month" : "year"}</span>
        </div>
        {plan.durationDays === 365 && (
          <span className="inline-block mt-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
            Save 33% vs monthly
          </span>
        )}
      </div>

      <ul className="space-y-3 flex-1 mb-8">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-3 text-sm text-foreground">
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              plan.isPopular ? "bg-brand text-primary-foreground" : "bg-muted"
            )}>
              <Check size={11} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold text-sm">
          <CheckCircle size={15} /> Your current plan
        </div>
      ) : hasOtherPlan ? (
        <div className="flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-muted/40 text-muted-foreground font-medium text-sm px-2 text-center">
          You have another active plan — see the banner above.
        </div>
      ) : (
        <Button
          onClick={() => onSubscribe(plan)}
          className={cn(
            "w-full h-12 font-semibold text-base",
            plan.isPopular
              ? "bg-brand hover:bg-brand-dark text-primary-foreground"
              : ""
          )}
          variant={plan.isPopular ? "default" : "outline"}
        >
          {plan.isPopular ? "Start Free Trial" : `Subscribe ${plan.durationDays === 30 ? "Monthly" : "Yearly"}`}
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground mt-3">
        No credit card required. Cancel anytime.
      </p>
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false)
  const panelId = React.useId()
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full py-5 text-left gap-4"
        aria-expanded={open ? "true" : "false"}
        aria-controls={panelId}
      >
        <span className="font-semibold text-foreground text-sm">{q}</span>
        <span className="sr-only">{open ? "Collapse" : "Expand"}</span>
        <span className={cn("text-muted-foreground text-lg transition-transform duration-200 leading-none", open ? "rotate-45" : "")} aria-hidden>
          +
        </span>
      </button>
      <p
        id={panelId}
        className="pb-5 text-sm text-muted-foreground leading-relaxed"
        role="region"
        hidden={!open}
      >
        {a}
      </p>
    </div>
  )
}

// ── Access Type Explainer ─────────────────────────────────────────────────────

function AccessTypeExplainer() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
      <h2 className="font-serif text-2xl font-bold text-foreground text-center mb-2">How Access Works</h2>
      <p className="text-muted-foreground text-center text-sm mb-8">
        MyScriptic has three access tiers. Your subscription unlocks the middle tier.
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            type: "FREE",
            color: "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10",
            badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
            icon: BookOpen,
            desc: "Open to everyone. No purchase or subscription needed.",
          },
          {
            type: "SUBSCRIPTION",
            color: "border-brand bg-brand/5",
            badgeColor: "bg-brand/20 text-brand",
            icon: Crown,
            desc: "Available to all active subscribers. The bulk of our library.",
          },
          {
            type: "PAID",
            color: "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10",
            badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
            icon: Lock,
            desc: "Premium titles. Must be purchased individually even with a subscription.",
          },
        ].map(item => (
          <div key={item.type} className={cn("rounded-2xl border-2 p-6", item.color)}>
            <div className="flex items-center gap-2 mb-3">
              <item.icon size={16} className="text-foreground" />
              <Badge className={cn("border-0 text-xs font-bold", item.badgeColor)}>{item.type}</Badge>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

/** Handles `subscription_success=1` / `subscription_cancelled=1` from payment return URLs (mock or gateway). */
function SubscriptionCheckoutReturnBanner({ onPaidReturn }: { onPaidReturn: () => void }) {
  const searchParams = useSearchParams()
  const [notice, setNotice] = React.useState<"success" | "cancel" | null>(null)

  React.useEffect(() => {
    const success = searchParams.get("subscription_success") === "1"
    const cancelled = searchParams.get("subscription_cancelled") === "1"
    if (!success && !cancelled) return

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("subscription_success")
      url.searchParams.delete("subscription_cancelled")
      const q = url.searchParams.toString()
      window.history.replaceState({}, "", url.pathname + (q ? `?${q}` : ""))
    }

    if (success) {
      setNotice("success")
      onPaidReturn()
    } else {
      setNotice("cancel")
    }
  }, [searchParams, onPaidReturn])

  if (notice === "success") {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-4" role="status">
        <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-300 flex items-start gap-3">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Welcome aboard.</span>{" "}
            Your subscription is active — browse the{" "}
            <Link href="/subscription/library" className="underline font-medium">
              subscription library
            </Link>
            .
          </span>
        </div>
      </div>
    )
  }

  if (notice === "cancel") {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-4" role="status">
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Subscription checkout was cancelled. You can try again whenever you&apos;re ready.
        </div>
      </div>
    )
  }

  return null
}

function SubscriptionPageContent() {
  const { user, isAuthenticated, isLoading, updateUser } = useAuth()
  const router = useRouter()
  const [plans, setPlans]             = React.useState<SubscriptionPlan[]>([])
  const [activeSub, setActiveSub]     = React.useState<ReturnType<typeof subscriptionStore.getActiveByUser>>(null)
  const [laravelSub, setLaravelSub]   = React.useState<{
    planId: string
    planName: string
    expiresAt: string
  } | null>(null)
  const [selectedPlan, setSelectedPlan] = React.useState<SubscriptionPlan | null>(null)
  const [refreshKey, setRefreshKey]   = React.useState(0)

  const bumpSubscriptionRefresh = React.useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const activePlanId =
    laravelPhase3Enabled() && laravelSub
      ? laravelSub.planId
      : activeSub
        ? activeSub.planId
        : null

  React.useEffect(() => {
    if (laravelPhase3Enabled()) {
      setActiveSub(null)
      subscriptionsApi.plans()
        .then(res => {
          const rows = res.data as Record<string, unknown>[]
          setPlans(rows.length ? rows.map(mapApiPlanToUi) : subPlanStore.getActive())
        })
        .catch(() => setPlans(subPlanStore.getActive()))
      return
    }
    setPlans(subPlanStore.getActive())
    if (user) {
      setActiveSub(subscriptionStore.getActiveByUser(user.id))
    } else {
      setActiveSub(null)
    }
  }, [user, refreshKey])

  React.useEffect(() => {
    if (!laravelPhase3Enabled() || !user) {
      setLaravelSub(null)
      return
    }
    subscriptionsApi.status()
      .then(s => {
        if (s.active && s.expires_at && s.plan) {
          const planId = String(s.plan.id)
          setLaravelSub({
            planId,
            planName: s.plan.name,
            expiresAt: s.expires_at,
          })
          if (
            user.subscriptionPlan !== s.plan.name
            || user.subscriptionExpiresAt !== s.expires_at
          ) {
            updateUser({
              subscriptionPlan:      s.plan.name,
              subscriptionExpiresAt: s.expires_at,
            })
          }
        } else {
          setLaravelSub(null)
          if (user.subscriptionPlan != null || user.subscriptionExpiresAt != null) {
            updateUser({ subscriptionPlan: null, subscriptionExpiresAt: null })
          }
        }
      })
      .catch(() => setLaravelSub(null))
  }, [user, refreshKey, updateUser])

  function handleSubscribe(plan: SubscriptionPlan) {
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent("/subscription")}`)
      return
    }
    setSelectedPlan(plan)
  }

  function handleSuccess() {
    // Refresh subscription state
    setRefreshKey(k => k + 1)
    if (user) {
      const sub = subscriptionStore.getActiveByUser(user.id)
      if (sub) {
        // Sync user auth state
        updateUser({ subscriptionPlan: sub.planName, subscriptionExpiresAt: sub.expiresAt })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1 pt-16">
        <React.Suspense fallback={null}>
          <SubscriptionCheckoutReturnBanner onPaidReturn={bumpSubscriptionRefresh} />
        </React.Suspense>
        {/* Header */}
        <section className="bg-sidebar py-16 text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Badge className="mb-4 bg-brand/20 text-brand border-0 px-3 py-1 font-semibold">
              Subscription Plans
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-sidebar-foreground mb-4 text-balance">
              Read More. Pay Less.
            </h1>
            <p className="text-sidebar-foreground/60 text-lg leading-relaxed">
              One subscription. Unlimited access to 50,000+ books and audiobooks.
            </p>
          </div>
        </section>

        {/* Active sub banner */}
        {(laravelPhase3Enabled() && laravelSub
          ? <ActiveSubBanner expiresAt={laravelSub.expiresAt} planName={laravelSub.planName} />
          : activeSub
            ? <ActiveSubBanner expiresAt={activeSub.expiresAt} planName={activeSub.planName} />
            : null)}

        {/* Plans */}
        <section className="py-14 bg-background" aria-label="Subscription plan options">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {!isAuthenticated && (
              <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  Please{" "}
                  <Link href="/auth/login?next=%2Fsubscription" className="underline font-semibold">
                    log in
                  </Link>{" "}
                  or{" "}
                  <Link href="/auth/register?next=%2Fsubscription" className="underline font-semibold">
                    register
                  </Link>{" "}
                  to subscribe.
                </span>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-8">
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  activePlanId={activePlanId}
                  onSubscribe={handleSubscribe}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Access type explainer */}
        <section className="bg-muted/40 border-y border-border">
          <AccessTypeExplainer />
        </section>

        {/* Feature highlights */}
        <section className="py-14 bg-background" aria-label="Subscription features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-3xl font-bold text-foreground text-center mb-10">
              Everything you need to read
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {FEATURES_DETAIL.map(f => (
                <div key={f.title} className="flex gap-4 p-5 rounded-xl bg-card border border-border">
                  <div className="p-2.5 rounded-xl bg-brand/10 text-brand shrink-0 h-fit">
                    <f.icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14 bg-muted/40 border-t border-border" aria-label="Frequently asked questions">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <h2 className="font-serif text-3xl font-bold text-foreground text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="rounded-2xl border border-border bg-card px-6">
              {FAQS.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Checkout modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Providers>
      <SubscriptionPageContent />
    </Providers>
  )
}
