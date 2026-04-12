"use client"

import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Clock, ChevronRight, BookOpen, TrendingUp, Pen } from "lucide-react"
import { cn } from "@/lib/utils"
import * as React from "react"

const CATEGORIES = ["All", "Product Updates", "Author Tips", "Reader Guides", "Industry News", "Company"]

const POSTS = [
  {
    id: "post_001",
    category: "Product Updates",
    title: "Introducing the MyScriptic CMS Builder: Full Control Over Your Storefront",
    excerpt: "Admins can now reorder homepage sections, toggle visibility, manage banners, and publish CMS pages — all without writing a single line of code.",
    author: "MyScriptic Team",
    authorInitials: "MT",
    date: "Jan 28, 2026",
    readTime: "4 min read",
    featured: true,
    coverUrl: "https://placehold.co/800x420?text=CMS+Builder+launch+announcement+dark+gradient+product+screenshot+amber+accent",
  },
  {
    id: "post_002",
    category: "Author Tips",
    title: "How to Write a Book Description That Converts Browsers into Buyers",
    excerpt: "Your book description is the most important piece of marketing copy you'll ever write. Here's a proven framework used by top authors on MyScriptic.",
    author: "Chimamanda A.",
    authorInitials: "CA",
    date: "Jan 22, 2026",
    readTime: "6 min read",
    featured: false,
    coverUrl: "https://placehold.co/480x300?text=Author+writing+tips+warm+amber+notebook+pen+creative+workspace",
  },
  {
    id: "post_003",
    category: "Reader Guides",
    title: "5 Ways to Get More from Your MyScriptic Subscription",
    excerpt: "From offline reading to subscription-only shelves and personalized recommendations, here's how to unlock every feature your plan includes.",
    author: "Tunde B.",
    authorInitials: "TB",
    date: "Jan 15, 2026",
    readTime: "5 min read",
    featured: false,
    coverUrl: "https://placehold.co/480x300?text=Subscription+guide+reader+cozy+reading+lamp+books+stack+warm",
  },
  {
    id: "post_004",
    category: "Industry News",
    title: "The African Publishing Market Is Growing at 18% YoY — What It Means for Authors",
    excerpt: "New data from Q4 2025 shows an accelerating appetite for African-authored content globally. We break down the trends and what they mean for independent creators.",
    author: "MyScriptic Research",
    authorInitials: "MR",
    date: "Jan 10, 2026",
    readTime: "8 min read",
    featured: false,
    coverUrl: "https://placehold.co/480x300?text=Publishing+industry+growth+chart+data+visualization+professional+clean",
  },
  {
    id: "post_005",
    category: "Author Tips",
    title: "Understanding the Revenue Pool: How MyScriptic Calculates Your Earnings",
    excerpt: "Every month, subscription revenue is distributed to authors based on engagement metrics. Here's the exact formula — no more black boxes.",
    author: "MyScriptic Team",
    authorInitials: "MT",
    date: "Dec 28, 2025",
    readTime: "7 min read",
    featured: false,
    coverUrl: "https://placehold.co/480x300?text=Revenue+pool+earnings+calculation+financial+dashboard+amber+coins",
  },
  {
    id: "post_006",
    category: "Company",
    title: "Year in Review 2025: 50,000 Books, 2 Million Readers, and a Long Road Ahead",
    excerpt: "Looking back at our most ambitious year yet — and sharing what we're building next for readers, authors, and the platform.",
    author: "MyScriptic CEO",
    authorInitials: "MC",
    date: "Dec 31, 2025",
    readTime: "10 min read",
    featured: false,
    coverUrl: "https://placehold.co/480x300?text=Year+in+review+2025+celebration+milestone+confetti+amber+gold+bokeh",
  },
]

const CATEGORY_COLOR: Record<string, string> = {
  "Product Updates": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Author Tips":     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Reader Guides":   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Industry News":   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Company":         "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
}

