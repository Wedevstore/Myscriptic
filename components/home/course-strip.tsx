"use client"

import * as React from "react"
import Link from "next/link"
import { GraduationCap, PlayCircle, ArrowRight, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { seedAuthorCourses, authorCourseStore, type AuthorCourse } from "@/lib/author-courses-store"
import { CoverImage } from "@/components/ui/cover-image"

export function CourseStrip({
  title = "Learn from authors",
  subtitle = "Video courses — lessons stream from YouTube or Vimeo. No downloads required.",
}: {
  title?: string
  subtitle?: string
}) {
  const [courses, setCourses] = React.useState<AuthorCourse[]>([])

  React.useEffect(() => {
    seedAuthorCourses()
    const refresh = () => setCourses(authorCourseStore.getPublished().slice(0, 6))
    refresh()
    window.addEventListener("author-courses-changed", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("author-courses-changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  if (courses.length === 0) return null

  return (
    <section className="py-14 md:py-16 border-b border-border bg-gradient-to-b from-muted/40 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-brand mb-2">
              <GraduationCap size={22} className="shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Courses</span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm md:text-base">{subtitle}</p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-2 border-brand/30 text-brand hover:bg-brand/10" asChild>
            <Link href="/courses">
              Browse all courses
              <ArrowRight size={14} />
            </Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-brand/40 hover:shadow-lg transition-all duration-300"
            >
              <div className="relative aspect-video bg-muted">
                {course.thumbnailUrl ? (
                  <CoverImage
                    src={course.thumbnailUrl}
                    alt={`${course.title} course thumbnail`}
                    className="group-hover:scale-[1.02] transition-transform duration-500"
                    sizes="(max-width: 1024px) 90vw, 400px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/20 to-brand/5">
                    <PlayCircle className="h-14 w-14 text-brand/80" strokeWidth={1.25} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-white/90 flex items-center gap-1.5 min-w-0">
                    <PlayCircle size={14} className="shrink-0" />
                    {course.lessons.length} lesson{course.lessons.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-serif font-bold text-lg text-foreground group-hover:text-brand transition-colors line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                  <User size={12} />
                  {course.authorName}
                </p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1">{course.description}</p>
                <span className="text-sm font-semibold text-brand mt-4 inline-flex items-center gap-1">
                  View course
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
