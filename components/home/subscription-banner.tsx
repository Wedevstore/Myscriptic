import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Headphones, Download, Zap, ChevronRight, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

const PERKS = [
  { icon: BookOpen,   label: "Unlimited ebooks",     sub: "50,000+ titles" },
  { icon: Headphones, label: "Audiobooks included",  sub: "5,000+ narrations" },
  { icon: Download,   label: "Offline downloads",    sub: "Read anywhere" },
  { icon: Zap,        label: "Early access",         sub: "New releases first" },
]

const PLANS = [
  { label: "Monthly",  price: "$9.99",  per: "/month", popular: false },
  { label: "Annual",   price: "$79.99", per: "/year",  popular: true,  savings: "Save 33%" },
]

export function SubscriptionBanner() {
  return (
    <section className="py-16 bg-sidebar noise relative overflow-hidden" aria-label="Subscription plans">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, oklch(0.769 0.188 70.08 / 0.12) 0%, transparent 65%)" }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Top label */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-brand mb-4">
            <Crown size={15} />
            <span className="text-xs font-bold uppercase tracking-widest">Subscription</span>
          </div>
          <h2 className="font-serif font-bold text-sidebar-foreground text-pretty leading-[1.1]"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            Read without limits.
          </h2>
          <p className="text-sidebar-foreground/50 mt-3 text-lg max-w-lg mx-auto leading-relaxed">
            One subscription unlocks your entire reading world.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Perks — left 3 cols */}
          <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
            {PERKS.map(p => (
              <div
                key={p.label}
                className="group flex items-start gap-4 p-5 rounded-2xl bg-sidebar-accent border border-sidebar-border/60 hover:border-brand/35 hover:bg-sidebar-accent/80 transition-all duration-200 card-lift"
              >
                <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center shrink-0 group-hover:bg-brand/25 transition-colors">
                  <p.icon size={18} className="text-brand" />
                </div>
                <div>
                  <div className="font-semibold text-sidebar-foreground text-sm leading-snug">{p.label}</div>
                  <div className="text-xs text-sidebar-foreground/40 mt-0.5">{p.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Plans — right 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.label}
                className={
                  plan.popular
                    ? "relative p-6 rounded-2xl bg-brand border-0 shadow-xl shadow-brand/30 overflow-hidden"
                    : "p-6 rounded-2xl bg-sidebar-accent border border-sidebar-border/60"
                }
              >
                {plan.popular && (
                  <div className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                {plan.savings && (
                  <div className="inline-block text-[10px] font-bold bg-white/25 text-white px-2.5 py-1 rounded-full mb-3 uppercase tracking-wide">
                    {plan.savings}
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: plan.popular ? "oklch(1 0 0 / 0.65)" : "oklch(var(--sidebar-foreground) / 0.45)" }}
                >
                  {plan.label}
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className={cn(
                    "font-serif font-bold leading-none",
                    plan.popular ? "text-white text-4xl" : "text-sidebar-foreground text-3xl"
                  )}>
                    {plan.price}
                  </span>
                  <span className={plan.popular ? "text-white/60 text-sm" : "text-sidebar-foreground/40 text-sm"}>
                    {plan.per}
                  </span>
                </div>
                <Link href="/subscription">
                  <Button
                    className={
                      plan.popular
                        ? "w-full bg-white text-brand hover:bg-white/90 font-semibold gap-2 shadow-sm"
                        : "w-full bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent font-semibold gap-2"
                    }
                  >
                    Start Free Trial <ChevronRight size={14} />
                  </Button>
                </Link>
              </div>
            ))}

            <p className="text-center text-[11px] text-sidebar-foreground/30 leading-relaxed px-2">
              No credit card required. Cancel anytime. Plans auto-renew.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
