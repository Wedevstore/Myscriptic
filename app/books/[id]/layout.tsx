import type { Metadata } from "next"
import { serverFetchJson, siteUrl } from "@/lib/server-api"

type BookPayload = {
  data: {
    title: string
    description?: string | null
    author: string
    coverUrl?: string | null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const json = await serverFetchJson<BookPayload>(`/books/${id}`, 300)
  const book = json?.data
  const site = siteUrl()

  if (!book) {
    return {
      title: "Book",
      description: "Discover ebooks and audiobooks on MyScriptic.",
    }
  }

  const title = book.title
  const raw = (book.description ?? `${book.title} by ${book.author} — read on MyScriptic.`).replace(/\s+/g, " ").trim()
  const description = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw
  const ogImage =
    book.coverUrl && (book.coverUrl.startsWith("http://") || book.coverUrl.startsWith("https://"))
      ? [{ url: book.coverUrl }]
      : undefined

  return {
    title,
    description,
    alternates: { canonical: `${site}/books/${id}` },
    openGraph: {
      type: "article",
      url: `${site}/books/${id}`,
      title,
      description,
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage?.map(i => i.url),
    },
  }
}

export default function BookDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
