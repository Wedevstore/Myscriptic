"use client"

import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen, CheckCircle, XCircle, DollarSign,
  Upload, FileText, Shield, Pen, ChevronRight, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_STATS = [
  { label: "Author Revenue Share",  value: "70%",    note: "of net subscription pool" },
  { label: "Direct Sales Commission", value: "85%",  note: "of book purchase price" },
  { label: "Payout Threshold",      value: "$10",    note: "minimum payout balance" },
  { label: "Review SLA",            value: "5 days", note: "editorial turnaround" },
]

const CONTENT_DO: string[] = [
  "Original works you own all rights to",
  "Fiction, non-fiction, poetry, essays, how-to guides",
  "Translated works with explicit written permission from the rights holder",
  "Series and serialised novels (each volume uploaded separately)",
  "Bilingual or multilingual editions",
  "Revised or updated editions of previously published works you own",
]

const CONTENT_DONT: string[] = [
  "Content that violates any applicable laws",
  "Works you do not own the rights to, including public domain works with new introductions you don't own",
  "Plagiarised content or AI-generated content passed off as original human-authored work",
  "Explicit sexual content involving minors",
  "Content designed to deceive or defraud readers",
  "Spam, keyword-stuffed, or low-quality machine-generated text",
]

const UPLOAD_REQUIREMENTS = [
  {
    category: "File Formats",
    items: ["EPUB 3 (preferred)", "PDF (acceptable, reduced discovery weighting)", "MOBI (deprecated — convert to EPUB first)"],
  },
  {
    category: "Cover Image",
    items: ["Minimum 1400 × 2100 px (2:3 ratio)", "RGB colour space, JPEG or PNG", "No third-party logos or stock imagery you don't have rights to"],
  },
  {
    category: "Metadata",
    items: ["Full title and subtitle (if applicable)", "Author name (pen names allowed)", "At least 100-word description", "1–3 accurate genre tags", "Language and target age group"],
  },
  {
    category: "Pricing",
    items: ["Free, subscription-only, or paid ($0.99 – $99.99)", "Multi-currency pricing supported (USD, NGN, GHS, KES)", "Promotional pricing available via coupon codes"],
  },
]

const PAYOUT_STEPS = [
  { step: "1", title: "Subscription Pool Calculation", desc: "At month-end, total subscription revenue is pooled after platform commission." },
  { step: "2", title: "Engagement Weighting", desc: "Each author's share is calculated based on reading-time minutes, pages read, and completion rate." },
  { step: "3", title: "Direct Sales Added", desc: "Revenue from one-time purchases (85% to author) is added to the pool allocation." },
  { step: "4", title: "Payout Processed", desc: "Authors with a balance of $10+ receive payment via Paystack, Flutterwave, or PayPal by the 15th of each month." },
]

