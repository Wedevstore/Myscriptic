"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BookCard, type BookCardData } from "@/components/books/book-card"
import { useAuth } from "@/components/providers/auth-provider"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { laravelAuthEnabled } from "@/lib/auth-mode"
import { authorsApi, authorFollowsApi, booksApi } from "@/lib/api"
import {
  loadAuthorFollowIdsFromStorage,
  saveAuthorFollowIdsToStorage,
  formatAuthorFollowerCount,
  ensureSignedInForAuthorFollow,
} from "@/lib/author-follows-client"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import {
  Users, BookOpen, Star, CheckCircle2, ArrowLeft, Twitter,
  Globe, MessageSquare, Award, TrendingUp, GraduationCap, PlayCircle, ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ReportButton } from "@/components/report-dialog"
import { CoverImage } from "@/components/ui/cover-image"
import type { CourseAccessType } from "@/lib/course-access"
import { formatCourseAccessLabel } from "@/lib/course-access"

// ── Extended author data ──────────────────────────────────────────────────────
const AUTHOR_PROFILES: Record<string, {
  id: string
  name: string
  avatar: string
  bio: string
  location: string
  website?: string
  twitter?: string
  books: number
  followers: number
  totalReads: number
  rating: number
  genres: string[]
  joinedYear: number
}> = {
  auth_001: {
    id: "auth_001",
    name: "Chimamanda A.",
    avatar: "https://placehold.co/120x120?text=CA+professional+author+headshot+warm+lighting+portrait",
    bio: "Award-winning author of literary fiction and essays exploring identity, feminism, and the African diaspora. Her debut novel sold over 800,000 copies worldwide. She holds a Masters in Creative Writing from Harvard and splits her time between Lagos and London.",
    location: "Lagos, Nigeria",
    website: "https://chimamanda.example.com",
    twitter: "@chimamanda_a",
    books: 12,
    followers: 45200,
    totalReads: 1_240_000,
    rating: 4.8,
    genres: ["Literary Fiction", "Essays", "Short Stories"],
    joinedYear: 2021,
  },
  auth_002: {
    id: "auth_002",
    name: "Tunde Balogun",
    avatar: "https://placehold.co/120x120?text=TB+professional+author+headshot+warm+lighting+portrait",
    bio: "Entrepreneur, speaker, and bestselling business author. Tunde has founded three companies and written extensively on African entrepreneurship, finance, and mindset. His books have been adopted in business schools across West Africa.",
    location: "Abuja, Nigeria",
    website: "https://tundebalogun.example.com",
    twitter: "@tundebalogun",
    books: 8,
    followers: 28300,
    totalReads: 870_000,
    rating: 4.7,
    genres: ["Business", "Entrepreneurship", "Finance"],
    joinedYear: 2022,
  },
  auth_003: {
    id: "auth_003",
    name: "Wanjiru Mwangi",
    avatar: "https://placehold.co/120x120?text=WM+professional+author+headshot+warm+lighting+portrait",
    bio: "Prolific Kenyan novelist and poet whose work draws from Kikuyu oral tradition. Winner of the Caine Prize for African Writing 2023. She teaches literature at the University of Nairobi and mentors emerging African writers through her nonprofit.",
    location: "Nairobi, Kenya",
    website: "https://wanjirumwangi.example.com",
    twitter: "@wanjiru_writes",
    books: 15,
    followers: 61000,
    totalReads: 2_100_000,
    rating: 4.9,
    genres: ["Poetry", "Historical Fiction", "Literary Fiction"],
    joinedYear: 2020,
  },
  auth_004: {
    id: "auth_004",
    name: "Seun Adesanya",
    avatar: "https://placehold.co/120x120?text=SA+professional+author+headshot+warm+lighting+portrait",
    bio: "Technology journalist and author covering Africa's booming tech ecosystem. Former editor at TechCabal, he now writes full-time about fintech, startups, and digital transformation across the continent.",
    location: "Lagos, Nigeria",
    twitter: "@seunadesanya",
    books: 6,
    followers: 18700,
    totalReads: 440_000,
    rating: 4.4,
    genres: ["Technology", "Journalism", "Business"],
    joinedYear: 2023,
  },
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-surface border border-border">
      <Icon size={16} className="text-brand" />
      <div className="font-serif text-xl font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground text-center leading-snug">{label}</div>
    </div>
  )
}

