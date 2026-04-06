"use client"

import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Newspaper, Download, Mail, ExternalLink, BookOpen,
  Users, Globe, TrendingUp,
} from "lucide-react"

const STATS = [
  { value: "50K+",  label: "Books Published",   icon: BookOpen },
  { value: "2M+",   label: "Active Readers",     icon: Users },
  { value: "12K+",  label: "Authors Earning",    icon: TrendingUp },
  { value: "40+",   label: "Countries Reached",  icon: Globe },
]

const PRESS_MENTIONS = [
  {
    publication: "TechCabal",
    quote: "MyScriptic is redefining how African authors monetise their craft in the digital age.",
    date: "January 2026",
    url: "#",
    logoText: "TechCabal",
  },
  {
    publication: "Disrupt Africa",
    quote: "A platform that bridges the gap between African storytelling and global readership.",
    date: "December 2025",
    url: "#",
    logoText: "Disrupt Africa",
  },
  {
    publication: "The Guardian Nigeria",
    quote: "MyScriptic's revenue pool model offers a transparent, author-first approach to digital publishing.",
    date: "November 2025",
    url: "#",
    logoText: "The Guardian",
  },
  {
    publication: "Quartz Africa",
    quote: "With over 2 million readers, MyScriptic is becoming the Spotify of African literature.",
    date: "October 2025",
    url: "#",
    logoText: "Quartz Africa",
  },
]

const PRESS_RELEASES = [
  {
    title: "MyScriptic Reaches 2 Million Active Readers Milestone",
    date: "January 28, 2026",
    excerpt: "The platform announces record growth driven by its subscription model and expansion into East Africa.",
  },
  {
    title: "MyScriptic Launches CMS Builder for Storefront Customisation",
    date: "January 15, 2026",
    excerpt: "A new drag-and-drop CMS tool gives platform admins complete control over the homepage and content layout.",
  },
  {
    title: "MyScriptic Expands to Ghana and Kenya, Adds Local Currency Support",
    date: "December 10, 2025",
    excerpt: "Payments in GHS and KES now supported via Flutterwave and Paystack, enabling local pricing for readers.",
  },
  {
    title: "MyScriptic Distributes $1.2M to Authors in 2025 Revenue Pool Payouts",
    date: "December 31, 2025",
    excerpt: "End-of-year payout cycle sees record distributions across 12,000+ active authors on the platform.",
  },
]

const BRAND_ASSETS = [
  { name: "Logo Pack (SVG + PNG)", description: "Full logo set in light and dark variants", size: "2.4 MB" },
  { name: "Brand Guidelines PDF", description: "Colour palette, typography, usage rules", size: "1.1 MB" },
  { name: "Product Screenshots", description: "High-res screenshots of key features", size: "18 MB" },
  { name: "Press Kit (All Assets)", description: "Complete bundle for editorial use", size: "21 MB" },
]

export default function PressPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">
          {/* Hero */}
          <section className="pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper size={16} className="text-brand" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand">Press & Media</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-4 text-balance max-w-3xl">
              MyScriptic in the News
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8 text-pretty">
              For media enquiries, interview requests, or to access brand assets, contact our press team. We respond within 24 hours.
            </p>
            <a href="mailto:press@myscriptic.com">
              <Button className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2">
                <Mail size={15} />
                press@myscriptic.com
              </Button>
            </a>
          </section>

          {/* Stats */}
          <section className="pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-5 text-center">
                  <stat.icon size={20} className="text-brand mx-auto mb-2" />
                  <div className="text-3xl font-serif font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Press mentions */}
          <section className="py-16 bg-muted/30 border-y border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-serif font-bold text-foreground mb-8">As Seen In</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {PRESS_MENTIONS.map(mention => (
                  <a
                    key={mention.publication}
                    href={mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-card border border-border rounded-xl p-6 hover:border-brand/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="px-3 py-1 bg-muted rounded-lg text-sm font-bold text-foreground">
                        {mention.logoText}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ExternalLink size={11} />
                        <span>{mention.date}</span>
                      </div>
                    </div>
                    <blockquote className="text-muted-foreground leading-relaxed italic text-sm">
                      &ldquo;{mention.quote}&rdquo;
                    </blockquote>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* Press releases */}
          <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-8">Press Releases</h2>
            <div className="space-y-4">
              {PRESS_RELEASES.map(pr => (
                <div
                  key={pr.title}
                  className="flex items-start gap-5 p-5 bg-card border border-border rounded-xl hover:border-brand/30 transition-all cursor-pointer group"
                >
                  <div className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors text-balance">
                        {pr.title}
                      </h3>
                      <span className="text-xs text-muted-foreground shrink-0">{pr.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{pr.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Brand assets */}
          <section className="py-16 bg-muted/30 border-y border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Brand Assets</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Available for editorial use. Please review our{" "}
                <Link href="/terms" className="text-brand hover:underline">brand guidelines</Link> before use.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {BRAND_ASSETS.map(asset => (
                  <div
                    key={asset.name}
                    className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-brand/30 transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                      <Download size={16} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.description} &bull; {asset.size}</p>
                    </div>
                    <Badge className="bg-brand/10 text-brand border-0 text-[10px] shrink-0 group-hover:bg-brand group-hover:text-primary-foreground transition-colors">
                      Download
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="py-16 px-4 sm:px-6 max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-3">Have a press enquiry?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Our communications team is available Monday–Friday, 9am–6pm WAT. We typically respond within one business day.
            </p>
            <a href="mailto:press@myscriptic.com">
              <Button size="lg" className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2">
                <Mail size={16} />
                Contact Press Team
              </Button>
            </a>
          </section>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