const PROHIBITED_CONTENT_CATEGORIES = [
  { label: "Hate Speech", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { label: "Violence & Gore", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { label: "Child Exploitation", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { label: "Terrorism / Extremism", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { label: "Plagiarism", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { label: "Misleading Medical Claims", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { label: "Spam / Keyword Stuffing", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { label: "AI-generated Spam", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
]

export default function AuthorGuidelinesPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">
          {/* Hero */}
          <section className="pt-24 pb-12 px-4 sm:px-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Pen size={16} className="text-brand" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand">For Authors</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-4 text-balance">
              Author Guidelines
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8 text-pretty">
              Everything you need to know about publishing on MyScriptic — from content standards and upload requirements to earnings, payouts, and community expectations.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/dashboard/author/books/new">
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2">
                  <Upload size={15} />
                  Upload Your First Book
                </Button>
              </Link>
              <Link href="/become-author">
                <Button variant="outline" className="gap-2">
                  <BookOpen size={15} />
                  Become an Author
                </Button>
              </Link>
            </div>
          </section>

          {/* Quick stats */}
          <section className="pb-12 px-4 sm:px-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {QUICK_STATS.map(stat => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-5 text-center">
                  <div className="text-3xl font-serif font-bold text-brand mb-1">{stat.value}</div>
                  <div className="text-xs font-semibold text-foreground mb-0.5">{stat.label}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.note}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Content policy */}
          <section className="py-12 bg-muted/30 border-y border-border">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Content Policy</h2>
              <p className="text-sm text-muted-foreground mb-8">
                MyScriptic is an open platform — but not without limits. Every submission is reviewed against these standards before going live.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Do */}
                <div className="bg-card border border-green-200 dark:border-green-900/40 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-foreground">We Accept</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {CONTENT_DO.map(item => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Don't */}
                <div className="bg-card border border-red-200 dark:border-red-900/40 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle size={16} className="text-red-500 dark:text-red-400" />
                    <h3 className="font-semibold text-foreground">We Do Not Accept</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {CONTENT_DONT.map(item => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Prohibited content badges */}
              <div className="mt-6 p-5 bg-card border border-amber-200 dark:border-amber-900/40 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                  <h4 className="font-semibold text-foreground text-sm">Immediate Account Suspension For</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PROHIBITED_CONTENT_CATEGORIES.map(cat => (
                    <Badge key={cat.label} className={cn("border-0 text-[10px]", cat.cls)}>{cat.label}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Upload requirements */}
          <section className="py-12 px-4 sm:px-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-8">Upload Requirements</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {UPLOAD_REQUIREMENTS.map(req => (
                <div key={req.category} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText size={14} className="text-brand" />
                    {req.category}
                  </h3>
                  <ul className="space-y-2">
                    {req.items.map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand/60 shrink-0 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Payout process */}
          <section className="py-12 bg-muted/30 border-y border-border">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-serif font-bold text-foreground mb-2">How Payouts Work</h2>
              <p className="text-sm text-muted-foreground mb-8">
                MyScriptic operates a transparent revenue pool. Here is how your earnings are calculated and paid out each month.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PAYOUT_STEPS.map(s => (
                  <div key={s.step} className="bg-card border border-border rounded-xl p-5 relative">
                    <span className="text-4xl font-serif font-bold text-foreground/10 absolute top-4 right-4">{s.step}</span>
                    <DollarSign size={16} className="text-brand mb-3" />
                    <h3 className="font-semibold text-foreground text-sm mb-2">{s.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link href="/dashboard/author/earnings">
                  <Button variant="outline" className="gap-2 hover:border-brand hover:text-brand">
                    View Your Earnings
                    <ChevronRight size={14} />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Rights & responsibilities */}
          <section className="py-12 px-4 sm:px-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Your Rights &amp; Responsibilities</h2>
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Shield size={14} className="text-brand" />You Retain All Rights</h3>
                <p className="text-sm text-muted-foreground">Uploading to MyScriptic does not transfer copyright. You retain full ownership. You grant us a non-exclusive licence to display, distribute, and monetise your work on the platform per our Terms of Service.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><CheckCircle size={14} className="text-brand" />You Are Responsible for Your Content</h3>
                <p className="text-sm text-muted-foreground">By uploading, you confirm that you own or have the necessary rights to all content in your submission, including cover images, and that it does not infringe any third-party intellectual property rights.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><BookOpen size={14} className="text-brand" />Editorial Review</h3>
                <p className="text-sm text-muted-foreground">All submissions are reviewed within 5 business days. We may reject submissions that violate our guidelines, require corrections, or are of insufficient quality. We will always explain why a submission was rejected and give you the opportunity to revise and resubmit.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-12 px-4 sm:px-6 max-w-3xl mx-auto text-center pb-20">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-3">Ready to start publishing?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Join over 12,000 authors already earning on MyScriptic. It takes less than 10 minutes to set up your author profile and upload your first book.
            </p>
            <div className="flex items-center gap-4 justify-center flex-wrap">
              <Link href="/become-author">
                <Button size="lg" className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2">
                  <Pen size={16} />
                  Apply to Become an Author
                </Button>
              </Link>
              <a href="mailto:authors@myscriptic.com">
                <Button size="lg" variant="outline" className="gap-2">
                  Contact Author Support
                </Button>
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
