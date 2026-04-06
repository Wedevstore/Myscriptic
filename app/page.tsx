"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { HeroSection } from "@/components/home/hero-section"
import { CategoryStrip } from "@/components/home/category-strip"
import { BookSection } from "@/components/home/book-section"
import { FlashSaleBanner } from "@/components/home/flash-sale-banner"
import { SubscriptionBanner } from "@/components/home/subscription-banner"
import { TrendingAuthors } from "@/components/home/trending-authors"
import { CmsDynamicHome } from "@/components/home/cms-dynamic-home"
import { Providers } from "@/components/providers"
import type { BookCardData } from "@/components/books/book-card"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { cmsApi, booksApi, storeApi } from "@/lib/api"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { cmsSectionStore, seedP4, type CmsSection } from "@/lib/store-p4"
import type { CmsHomepageSection } from "@/lib/cms-homepage"
import { shouldTryCmsHomepageApi } from "@/lib/cms-homepage"

const AdBanner = dynamic(
  () => import("@/components/ads/ad-banner").then(m => ({ default: m.AdBanner })),
  { ssr: false, loading: () => null }
)

type HomeBookSections = {
  trendingBooks: BookCardData[]
  newArrivals: BookCardData[]
  freeBooks: BookCardData[]
  audiobooks: BookCardData[]
  subscriptionBooks: BookCardData[]
}

const DEFAULT_HOME_BOOKS: HomeBookSections = {
  trendingBooks: MOCK_BOOKS.filter(b => b.isTrending),
  newArrivals: MOCK_BOOKS.filter(b => b.isNew),
  freeBooks: MOCK_BOOKS.filter(b => b.accessType === "FREE"),
  audiobooks: MOCK_BOOKS.filter(b => b.format === "audiobook"),
  subscriptionBooks: MOCK_BOOKS.filter(b => b.accessType === "SUBSCRIPTION"),
}

function mapBookRows(rows: unknown[]): BookCardData[] {
  return rows.map(r => apiBookToCard(r as ApiBookRecord))
}

/** Loads curated lists for the static home layout when CMS homepage is unavailable. */
async function fetchLiveHomeBooks(): Promise<HomeBookSections> {
  const [featRes, freeRes, subRes, wideRes] = await Promise.all([
    storeApi.featured(),
    booksApi.list({ per_page: "12", access_type: "FREE" }),
    booksApi.list({ per_page: "12", access_type: "SUBSCRIPTION" }),
    booksApi.list({ per_page: "48" }),
  ])

  const featured = mapBookRows((featRes.data as unknown[]) ?? [])
  const trendingBooks =
    featured.filter(b => b.isTrending).slice(0, 4).length > 0
      ? featured.filter(b => b.isTrending).slice(0, 4)
      : featured.slice(0, 4)
  const newArrivals =
    featured.filter(b => b.isNew).slice(0, 4).length > 0
      ? featured.filter(b => b.isNew).slice(0, 4)
      : featured.slice(4, 8).length > 0
        ? featured.slice(4, 8)
        : featured.slice(0, 4)

  const freeBooks = mapBookRows((freeRes.data as unknown[]) ?? []).slice(0, 8)
  const subscriptionBooks = mapBookRows((subRes.data as unknown[]) ?? []).slice(0, 8)
  const audiobooks = mapBookRows((wideRes.data as unknown[]) ?? [])
    .filter(b => b.format === "audiobook")
    .slice(0, 4)

  return {
    trendingBooks: trendingBooks.length ? trendingBooks : DEFAULT_HOME_BOOKS.trendingBooks,
    newArrivals: newArrivals.length ? newArrivals : DEFAULT_HOME_BOOKS.newArrivals,
    freeBooks: freeBooks.length ? freeBooks : DEFAULT_HOME_BOOKS.freeBooks,
    subscriptionBooks: subscriptionBooks.length ? subscriptionBooks : DEFAULT_HOME_BOOKS.subscriptionBooks,
    audiobooks: audiobooks.length ? audiobooks : DEFAULT_HOME_BOOKS.audiobooks,
  }
}