function BlogContent() {
  const [query, setQuery] = React.useState("")
  const [activeCategory, setActiveCategory] = React.useState("All")
  const [nlEmail, setNlEmail] = React.useState("")
  const [nlDone, setNlDone] = React.useState(false)

  const handleNewsletterSubscribe = () => {
    if (!nlEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nlEmail)) return
    const stored: string[] = JSON.parse(localStorage.getItem("myscriptic-newsletter") ?? "[]")
    if (!stored.includes(nlEmail)) stored.push(nlEmail)
    localStorage.setItem("myscriptic-newsletter", JSON.stringify(stored))
    setNlDone(true)
  }

  const featured = POSTS.find(p => p.featured)
  const filtered = POSTS.filter(p => {
    if (p.featured) return false
    const matchesQuery = !query || p.title.toLowerCase().includes(query.toLowerCase()) || p.excerpt.toLowerCase().includes(query.toLowerCase())
    const matchesCat = activeCategory === "All" || p.category === activeCategory
    return matchesQuery && matchesCat
  })

  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Pen size={16} className="text-brand" />
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">The MyScriptic Blog</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-4 text-balance">
          Stories, insights and<br className="hidden sm:block" /> updates from our team
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-8 text-pretty">
          Product news, author resources, reader guides, and thought leadership from the world of digital publishing.
        </p>

        {/* Search */}
        <div className="flex items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search posts..."
              className="pl-9 h-10"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {/* Featured post */}
        {featured && !query && activeCategory === "All" && (
          <article className="mb-14 group cursor-pointer">
            <Link href={`/blog/${featured.id}`}>
              <div className="grid lg:grid-cols-2 gap-8 bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                <div className="aspect-[16/9] lg:aspect-auto lg:min-h-[280px] overflow-hidden bg-muted">
                  <img
                    src={featured.coverUrl}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={cn("text-[10px] border-0", CATEGORY_COLOR[featured.category] ?? "bg-muted text-muted-foreground")}>
                      {featured.category}
                    </Badge>
                    <Badge className="bg-brand/10 text-brand border-0 text-[10px]">Featured</Badge>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-3 text-balance group-hover:text-brand transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-3">{featured.excerpt}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-[10px]">
                      {featured.authorInitials}
                    </div>
                    <span className="font-medium text-foreground">{featured.author}</span>
                    <span>&bull;</span>
                    <span>{featured.date}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{featured.readTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          </article>
        )}

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                activeCategory === cat
                  ? "bg-brand text-primary-foreground border-brand shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-brand/40 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen size={40} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No posts found for your search.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(post => (
              <article key={post.id} className="group">
                <Link href={`/blog/${post.id}`}>
                  <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-brand/30 transition-all card-lift h-full flex flex-col">
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={post.coverUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <Badge className={cn("self-start text-[10px] border-0 mb-3", CATEGORY_COLOR[post.category] ?? "bg-muted text-muted-foreground")}>
                        {post.category}
                      </Badge>
                      <h3 className="font-serif font-bold text-foreground leading-snug mb-2 text-balance group-hover:text-brand transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-4">{post.excerpt}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border mt-auto">
                        <div className="w-6 h-6 rounded-full bg-brand/15 flex items-center justify-center text-brand font-bold text-[9px] shrink-0">
                          {post.authorInitials}
                        </div>
                        <span className="font-medium text-foreground truncate">{post.author}</span>
                        <span className="ml-auto flex items-center gap-1 shrink-0"><Clock size={10} />{post.readTime}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="mt-16 bg-card border border-border rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
              <TrendingUp size={16} className="text-brand" />
              <span className="text-xs font-bold uppercase tracking-widest text-brand">Stay Updated</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Get the latest posts in your inbox</h2>
            <p className="text-muted-foreground text-sm">Weekly digest of the best articles, author tips, and platform updates.</p>
          </div>
          {nlDone ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-semibold shrink-0">Subscribed!</p>
          ) : (
            <div className="flex gap-3 w-full sm:w-auto">
              <Input
                placeholder="your@email.com"
                className="h-11 min-w-[220px]"
                type="email"
                value={nlEmail}
                onChange={e => setNlEmail(e.target.value)}
                aria-label="Email for newsletter"
              />
              <Button
                type="button"
                className="bg-brand hover:bg-brand-dark text-primary-foreground h-11 px-6 shrink-0"
                onClick={handleNewsletterSubscribe}
              >
                Subscribe
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function BlogPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">
          <BlogContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
