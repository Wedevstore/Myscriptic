"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { seedP4, cmsPageStore, type CmsPage } from "@/lib/store-p4"
import { FileText, Globe, Lock, ArrowLeft, Calendar, ExternalLink } from "lucide-react"

const SLUG_META: Record<string, { icon: React.ElementType; desc: string }> = {
  about:   { icon: Globe,    desc: "Learn about our mission, story, and the team behind MyScriptic." },
  terms:   { icon: FileText, desc: "Read the terms and conditions governing use of the platform."    },
  privacy: { icon: Lock,     desc: "Understand how we collect, use, and protect your personal data." },
}

// Very simple markdown renderer — handles headings, bold, italic, lists, paragraphs
function renderMarkdown(md: string) {
  const lines = md.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="font-serif text-3xl font-bold text-foreground mt-8 mb-4 first:mt-0">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="font-serif text-xl font-bold text-foreground mt-7 mb-3">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-base font-bold text-foreground mt-5 mb-2">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith("- ")) {
      // Collect consecutive list items
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1.5 my-4 text-foreground/80">
          {items.map((item, j) => (
            <li key={j} className="text-sm leading-relaxed">{inlineFormat(item)}</li>
          ))}
        </ul>
      )
      continue
    } else if (line.startsWith("*") && line.startsWith("*Last")) {
      elements.push(
        <p key={i} className="text-xs text-muted-foreground italic mt-1 mb-5">{line.replace(/\*/g, "")}</p>
      )
    } else if (line.trim() === "") {
      // skip blank lines (paragraph spacing handled by margins)
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed text-foreground/85 mb-4">
          {inlineFormat(line)}
        </p>
      )
    }
    i++
  }
  return elements
}

function inlineFormat(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      : part
  )
}

function CmsPageContent() {
  const params = useParams<{ slug: string }>()
  const slug   = params?.slug ?? ""

  const [page, setPage] = React.useState<CmsPage | null | undefined>(undefined)

  React.useEffect(() => {
    seedP4()
    const found = cmsPageStore.getBySlug(slug)
    setPage(found ?? null)
  }, [slug])

  // Loading
  if (page === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not found
  if (page === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <FileText size={40} className="text-muted-foreground/25" />
        <h1 className="font-serif text-2xl font-bold text-foreground">Page Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          The page <code className="bg-muted px-1 rounded text-xs">/{slug}</code> does not exist or has not been published yet.
        </p>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/"><ArrowLeft size={13} />Back to Home</Link>
        </Button>
      </div>
    )
  }

  // Draft / unpublished
  if (!page.isPublished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Lock size={40} className="text-muted-foreground/25" />
        <h1 className="font-serif text-2xl font-bold text-foreground">Page Not Published</h1>
        <p className="text-sm text-muted-foreground max-w-sm">This page is currently saved as a draft and is not yet visible to the public.</p>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/"><ArrowLeft size={13} />Back to Home</Link>
        </Button>
      </div>
    )
  }

  const meta = SLUG_META[slug]

  return (
    <article className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft size={12} />Back to Home
      </Link>

      {/* Hero header */}
      <div className="mb-10">
        {meta && (
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-brand/10">
              <meta.icon size={16} className="text-brand" />
            </div>
          </div>
        )}
        <h1 className="font-serif text-4xl font-bold text-foreground text-balance mb-3">{page.title}</h1>
        {meta && (
          <p className="text-base text-muted-foreground leading-relaxed">{meta.desc}</p>
        )}
        <div className="flex items-center gap-3 mt-4">
          <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-0 text-xs h-5 px-2">
            Published
          </Badge>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar size={10} />
            Last updated {new Date(page.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-12 h-0.5 bg-brand rounded mb-10" />

      {/* Content */}
      <div className={cn("text-foreground/80")}>
        {renderMarkdown(page.content)}
      </div>

      {/* Footer actions */}
      <div className="mt-12 pt-8 border-t border-border flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs text-muted-foreground">
          Questions? Contact us at{" "}
          <a href="mailto:support@myscriptic.com" className="text-brand hover:underline">
            support@myscriptic.com
          </a>
        </p>
        <Link
          href="/dashboard/admin/pages"
          className="hidden admin-only text-[11px] text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors"
        >
          <ExternalLink size={10} />Edit in Admin
        </Link>
      </div>
    </article>
  )
}

export default function CmsPageRoute() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <CmsPageContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
