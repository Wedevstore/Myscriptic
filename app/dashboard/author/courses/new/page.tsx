"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Navbar } from "@/components/layout/navbar"
import { AuthorCourseEditor } from "@/components/courses/author-course-editor"

function AuthorCourseNewContent() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Fauthor%2Fcourses%2Fnew")
    }
    if (!isLoading && isAuthenticated && user?.role !== "author" && user?.role !== "admin") {
      router.replace("/")
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading || !user || (user.role !== "author" && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <AuthorCourseEditor authorId={user.id} authorName={user.name} />
    </div>
  )
}

export default function AuthorCourseNewPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AuthorCourseNewContent />
        </main>
      </div>
    </Providers>
  )
}
