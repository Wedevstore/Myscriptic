"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import {
  XCircle, RefreshCw, ShoppingCart, Headphones, BookOpen,
  MessageCircle, ChevronRight, ShieldCheck,
} from "lucide-react"

const REASONS = [
  { icon: ShieldCheck, title: "Card declined", desc: "Check your card details and available balance, then try again." },
  { icon: RefreshCw,   title: "Network issue", desc: "Your connection may have dropped. Please retry the payment." },
  { icon: MessageCircle, title: "Authentication failed", desc: "Bank authentication step (3DS) was not completed. Try again." },
]

const CHECKOUT_GATEWAYS = ["paystack", "flutterwave", "paypal", "korapay"] as const
const GATEWAY_LABEL: Record<(typeof CHECKOUT_GATEWAYS)[number], string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
  paypal: "PayPal",
  korapay: "Korapay",
}

function FailureContent() {
  const params  = useSearchParams()
  const orderId = params.get("order") ?? ""
  const reason  = params.get("reason") ?? "payment_declined"
  const rawGw = (params.get("gateway") ?? "paystack").toLowerCase()
  const gateway = (CHECKOUT_GATEWAYS as readonly string[]).includes(rawGw) ? rawGw : "paystack"

  const friendlyError: Record<string, string> = {
    payment_declined:       "Payment was declined by the card issuer.",
    insufficient_funds:     "Insufficient funds on the selected payment method.",
    authentication_failed:  "3D Secure authentication was not completed.",
    network_error:          "A network error occurred during payment processing.",
    timeout:                "The payment session timed out. Please try again.",
    user_cancelled:         "Checkout was cancelled. No payment was taken.",
  }

  const message = friendlyError[reason] ?? "Payment could not be completed."

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
        <XCircle size={44} className="text-destructive" strokeWidth={1.5} />
      </div>

      <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Payment Failed</h1>
      <p className="text-muted-foreground mb-2">{message}</p>
      {orderId && (
        <p className="text-xs text-muted-foreground font-mono mb-8">
          Reference: {orderId.toUpperCase()}
        </p>
      )}

      {/* Retry */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
        <Link href={`/checkout?gateway=${encodeURIComponent(gateway)}&reason=retry`}>
          <Button className="w-full sm:w-auto bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11 gap-2">
            <RefreshCw size={15} />
            Try Again
          </Button>
        </Link>
        <Link href="/cart">
          <Button variant="outline" className="w-full sm:w-auto h-11 gap-2 hover:border-brand hover:text-brand">
            <ShoppingCart size={15} />
            Back to Cart
          </Button>
        </Link>
      </div>

      {/* Why it might have failed */}
      <div className="bg-card border border-border rounded-2xl p-6 text-left mb-8">
        <h2 className="font-semibold text-foreground mb-4 text-sm">Common reasons for payment failure</h2>
        <div className="space-y-4">
          {REASONS.map(r => (
            <div key={r.title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <r.icon size={14} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alternatives */}
      <div className="bg-muted/50 rounded-2xl p-5 mb-6 text-left">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Try a different payment method
        </p>
        <div className="flex flex-wrap gap-2">
          {CHECKOUT_GATEWAYS.filter(id => id !== gateway).map(id => (
            <Link key={id} href={`/checkout?gateway=${id}&reason=retry`}>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground hover:border-brand hover:text-brand transition-all"
              >
                Pay via {GATEWAY_LABEL[id]}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom links */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/books" className="text-brand hover:underline flex items-center gap-1">
          <BookOpen size={13} /> Browse Books
        </Link>
        <Link href="/subscription" className="text-brand hover:underline flex items-center gap-1">
          <Headphones size={13} /> Subscribe Instead
        </Link>
        <Link href="/contact" className="text-brand hover:underline flex items-center gap-1">
          <MessageCircle size={13} /> Contact Support <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}

export default function OrderFailurePage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <React.Suspense fallback={<div className="flex items-center justify-center h-96"><div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" /></div>}>
            <FailureContent />
          </React.Suspense>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
