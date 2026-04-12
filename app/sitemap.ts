import type { MetadataRoute } from "next"
import { serverFetchJson, siteUrl } from "@/lib/server-api"

type BooksPage = {
  data: { id: string | number }[]
  meta?: { last_page?: number }
}

type CoursesList = {
  data: { slug: string }[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const staticPaths = [
    "",
    "/books",
    "/store",
    "/subscription",
    "/discover",
    "/audiobooks",
    "/courses",
    "/about",
    "/blog",
    "/authors",
    "/contact",
    "/become-author",
    "/press",
    "/careers",
    "/sales",
    "/terms",
    "/privacy",
    "/cookies",
    "/dmca",
    "/authors/guidelines",
  ]

  const entries: MetadataRoute.Sitemap = staticPaths.map(path => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.75,
  }))

  let page = 1
  let lastPage = 1
  let anyApiBooks = false
  do {
    const json = await serverFetchJson<BooksPage>(`/books?per_page=100&page=${page}`, 3600)
    if (!json?.data?.length) break
    anyApiBooks = true
    lastPage = json.meta?.last_page ?? 1
    for (const b of json.data) {
      entries.push({
        url: `${base}/books/${encodeURIComponent(String(b.id))}`,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
    page++
  } while (page <= lastPage)

  // No mock fallback — sitemap only contains real content from the API

  const coursesJson = await serverFetchJson<CoursesList>("/courses", 3600)
  if (coursesJson?.data?.length) {
    for (const c of coursesJson.data) {
      if (c.slug) {
        entries.push({
          url: `${base}/courses/${encodeURIComponent(c.slug)}`,
          changeFrequency: "weekly",
          priority: 0.72,
        })
      }
    }
  }

  return entries
}
