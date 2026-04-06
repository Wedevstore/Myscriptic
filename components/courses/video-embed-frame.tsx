"use client"

import * as React from "react"
import { parseVideoUrl } from "@/lib/video-embed"
import { loadYouTubeIframeAPI } from "@/lib/youtube-iframe-api"
import {
  readCourseVideoMuted,
  readCourseVideoSpeedIndex,
  readCourseVideoVolume,
  writeCourseVideoMuted,
  writeCourseVideoSpeedIndex,
  writeCourseVideoVolume,
} from "@/lib/course-video-prefs"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  List,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

const SKIP_BACK_SEC = 15
const SKIP_FORWARD_SEC = 30

/** YouTube player state: 1 = playing, 2 = paused, 0 = ended */
const YT_PLAYING = 1
const YT_PAUSED = 2
const YT_ENDED = 0

type YoutubePlayerInstance = {
  destroy: () => void
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  setPlaybackRate: (rate: number) => void
  setVolume: (v: number) => void
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
}

function youtubeEmbedSrc(videoId: string, origin: string): string {
  const o = encodeURIComponent(origin)
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&controls=0&disablekb=1&modestbranding=1&playsinline=1&fs=0&enablejsapi=1&origin=${o}`
}

function vimeoEmbedSrc(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}?controls=0&api=1&playsinline=1&dnt=1`
}

export type VideoEmbedFrameProps = {
  url: string
  title?: string
  /** When set, outer SkipBack skips lesson (like audiobook “previous chapter”). Otherwise it rewinds 15s. */
  onPreviousLesson?: () => void
  hasPreviousLesson?: boolean
  onNextLesson?: () => void
  hasNextLesson?: boolean
  /** Scroll/focus the course lesson list (audiobook “Chapters”). */
  onOpenLessons?: () => void
  showLessonsButton?: boolean
}

