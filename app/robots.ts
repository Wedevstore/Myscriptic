import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/server-api"

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