function sectionActive(sections: CmsSection[], type: string) {
  const s = sections.find(s => s.type === type)
  return s ? s.isActive : true
}

function MockHomeContent({
  sections,
  books = DEFAULT_HOME_BOOKS,
}: {
  sections: CmsSection[]
  books?: HomeBookSections
}) {
  const showBanner = sectionActive(sections, "banner")
  const showTrending = sectionActive(sections, "book_list")
  const showFeatured = sectionActive(sections, "featured")
  const showCategories = sectionActive(sections, "category_list")
  const showFlashSale = sectionActive(sections, "flash_sale")

  return (
    <main id="main-content" className="flex-1 pt-16">
      {showBanner && <HeroSection />}
      {showCategories && <CategoryStrip />}
      {showTrending && (
        <BookSection
          title="Trending This Week"
          subtitle="Most-read books by the MyScriptic community"
          books={books.trendingBooks}
          seeAllHref="/books?sort=trending"
          columns={4}
        />
      )}
      {showFlashSale && <FlashSaleBanner />}
      {showFeatured && (
        <BookSection
          title="New Arrivals"
          subtitle="Fresh titles added this month"
          books={books.newArrivals}
          seeAllHref="/books?sort=new"
          columns={4}
        />
      )}
      <BookSection
        title="Read with Subscription"
        subtitle="Unlimited access with any plan"
        books={books.subscriptionBooks}
        seeAllHref="/books?access=subscription"
        variant="scroll"
        columns={6}
      />
      <SubscriptionBanner />
      <BookSection
        title="Top Audiobooks"
        subtitle="Listen on the go"
        books={books.audiobooks}
        seeAllHref="/audiobooks"
        columns={4}
      />
      <TrendingAuthors />
      <BookSection
        title="Free to Read"
        subtitle="Start reading right now — no subscription needed"
        books={books.freeBooks}
        seeAllHref="/books?access=free"
        columns={4}
      />
    </main>
  )
}

function HomeContent() {
  const [cmsSections, setCmsSections] = React.useState<CmsHomepageSection[] | null>(null)
  const [cmsFailed, setCmsFailed] = React.useState(false)
  const [storeSections, setStoreSections] = React.useState<CmsSection[]>([])
  const [liveBooks, setLiveBooks] = React.useState<HomeBookSections | null>(null)
  const [liveBooksReady, setLiveBooksReady] = React.useState(() => !apiUrlConfigured())

  React.useEffect(() => {
    seedP4()
    setStoreSections(cmsSectionStore.getAll())
  }, [])

  React.useEffect(() => {
    if (!apiUrlConfigured()) return
    let cancelled = false
    setLiveBooksReady(false)
    fetchLiveHomeBooks()
      .then(books => {
        if (!cancelled) setLiveBooks(books)
      })
      .catch(() => {
        if (!cancelled) setLiveBooks(null)
      })
      .finally(() => {
        if (!cancelled) setLiveBooksReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (!shouldTryCmsHomepageApi()) {
      setCmsFailed(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = (await cmsApi.homepage()) as { sections?: CmsHomepageSection[] }
        if (!cancelled && Array.isArray(res.sections) && res.sections.length > 0) {
          setCmsSections(res.sections)
        } else if (!cancelled) {
          setCmsFailed(true)
        }
      } catch {
        if (!cancelled) setCmsFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (cmsSections && !cmsFailed) {
    return (
      <main id="main-content" className="flex-1 pt-16">
        <CmsDynamicHome sections={cmsSections} />
        <TrendingAuthors />
      </main>
    )
  }

  const showMockFallback = cmsFailed || !shouldTryCmsHomepageApi()
  const waitingLiveBooks = apiUrlConfigured() && !liveBooksReady

  if (showMockFallback && waitingLiveBooks) {
    return (
      <main id="main-content" className="flex-1 pt-16 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </main>
    )
  }

  return (
    <MockHomeContent
      sections={storeSections}
      books={liveBooks ?? DEFAULT_HOME_BOOKS}
    />
  )
}

export default function HomePage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <HomeContent />
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-6">
          <AdBanner />
        </div>
        <Footer />
      </div>
    </Providers>
  )
}
