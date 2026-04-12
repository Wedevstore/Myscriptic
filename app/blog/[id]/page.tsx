"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, notFound } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, BookOpen, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

const CATEGORY_COLOR: Record<string, string> = {
  "Product Updates": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Author Tips":     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Reader Guides":   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Industry News":   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Company":         "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
}

const POSTS: Record<string, {
  category: string; title: string; excerpt: string; author: string
  authorInitials: string; date: string; readTime: string; coverUrl: string
  body: string
}> = {
  post_001: {
    category: "Product Updates",
    title: "Introducing the MyScriptic CMS Builder: Full Control Over Your Storefront",
    excerpt: "Admins can now reorder homepage sections, toggle visibility, manage banners, and publish CMS pages — all without writing a single line of code.",
    author: "MyScriptic Team", authorInitials: "MT", date: "Jan 28, 2026", readTime: "4 min read",
    coverUrl: "https://placehold.co/1200x500?text=CMS+Builder+launch",
    body: "We're excited to announce the MyScriptic CMS Builder — a powerful new admin tool that lets you customise your entire storefront without touching code.\n\nWith the CMS Builder, you can reorder homepage sections via drag-and-drop, toggle section visibility, manage promotional banners with scheduling, and create rich CMS pages for policies, about content, and more.\n\nThis feature is available immediately for all admin users. Head to Dashboard → Settings → CMS to get started.\n\nWe built this because we heard from our platform operators that they needed faster iteration cycles on the storefront without waiting for developer deployments. The CMS Builder solves that by giving admins real-time control.\n\nStay tuned — we're already working on CMS templates and A/B testing support for the next release.",
  },
  post_002: {
    category: "Author Tips",
    title: "How to Write a Book Description That Converts Browsers into Buyers",
    excerpt: "Your book description is the most important piece of marketing copy you'll ever write. Here's a proven framework used by top authors on MyScriptic.",
    author: "Chimamanda A.", authorInitials: "CA", date: "Jan 22, 2026", readTime: "6 min read",
    coverUrl: "https://placehold.co/1200x500?text=Author+writing+tips",
    body: "Your book description is your number-one sales tool. It's the first thing readers see after the cover, and for many, it determines whether they hit 'Add to Cart'.\n\nHere's the framework that top-performing authors on MyScriptic use:\n\n1. Hook — Open with a question or a bold statement that targets your reader's core desire or pain point.\n\n2. Setup — Introduce the world, the protagonist, or the core promise in 2–3 sentences.\n\n3. Conflict — What stands in the way? Tease the tension without spoiling the resolution.\n\n4. Stakes — What happens if the protagonist fails? Make the reader care.\n\n5. Call to Action — End with urgency. 'Start reading today' or 'Download the first chapter free.'\n\nAuthors who rewrote their descriptions using this framework saw an average 35% increase in conversion rate on MyScriptic in Q4 2025.",
  },
  post_003: {
    category: "Reader Guides",
    title: "5 Ways to Get More from Your MyScriptic Subscription",
    excerpt: "From offline reading to subscription-only shelves and personalized recommendations, here's how to unlock every feature your plan includes.",
    author: "Tunde B.", authorInitials: "TB", date: "Jan 15, 2026", readTime: "5 min read",
    coverUrl: "https://placehold.co/1200x500?text=Subscription+guide",
    body: "Your MyScriptic subscription includes more than just unlimited reading. Here are five features you might be missing:\n\n1. Offline Downloads — Tap the download icon on any subscription book to read without internet. Annual plans get unlimited downloads.\n\n2. Subscription Library Shelves — Browse curated collections updated weekly by our editorial team.\n\n3. Progress Sync — Your reading position syncs across all devices automatically.\n\n4. Early Access — Annual subscribers can read select new releases before they're available to everyone else.\n\n5. Engagement Rewards — The more you read, the more your favourite authors earn. Your reading directly supports creators.\n\nMake the most of your plan by exploring the Subscription Library from your dashboard.",
  },
  post_004: {
    category: "Industry News",
    title: "The African Publishing Market Is Growing at 18% YoY — What It Means for Authors",
    excerpt: "New data from Q4 2025 shows an accelerating appetite for African-authored content globally.",
    author: "MyScriptic Research", authorInitials: "MR", date: "Jan 10, 2026", readTime: "8 min read",
    coverUrl: "https://placehold.co/1200x500?text=Publishing+industry+growth",
    body: "The African digital publishing market grew 18% year-over-year in 2025, driven by rising smartphone penetration, mobile payment adoption, and a growing diaspora audience hungry for authentic stories.\n\nKey findings:\n\n• Nigeria, Kenya, Ghana, and South Africa lead in both production and consumption.\n• Self-published authors now account for 42% of all new titles on major platforms.\n• Audiobook consumption grew 67% — the fastest-growing format.\n• Subscription models (like MyScriptic) now represent 28% of total digital book revenue in the region.\n\nFor authors, this means the opportunity has never been larger. The audience is growing, payment infrastructure is maturing, and platforms are investing in discovery and recommendation engines that surface new voices.\n\nWe'll publish a deeper analysis with country-by-country breakdowns next month.",
  },
  post_005: {
    category: "Author Tips",
    title: "Understanding the Revenue Pool: How MyScriptic Calculates Your Earnings",
    excerpt: "Every month, subscription revenue is distributed to authors based on engagement metrics. Here's the exact formula.",
    author: "MyScriptic Team", authorInitials: "MT", date: "Dec 28, 2025", readTime: "7 min read",
    coverUrl: "https://placehold.co/1200x500?text=Revenue+pool+earnings",
    body: "Transparency is one of our core values. Here's exactly how the MyScriptic revenue pool works.\n\nEach month, we calculate the total subscription revenue collected. A fixed percentage (currently 65%) goes into the Author Revenue Pool.\n\nThe pool is distributed based on engagement — specifically, the proportion of total reading time your books received during that cycle.\n\nFormula: Your Payout = (Your Books' Reading Time ÷ Total Platform Reading Time) × Revenue Pool\n\nWe also apply a quality multiplier based on completion rates and reader ratings, which ensures that authors who write compelling, finish-worthy content earn more per read.\n\nPayouts are processed on the 15th of each month for the previous cycle. You can track your earnings in real-time from the Author Dashboard → Earnings page.\n\nQuestions? Reach out to our author support team anytime.",
  },
  post_006: {
    category: "Company",
    title: "Year in Review 2025: 50,000 Books, 2 Million Readers, and a Long Road Ahead",
    excerpt: "Looking back at our most ambitious year yet — and sharing what we're building next.",
    author: "MyScriptic CEO", authorInitials: "MC", date: "Dec 31, 2025", readTime: "10 min read",
    coverUrl: "https://placehold.co/1200x500?text=Year+in+review+2025",
    body: "2025 was a defining year for MyScriptic.\n\nWe crossed 50,000 books in our catalog, welcomed our 2-millionth reader, and paid out over $1.2 million to authors across 14 countries.\n\nHighlights:\n\n• Launched the Subscription model — now our fastest-growing revenue stream.\n• Shipped the Author Dashboard with real-time earnings, engagement analytics, and payout tracking.\n• Introduced multi-currency payments: USD, NGN, GHS, KES via Paystack, Flutterwave, PayPal, and Korapay.\n• Built the CMS Builder so platform admins can control the storefront without code.\n• Opened the Courses platform for authors to sell educational content alongside books.\n\nWhat's next in 2026:\n\n• AI-powered recommendations and personalised reading lists.\n• An author mobile app for managing books and earnings on the go.\n• Expanded audiobook production tools.\n• International expansion beyond Africa.\n\nThank you to every reader, author, and team member who made this year possible. The best is ahead.",
  },
}

