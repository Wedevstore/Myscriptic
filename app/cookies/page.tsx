"use client"

import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Badge } from "@/components/ui/badge"
import { Cookie, Shield, Settings, BarChart2, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"

const COOKIE_TYPES = [
  {
    icon: Shield,
    name: "Strictly Necessary",
    tag: "Always Active",
    tagClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    description:
      "These cookies are essential for the website to function and cannot be switched off. They are usually only set in response to actions made by you, such as logging in, adding items to your cart, or setting your privacy preferences.",
    examples: ["Authentication session token", "Shopping cart contents", "CSRF protection token", "Cookie consent preference"],
  },
  {
    icon: BarChart2,
    name: "Analytics & Performance",
    tag: "Optional",
    tagClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description:
      "These cookies allow us to count page visits and traffic sources so we can measure and improve the performance of our site. All information these cookies collect is aggregated and therefore anonymous.",
    examples: ["Page view counts", "User flow through the site", "Reading time metrics", "Error tracking"],
  },
  {
    icon: Settings,
    name: "Functional",
    tag: "Optional",
    tagClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    description:
      "These cookies enable the website to provide enhanced functionality and personalisation, such as remembering your reading preferences, font settings, theme choice, and last-read position in a book.",
    examples: ["Theme preference (light/dark)", "Reading font size", "Last-read page position", "Language preference"],
  },
  {
    icon: Megaphone,
    name: "Marketing",
    tag: "Optional",
    tagClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    description:
      "These cookies may be set through our site by our advertising partners to build a profile of your interests and show you relevant adverts on other sites. We do not sell your personal data.",
    examples: ["Referral source tracking", "Campaign attribution", "Social share pixels", "Re-engagement signals"],
  },
]

const SECTIONS = [
  {
    heading: "What Are Cookies?",
    content:
      "Cookies are small text files placed on your device by websites you visit. They are widely used to make websites work more efficiently, to provide a better user experience, and to report information to website owners. MyScriptic uses both first-party cookies (set by us) and third-party cookies (set by trusted partners such as payment processors).",
  },
  {
    heading: "How We Use Cookies",
    content:
      "We use cookies to keep you logged in, remember your preferences across sessions, understand how readers navigate the platform, and improve our content recommendations. We never sell cookie data to third parties for advertising purposes.",
  },
  {
    heading: "Managing Your Cookies",
    content:
      "You can control cookie behaviour through your browser settings. Most browsers allow you to block or delete cookies. Note that blocking strictly necessary cookies will prevent you from using key features such as logging in or adding books to your cart. You can also use our in-product cookie preference centre (accessible from any page footer) to manage optional cookies at any time.",
  },
  {
    heading: "Third-Party Cookies",
    content:
      "We work with trusted partners including Paystack, Flutterwave, and Paypal for payment processing, and may include social sharing functionality. These partners may set their own cookies subject to their respective privacy policies. We have no control over third-party cookies and recommend reviewing those policies directly.",
  },
  {
    heading: "Changes to This Policy",
    content:
      "We may update this Cookie Policy from time to time. We will notify you of significant changes by displaying a prominent notice on the platform or by email. The date at the top of this page indicates when the policy was last updated.",
  },
]

export default function CookiesPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">
          {/* Hero */}
          <section className="pt-24 pb-12 px-4 sm:px-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Cookie size={16} className="text-brand" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand">Legal</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-4 text-balance">
              Cookie Policy
            </h1>
            <p className="text-muted-foreground text-sm">
              Last updated: <strong>January 28, 2026</strong>
            </p>
            <p className="text-muted-foreground mt-4 text-pretty leading-relaxed">
              This policy explains how MyScriptic uses cookies and similar tracking technologies on our platform. By using MyScriptic, you agree to our use of cookies as described in this document. For a full picture of how we handle your data, see our{" "}
              <Link href="/privacy" className="text-brand hover:underline font-medium">Privacy Policy</Link>.
            </p>
          </section>

          {/* Cookie types */}
          <section className="pb-12 px-4 sm:px-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Types of Cookies We Use</h2>
            <div className="space-y-5">
              {COOKIE_TYPES.map(type => (
                <div key={type.name} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                      <type.icon size={16} className="text-brand" />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-foreground">{type.name}</h3>
                      <Badge className={cn("text-[10px] border-0", type.tagClass)}>{type.tag}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{type.description}</p>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Examples</p>
                    <ul className="grid sm:grid-cols-2 gap-1.5">
                      {type.examples.map(ex => (
                        <li key={ex} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Prose sections */}
          <section className="pb-20 px-4 sm:px-6 max-w-4xl mx-auto">
            <div className="space-y-8">
              {SECTIONS.map(section => (
                <div key={section.heading}>
                  <h2 className="text-xl font-serif font-bold text-foreground mb-3">{section.heading}</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm">{section.content}</p>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="mt-12 p-6 bg-muted/50 rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-2">Questions about cookies?</h3>
              <p className="text-sm text-muted-foreground">
                Contact our privacy team at{" "}
                <a href="mailto:privacy@myscriptic.com" className="text-brand hover:underline font-medium">
                  privacy@myscriptic.com
                </a>
                {" "}or write to: MyScriptic Inc., 14 Innovation Drive, Lagos, Nigeria.
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