export function VideoEmbedFrame({
  url,
  title,
  onPreviousLesson,
  hasPreviousLesson = false,
  onNextLesson,
  hasNextLesson = false,
  onOpenLessons,
  showLessonsButton = false,
}: VideoEmbedFrameProps) {
  const parsed = React.useMemo(() => parseVideoUrl(url), [url])
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const youtubeRef = React.useRef<YoutubePlayerInstance | null>(null)
  const vimeoRef = React.useRef<import("@vimeo/player").default | null>(null)
  const initGenRef = React.useRef(0)
  const loopingRef = React.useRef(false)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const currentTimeRef = React.useRef(0)

  const [apiReady, setApiReady] = React.useState(false)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [speedIdx, setSpeedIdx] = React.useState(2)
  const speed = SPEEDS[speedIdx] ?? 1
  const [volume, setVolume] = React.useState(80)
  const [muted, setMuted] = React.useState(false)
  const [looping, setLooping] = React.useState(false)

  React.useLayoutEffect(() => {
    setVolume(readCourseVideoVolume())
    setMuted(readCourseVideoMuted())
    setSpeedIdx(readCourseVideoSpeedIndex(SPEEDS.length, 2))
  }, [])

  React.useEffect(() => {
    writeCourseVideoVolume(volume)
  }, [volume])

  React.useEffect(() => {
    writeCourseVideoMuted(muted)
  }, [muted])

  React.useEffect(() => {
    writeCourseVideoSpeedIndex(speedIdx)
  }, [speedIdx])

  React.useEffect(() => {
    loopingRef.current = looping
  }, [looping])

  React.useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  const [origin, setOrigin] = React.useState("")
  React.useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin)
  }, [])

  const iframeSrc = React.useMemo(() => {
    if (!parsed || !origin) return ""
    return parsed.provider === "youtube"
      ? youtubeEmbedSrc(parsed.videoId, origin)
      : vimeoEmbedSrc(parsed.videoId)
  }, [parsed, origin])

  const lessonNav = typeof onPreviousLesson === "function" && typeof onNextLesson === "function"

  React.useEffect(() => {
    if (!parsed || !iframeSrc || !iframeRef.current) return

    const myGen = ++initGenRef.current
    let cancelled = false
    const el = iframeRef.current
    setApiReady(false)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)

    const cleanup = () => {
      try {
        youtubeRef.current?.destroy()
      } catch {
        /* ignore */
      }
      youtubeRef.current = null
      void vimeoRef.current?.destroy().catch(() => {})
      vimeoRef.current = null
    }

    cleanup()

    const run = async () => {
      if (parsed.provider === "youtube") {
        await loadYouTubeIframeAPI()
        if (cancelled || myGen !== initGenRef.current || !iframeRef.current) return

        const YT = (window as unknown as { YT: { Player: new (h: HTMLElement, c: unknown) => YoutubePlayerInstance } })
          .YT
        if (!YT?.Player) return

        const player = new YT.Player(el, {
          events: {
            onReady: () => {
              if (cancelled || myGen !== initGenRef.current) return
              youtubeRef.current = player
              const d = player.getDuration()
              if (Number.isFinite(d) && d > 0) setDuration(d)
              setApiReady(true)
              try {
                player.setPlaybackRate(SPEEDS[speedIdx] ?? 1)
              } catch {
                /* rate may be unavailable until playback */
              }
            },
            onStateChange: (e: { data: number }) => {
              if (cancelled || myGen !== initGenRef.current) return
              setIsPlaying(e.data === YT_PLAYING)
              if (e.data === YT_ENDED) {
                if (loopingRef.current && youtubeRef.current) {
                  const p = youtubeRef.current
                  try {
                    p.seekTo(0, true)
                    p.playVideo()
                  } catch {
                    setIsPlaying(false)
                  }
                } else {
                  setIsPlaying(false)
                }
              }
            },
          },
        })
        youtubeRef.current = player
      } else {
        const { default: Player } = await import("@vimeo/player")
        if (cancelled || myGen !== initGenRef.current || !iframeRef.current) return
        const player = new Player(el)
        vimeoRef.current = player

        player.on("play", () => {
          if (!cancelled && myGen === initGenRef.current) setIsPlaying(true)
        })
        player.on("pause", () => {
          if (!cancelled && myGen === initGenRef.current) setIsPlaying(false)
        })
        player.on("ended", () => {
          if (cancelled || myGen !== initGenRef.current) return
          if (loopingRef.current) {
            void player.setCurrentTime(0).then(() => {
              if (!cancelled && myGen === initGenRef.current) void player.play()
            })
          } else {
            setIsPlaying(false)
          }
        })
        player.on("timeupdate", d => {
          if (cancelled || myGen !== initGenRef.current) return
          setCurrentTime(d.seconds)
          if (d.duration && d.duration > 0) setDuration(d.duration)
        })

        try {
          await player.ready()
          if (cancelled || myGen !== initGenRef.current) return
          const d = await player.getDuration()
          if (Number.isFinite(d) && d > 0) setDuration(d)
          setApiReady(true)
          try {
            await player.setPlaybackRate(SPEEDS[speedIdx] ?? 1)
          } catch {
            /* ignore */
          }
        } catch {
          if (!cancelled && myGen === initGenRef.current) setApiReady(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init when URL / provider / embed src changes
  }, [parsed?.provider, parsed?.videoId, iframeSrc])

  React.useEffect(() => {
    if (!apiReady) return
    const yt = youtubeRef.current
    const vm = vimeoRef.current
    if (yt) {
      try {
        yt.setPlaybackRate(speed)
      } catch {
        /* ignore */
      }
      return
    }
    if (vm) {
      void vm.setPlaybackRate(speed).catch(() => {})
    }
  }, [speed, apiReady])

  React.useEffect(() => {
    if (!apiReady) return
    const yt = youtubeRef.current
    const vm = vimeoRef.current
    if (yt) {
      try {
        if (muted) {
          yt.mute()
        } else {
          yt.unMute()
          yt.setVolume(volume)
        }
      } catch {
        /* ignore */
      }
      return
    }
    if (vm) {
      void vm.setMuted(muted).catch(() => {})
      void vm.setVolume(muted ? 0 : volume / 100).catch(() => {})
    }
  }, [volume, muted, apiReady])

  React.useEffect(() => {
    if (!apiReady || parsed?.provider !== "youtube" || !youtubeRef.current) return
    const id = window.setInterval(() => {
      const p = youtubeRef.current
      if (!p) return
      try {
        const t = p.getCurrentTime()
        const d = p.getDuration()
        if (Number.isFinite(t)) setCurrentTime(t)
        if (Number.isFinite(d) && d > 0) setDuration(d)
        const st = p.getPlayerState()
        setIsPlaying(st === YT_PLAYING)
      } catch {
        /* iframe may be tearing down */
      }
    }, 300)
    return () => window.clearInterval(id)
  }, [apiReady, parsed?.provider])

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  const seekToSeconds = React.useCallback((sec: number) => {
    const clamped = Math.max(0, Math.min(duration || Infinity, sec))
    const yt = youtubeRef.current
    const vm = vimeoRef.current
    if (yt) {
      yt.seekTo(clamped, true)
      setCurrentTime(clamped)
      return
    }
    if (vm) {
      void vm.setCurrentTime(clamped).then(() => setCurrentTime(clamped))
    }
  }, [duration])

  const togglePlay = React.useCallback(() => {
    const yt = youtubeRef.current
    const vm = vimeoRef.current
    if (yt) {
      const st = yt.getPlayerState()
      if (st === YT_PLAYING) yt.pauseVideo()
      else yt.playVideo()
      return
    }
    if (vm) {
      void vm.getPaused().then(paused => {
        if (paused) void vm.play()
        else void vm.pause()
      })
    }
  }, [])

  const skipBack = React.useCallback(() => {
    seekToSeconds(currentTime - SKIP_BACK_SEC)
  }, [currentTime, seekToSeconds])

  const skipForward = React.useCallback(() => {
    seekToSeconds(currentTime + SKIP_FORWARD_SEC)
  }, [currentTime, seekToSeconds])

  const cycleSpeed = React.useCallback(() => {
    setSpeedIdx(i => (i + 1) % SPEEDS.length)
  }, [])

  const onSliderChange = React.useCallback(
    (vals: number[]) => {
      const v = vals[0]
      if (v === undefined || !duration) return
      seekToSeconds((v / 100) * duration)
    },
    [duration, seekToSeconds]
  )

  const onOuterSkipBack = React.useCallback(() => {
    if (lessonNav && hasPreviousLesson) onPreviousLesson!()
    else skipBack()
  }, [lessonNav, hasPreviousLesson, onPreviousLesson, skipBack])

  const onOuterSkipForward = React.useCallback(() => {
    if (lessonNav && hasNextLesson) onNextLesson!()
    else skipForward()
  }, [lessonNav, hasNextLesson, onNextLesson, skipForward])

  const outerBackDisabled =
    !apiReady || (lessonNav ? !hasPreviousLesson : false)
  const outerForwardDisabled =
    !apiReady || (lessonNav ? !hasNextLesson : false)

  React.useEffect(() => {
    if (!apiReady) return

    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current
      const active = document.activeElement
      if (!panel || !active || !panel.contains(active)) return

      const t = active as HTMLElement
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return
      if (t.closest('[role="slider"]') && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return
      if (t.closest("button") && e.code === "Space") return

      switch (e.code) {
        case "Space":
          e.preventDefault()
          togglePlay()
          break
        case "ArrowLeft":
          e.preventDefault()
          seekToSeconds(currentTimeRef.current - 5)
          break
        case "ArrowRight":
          e.preventDefault()
          seekToSeconds(currentTimeRef.current + 5)
          break
        case "KeyM":
          e.preventDefault()
          setMuted(m => !m)
          break
        case "KeyL":
          e.preventDefault()
          setLooping(l => !l)
          break
        case "Comma":
          if (e.shiftKey) return
          e.preventDefault()
          cycleSpeed()
          break
        case "BracketLeft":
          if (lessonNav && hasPreviousLesson) {
            e.preventDefault()
            onPreviousLesson!()
          }
          break
        case "BracketRight":
          if (lessonNav && hasNextLesson) {
            e.preventDefault()
            onNextLesson!()
          }
          break
        default:
          break
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    apiReady,
    togglePlay,
    seekToSeconds,
    cycleSpeed,
    lessonNav,
    hasPreviousLesson,
    hasNextLesson,
    onPreviousLesson,
    onNextLesson,
  ])

  if (!parsed) {
    const trimmed = url.trim()
    const openable = /^https?:\/\//i.test(trimmed)
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5",
          "aspect-video text-center p-6"
        )}
      >
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground max-w-sm">
          This lesson URL is not a supported YouTube or Vimeo link. Edit the course and paste a valid watch URL.
        </p>
        {openable ? (
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand hover:underline"
          >
            Open link in new tab
          </a>
        ) : null}
      </div>
    )
  }

  const playerKey = parsed ? `${parsed.provider}-${parsed.videoId}` : "none"

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg border border-border">
        {iframeSrc ? (
          <iframe
            key={playerKey}
            ref={iframeRef}
            title={title ?? "Video lesson"}
            src={iframeSrc}
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Loading player…
          </div>
        )}
      </div>

      <p className="sr-only">
        Video controls: when focus is inside the control panel, press Space to play or pause, arrow keys to seek by five
        seconds, M to mute, L to toggle repeat, comma to change speed
        {lessonNav ? ", [ and ] for previous and next lesson" : ""}.
      </p>

      {/* Audiobook-style control surface (matches /audio/[id]) */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="group"
        aria-label="Video playback controls"
        className="rounded-xl border border-sidebar-border bg-sidebar px-4 py-6 space-y-6 shadow-md w-full outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
      >
        <div className="w-full space-y-2">
          <Slider
            min={0}
            max={100}
            step={0.1}
            value={[progressPct]}
            onValueChange={onSliderChange}
            disabled={!apiReady || duration <= 0}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-sidebar-foreground/50">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 flex-wrap">
          <button
            type="button"
            disabled
            className="p-2 rounded-full text-sidebar-foreground/25 cursor-not-allowed"
            aria-label="Shuffle not available for video"
            title="Not available for video"
          >
            <Shuffle size={18} />
          </button>

          <button
            type="button"
            onClick={onOuterSkipBack}
            disabled={outerBackDisabled}
            className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label={lessonNav ? "Previous lesson" : `Back ${SKIP_BACK_SEC} seconds`}
          >
            <SkipBack size={22} />
          </button>

          <button
            type="button"
            onClick={skipBack}
            disabled={!apiReady}
            className="text-xs font-bold text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-8 disabled:opacity-40"
          >
            -{SKIP_BACK_SEC}
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!apiReady}
            className="w-16 h-16 rounded-full bg-brand hover:bg-brand-dark text-primary-foreground flex items-center justify-center shadow-lg shadow-brand/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={26} fill="currentColor" />
            ) : (
              <Play size={26} fill="currentColor" className="translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={skipForward}
            disabled={!apiReady}
            className="text-xs font-bold text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-8 disabled:opacity-40"
          >
            +{SKIP_FORWARD_SEC}
          </button>

          <button
            type="button"
            onClick={onOuterSkipForward}
            disabled={outerForwardDisabled}
            className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label={lessonNav ? "Next lesson" : `Forward ${SKIP_FORWARD_SEC} seconds`}
          >
            <SkipForward size={22} />
          </button>

          <button
            type="button"
            onClick={() => setLooping(l => !l)}
            disabled={!apiReady}
            className={cn(
              "p-2 rounded-full transition-colors disabled:opacity-30",
              looping ? "text-brand" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
            )}
            aria-label={looping ? "Repeat lesson on" : "Repeat lesson off"}
          >
            <Repeat size={18} />
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full">
          <div className="flex items-center gap-2 min-w-0 max-w-[200px] justify-self-start">
            <button
              type="button"
              onClick={() => setMuted(m => !m)}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors shrink-0"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[muted ? 0 : volume]}
              onValueChange={([v]) => {
                setVolume(v)
                setMuted(false)
              }}
              disabled={!apiReady}
              className="flex-1 min-w-0"
            />
          </div>

          <button
            type="button"
            onClick={cycleSpeed}
            disabled={!apiReady}
            className="justify-self-center px-3 py-1.5 rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm font-bold hover:bg-brand/20 hover:text-brand transition-colors disabled:opacity-40"
          >
            {speed}×
          </button>

          <div className="flex justify-end justify-self-end min-w-0">
            {showLessonsButton && onOpenLessons ? (
              <button
                type="button"
                onClick={onOpenLessons}
                className="flex items-center gap-1.5 text-sm text-sidebar-foreground/60 hover:text-brand transition-colors"
              >
                <List size={16} />
                <span className="hidden sm:inline">Lessons</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
