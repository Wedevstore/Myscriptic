"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { authorCourseStore, seedAuthorCourses, type AuthorCourseLesson } from "@/lib/author-courses-store"
import { isAllowedVideoUrl } from "@/lib/video-embed"
import { slugify } from "@/lib/slugify"
import { ChevronLeft, Plus, Trash2, ChevronUp, ChevronDown, Link2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type DraftLesson = { title: string; videoUrl: string; id?: string }

export function AuthorCourseEditor({
  courseId,
  authorId,
  authorName,
}: {
  courseId?: string
  authorId: string
  authorName: string
}) {
  const router = useRouter()
  const isEdit = Boolean(courseId)
  const [title, setTitle] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [thumbnailUrl, setThumbnailUrl] = React.useState("")
  const [published, setPublished] = React.useState(false)
  const [lessons, setLessons] = React.useState<DraftLesson[]>([{ title: "", videoUrl: "" }])
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    seedAuthorCourses()
    if (!courseId) return
    const c = authorCourseStore.getById(courseId)
    if (!c || c.authorId !== authorId) {
      router.replace("/dashboard/author/courses")
      return
    }
    setTitle(c.title)
    setSlug(c.slug)
    setSlugTouched(true)
    setDescription(c.description)
    setThumbnailUrl(c.thumbnailUrl ?? "")
    setPublished(c.published)
    setLessons(
      [...c.lessons]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(l => ({ id: l.id, title: l.title, videoUrl: l.videoUrl }))
    )
  }, [courseId, authorId, router])

  React.useEffect(() => {
    if (isEdit || slugTouched) return
    setSlug(slugify(title))
  }, [title, isEdit, slugTouched])

  const addLesson = () => setLessons(prev => [...prev, { title: "", videoUrl: "" }])
  const removeLesson = (i: number) => setLessons(prev => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))

  const moveLesson = (i: number, dir: -1 | 1) => {
    setLessons(prev => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const updateLesson = (i: number, patch: Partial<DraftLesson>) => {
    setLessons(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const t = title.trim()
    if (!t) {
      setError("Title is required.")
      return
    }
    const filled = lessons.filter(l => l.title.trim() || l.videoUrl.trim())
    if (filled.length === 0) {
      setError("Add at least one lesson with a title and a YouTube or Vimeo URL.")
      return
    }
    for (let i = 0; i < filled.length; i++) {
      const l = filled[i]
      if (!l.title.trim()) {
        setError(`Lesson ${i + 1}: add a title.`)
        return
      }
      if (!l.videoUrl.trim()) {
        setError(`Lesson ${i + 1}: paste a video URL.`)
        return
      }
      if (!isAllowedVideoUrl(l.videoUrl)) {
        setError(
          `Lesson ${i + 1}: use a YouTube or Vimeo watch URL (e.g. youtube.com/watch?v=… or vimeo.com/…).`
        )
        return
      }
    }

    setBusy(true)
    try {
      if (isEdit && courseId) {
        const mapped: AuthorCourseLesson[] = filled.map((l, idx) => ({
          id: l.id ?? `l_${Math.random().toString(36).slice(2, 10)}`,
          title: l.title.trim(),
          videoUrl: l.videoUrl.trim(),
          sortOrder: idx,
        }))
        authorCourseStore.update(courseId, {
          title: t,
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim() || null,
          published,
          lessons: mapped,
          ...(slug.trim() ? { slug: slugify(slug.trim()) } : {}),
        })
      } else {
        authorCourseStore.create({
          authorId,
          authorName,
          title: t,
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim() || null,
          published,
          slugBase: slugTouched && slug.trim() ? slug.trim() : null,
          lessons: filled.map(l => ({
            title: l.title.trim(),
            videoUrl: l.videoUrl.trim(),
          })),
        })
      }
      router.push("/dashboard/author/courses")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl">
      <div className="space-y-1">
        <Link
          href="/dashboard/author/courses"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand transition-colors"
        >
          <ChevronLeft size={14} /> Back to courses
        </Link>
        <h1 className="font-serif text-2xl font-bold text-foreground">{isEdit ? "Edit course" : "New video course"}</h1>
        <p className="text-sm text-muted-foreground">
          Paste YouTube or Vimeo links per lesson. We never upload or host video files.
        </p>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4 bg-card border border-border rounded-xl p-6">
        <div className="space-y-1.5">
          <Label htmlFor="c-title">Course title *</Label>
          <Input
            id="c-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Self-publishing 101"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-slug">URL slug</Label>
          <Input
            id="c-slug"
            value={slug}
            onChange={e => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            placeholder="auto-from-title"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Public URL: /courses/{slug.trim() ? slugify(slug.trim()) || "…" : slugify(title) || "your-slug"}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-desc">Description</Label>
          <Textarea
            id="c-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What readers will learn…"
            rows={4}
            className="resize-y min-h-[100px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-thumb">Thumbnail image URL (optional)</Label>
          <Input
            id="c-thumb"
            value={thumbnailUrl}
            onChange={e => setThumbnailUrl(e.target.value)}
            placeholder="https://…"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">Shown on cards. Use any image CDN; not a video file.</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Switch id="c-pub" checked={published} onCheckedChange={setPublished} />
          <Label htmlFor="c-pub" className="text-sm cursor-pointer">
            Published — visible on /courses and homepage when the section is on
          </Label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Link2 size={16} className="text-brand" />
              Lessons (video links)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">YouTube watch or youtu.be / Vimeo page URLs.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addLesson}>
            <Plus size={14} /> Add lesson
          </Button>
        </div>

        <div className="space-y-3">
          {lessons.map((l, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border border-border bg-card p-4 space-y-3",
                l.videoUrl && !isAllowedVideoUrl(l.videoUrl) && "border-amber-500/50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Lesson {i + 1}</span>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveLesson(i, -1)}>
                    <ChevronUp size={14} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveLesson(i, 1)}>
                    <ChevronDown size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeLesson(i)}
                    disabled={lessons.length <= 1}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <Input
                value={l.title}
                onChange={e => updateLesson(i, { title: e.target.value })}
                placeholder="Lesson title"
              />
              <Input
                value={l.videoUrl}
                onChange={e => updateLesson(i, { videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
                className="font-mono text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button type="submit" disabled={busy} className="bg-brand text-primary-foreground hover:bg-brand-dark">
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create course"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/author/courses">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
