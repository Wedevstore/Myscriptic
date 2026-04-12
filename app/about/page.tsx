"use client"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  BookOpen, Users, Globe, TrendingUp, Shield,
  Heart, Award, Zap, ChevronRight,
} from "lucide-react"

const MISSION_STATS = [
  { value: "50K+",   label: "Books Published" },
  { value: "2M+",    label: "Active Readers" },
  { value: "12K+",   label: "Authors Earning" },
  { value: "40+",    label: "Countries Reached" },
]

const VALUES = [
  {
    icon: BookOpen,
    title: "Access for All",
    description:
      "We believe great stories and knowledge should be accessible to everyone. Free, subscription, and pay-once options ensure every reader finds a path in.",
  },
  {
    icon: Heart,
    title: "Author-First Earnings",
    description:
      "Authors deserve fair pay. Our transparent revenue pool ensures creators receive earnings proportional to how much readers engage with their work.",
  },
  {
    icon: Globe,
    title: "African & Global Voices",
    description:
      "We champion stories from Africa and the diaspora while welcoming authors and readers from every corner of the world.",
  },
  {
    icon: Shield,
    title: "Trust & Transparency",
    description:
      "Every payout, every calculation, every commission is logged in an immutable audit trail. No black boxes — ever.",
  },
  {
    icon: Zap,
    title: "Speed & Reliability",
    description:
      "Built on a modern, cloud-native stack with Redis caching and S3 storage, MyScriptic loads fast and stays up.",
  },
  {
    icon: Award,
    title: "Quality Over Quantity",
    description:
      "Every book goes through editorial review before publication. We maintain a high bar so readers always find great reads.",
  },
]

const TEAM = [
  {
    name: "Adaeze Okonkwo",
    role: "Chief Executive Officer",
    bio: "Former product lead at a leading African fintech. Passionate about democratising access to knowledge.",
    initials: "AO",
  },
  {
    name: "Seun Falana",
    role: "Chief Technology Officer",
    bio: "Full-stack architect with 14 years building scalable platforms. Open-source contributor.",
    initials: "SF",
  },
  {
    name: "Kwame Asante",
    role: "Head of Author Relations",
    bio: "Published author himself, Kwame ensures every creator feels supported and fairly compensated.",
    initials: "KA",
  },
  {
    name: "Fatima Al-Rashid",
    role: "Head of Product Design",
    bio: "10 years designing consumer products for global audiences. Led design at two successful startups.",
    initials: "FR",
  },
]

const TIMELINE = [
  { year: "2022", title: "The Idea", description: "Founded in Lagos with a simple vision: give African authors a world-class platform and readers an affordable, rich library." },
  { year: "2023", title: "Beta Launch", description: "Launched to 500 beta users. First 200 authors signed up within 6 weeks. Early feedback shaped the subscription model." },
  { year: "2024", title: "Series A", description: "Raised $4.2M to build out the earnings engine, audiobook streaming, and mobile apps across iOS and Android." },
  { year: "2025", title: "Going Global", description: "Expanded to 40+ countries. Crossed 1 million registered readers and 10,000 published books." },
  { year: "2026", title: "Now", description: "2M+ readers, 50K+ books, 12K+ earning authors. Building the world's best reading platform — one page at a time." },
]

