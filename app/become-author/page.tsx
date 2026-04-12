"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DollarSign, Upload, BarChart3, Users, Shield,
  BookOpen, Headphones, CheckCircle, ChevronRight,
  ArrowRight, Star, Zap, Lock, Clock,
} from "lucide-react"
import { authorApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { cn } from "@/lib/utils"

function buildAuthorApplicationBio(f: {
  penName: string
  bio: string
  genres: string
  sampleWork: string
  experience: string
}): string {
  const parts = [
    f.penName.trim() && `Pen name: ${f.penName.trim()}`,
    f.bio.trim(),
    f.genres.trim() && `Genres: ${f.genres.trim()}`,
    f.sampleWork.trim() && `Sample work:\n${f.sampleWork.trim()}`,
    f.experience.trim() && `Publishing experience:\n${f.experience.trim()}`,
  ].filter(Boolean) as string[]
  const text = parts.join("\n\n")
  return text.length > 5000 ? `${text.slice(0, 4997)}...` : text
}

function buildPayoutDetailsFromForm(f: {
  payoutMethod: string
  paystackEmail: string
  flutterwaveName: string
  flutterwaveBank: string
  flutterwaveAccNum: string
  paypalEmail: string
}): Record<string, string> {
  if (f.payoutMethod === "paystack") {
    return { paystack_email: f.paystackEmail.trim() }
  }
  if (f.payoutMethod === "flutterwave") {
    return {
      account_holder_name: f.flutterwaveName.trim(),
      bank_name: f.flutterwaveBank.trim(),
      account_number: f.flutterwaveAccNum.trim(),
    }
  }
  return { paypal_email: f.paypalEmail.trim() }
}

// ── Revenue pool illustration data ──────────────────────────────────────────
const POOL_EXAMPLE = {
  subscribers: 2000,
  pricePerMonth: 9.99,
  totalPool: 19980,
  adminCommission: 30,
  authorPool: 70,
  authorPoolAmount: 13986,
  exampleEngagement: 8,
  exampleEarning: 1118.88,
}

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Fair Revenue Share",
    description: "Earn from the subscription pool based on reader engagement. The more people read your work, the more you earn.",
  },
  {
    icon: Upload,
    title: "Easy Publishing",
    description: "Upload ebooks (PDF/EPUB) or audiobooks with our guided wizard. S3-backed storage ensures your files are always safe.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track reads, completion rates, and revenue month by month from your author dashboard.",
  },
  {
    icon: Users,
    title: "Built-in Audience",
    description: "Publish to 2M+ active readers with discovery features — trending, categories, and recommendations — doing the work for you.",
  },
  {
    icon: Shield,
    title: "DRM & Content Protection",
    description: "Your intellectual property is protected with secure signed URLs and anti-download controls.",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Monthly payouts via Paystack, Flutterwave, or PayPal. Full audit trail on every transaction.",
  },
]

const HOW_IT_WORKS = [
  { step: "01", title: "Create Your Account", description: "Register as an Author. Your application is reviewed within 24 hours." },
  { step: "02", title: "Upload Your Book", description: "Fill in the details, upload your cover and file. Set it as Free, Paid, or Subscription." },
  { step: "03", title: "Admin Review", description: "Our editorial team reviews quality and appropriateness before publishing." },
  { step: "04", title: "Earn Monthly", description: "Track reading engagement in real-time and receive monthly payouts based on your audience share." },
]

const TESTIMONIALS = [
  {
    name: "Chimamanda A.",
    role: "Fiction Author · 12 books",
    avatar: "https://placehold.co/56x56?text=CA+author+headshot+professional+warm",
    quote: "MyScriptic paid me more in 3 months than I earned from print sales in 2 years. The earnings engine is genuinely fair.",
    rating: 5,
  },
  {
    name: "Tunde Balogun",
    role: "Business & Audiobooks · 8 books",
    avatar: "https://placehold.co/56x56?text=TB+author+headshot+professional+neutral",
    quote: "The analytics dashboard is incredible. I can see exactly which chapters readers drop off at and improve my writing accordingly.",
    rating: 5,
  },
  {
    name: "Wanjiru Mwangi",
    role: "Poetry & Short Fiction · 15 books",
    avatar: "https://placehold.co/56x56?text=WM+author+headshot+professional+soft",
    quote: "I was sceptical at first, but the transparency of the revenue pool won me over. Every penny is accounted for.",
    rating: 5,
  },
]

