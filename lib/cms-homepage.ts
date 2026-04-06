/**
 * Types for GET /api/cms/homepage (Phase 4 CMS).
 */

export interface CmsHomepageBook {
  id: string
  title: string
  author: string
  coverUrl: string | null
  rating: number | null
  reviewCount: number
  price?: number | null
  currency?: string
  accessType: string
  format: string
  category: string
  isNew?: boolean
  isTrending?: boolean
}

export interface CmsHomepageItem {
  id: number
  sort_order: number
  item_type: string
  title: string | null
  subtitle: string | null
  image_url: string | null
  cta_label: string | null
  link_type: string | null
  link_value: string | null
  book_id: number | null
  meta: Record<string, unknown>
  book: CmsHomepageBook | null
}

export interface CmsHomepageSection {
  id: number
  title: string
  section_type: string
  sort_order: number
  is_active: boolean
  settings: Record<string, unknown>
  items: CmsHomepageItem[]
}

export interface CmsHomepageResponse {
  sections: CmsHomepageSection[]
}

/**
 * When not "0" or "false", the homepage tries the Laravel CMS API first and falls back to mock content if the request fails.
 */
export function shouldTryCmsHomepageApi(): boolean {
  const v = process.env.NEXT_PUBLIC_CMS_FROM_API
  if (v === "0" || v === "false") return false
  return true
}

export function resolveCmsLink(linkType: string | null, linkValue: string | null): string {
  if (!linkType || !linkValue) return "#"
  switch (linkType) {
    case "book":
      return `/books/${linkValue}`
    case "category":
      return `/books?category=${encodeURIComponent(linkValue)}`
    case "external":
      return linkValue
    case "subscription":
      return "/subscription"
    case "store":
      return linkValue.startsWith("/") ? linkValue : "/store"
    default:
      return linkValue.startsWith("/") ? linkValue : "#"
  }
}