function BlogPostContent() {
  const { id } = useParams<{ id: string }>()
  const post = POSTS[id]

  if (!post) return notFound()

  const share = () => {
    if (navigator.share) {
      void navigator.share({ title: post.title, url: window.location.href })
    } else {
      void navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1 pt-16">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft size={16} /> Back to blog
          </Link>

          <div className="flex items-center gap-2 mb-4">
            <Badge className={cn("text-[10px] border-0", CATEGORY_COLOR[post.category] ?? "bg-muted text-muted-foreground")}>
              {post.category}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} /> {post.readTime}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-4 text-balance leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-xs">
              {post.authorInitials}
            </div>
            <span className="font-medium text-foreground">{post.author}</span>
            <span>&bull;</span>
            <span>{post.date}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={share}
            >
              <Share2 size={13} /> Share
            </Button>
          </div>

          <div className="aspect-[21/9] rounded-xl overflow-hidden bg-muted mb-10">
            <img src={post.coverUrl} alt={post.title} className="w-full h-full object-cover" />
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {post.body.split("\n\n").map((para, i) => (
              <p key={i} className="text-foreground/90 leading-relaxed mb-4">{para}</p>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
            <Link href="/blog" className="text-sm text-brand hover:underline flex items-center gap-1.5">
              <ArrowLeft size={14} /> More articles
            </Link>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={share}>
              <Share2 size={13} /> Share this post
            </Button>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}

export default function BlogPostPage() {
  return (
    <Providers>
      <BlogPostContent />
    </Providers>
  )
}
