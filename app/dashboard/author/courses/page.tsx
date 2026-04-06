"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { seedAuthorCourses, authorCourseStore, courseLessonCount, type AuthorCourse } from "@/lib/author-courses-store"
import { laravelCoursesEnabled } from "@/lib/auth-mode"
import { authorCoursesApi } from "@/lib/api"
import { mapAuthorCourseDetailFromApi } from "@/lib/courses-from-api"
import { formatCourseAccessLabel } from "@/lib/course-access"
import {
  ChevronLeft, Plus, Pencil, Trash2, Eye, Copy, Check, GraduationCap, ExternalLink,
} from "lucide-react"
function AuthorCoursesListContent() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [rows, setRows] = React.useState<AuthorCourse[]>([])
  const [copied, setCopied] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Fauthor%2Fcourses")
    }
    if (!isLoading && isAuthenticated && user?.role !== "author" && user?.role !== "admin") {
      router.replace("/")
    }
  }, [isLoading, isAuthenticated, user, router])

  const refresh = React.useCallback(() => {
    if (!user?.id) return
    if (laravelCoursesEnabled()) {
      void authorCoursesApi
        .list()
        .then(res => setRows(res.data.map(mapAuthorCourseDetailFromApi)))
        .catch(() => setRows([]))
      return
    }
    seedAuthorCourses()
    setRows(authorCourseStore.getByAuthor(user.id))
  }, [user?.id])

  React.useEffect(() => {
    refresh()
    window.addEventListener("author-courses-changed", refresh)
    return () => window.removeEventListener("author-courses-changed", refresh)
  }, [refresh])

  const copyPreview = (slug: string, id: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/courses/${slug}?preview=1`
    void navigator.clipboard.writeText(url)
    setCopied(id)
    window.setTimeout(() => setCopied(null), 2000)
  }

  const onDelete = (id: string) => {
    if (!confirm("Delete this course and all its lessons?")) return
    if (laravelCoursesEnabled()) {
      void authorCoursesApi.delete(id).then(() => {
        if (typeof window !== "undefined") window.dispatchEvent(new Event("author-courses-changed"))
        refresh()
      })
      return
    }
    authorCourseStore.delete(id)
    refresh()
  }

  if (isLoading || !user || (user.role !== "author" && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <Link
              href="/dashboard/author"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-2"
            >
              <ChevronLeft size={14} /> Author dashboard
            </Link>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-brand" />
              Video courses
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Build lessons with YouTube or Vimeo links only. Publish when ready — readers watch embedded players on
              MyScriptic.
            </p>
          </div>
          <Button asChild className="bg-brand text-primary-foreground hover:bg-brand-dark gap-2">
            <Link href="/dashboard/author/courses/new">
              <Plus size={16} /> New course
            </Link>
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 py-16 text-center px-4">
            <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">No courses yet</p>
            <p className="text-sm text-muted-foreground mb-6">Create your first course with linked video lessons.</p>
            <Button asChild className="bg-brand text-primary-foreground">
              <Link href="/dashboard/author/courses/new">Create course</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(c => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-brand/25 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-semibold text-foreground truncate">{c.title}</h2>
                    {c.published ? (
                      <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Draft
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                      {formatCourseAccessLabel(c.accessType, c.price, c.currency)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    /courses/{c.slug} · {courseLessonCount(c)} lesson{courseLessonCount(c) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => copyPreview(c.slug, c.id)}
                  >
                    {copied === c.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    Preview link
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" asChild>
                    <a href={`/courses/${c.slug}${c.published ? "" : "?preview=1"}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={12} /> Open
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" asChild>
                    <Link href={`/dashboard/author/courses/${c.id}`}>
                      <Pencil size={12} /> Edit
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-8 px-2"
                    onClick={() => onDelete(c.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-8 flex items-start gap-2">
          <Eye size={12} className="shrink-0 mt-0.5" />
          Preview links only work when you are signed in as the course author. Published courses are public at /courses/…
        </p>
      </div>
  )
}

export default function AuthorCoursesListPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AuthorCoursesListContent />
        </main>
      </div>
    </Providers>
  )
}
