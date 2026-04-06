"use client"

import * as React from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { cmsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  const [title, setTitle] = React.useState("Terms of Service")
  const [html, setHtml] = React.useState<string | null>(null)
  const [err, setErr] = React.useState(false)

  React.useEffect(() => {
    cmsApi
      .page("terms")
      .then(res => {
        setTitle(res.data.title)
        setHtml(res.data.content)
      })
      .catch(() => setErr(true))
  }, [])

  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-20 pb-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 mb-8 -ml-2 text-muted-foreground">
                <ArrowLeft size={14} /> Back
              </Button>
            </Link>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-8">{title}</h1>
            {err && (
              <p className="text-muted-foreground text-sm">
                This page could not be loaded from the CMS. Ensure the API is running and the terms page is published.
              </p>
            )}
            {html && (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
            {!html && !err && <div className="h-32 skeleton-shimmer rounded-xl" aria-hidden />}
          </div>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
