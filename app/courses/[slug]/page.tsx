"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VideoEmbedFrame } from "@/components/courses/video-embed-frame"
import { seedAuthorCourses, authorCourseStore, type AuthorCourse } from "@/lib/author-courses-store"
import { isAllowedVideoUrl } from "@/lib/video-embed"
import {
  GraduationCap, ChevronLeft, ListVideo, Eye, Lock, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

function sortLessons(c: AuthorCourse) {
  return [...c.lessons].sort((a, b) => a.sortOrder - b.sortOrder)
}

function CourseSlugInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = typeof params.slug === "string" ? params.slug : ""
  const preview = searchParams.get("preview") === "1"
  const { user, isLoading: authLoading } = useAuth()

  const [course, setCourse] = React.useState<AuthorCourse | null | undefined>(undefined)
  const [activeIdx, setActiveIdx] = React.useState(0)

  React.useEffect(() => {
    seedAuthorCourses()
    const refresh = () => {
      const c = authorCourseStore.getBySlug(slug)
      setCourse(c ?? null)
    }
    refresh()
    window.addEventListener("author-courses-changed", refresh)
    return () => window.removeEventListener("author-courses-changed", refresh)
  }, [slug])

  const canPreview =
    preview &&
    user &&
    course &&
    course.authorId === user.id

  const visible =
    course &&
    (course.published || canPreview)

  React.useEffect(() => {
    setActiveIdx(0)
  }, [slug, course?.id])

  if (course === undefined || authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  if (!course || !visible) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pt-16 flex flex-col items-center justify-center px-4 text-center">
          {course && !course.published && !canPreview ? (
            <>
              <Lock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Course not published</h1>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                This course is still a draft. If you are the author, open your dashboard and use the preview link while
                signed in.
              </p>
              <Button asChild variant="outline">
                <Link href="/courses">Browse courses</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Course not found</h1>
              <Button asChild className="mt-4 bg-brand text-primary-foreground">
                <Link href="/courses">All courses</Link>
              </Button>
            </>
          )}
        </main>
        <Footer />
      </div>
    )
  }

  const lessons = sortLessons(course)
  const lesson = lessons[activeIdx] ?? lessons[0]
  const invalidLesson = lesson && !isAllowedVideoUrl(lesson.videoUrl)

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1 pt-16">
        <div className="border-b border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand transition-colors mb-4"
            >
              <ChevronLeft size={16} /> All courses
            </Link>
            <div className="flex flex-wrap items-start gap-3 justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <GraduationCap size={10} /> Video course
                  </Badge>
                  {!course.published && canPreview && (
                    <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                      <Eye size={10} /> Draft preview
                    </Badge>
                  )}
                </div>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{course.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">By {course.authorName}</p>
              </div>
            </div>
            {course.description && (
              <p className="text-sm text-muted-foreground mt-4 max-w-3xl leading-relaxed">{course.description}</p>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-4 order-2 lg:order-1">
              <div className="lg:sticky lg:top-24 rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
                  <ListVideo size={16} className="text-brand" />
                  <span className="text-sm font-semibold text-foreground">Lessons</span>
                </div>
                <ol className="divide-y divide-border max-h-[min(70vh,520px)] overflow-y-auto">
                  {lessons.map((l, i) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setActiveIdx(i)}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm transition-colors flex gap-3",
                          i === activeIdx
                            ? "bg-brand/10 text-brand font-medium"
                            : "text-foreground hover:bg-muted/60"
                        )}
                      >
                        <span className="tabular-nums text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                        <span className="line-clamp-2">{l.title}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="lg:col-span-8 order-1 lg:order-2 space-y-4">
              {lesson ? (
                <>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-foreground mb-1">{lesson.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      Video plays from {invalidLesson ? "linked provider" : "embedded player"} — hosted on YouTube or
                      Vimeo.
                    </p>
                  </div>
                  <VideoEmbedFrame url={lesson.videoUrl} title={lesson.title} />
                  {!invalidLesson && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ExternalLink size={10} />
                      Having trouble? Open the original link in{" "}
                      <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                        a new tab
                      </a>
                      .
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No lessons in this course yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function CoursePublicPage() {
  return (
    <Providers>
      <Suspense
        fallback={
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 pt-16 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            </main>
            <Footer />
          </div>
        }
      >
        <CourseSlugInner />
      </Suspense>
    </Providers>
  )
}
