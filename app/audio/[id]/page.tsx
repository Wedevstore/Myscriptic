"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { booksApi } from "@/lib/api"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { MOCK_BOOKS } from "@/lib/mock-data"
import {
  ChevronLeft, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Repeat, Shuffle, BookOpen, Clock,
  List, ChevronDown, ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProtectedSurface } from "@/components/protected-surface"

// Mock chapters
const CHAPTERS = [
  { id: 1, title: "Chapter 1: The City That Never Sleeps", duration: "28:14", startSec: 0 },
  { id: 2, title: "Chapter 2: Roots and Routes",           duration: "31:42", startSec: 1694 },
  { id: 3, title: "Chapter 3: The Manuscript",             duration: "25:08", startSec: 3596 },
  { id: 4, title: "Chapter 4: Lagos by Night",             duration: "34:55", startSec: 5104 },
  { id: 5, title: "Chapter 5: The Voice in the Pages",     duration: "29:37", startSec: 7199 },
]

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

type PlayerBookMeta = { id: string; title: string; author: string; coverUrl: string }

function AudioPlayerContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const useApi = apiUrlConfigured()
  const routeId = typeof params?.id === "string" ? params.id : ""

  const [remoteMeta, setRemoteMeta] = React.useState<PlayerBookMeta | null>(null)
  const [metaLoading, setMetaLoading] = React.useState(false)

  const fallbackMeta = React.useMemo<PlayerBookMeta>(() => {
    const m =
      MOCK_BOOKS.find(b => b.id === routeId) ??
      MOCK_BOOKS.find(b => b.format === "audiobook") ??
      MOCK_BOOKS[0]
    return {
      id: m.id,
      title: m.title,
      author: m.author,
      coverUrl: m.coverUrl,
    }
  }, [routeId])

  React.useEffect(() => {
    if (!useApi || !routeId) return
    if (isLoading || !isAuthenticated) return
    let cancelled = false
    setRemoteMeta(null)
    setMetaLoading(true)
    booksApi
      .get(routeId)
      .then(res => {
        if (cancelled) return
        const card = apiBookToCard(res.data as ApiBookRecord)
        setRemoteMeta({
          id: card.id,
          title: card.title,
          author: card.author,
          coverUrl: card.coverUrl,
        })
      })
      .catch(() => {
        if (!cancelled) setRemoteMeta(null)
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [useApi, routeId, isLoading, isAuthenticated])

  const book = remoteMeta ?? fallbackMeta
  const TOTAL_DURATION = CHAPTERS.reduce((s, c) => s + parseInt(c.duration.split(":")[0]) * 60 + parseInt(c.duration.split(":")[1]), 0)

  const [isPlaying,  setIsPlaying]  = React.useState(false)
  const [progress,   setProgress]   = React.useState(0)   // 0–100
  const [volume,     setVolume]     = React.useState(80)
  const [muted,      setMuted]      = React.useState(false)
  const [speed,      setSpeed]      = React.useState(1)
  const [speedIdx,   setSpeedIdx]   = React.useState(1)
  const [shuffled,   setShuffled]   = React.useState(false)
  const [looping,    setLooping]    = React.useState(false)
  const [activeChap, setActiveChap] = React.useState(0)
  const [showChaps,  setShowChaps]  = React.useState(false)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const next = routeId ? `/audio/${routeId}` : "/audiobooks"
      router.replace(`/auth/login?next=${encodeURIComponent(next)}`)
    }
  }, [isLoading, isAuthenticated, router, routeId])

  // Simulate playback progress
  React.useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          const next = p + (100 / TOTAL_DURATION) * speed
          if (next >= 100) {
            setIsPlaying(false)
            return looping ? 0 : 100
          }
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, looping, TOTAL_DURATION])

  // Update active chapter based on progress
  React.useEffect(() => {
    const currentSec = (progress / 100) * TOTAL_DURATION
    let idx = 0
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (currentSec >= CHAPTERS[i].startSec) { idx = i; break }
    }
    setActiveChap(idx)
  }, [progress, TOTAL_DURATION])

  const currentSec = Math.round((progress / 100) * TOTAL_DURATION)

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    setSpeed(SPEEDS[next])
  }

  const skipBack    = () => setProgress(p => Math.max(0, p - (15 / TOTAL_DURATION) * 100))
  const skipForward = () => setProgress(p => Math.min(100, p + (30 / TOTAL_DURATION) * 100))
  const prevChap = () => {
    const idx = Math.max(0, activeChap - 1)
    setProgress((CHAPTERS[idx].startSec / TOTAL_DURATION) * 100)
  }
  const nextChap = () => {
    const idx = Math.min(CHAPTERS.length - 1, activeChap + 1)
    setProgress((CHAPTERS[idx].startSec / TOTAL_DURATION) * 100)
  }
  const jumpToChap = (idx: number) => {
    setProgress((CHAPTERS[idx].startSec / TOTAL_DURATION) * 100)
    setIsPlaying(true)
    setShowChaps(false)
  }

  if (!isAuthenticated && !isLoading) return null

  if (isLoading || (useApi && isAuthenticated && metaLoading)) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sidebar flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <Link href={`/books/${book.id}`}>
          <Button variant="ghost" size="sm" className="text-sidebar-foreground/70 hover:text-sidebar-foreground gap-1.5">
            <ChevronLeft size={15} />
            Back
          </Button>
        </Link>
        <p className="text-sm font-medium text-sidebar-foreground/60 uppercase tracking-wider">Audiobook</p>
        <div className="w-16" />
      </header>

      <ProtectedSurface
        userEmail={user?.email ?? null}
        watermarkVariant="dark"
        outerClassName="flex flex-col flex-1 min-h-0"
        innerClassName="flex flex-col flex-1 min-h-0"
      >
      {/* Main Player */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full gap-8">
        {/* Cover art */}
        <div className="relative">
          <div className={cn(
            "w-56 h-56 md:w-72 md:h-72 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500",
            isPlaying ? "shadow-brand/30 scale-105" : "scale-100"
          )}>
            <img
              src={book.coverUrl}
              alt={`Audiobook cover of ${book.title}`}
              className="w-full h-full object-cover"
            />
          </div>
          {isPlaying && (
            <div className="absolute -inset-3 rounded-[2rem] border-2 border-brand/20 animate-pulse" />
          )}
        </div>

        {/* Book info */}
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-sidebar-foreground mb-1">{book.title}</h1>
          <p className="text-sidebar-foreground/60">{book.author}</p>
          <button
            onClick={() => setShowChaps(s => !s)}
            className="mt-2 flex items-center gap-1.5 mx-auto text-sm text-brand hover:text-brand-light transition-colors"
          >
            {CHAPTERS[activeChap].title}
            {showChaps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Progress */}
        <div className="w-full space-y-2">
          <Slider
            min={0} max={100} step={0.1}
            value={[progress]}
            onValueChange={([v]) => { setProgress(v) }}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-sidebar-foreground/50">
            <span>{formatTime(currentSec)}</span>
            <span>-{formatTime(TOTAL_DURATION - currentSec)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShuffled(s => !s)}
            className={cn("p-2 rounded-full transition-colors", shuffled ? "text-brand" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70")}
            aria-label="Shuffle"
          >
            <Shuffle size={18} />
          </button>

          <button onClick={prevChap} className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors" aria-label="Previous chapter">
            <SkipBack size={22} />
          </button>

          <button onClick={skipBack} className="text-xs font-bold text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-8">
            -15
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(p => !p)}
            className="w-16 h-16 rounded-full bg-brand hover:bg-brand-dark text-primary-foreground flex items-center justify-center shadow-lg shadow-brand/30 transition-all hover:scale-105 active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="translate-x-0.5" />}
          </button>

          <button onClick={skipForward} className="text-xs font-bold text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-8">
            +30
          </button>

          <button onClick={nextChap} className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors" aria-label="Next chapter">
            <SkipForward size={22} />
          </button>

          <button
            onClick={() => setLooping(l => !l)}
            className={cn("p-2 rounded-full transition-colors", looping ? "text-brand" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70")}
            aria-label="Repeat"
          >
            <Repeat size={18} />
          </button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-between w-full">
          {/* Volume */}
          <div className="flex items-center gap-2 flex-1 max-w-[140px]">
            <button onClick={() => setMuted(m => !m)} className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors shrink-0">
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <Slider
              min={0} max={100} step={1}
              value={[muted ? 0 : volume]}
              onValueChange={([v]) => { setVolume(v); setMuted(false) }}
              className="flex-1"
            />
          </div>

          {/* Speed */}
          <button
            onClick={cycleSpeed}
            className="px-3 py-1.5 rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm font-bold hover:bg-brand/20 hover:text-brand transition-colors"
          >
            {speed}×
          </button>

          {/* Chapters button */}
          <button
            onClick={() => setShowChaps(s => !s)}
            className="flex items-center gap-1.5 text-sm text-sidebar-foreground/60 hover:text-brand transition-colors"
          >
            <List size={16} />
            <span className="hidden sm:inline">Chapters</span>
          </button>
        </div>
      </main>

      {/* Chapter list panel */}
      {showChaps && (
        <div className="border-t border-sidebar-border bg-sidebar/95 backdrop-blur-md max-h-72 overflow-y-auto">
          <div className="max-w-lg mx-auto p-4 space-y-1">
            <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen size={12} /> Chapters
            </h3>
            {CHAPTERS.map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => jumpToChap(i)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  i === activeChap
                    ? "bg-brand/15 text-brand"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {i === activeChap && isPlaying ? (
                    <div className="flex gap-0.5 items-end h-3">
                      {[1, 2, 3].map(b => (
                        <div key={b} className="w-0.5 bg-brand animate-pulse rounded-sm" style={{ height: `${(b / 3) * 100}%`, animationDelay: `${b * 0.15}s` }} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs w-4 text-center opacity-50">{i + 1}</span>
                  )}
                  <span className="text-left truncate max-w-[220px]">{ch.title}</span>
                </div>
                <div className="flex items-center gap-1 text-xs opacity-50 shrink-0">
                  <Clock size={10} />
                  {ch.duration}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      </ProtectedSurface>
    </div>
  )
}

export default function AudioPage() {
  return (
    <Providers>
      <AudioPlayerContent />
    </Providers>
  )
}
