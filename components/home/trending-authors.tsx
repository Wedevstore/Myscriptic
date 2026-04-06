"use client"

import * as React from "react"
import Link from "next/link"
import { TRENDING_AUTHORS } from "@/lib/mock-data"
import { laravelAuthEnabled } from "@/lib/auth-mode"
import { authorsApi, authorFollowsApi } from "@/lib/api"
import {
  loadAuthorFollowIdsFromStorage,
  saveAuthorFollowIdsToStorage,
  formatAuthorFollowerCount,
} from "@/lib/author-follows-client"
import { useAuth } from "@/components/providers/auth-provider"
import { Users, BookOpen, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AuthorRow = {
  id: string
  name: string
  books: number
  followers: number
  avatar: string
}

export function TrendingAuthors() {
  const { isAuthenticated } = useAuth()
  const laravel = laravelAuthEnabled()
  const [authors, setAuthors] = React.useState<AuthorRow[]>(TRENDING_AUTHORS)
  const [followed, setFollowed] = React.useState<Set<string>>(() => new Set())
  const [busyId, setBusyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!laravel) return
    authorsApi
      .trending()
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) setAuthors(res.data)
      })
      .catch(() => {})
  }, [laravel])

  React.useEffect(() => {
    if (laravel && isAuthenticated) {
      authorFollowsApi
        .listIds()
        .then(res => setFollowed(new Set((res.data ?? []).map(String))))
        .catch(() => setFollowed(loadAuthorFollowIdsFromStorage()))
      return
    }
    setFollowed(loadAuthorFollowIdsFromStorage())
  }, [laravel, isAuthenticated])

  async function toggleFollow(authorId: string) {
    const willFollow = !followed.has(authorId)

    if (laravel && isAuthenticated) {
      setBusyId(authorId)
      try {
        if (willFollow) await authorFollowsApi.follow(authorId)
        else await authorFollowsApi.unfollow(authorId)
        setFollowed(prev => {
          const next = new Set(prev)
          if (willFollow) next.add(authorId)
          else next.delete(authorId)
          return next
        })
      } catch {
        /* keep UI state */
      } finally {
        setBusyId(null)
      }
      return
    }

    setFollowed(prev => {
      const next = new Set(prev)
      if (willFollow) next.add(authorId)
      else next.delete(authorId)
      saveAuthorFollowIdsToStorage(next)
      return next
    })
  }

  return (
    <section className="py-14 section-divider" aria-label="Trending authors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Authors</p>
            <h2 className="font-serif text-2xl font-bold text-foreground leading-tight">Top Authors</h2>
          </div>
          <Link href="/authors" className="group flex items-center gap-1 text-sm text-brand font-semibold hover:gap-2 transition-all">
            Explore all <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {authors.map((author, idx) => {
            const isFollowed = followed.has(author.id)
            const busy = busyId === author.id
            return (
              <div
                key={author.id}
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:border-brand/30 hover:shadow-lg transition-all duration-300 card-lift text-center relative overflow-hidden"
              >
                {/* Rank badge */}
                <div className="absolute top-3 left-3 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                </div>

                {/* Avatar */}
                <div className="relative mt-1">
                  <div className="w-18 h-18 rounded-full p-0.5 bg-gradient-to-br from-brand to-brand-dark shadow-md">
                    <img
                      src={author.avatar}
                      alt={`${author.name} author photo`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-background"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                    <CheckCircle2 size={12} className="text-primary-foreground" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <Link href={`/authors/${author.id}`}>
                    <p className="font-semibold text-sm text-foreground group-hover:text-brand transition-colors leading-snug">
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

                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  aria-busy={busy ? "true" : "false"}
                  aria-pressed={isFollowed ? "true" : "false"}
                  onClick={() => void toggleFollow(author.id)}
                  className={cn(
                    "h-8 text-xs px-4 w-full font-semibold transition-all",
                    isFollowed
                      ? "bg-brand/10 text-brand border border-brand/25 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/25"
                      : "bg-foreground text-background hover:bg-brand hover:text-primary-foreground border-0"
                  )}
                >
                  {busy ? "…" : isFollowed ? "Following" : "Follow"}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