/** Laravel-backed author profile (numeric user id). */
function LiveAuthorProfile({ authorId }: { authorId: string }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [profile, setProfile] = React.useState<{
    id: string
    name: string
    avatar: string
    books: number
    followers: number
    courses?: {
      slug: string
      title: string
      lesson_count: number
      thumbnail_url: string | null
      access_type?: string
      price?: number | null
      currency?: string | null
    }[]
  } | null>(null)
  const [books, setBooks] = React.useState<BookCardData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)
  const [followed, setFollowed] = React.useState(false)
  const [busyFollow, setBusyFollow] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setNotFound(false)
    Promise.all([
      authorsApi.get(authorId).catch(() => null),
      booksApi.list({ author_id: authorId, per_page: "48" }).catch(() => null),
    ]).then(([p, b]) => {
      if (!alive) return
      if (!p?.data) {
        setProfile(null)
        setNotFound(true)
        setBooks([])
        setLoading(false)
        return
      }
      setProfile(p.data)
      if (b?.data && Array.isArray(b.data) && b.data.length > 0) {
        setBooks((b.data as ApiBookRecord[]).map(apiBookToCard))
      } else {
        setBooks([])
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [authorId])

  React.useEffect(() => {
    if (!profile) return
    if (!isAuthenticated) {
      setFollowed(false)
      return
    }
    if (laravelAuthEnabled()) {
      authorFollowsApi
        .listIds()
        .then(res => setFollowed((res.data ?? []).map(String).includes(profile.id)))
        .catch(() => setFollowed(loadAuthorFollowIdsFromStorage().has(profile.id)))
      return
    }
    setFollowed(loadAuthorFollowIdsFromStorage().has(profile.id))
  }, [profile, isAuthenticated])

  async function toggleFollow() {
    if (!profile) return
    if (!ensureSignedInForAuthorFollow(router, isAuthenticated, `/authors/${authorId}`)) return
    const willFollow = !followed
    if (laravelAuthEnabled() && isAuthenticated) {
      setBusyFollow(true)
      try {
        if (willFollow) await authorFollowsApi.follow(profile.id)
        else await authorFollowsApi.unfollow(profile.id)
        setFollowed(willFollow)
      } catch {
        /* unchanged */
      } finally {
        setBusyFollow(false)
      }
      return
    }
    setFollowed(willFollow)
    const next = loadAuthorFollowIdsFromStorage()
    if (willFollow) next.add(profile.id)
    else next.delete(profile.id)
    saveAuthorFollowIdsToStorage(next)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 flex justify-center">
        <div className="w-9 h-9 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <BookOpen size={48} className="text-muted-foreground/25 mx-auto mb-6" />
        <h1 className="font-serif text-2xl font-bold text-foreground mb-3">Author Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This author profile doesn&apos;t exist or has been removed.
        </p>
        <Link href="/authors">
          <Button variant="outline" className="gap-2">
            <ArrowLeft size={14} /> Back to Authors
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/authors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        All Authors
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-brand to-brand-dark shadow-xl">
              <img
                src={profile.avatar || "https://placehold.co/120x120?text=Author"}
                alt={`${profile.name} author profile`}
                className="w-full h-full rounded-full object-cover border-3 border-background"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand rounded-full flex items-center justify-center border-2 border-background shadow-md">
              <CheckCircle2 size={15} className="text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start flex-wrap gap-3 justify-between mb-3">
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground leading-tight">{profile.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">Author on MyScriptic</p>
              </div>
              <Button
                type="button"
                disabled={busyFollow}
                onClick={() => void toggleFollow()}
                className={cn(
                  "h-9 px-5 text-sm font-semibold gap-2 transition-all",
                  followed
                    ? "bg-brand/10 text-brand border border-brand/25 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/25"
                    : "bg-brand hover:bg-brand-dark text-primary-foreground shadow-sm"
                )}
              >
                <Users size={14} />
                {busyFollow ? "…" : followed ? "Following" : "Follow"}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/contact?author=${profile.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors"
              >
                <MessageSquare size={13} />
                Contact
              </Link>
              <ReportButton targetType="author" targetId={profile.id} targetTitle={profile.name} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <StatCard icon={BookOpen} label="Books Published" value={String(profile.books)} />
        <StatCard icon={Users} label="Followers" value={formatAuthorFollowerCount(profile.followers)} />
      </div>

      <div>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Works</p>
            <h2 className="font-serif text-2xl font-bold text-foreground">Books by {profile.name.split(" ")[0]}</h2>
          </div>
          <Link
            href={`/books?author_id=${profile.id}`}
            className="text-sm text-brand font-semibold hover:underline flex items-center gap-1"
          >
            All books by this author <BookOpen size={13} />
          </Link>
        </div>
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
            No published books yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
            {books.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>

      {profile.courses && profile.courses.length > 0 ? (
        <div className="mt-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                <GraduationCap size={12} className="text-brand" />
                Courses
              </p>
              <h2 className="font-serif text-2xl font-bold text-foreground">Video courses</h2>
            </div>
            <Link href="/courses" className="text-sm text-brand font-semibold hover:underline flex items-center gap-1">
              All courses <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {profile.courses.map(c => (
              <Link
                key={c.slug}
                href={`/courses/${c.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-brand/35 transition-all"
              >
                <div className="relative aspect-video bg-muted">
                  {c.thumbnail_url ? (
                    <CoverImage
                      src={c.thumbnail_url}
                      alt={c.title ?? "Course thumbnail"}
                      className="group-hover:scale-[1.02] transition-transform duration-500"
                      sizes="(max-width: 1024px) 90vw, 360px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/15 to-brand/5">
                      <PlayCircle className="h-12 w-12 text-brand/70" strokeWidth={1.2} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 rounded-md bg-black/55 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white border border-white/10">
                    {(() => {
                      const raw = c.access_type
                      const access: CourseAccessType =
                        raw === "FREE" || raw === "PAID" || raw === "SUBSCRIPTION" ? raw : "SUBSCRIPTION"
                      return formatCourseAccessLabel(access, c.price, c.currency ?? undefined)
                    })()}
                  </div>
                  <div className="absolute bottom-2 left-2 text-[11px] font-medium text-white flex items-center gap-1 drop-shadow-md">
                    <PlayCircle size={12} />
                    {c.lesson_count} lesson{c.lesson_count === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-serif font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-2">
                    {c.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Separator className="my-12" />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-brand/20 bg-brand/5 p-7">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award size={16} className="text-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">Become an Author</span>
          </div>
          <h3 className="font-serif text-lg font-bold text-foreground">Share your story</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Publish on MyScriptic and reach readers everywhere.
          </p>
        </div>
        <Link href="/become-author">
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold px-7 h-10 shrink-0">
            Start Writing
          </Button>
        </Link>
      </div>
    </div>
  )
}

function AuthorProfileContent() {
  const params = useParams()
  const authorId = params.id as string
  if (/^\d+$/.test(authorId) && laravelAuthEnabled()) {
    return <LiveAuthorProfile authorId={authorId} />
  }
  return <MockAuthorProfile authorId={authorId} />
}

function MockAuthorProfile({ authorId }: { authorId: string }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const author = AUTHOR_PROFILES[authorId]
  const [followed, setFollowed] = React.useState(false)

  React.useEffect(() => {
    const a = AUTHOR_PROFILES[authorId]
    if (!a) return
    if (!isAuthenticated) {
      setFollowed(false)
      return
    }
    setFollowed(loadAuthorFollowIdsFromStorage().has(a.id))
  }, [authorId, isAuthenticated])

  const authorBooks = React.useMemo(() => {
    const seed = authorId?.charCodeAt(authorId.length - 1) ?? 0
    return MOCK_BOOKS.slice(seed % 3, (seed % 3) + 4)
  }, [authorId])

  if (!author) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <BookOpen size={48} className="text-muted-foreground/25 mx-auto mb-6" />
        <h1 className="font-serif text-2xl font-bold text-foreground mb-3">Author Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This author profile doesn&apos;t exist or has been removed.
        </p>
        <Link href="/authors">
          <Button variant="outline" className="gap-2">
            <ArrowLeft size={14} /> Back to Authors
          </Button>
        </Link>
      </div>
    )
  }

  function toggleFollow() {
    if (!ensureSignedInForAuthorFollow(router, isAuthenticated, `/authors/${authorId}`)) return
    const willFollow = !followed
    setFollowed(willFollow)
    const next = loadAuthorFollowIdsFromStorage()
    if (willFollow) next.add(author.id)
    else next.delete(author.id)
    saveAuthorFollowIdsToStorage(next)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Breadcrumb */}
      <Link
        href="/authors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        All Authors
      </Link>

      {/* Profile header */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-brand to-brand-dark shadow-xl">
              <img
                src={author.avatar}
                alt={`${author.name} author profile`}
                className="w-full h-full rounded-full object-cover border-3 border-background"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand rounded-full flex items-center justify-center border-2 border-background shadow-md">
              <CheckCircle2 size={15} className="text-primary-foreground" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start flex-wrap gap-3 justify-between mb-3">
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground leading-tight">{author.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-muted-foreground">{author.location}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-sm text-muted-foreground">Member since {author.joinedYear}</span>
                </div>
              </div>
              <Button
                type="button"
                aria-pressed={followed}
                onClick={toggleFollow}
                className={cn(
                  "h-9 px-5 text-sm font-semibold gap-2 transition-all",
                  followed
                    ? "bg-brand/10 text-brand border border-brand/25 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/25"
                    : "bg-brand hover:bg-brand-dark text-primary-foreground shadow-sm"
                )}
              >
                <Users size={14} />
                {followed ? "Following" : "Follow"}
              </Button>
            </div>

            {/* Genre tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {author.genres.map(g => (
                <Badge key={g} variant="outline" className="text-[11px] px-2.5 py-0.5">
                  {g}
                </Badge>
              ))}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-5">{author.bio}</p>

            {/* Social links */}
            <div className="flex items-center gap-3">
              {author.twitter && (
                <a
                  href={`https://twitter.com/${author.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors"
                >
                  <Twitter size={13} />
                  {author.twitter}
                </a>
              )}
              {author.website && (
                <a
                  href={author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors"
                >
                  <Globe size={13} />
                  Website
                </a>
              )}
              <Link
                href={`/contact?author=${author.id}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors"
              >
                <MessageSquare size={13} />
                Contact
              </Link>
              <ReportButton targetType="author" targetId={author.id} targetTitle={author.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <StatCard
          icon={BookOpen}
          label="Books Published"
          value={author.books.toString()}
        />
        <StatCard
          icon={Users}
          label="Followers"
          value={author.followers >= 1000
            ? `${(author.followers / 1000).toFixed(1)}k`
            : author.followers.toString()}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Reads"
          value={author.totalReads >= 1_000_000
            ? `${(author.totalReads / 1_000_000).toFixed(1)}M`
            : `${(author.totalReads / 1000).toFixed(0)}k`}
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={author.rating.toFixed(1)}
        />
      </div>

      {/* Books section */}
      <div>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Works</p>
            <h2 className="font-serif text-2xl font-bold text-foreground">Books by {author.name.split(" ")[0]}</h2>
          </div>
          <Link href={`/books?author_id=${author.id}`} className="text-sm text-brand font-semibold hover:underline flex items-center gap-1">
            See all books <BookOpen size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
          {authorBooks.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </div>

      {/* Separator + CTA */}
      <Separator className="my-12" />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-brand/20 bg-brand/5 p-7">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award size={16} className="text-brand" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand">Become an Author</span>
          </div>
          <h3 className="font-serif text-lg font-bold text-foreground">Inspired by {author.name.split(" ")[0]}&apos;s work?</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Share your own story with millions of readers on MyScriptic.
          </p>
        </div>
        <Link href="/become-author">
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold px-7 h-10 shrink-0">
            Start Writing
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function AuthorProfilePage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AuthorProfileContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
