"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TRENDING_AUTHORS } from "@/lib/mock-data"
import { apiUrlConfigured, laravelAuthEnabled } from "@/lib/auth-mode"
import { authorsApi, authorFollowsApi } from "@/lib/api"
import {
  loadAuthorFollowIdsFromStorage,
  saveAuthorFollowIdsToStorage,
  formatAuthorFollowerCount,
  ensureSignedInForAuthorFollow,
} from "@/lib/author-follows-client"
import { useAuth } from "@/components/providers/auth-provider"
import { Search, BookOpen, Users, CheckCircle2, Star, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Expanded mock author data ─────────────────────────────────────────────────
const ALL_AUTHORS = [
  ...TRENDING_AUTHORS,
  { id: "auth_005", name: "Ngozi Adeyemi",   books: 9,  followers: 33400, avatar: "https://placehold.co/80x80?text=NA+author+portrait+professional+headshot+warm+lighting" },
  { id: "auth_006", name: "Kofi Mensah",     books: 11, followers: 52100, avatar: "https://placehold.co/80x80?text=KM+author+portrait+professional+headshot+warm+lighting" },
  { id: "auth_007", name: "Amina Diallo",    books: 7,  followers: 21300, avatar: "https://placehold.co/80x80?text=AD+author+portrait+professional+headshot+warm+lighting" },
  { id: "auth_008", name: "Seun Williams",   books: 14, followers: 47800, avatar: "https://placehold.co/80x80?text=SW+author+portrait+professional+headshot+warm+lighting" },
  { id: "auth_009", name: "Dr. Amaka Eze",   books: 5,  followers: 18200, avatar: "https://placehold.co/80x80?text=AE+author+portrait+professional+headshot+warm+lighting" },
  { id: "auth_010", name: "Gen. Emeka Nwosu",books: 3,  followers: 29600, avatar: "https://placehold.co/80x80?text=EN+author+portrait+professional+headshot+warm+lighting" },
  { id: "auth_011", name: "Efua Asante",     books: 6,  followers: 15700, avatar: "https://placehold.co/80x80?text=EA+author+portrait+professional+headshot+warm+lighting" },
  { id: "auth_012", name: "Bisi Ogunwale",   books: 10, followers: 38900, avatar: "https://placehold.co/80x80?text=BO+author+portrait+professional+headshot+warm+lighting" },
]

const GENRES = ["All Genres", "Fiction", "Self-Help", "Business", "Romance", "Technology", "History", "Poetry", "Children"]

const SORT_OPTIONS = [
  { value: "followers", label: "Most Followed" },
  { value: "books",     label: "Most Books"    },
  { value: "name",      label: "A – Z"         },
]

type AuthorRow = {
  id: string
  name: string
  books: number
  followers: number
  avatar: string
}

function AuthorsContent() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const apiLive = apiUrlConfigured()
  const laravelAuth = laravelAuthEnabled()
  const [search,   setSearch]   = React.useState("")
  const [genre,    setGenre]    = React.useState("All Genres")
  const [sort,     setSort]     = React.useState("followers")
  const [authors,  setAuthors]  = React.useState<AuthorRow[]>(ALL_AUTHORS)
  const [followed, setFollowed] = React.useState<Set<string>>(() => new Set())
  const [busyId,   setBusyId]   = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!apiLive) return
    authorsApi
      .trending({ limit: 48 })
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) setAuthors(res.data)
      })
      .catch(() => {})
  }, [apiLive])

  React.useEffect(() => {
    if (!isAuthenticated) {
      setFollowed(new Set())
      return
    }
    if (laravelAuth) {
      authorFollowsApi
        .listIds()
        .then(res => setFollowed(new Set((res.data ?? []).map(String))))
        .catch(() => setFollowed(loadAuthorFollowIdsFromStorage()))
      return
    }
    setFollowed(loadAuthorFollowIdsFromStorage())
  }, [laravelAuth, isAuthenticated])

  async function toggleFollow(id: string) {
    if (!ensureSignedInForAuthorFollow(router, isAuthenticated, "/authors")) return
    const willFollow = !followed.has(id)
    if (laravelAuth && isAuthenticated) {
      setBusyId(id)
      try {
        if (willFollow) await authorFollowsApi.follow(id)
        else await authorFollowsApi.unfollow(id)
        setFollowed(prev => {
          const next = new Set(prev)
          if (willFollow) next.add(id)
          else next.delete(id)
          return next
        })
      } catch {
        /* unchanged */
      } finally {
        setBusyId(null)
      }
      return
    }
    setFollowed(prev => {
      const next = new Set(prev)
      if (willFollow) next.add(id)
      else next.delete(id)
      saveAuthorFollowIdsToStorage(next)
      return next
    })
  }

  const filtered = authors
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "followers") return b.followers - a.followers
      if (sort === "books")     return b.books - a.books
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* Page header */}
      <div className="mb-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Community</p>
        <h1 className="font-serif text-4xl font-bold text-foreground text-balance leading-tight mb-3">
          Discover Authors
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-xl">
          Follow the voices that inspire you. Browse Africa&apos;s most talented and prolific storytellers.
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search authors..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                sort === opt.value
                  ? "bg-brand text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genre pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-thin">
        {GENRES.map(g => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={cn(
              "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all",
              genre === g
                ? "bg-brand text-primary-foreground border-brand"
                : "border-border text-muted-foreground hover:border-brand/40 hover:text-brand"
            )}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-5">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> authors
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
        {filtered.map((author, idx) => {
          const isFollowed = followed.has(author.id)
          return (
            <div
              key={author.id}
              className="group flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:border-brand/30 hover:shadow-lg transition-all duration-300 card-lift text-center relative overflow-hidden"
            >
              {/* Rank badge */}
              <div className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
              </div>

              {/* Avatar */}
              <div className="relative mt-1">
                <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-br from-brand to-brand-dark shadow-md">
                  <img
                    src={author.avatar}
                    alt={`${author.name} author profile photo`}
                    className="w-[74px] h-[74px] rounded-full object-cover border-2 border-background"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                  <CheckCircle2 size={12} className="text-primary-foreground" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 w-full">
                <Link href={`/authors/${author.id}`}>
                  <p className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors leading-snug truncate">
                    {author.name}
                  </p>
                </Link>
                <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen size={10} />
                    {author.books} books
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="flex items-center gap-1">
                    <Users size={10} />
                    {formatAuthorFollowerCount(author.followers)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full flex flex-col gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === author.id}
                  aria-busy={busyId === author.id ? "true" : "false"}
                  aria-pressed={isFollowed ? "true" : "false"}
                  onClick={() => void toggleFollow(author.id)}
                  className={cn(
                    "h-8 text-xs w-full font-semibold transition-all",
                    isFollowed
                      ? "bg-brand/10 text-brand border border-brand/25 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/25"
                      : "bg-foreground text-background hover:bg-brand hover:text-primary-foreground border-0"
                  )}
                >
                  {busyId === author.id ? "…" : isFollowed ? "Following" : "Follow"}
                </Button>
                <Link href={`/authors/${author.id}`} className="block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] w-full text-muted-foreground hover:text-brand gap-1"
                  >
                    View Profile <ArrowRight size={10} />
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Become an author CTA */}
      <div className="mt-16 rounded-2xl border border-brand/20 bg-brand/5 p-8 text-center">
        <Star size={28} className="text-brand mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
          Share your story with the world
        </h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Join thousands of authors who earn from their writing on MyScriptic. Publish your book and reach millions of readers.
        </p>
        <Link href="/become-author">
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold px-8 h-11 gap-2 shadow-sm">
            Become an Author <ArrowRight size={15} />
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function AuthorsPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <AuthorsContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