export default function AboutPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">

          {/* ── Hero ──────────────────────────────────────────── */}
          <section className="bg-sidebar py-20 md:py-28" aria-labelledby="about-hero-heading">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <div className="inline-flex items-center gap-2 bg-brand/15 text-brand text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
                <BookOpen size={14} />
                About MyScriptic
              </div>
              <h1
                id="about-hero-heading"
                className="font-serif text-4xl md:text-6xl font-bold text-sidebar-foreground mb-6 text-balance leading-tight"
              >
                Books change lives.<br />
                <span className="text-brand">We help more people read them.</span>
              </h1>
              <p className="text-sidebar-foreground/60 text-xl leading-relaxed max-w-2xl mx-auto">
                MyScriptic is a hybrid eBook platform built for readers who love stories and authors who deserve fair earnings. We combine the discovery of Wattpad, the store of Kindle, and an unlimited subscription — all in one place.
              </p>
            </div>
          </section>

          {/* ── Stats ─────────────────────────────────────────── */}
          <section className="py-14 border-b border-border" aria-label="Platform statistics">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {MISSION_STATS.map(stat => (
                  <div key={stat.label} className="text-center">
                    <div className="font-serif text-4xl md:text-5xl font-bold text-brand mb-1">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Mission ───────────────────────────────────────── */}
          <section className="py-16 border-b border-border" aria-labelledby="mission-heading">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 id="mission-heading" className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Our Mission
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4 text-[15px]">
                    We started MyScriptic because we saw brilliant African authors struggling to monetise their work, and readers hungry for great stories they could afford. The global publishing industry had largely overlooked this market.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4 text-[15px]">
                    So we built it ourselves. A platform where authors keep fair earnings, where readers can access thousands of books affordably, and where great writing from any corner of the world gets the audience it deserves.
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">
                    Every feature we build — from the revenue pool engine to the immersive reader — exists in service of that mission.
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-xl aspect-[4/3] bg-gradient-to-br from-brand/20 via-brand/10 to-background flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="w-16 h-16 rounded-xl bg-brand text-primary-foreground flex items-center justify-center font-serif font-bold text-2xl mx-auto mb-3">M</div>
                    <p className="text-lg font-serif font-bold text-foreground">Building the future of African literature</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Values ────────────────────────────────────────── */}
          <section className="py-16 border-b border-border bg-muted/30" aria-labelledby="values-heading">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 id="values-heading" className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
                  What We Stand For
                </h2>
                <p className="text-muted-foreground text-lg">The principles that guide every product decision we make.</p>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                {VALUES.map(v => (
                  <div key={v.title} className="bg-card border border-border rounded-xl p-6">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                      <v.icon size={20} className="text-brand" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Timeline ──────────────────────────────────────── */}
          <section className="py-16 border-b border-border" aria-labelledby="story-heading">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 id="story-heading" className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
                  Our Story
                </h2>
              </div>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-border" aria-hidden />
                <div className="space-y-8">
                  {TIMELINE.map((event, i) => (
                    <div key={event.year} className="flex gap-6 relative">
                      <div className="shrink-0 w-12 h-12 rounded-full border-2 border-brand bg-background flex items-center justify-center z-10">
                        <span className="text-[10px] font-bold text-brand">{event.year}</span>
                      </div>
                      <div className="bg-card border border-border rounded-xl p-5 flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{event.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Team ──────────────────────────────────────────── */}
          <section className="py-16 border-b border-border" aria-labelledby="team-heading">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-12">
                <h2 id="team-heading" className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
                  The Team Behind MyScriptic
                </h2>
                <p className="text-muted-foreground text-lg">Builders, readers, and storytellers.</p>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                {TEAM.map(member => (
                  <div key={member.name} className="bg-card border border-border rounded-xl p-5 text-center">
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-brand/20 bg-brand/10 flex items-center justify-center"
                      aria-label={`Portrait of ${member.name}, ${member.role} at MyScriptic`}
                    >
                      <span className="text-xl font-bold text-brand">{member.initials}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-0.5">{member.name}</h3>
                    <p className="text-xs text-brand font-medium mb-2">{member.role}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{member.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────────────── */}
          <section className="py-20 bg-sidebar" aria-label="Join MyScriptic">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <TrendingUp size={40} className="mx-auto text-brand mb-5" />
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-sidebar-foreground mb-4">
                Join the Community
              </h2>
              <p className="text-sidebar-foreground/60 text-lg mb-8">
                Whether you&apos;re here to read, write, or both — there&apos;s a place for you at MyScriptic.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/auth/register?next=%2Fabout">
                  <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8 gap-2">
                    Start Reading Free <ChevronRight size={16} />
                  </Button>
                </Link>
                <Link href="/become-author">
                  <Button variant="outline" className="h-12 px-8 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent gap-2">
                    Become an Author <ChevronRight size={16} />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
    </Providers>
  )
}
