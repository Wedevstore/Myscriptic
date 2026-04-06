"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Navbar } from "@/components/layout/navbar"
import { AuthorCourseEditor } from "@/components/courses/author-course-editor"

function AuthorCourseEditContent() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const { user, isAuthenticated, isLoading } = useAuth()

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/dashboard/author/courses/${id}`)}`)
    }
    if (!isLoading && isAuthenticated && user?.role !== "author" && user?.role !== "admin") {
      router.replace("/")
    }
  }, [isLoading, isAuthenticated, user, router, id])

  if (isLoading || !user || (user.role !== "author" && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <AuthorCourseEditor courseId={id} authorId={user.id} authorName={user.name} />
    </div>
  )
}

export default function AuthorCourseEditPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AuthorCourseEditContent />
        </main>
      </div>
    </Providers>
  )
}
