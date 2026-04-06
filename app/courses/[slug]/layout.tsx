import type { Metadata } from "next"
import { siteUrl } from "@/lib/server-api"
import { courseJsonLd, getPublicCourseMetaBySlug } from "@/lib/server-course-meta"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublicCourseMetaBySlug(slug)
  const site = siteUrl()
  const encoded = encodeURIComponent(slug)

  if (!data) {
    return {
      title: "Course",
      description: "Video courses from MyScriptic authors.",
    }
  }

  const { title, author_name: authorName, description, thumbnail_url: thumb } = data
  const raw = (description ?? `${title} — video course by ${authorName} on MyScriptic.`)
    .replace(/\s+/g, " ")
    .trim()
  const desc = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw
  const ogImage =
    thumb && (thumb.startsWith("http://") || thumb.startsWith("https://")) ? [{ url: thumb }] : undefined

  return {
    title,
    description: desc,
    alternates: { canonical: `${site}/courses/${encoded}` },
    openGraph: {
      type: "website",
      url: `${site}/courses/${encoded}`,
      title,
      description: desc,
      images: ogImage,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description: desc,
      images: ogImage?.map(i => i.url),
    },
  }
}

export default async function CourseSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getPublicCourseMetaBySlug(slug)
  const jsonLd = data ? courseJsonLd(data) : null

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  )
}
