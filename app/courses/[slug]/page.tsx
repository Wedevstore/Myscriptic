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
import { laravelCoursesEnabled } from "@/lib/auth-mode"
import { coursesPublicApi } from "@/lib/api"
import { mapAuthorCourseDetailFromApi } from "@/lib/courses-from-api"
import { isAllowedVideoUrl } from "@/lib/video-embed"
import {
  GraduationCap, ChevronLeft, ListVideo, Eye, Lock, ExternalLink, CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCourseAccessLabel } from "@/lib/course-access"

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
  const fromApi = laravelCoursesEnabled()

  React.useEffect(() => {
    if (!slug) return

    if (!fromApi) {
      seedAuthorCourses()
      const refresh = () => {
        const c = authorCourseStore.getBySlug(slug)
        setCourse(c ?? null)
      }
      refresh()
      window.addEventListener("author-courses-changed", refresh)
      return () => window.removeEventListener("author-courses-changed", refresh)
    }

    if (preview && authLoading) {
      setCourse(undefined)
      return
    }

    let cancelled = false
    setCourse(undefined)
    void coursesPublicApi
      .get(slug, preview ? { preview: true } : {})
      .then(({ data }) => {
        if (!cancelled) setCourse(mapAuthorCourseDetailFromApi(data))
      })
      .catch(() => {
        if (!cancelled) setCourse(null)
      })

    return () => {
      cancelled = true
    }
  }, [slug, preview, authLoading, fromApi])

  const canPreview =
    preview &&
    user &&
    course &&
    String(course.authorId) === String(user.id)

  const visible =
    course &&
    (course.published || canPreview)

  React.useEffect(() => {
    setActiveIdx(0)
  }, [slug, course?.id])

  const lessonScrollPrevIdxRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    lessonScrollPrevIdxRef.current = null
  }, [slug, course?.id])

  React.useEffect(() => {
    if (!course || !visible) return
    const lessons = sortLessons(course)
    const lesson = lessons[activeIdx]
    if (!lesson) return
    const prev = lessonScrollPrevIdxRef.current
    lessonScrollPrevIdxRef.current = activeIdx
    if (prev !== null && prev !== activeIdx) {
      document.getElementById("course-lesson-player")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }, [activeIdx, course, visible])

  const pageLoading =
    course === undefined ||
    (fromApi && preview && authLoading) ||
    (!fromApi && authLoading)

  if (pageLoading) {
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

  const isOwner = Boolean(user && String(course.authorId) === String(user.id))
  const paywalledPaidPlayback = course.accessType === "PAID" && !isOwner

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
                  <Badge variant="outline" className="text-[10px] border-brand/30 text-brand">
                    {formatCourseAccessLabel(course.accessType, course.price, course.currency)}
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
              <div
                id="course-lesson-panel"
                className="lg:sticky lg:top-24 rounded-2xl border border-border bg-card overflow-hidden scroll-mt-24"
              >
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
                <div id="course-lesson-player" className="space-y-4 scroll-mt-24">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-foreground mb-1">{lesson.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {paywalledPaidPlayback
                        ? "Video playback unlocks after purchase."
                        : invalidLesson
                          ? "This lesson link cannot be embedded here — open it in a new tab below."
                          : "Use the controls below the player — video is hosted on YouTube or Vimeo."}
                    </p>
                  </div>
                  {course.accessType === "SUBSCRIPTION" && !isOwner ? (
                    <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
                      This course is included with eligible reader plans.{" "}
                      <Link href="/subscription" className="text-brand font-medium hover:underline">
                        View subscription options
                      </Link>
                      .
                    </p>
                  ) : null}
                  {paywalledPaidPlayback ? (
                    <div className="rounded-2xl border-2 border-dashed border-brand/35 bg-gradient-to-b from-brand/5 to-muted/20 aspect-video flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                      <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
                        <CreditCard className="h-7 w-7 text-brand" />
                      </div>
                      <div>
                        <p className="font-serif text-lg font-bold text-foreground">Purchase to watch</p>
                        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                          {formatCourseAccessLabel(course.accessType, course.price, course.currency)} — individual course
                          checkout is coming soon. Contact us to arrange access, or explore a reader subscription.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button asChild className="bg-brand text-primary-foreground hover:bg-brand-dark">
                          <Link href="/contact">Contact us</Link>
                        </Button>
                        <Button asChild variant="outline" className="border-brand/40 text-brand">
                          <Link href="/subscription">Subscription plans</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <VideoEmbedFrame
                        url={lesson.videoUrl}
                        title={lesson.title}
                        {...(lessons.length > 1
                          ? {
                              onPreviousLesson: () => setActiveIdx(i => Math.max(0, i - 1)),
                              onNextLesson: () => setActiveIdx(i => Math.min(lessons.length - 1, i + 1)),
                              hasPreviousLesson: activeIdx > 0,
                              hasNextLesson: activeIdx < lessons.length - 1,
                              showLessonsButton: true,
                              onOpenLessons: () =>
                                document.getElementById("course-lesson-panel")?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                }),
                            }
                          : {})}
                      />
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
                  )}
                </div>
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
