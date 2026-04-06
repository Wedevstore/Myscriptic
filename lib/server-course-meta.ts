import { cache } from "react"
import { serverFetchJson, siteUrl } from "@/lib/server-api"

export type PublicCourseMeta = {
  title: string
  slug: string
  description?: string | null
  author_name: string
  thumbnail_url?: string | null
  lessons?: { id: string; title: string }[]
  access_type?: string
  price?: number | null
  currency?: string | null
}

type CourseDetailResponse = { data: PublicCourseMeta }

/**
 * Single fetch per request (shared by generateMetadata + layout) when the Laravel API is configured.
 */
export const getPublicCourseMetaBySlug = cache(async (slug: string): Promise<PublicCourseMeta | null> => {
  const encoded = encodeURIComponent(slug)
  const json = await serverFetchJson<CourseDetailResponse>(`/courses/${encoded}`, 300)
  return json?.data ?? null
})

export function courseJsonLd(course: PublicCourseMeta): Record<string, unknown> {
  const site = siteUrl()
  const pathSlug = encodeURIComponent(course.slug)
  const url = `${site}/courses/${pathSlug}`
  const desc =
    (course.description ?? `${course.title} — video course by ${course.author_name} on MyScriptic.`)
      .replace(/\s+/g, " ")
      .trim() || course.title

  const image =
    course.thumbnail_url &&
    (course.thumbnail_url.startsWith("http://") || course.thumbnail_url.startsWith("https://"))
      ? course.thumbnail_url
      : undefined

  const access = course.access_type ?? "SUBSCRIPTION"
  const paid =
    access === "PAID" &&
    course.price != null &&
    Number.isFinite(Number(course.price)) &&
    Number(course.price) > 0

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: desc.length > 5000 ? `${desc.slice(0, 4997)}…` : desc,
    url,
    provider: {
      "@type": "Organization",
      name: "MyScriptic",
      url: site,
    },
    author: {
      "@type": "Person",
      name: course.author_name,
    },
    ...(image ? { image: [image] } : {}),
    ...(paid
      ? {
          offers: {
            "@type": "Offer",
            price: Number(course.price),
            priceCurrency: (course.currency ?? "USD").toUpperCase(),
            availability: "https://schema.org/OnlineOnly",
            url,
          },
        }
      : {}),
  }
}
