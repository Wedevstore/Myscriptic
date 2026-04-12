"use client"

import * as React from "react"
import { BookSection } from "@/components/home/book-section"
import { CategoryStrip } from "@/components/home/category-strip"
import { CmsHeroCarousel } from "@/components/home/cms-hero-carousel"
import { FlashSaleBanner } from "@/components/home/flash-sale-banner"
import { SubscriptionBanner } from "@/components/home/subscription-banner"
import { CourseStrip } from "@/components/home/course-strip"
import type { BookCardData } from "@/components/books/book-card"
import type { CmsHomepageBook, CmsHomepageSection } from "@/lib/cms-homepage"
import { FALLBACK_COVER } from "@/lib/book-mapper"
import { rewriteS3CoverToCdn } from "@/lib/cover-display"

function toCard(b: CmsHomepageBook): BookCardData {
  const reviewCount =
    typeof b.reviewCount === "number" && Number.isFinite(b.reviewCount) ? b.reviewCount : 0
  const rating = typeof b.rating === "number" && Number.isFinite(b.rating) ? b.rating : 0
  const cover = b.coverUrl?.trim()
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    coverUrl: rewriteS3CoverToCdn(cover || FALLBACK_COVER),
    rating,
    reviewCount,
    price: b.price ?? undefined,
    currency: b.currency,
    accessType: b.accessType as BookCardData["accessType"],
    format: b.format as BookCardData["format"],
    category: b.category ?? "",
    isNew: b.isNew,
    isTrending: b.isTrending,
  }
}

export function CmsDynamicHome({ sections }: { sections: CmsHomepageSection[] }) {
  const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      {sorted.map(section => {
        const key = section.id

        switch (section.section_type) {
          case "hero_carousel":
            return <CmsHeroCarousel key={key} items={section.items} />

          case "book_list": {
            const books = section.items
              .map(i => i.book)
              .filter((x): x is CmsHomepageBook => x !== null)
              .map(toCard)
            const seeAll =
              typeof section.settings?.see_all_href === "string"
                ? section.settings.see_all_href
                : "/books"
            const variant = section.settings?.variant === "scroll" ? "scroll" : "grid"
            const columns = (section.settings?.columns as 2 | 3 | 4 | 5 | 6 | undefined) ?? 4
            if (books.length === 0) return null

            return (
              <BookSection
                key={key}
                title={section.title}
                subtitle={
                  typeof section.settings?.subtitle === "string" ? section.settings.subtitle : undefined
                }
                books={books}
                seeAllHref={seeAll}
                variant={variant}
                columns={columns}
              />
            )
          }

          case "category_strip":
            return <CategoryStrip key={key} />

          case "flash_sale":
            return <FlashSaleBanner key={key} />

          case "subscription_cta":
            return <SubscriptionBanner key={key} />

          case "author_courses":
            return (
              <CourseStrip
                key={key}
                title={section.title || "Learn from authors"}
                subtitle={
                  typeof section.settings?.subtitle === "string"
                    ? section.settings.subtitle
                    : undefined
                }
              />
            )

          case "custom_html": {
            const html = typeof section.settings?.html === "string" ? section.settings.html : ""
            if (!html) return null

            return (
              <section key={key} className="py-10 border-b border-border">
                <div
                  className="max-w-4xl mx-auto px-4 sm:px-6 prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </section>
            )
          }

          default:
            return null
        }
      })}
    </>
  )
}
