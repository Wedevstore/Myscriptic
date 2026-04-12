"use client"

import * as React from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, PlayCircle, ArrowRight, User, Search } from "lucide-react"
import {
  seedAuthorCourses,
  authorCourseStore,
  courseLessonCount,
  type AuthorCourse,
} from "@/lib/author-courses-store"
import { laravelCoursesEnabled } from "@/lib/auth-mode"
import { coursesPublicApi } from "@/lib/api"
import { mapAuthorCourseCardFromApi } from "@/lib/courses-from-api"
import { CoverImage } from "@/components/ui/cover-image"
import { Badge } from "@/components/ui/badge"
import { formatCourseAccessLabel } from "@/lib/course-access"
import { cn } from "@/lib/utils"

function CourseCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card overflow-hidden animate-pulse",
        className
      )}
      aria-hidden
    >
      <div className="aspect-video bg-muted" />
      <div className="p-6 flex-1 flex flex-col gap-3">
        <div className="h-6 bg-muted rounded-md w-[85%]" />
        <div className="h-3 bg-muted rounded-md w-[45%]" />
        <div className="h-14 bg-muted rounded-md w-full mt-1" />
        <div className="h-4 bg-muted rounded-md w-24 mt-3" />
      </div>
    </div>
  )
}

function CoursesGrid() {
  const [courses, setCourses] = React.useState<AuthorCourse[]>([])
  const [query, setQuery] = React.useState("")
  const [debouncedQ, setDebouncedQ] = React.useState("")
  const [listLoading, setListLoading] = React.useState(() => laravelCoursesEnabled())

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])

  React.useEffect(() => {
    const refresh = () => {
      if (laravelCoursesEnabled()) {
        setListLoading(true)
        void coursesPublicApi
          .list(debouncedQ ? { q: debouncedQ } : undefined)
          .then(res => setCourses(res.data.map(mapAuthorCourseCardFromApi)))
          .catch(() => setCourses([]))
          .finally(() => setListLoading(false))
        return
      }
      setListLoading(false)
      seedAuthorCourses()
      let list = authorCourseStore.getPublished()
      if (debouncedQ) {
        const q = debouncedQ.toLowerCase()
        list = list.filter(
          c =>
            c.title.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.authorName.toLowerCase().includes(q)
        )
      }
      setCourses(list)
    }
    refresh()
    window.addEventListener("author-courses-changed", refresh)
    return () => window.removeEventListener("author-courses-changed", refresh)
  }, [debouncedQ])

  const searchBar = (
    <div className="max-w-md">
      <Label htmlFor="courses-search" className="text-xs text-muted-foreground mb-1.5 block">
        Search courses
      </Label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          id="courses-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Title, author, or topic…"
          className="pl-9"
          autoComplete="off"
        />
      </div>
    </div>
  )

  if (listLoading && courses.length === 0) {
    return (
      <div className="space-y-8">
        {searchBar}
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
          role="status"
          aria-live="polite"
          aria-label="Loading courses"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!listLoading && courses.length === 0) {
    const filtered = debouncedQ.length > 0
    return (
      <div className="space-y-8">
        {searchBar}
        <div className="max-w-lg mx-auto text-center py-16 px-4">
          <GraduationCap className="h-14 w-14 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="font-serif text-xl font-bold text-foreground mb-2">
            {filtered ? "No matching courses" : "No published courses yet"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {filtered
              ? "Try a different search term or clear the box to see all published courses."
              : "Authors can publish video courses with YouTube or Vimeo links from the author dashboard."}
          </p>
          {filtered ? (
            <Button type="button" variant="outline" className="border-brand/40 text-brand" onClick={() => setQuery("")}>
              Clear search
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-brand/40 text-brand">
              <Link href="/become-author">Become an author</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {searchBar}
      <div
        className={cn(
          "grid sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-200",
          listLoading && "opacity-70"
        )}
        aria-busy={listLoading}
      >
      {courses.map(course => (
        <Link
          key={course.id}
          href={`/courses/${course.slug}`}
          className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-brand/40 hover:shadow-xl transition-all duration-300"
        >
          <div className="relative aspect-video bg-muted">
            {course.thumbnailUrl ? (
              <CoverImage
                src={course.thumbnailUrl}
                alt={`${course.title} thumbnail`}
                className="group-hover:scale-[1.02] transition-transform duration-500"
                sizes="(max-width: 1024px) 90vw, 400px"
                coverFallbackSeed={course.id}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/25 to-brand/5">
                <PlayCircle className="h-16 w-16 text-brand/70" strokeWidth={1.2} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute top-3 right-3">
              <Badge className="text-[10px] bg-black/55 text-white border-white/15 backdrop-blur-sm hover:bg-black/55">
                {formatCourseAccessLabel(course.accessType, course.price, course.currency)}
              </Badge>
            </div>
            <div className="absolute bottom-3 left-3 text-xs font-medium text-white flex items-center gap-1.5">
              <PlayCircle size={14} />
              {courseLessonCount(course)} lesson{courseLessonCount(course) === 1 ? "" : "s"}
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h2 className="font-serif text-xl font-bold text-foreground group-hover:text-brand transition-colors line-clamp-2">
              {course.title}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
              <User size={12} />
              {course.authorName}
            </p>
            <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">{course.description}</p>
            <span className="text-sm font-semibold text-brand mt-5 inline-flex items-center gap-1">
              Start course
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>
      ))}
      </div>
    </div>
  )
}

export default function CoursesIndexPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">
          <div className="bg-sidebar border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-12">
              <div className="flex items-center gap-2 text-brand mb-2">
                <GraduationCap size={24} />
                <span className="text-xs font-semibold uppercase tracking-wider">Author courses</span>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-sidebar-foreground">Video courses</h1>
              <p className="text-sidebar-foreground/60 mt-2 max-w-2xl">
                Learn from MyScriptic authors. Each lesson opens a stream from YouTube or Vimeo — we never host video
                files on our servers.
              </p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
            <CoursesGrid />
          </div>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