// ── localStorage-backed application store ────────────────────────────────────
const APP_KEY = "ms_author_applications"

function saveApplication(data: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const existing = JSON.parse(localStorage.getItem(APP_KEY) ?? "[]")
  existing.push({ ...data, id: `app_${Date.now()}`, submittedAt: new Date().toISOString(), status: "pending" })
  localStorage.setItem(APP_KEY, JSON.stringify(existing))
}

// ── Application form ──────────────────────────────────────────────────────────
function AuthorApplicationForm() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const alreadyApplied = user?.authorApplicationStatus === "pending" || user?.authorApplicationStatus === "approved"

  const [form, setForm] = React.useState({
    name:          user?.name ?? "",
    email:         user?.email ?? "",
    penName:       "",
    bio:           "",
    country:       "",
    genres:        "",
    sampleWork:    "",
    experience:    "",
    payoutMethod:  "paystack",
    payoutCurrency: "USD",
    agreeTerms:    false,
    // Payout details
    paystackEmail:     "",
    flutterwaveName:   "",
    flutterwaveBank:   "",
    flutterwaveAccNum: "",
    paypalEmail:       "",
  })

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const submitRef = React.useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitRef.current || submitting) return
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent("/become-author")}`)
      return
    }
    submitRef.current = true
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (apiUrlConfigured()) {
        await authorApi.apply({
          bio: buildAuthorApplicationBio(form),
          payout_method: form.payoutMethod,
          payout_details: {
            ...buildPayoutDetailsFromForm(form),
            country: form.country,
            currency: form.payoutCurrency,
            pen_name: form.penName || undefined,
            genres: form.genres,
          },
        })
      } else {
        await new Promise(r => setTimeout(r, 1400))
        saveApplication(form)
      }
      setSubmitted(true)
    } catch (err) {
      submitRef.current = false
      setSubmitError(err instanceof Error ? err.message : "Could not submit application.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const isAuthorRole = user?.role === "author"
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="font-serif text-2xl font-bold text-foreground mb-2">Application Submitted!</h3>
        <p className="text-muted-foreground mb-2 max-w-sm mx-auto">
          Our editorial team will review your application. You&apos;ll receive an email notification when it&apos;s approved.
        </p>
        <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-2 text-sm font-medium mb-6">
          <Clock size={14} />
          Status: Under Review
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {isAuthorRole ? (
            <Link href="/dashboard/author">
              <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
                Go to Author Dashboard <ChevronRight size={16} />
              </Button>
            </Link>
          ) : (
            <Link href="/profile">
              <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
                View Your Profile <ChevronRight size={16} />
              </Button>
            </Link>
          )}
          <Link href="/authors/guidelines">
            <Button variant="outline" className="gap-2">
              Read Author Guidelines
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (alreadyApplied) {
    const isPending = user?.authorApplicationStatus === "pending"
    return (
      <div className="text-center py-12">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5",
          isPending ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30"
        )}>
          {isPending ? <Clock size={32} className="text-amber-500" /> : <CheckCircle size={32} className="text-green-500" />}
        </div>
        <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
          {isPending ? "Application Under Review" : "You\u2019re an Approved Author!"}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          {isPending
            ? "We\u2019re reviewing your application. You\u2019ll receive an email when it\u2019s approved."
            : "Your author account is active. Head to your dashboard to start publishing."}
        </p>
        <Link href={isPending ? "/profile" : "/dashboard/author"}>
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
            {isPending ? "View Profile" : "Author Dashboard"} <ChevronRight size={16} />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {submitError && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2" role="alert">
          {submitError}
        </p>
      )}
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <button
              type="button"
              onClick={() => s < step && setStep(s)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                step === s
                  ? "bg-brand text-primary-foreground"
                  : step > s
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-pointer"
                  : "bg-muted text-muted-foreground cursor-default"
              )}
            >
                {step > s ? <CheckCircle size={12} /> : s}
                  {s === 1 ? "Personal Info" : s === 2 ? "Your Work" : "Payout"}
            </button>
            {s < 3 && <ArrowRight size={14} className="text-muted-foreground" />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="apply-name">Full Name</label>
              <Input
                id="apply-name"
                value={form.name}
                onChange={e => update("name", e.target.value)}
                placeholder="Your legal name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="apply-email">Email</label>
              <Input
                id="apply-email"
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="apply-penname">
              Pen Name <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="apply-penname"
              value={form.penName}
              onChange={e => update("penName", e.target.value)}
              placeholder="Name you write under (if different)"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="apply-bio">Author Bio</label>
            <Textarea
              id="apply-bio"
              value={form.bio}
              onChange={e => update("bio", e.target.value)}
              placeholder="Tell readers about yourself — background, what drives you to write, etc."
              rows={4}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="apply-country">Country</label>
            <Input
              id="apply-country"
              value={form.country}
              onChange={e => update("country", e.target.value)}
              placeholder="e.g. Nigeria, United States, Kenya"
              required
            />
          </div>
          <Button
            type="button"
            className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2"
            onClick={() => setStep(2)}
            disabled={!form.name || !form.email || !form.bio || !form.country}
          >
            Continue to Your Work <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="apply-genres">
              Genres & Categories
            </label>
            <Input
              id="apply-genres"
              value={form.genres}
              onChange={e => update("genres", e.target.value)}
              placeholder="e.g. Literary Fiction, Self-Help, Business"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="apply-experience">
              Writing Experience
            </label>
            <Textarea
              id="apply-experience"
              value={form.experience}
              onChange={e => update("experience", e.target.value)}
              placeholder="Previous publications, writing courses, awards, etc."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="apply-sample">
              Sample Work Link <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="apply-sample"
              value={form.sampleWork}
              onChange={e => update("sampleWork", e.target.value)}
              placeholder="Link to blog, previous book, or writing sample"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button
              type="button"
              className="flex-1 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2"
              disabled={!form.genres}
              onClick={() => setStep(3)}
            >
              Continue to Payout <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          {/* Payout method selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Preferred Payout Method</label>
            <div className="grid grid-cols-3 gap-2">
              {["paystack", "flutterwave", "paypal"].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => update("payoutMethod", method)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border text-sm font-medium capitalize transition-all",
                    form.payoutMethod === method
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted-foreground hover:border-brand/30"
                  )}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Paystack fields */}
          {form.payoutMethod === "paystack" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="ps-email">
                Paystack Registered Email
              </label>
              <Input
                id="ps-email"
                type="email"
                value={form.paystackEmail}
                onChange={e => update("paystackEmail", e.target.value)}
                placeholder="your@paystack-email.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Payouts will be sent to your Paystack wallet linked to this email.
              </p>
            </div>
          )}

          {/* Flutterwave fields */}
          {form.payoutMethod === "flutterwave" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="fw-name">
                  Account Holder Name
                </label>
                <Input
                  id="fw-name"
                  value={form.flutterwaveName}
                  onChange={e => update("flutterwaveName", e.target.value)}
                  placeholder="Full name on bank account"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="fw-bank">
                  Bank Name
                </label>
                <Input
                  id="fw-bank"
                  value={form.flutterwaveBank}
                  onChange={e => update("flutterwaveBank", e.target.value)}
                  placeholder="e.g. GTBank, Access Bank"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="fw-acc">
                  Account Number
                </label>
                <Input
                  id="fw-acc"
                  value={form.flutterwaveAccNum}
                  onChange={e => update("flutterwaveAccNum", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit account number"
                  maxLength={10}
                  required
                />
              </div>
            </div>
          )}

          {/* PayPal fields */}
          {form.payoutMethod === "paypal" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="pp-email">
                PayPal Email Address
              </label>
              <Input
                id="pp-email"
                type="email"
                value={form.paypalEmail}
                onChange={e => update("paypalEmail", e.target.value)}
                placeholder="your@paypal-email.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Monthly payouts will be sent directly to this PayPal account.
              </p>
            </div>
          )}

          {/* Payout currency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Payout Currency</label>
            <div className="grid grid-cols-4 gap-2">
              {["USD", "NGN", "GHS", "KES"].map(cur => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => update("payoutCurrency", cur)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                    form.payoutCurrency === cur
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted-foreground hover:border-brand/30"
                  )}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2.5 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <Shield size={14} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
              Your payout details are encrypted at rest and never shared with third parties.
              You can update them anytime from your author dashboard settings.
            </p>
          </div>

          {/* Terms acceptance */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.agreeTerms}
              onChange={e => setForm(prev => ({ ...prev, agreeTerms: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand"
              required
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-brand underline underline-offset-2" target="_blank">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/authors/guidelines" className="text-brand underline underline-offset-2" target="_blank">Author Guidelines</Link>.
              I confirm that all submitted content is original work I own the rights to.
            </span>
          </label>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2"
              disabled={submitting || !form.agreeTerms}
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Submitting...</>
              ) : (
                <>Submit Application <ChevronRight size={16} /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BecomeAuthorPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">

          {/* ── Hero ────────────────────────────────────────── */}
          <section className="bg-sidebar py-20 md:py-28" aria-labelledby="become-author-heading">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge className="mb-4 bg-brand/15 text-brand border-0 text-xs px-3 py-1.5">
                    Author Programme
                  </Badge>
                  <h1
                    id="become-author-heading"
                    className="font-serif text-4xl md:text-5xl font-bold text-sidebar-foreground mb-5 leading-tight text-balance"
                  >
                    Write. Publish. <span className="text-brand">Earn.</span>
                  </h1>
                  <p className="text-sidebar-foreground/60 text-lg leading-relaxed mb-8">
                    Join 12,000+ authors earning real income from their writing on MyScriptic. Our transparent revenue pool ensures every reader engagement translates to money in your pocket.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-8">
                    <Link href="/auth/register?next=%2Fbecome-author">
                      <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2">
                        Create account <ChevronRight size={16} />
                      </Button>
                    </Link>
                    <Link href="/auth/login?next=%2Fbecome-author">
                      <Button variant="outline" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent gap-2">
                        Sign in to apply
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-sidebar-foreground/45 mb-6 -mt-4 max-w-md">
                    When you register, choose <span className="font-medium text-sidebar-foreground/70">Author</span> — then complete the application below.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: "12K+", label: "Authors" },
                      { value: "70%", label: "Author Pool" },
                      { value: "$2.1M", label: "Paid Out" },
                    ].map(s => (
                      <div key={s.label} className="bg-sidebar-accent rounded-xl p-4 border border-sidebar-border text-center">
                        <div className="font-serif text-2xl font-bold text-brand">{s.value}</div>
                        <div className="text-xs text-sidebar-foreground/50 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                  <img
                    src="https://placehold.co/600x450?text=Author+writing+laptop+cozy+desk+warm+lamp+books+creative+workspace"
                    alt="Author writing at a cozy desk with books and warm lighting"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── How Revenue Pool Works ───────────────────────── */}
          <section className="py-16 border-b border-border" aria-labelledby="revenue-pool-heading">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 id="revenue-pool-heading" className="font-serif text-3xl font-bold text-foreground mb-3">
                  How You Earn
                </h2>
                <p className="text-muted-foreground text-lg">A transparent, engagement-based revenue pool — no guesswork.</p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8">
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-muted/60 rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold font-serif text-foreground mb-1">
                      {POOL_EXAMPLE.subscribers.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Subscribers</div>
                    <div className="text-xs text-muted-foreground mt-1">× ${POOL_EXAMPLE.pricePerMonth}/mo</div>
                  </div>
                  <div className="bg-brand/5 border border-brand/20 rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold font-serif text-brand mb-1">
                      ${POOL_EXAMPLE.authorPoolAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Author Pool (70%)</div>
                    <div className="text-xs text-muted-foreground mt-1">after 30% platform fee</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold font-serif text-green-600 dark:text-green-400 mb-1">
                      ${POOL_EXAMPLE.exampleEarning.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Your Earning</div>
                    <div className="text-xs text-muted-foreground mt-1">at {POOL_EXAMPLE.exampleEngagement}% engagement</div>
                  </div>
                </div>

                {/* Formula */}
                <div className="bg-sidebar rounded-xl p-5 text-center">
                  <p className="text-xs text-sidebar-foreground/40 uppercase tracking-wider font-semibold mb-2">Earnings Formula</p>
                  <p className="font-mono text-sm text-sidebar-foreground">
                    Your Earning = (Your Engagement / Total Engagement) × Author Pool
                  </p>
                  <p className="text-xs text-sidebar-foreground/40 mt-2">
                    Engagement = weighted reading time + pages completed + % completion rate
                  </p>
                </div>

                {/* Pool bar */}
                <div className="mt-6">
                  <div className="flex rounded-full overflow-hidden h-4 mb-2">
                    <div className="bg-muted-foreground/30 flex items-center justify-center text-[9px] font-bold text-background" style={{ width: "30%" }}>
                      Platform 30%
                    </div>
                    <div className="bg-brand flex items-center justify-center text-[9px] font-bold text-primary-foreground" style={{ width: "70%" }}>
                      Authors 70%
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Platform commission is deducted first; 100% of the remaining 70% is distributed to authors.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Benefits ─────────────────────────────────────── */}
          <section className="py-16 border-b border-border bg-muted/30" aria-labelledby="benefits-heading">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 id="benefits-heading" className="font-serif text-3xl font-bold text-foreground mb-3">
                  Everything You Need to Succeed
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
                {BENEFITS.map(b => (
                  <div key={b.title} className="bg-card border border-border rounded-xl p-5">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center mb-3">
                      <b.icon size={18} className="text-brand" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1.5">{b.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── How It Works ─────────────────────────────────── */}
          <section className="py-16 border-b border-border" aria-labelledby="how-it-works-heading">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 id="how-it-works-heading" className="font-serif text-3xl font-bold text-foreground mb-3">
                  How It Works
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                {HOW_IT_WORKS.map(step => (
                  <div key={step.step} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-brand/10 border-2 border-brand/20 flex items-center justify-center mx-auto mb-4">
                      <span className="font-bold text-brand text-sm">{step.step}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1.5">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Testimonials ─────────────────────────────────── */}
          <section className="py-16 border-b border-border bg-muted/30" aria-labelledby="testimonials-heading">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-10">
                <h2 id="testimonials-heading" className="font-serif text-3xl font-bold text-foreground mb-3">
                  Authors Love MyScriptic
                </h2>
              </div>
              <div className="grid sm:grid-cols-3 gap-5">
                {TESTIMONIALS.map(t => (
                  <div key={t.name} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} size={12} className="fill-brand text-brand" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <img
                        src={t.avatar}
                        alt={`Portrait of ${t.name}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Application Form ─────────────────────────────── */}
          <section className="py-16" aria-labelledby="apply-heading">
            <div className="max-w-2xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-10">
                <h2 id="apply-heading" className="font-serif text-3xl font-bold text-foreground mb-3">
                  Apply to Become an Author
                </h2>
                <p className="text-muted-foreground">Applications reviewed within 24 hours. No fees. No lock-ins.</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-8">
                <AuthorApplicationForm />
              </div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
    </Providers>
  )
}
