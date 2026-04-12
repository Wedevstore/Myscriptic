"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CATEGORIES } from "@/lib/mock-data"
import {
  Upload, ImageIcon, FileText, Headphones, X, Check, ChevronLeft,
  Info, Loader2, Globe, Lock, CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { booksApi } from "@/lib/api"
import { apiUrlConfigured, laravelAuthEnabled } from "@/lib/auth-mode"
import { demoPic } from "@/lib/demo-images"
import { parseBookFile, saveParsedBook, type ParsedBook } from "@/lib/book-parser"
import { normalizeApiBookRecord } from "@/lib/book-mapper"

const MAX_BOOK_FILE_SIZE = 100 * 1024 * 1024
const MAX_AUDIO_FILE_SIZE = 500 * 1024 * 1024
const MAX_COVER_FILE_SIZE = 10 * 1024 * 1024
const MAX_DESCRIPTION_LENGTH = 2000

type AccessType = "FREE" | "PAID" | "SUBSCRIPTION"
type BookFormat  = "ebook" | "audiobook" | "magazine"

interface BookFormState {
  title: string
  description: string
  /** Shown on book detail inside copy-protected “Opening excerpt” (optional). */
  sampleExcerpt: string
  category: string
  tags: string[]
  tagInput: string
  format: BookFormat
  accessType: AccessType
  price: string
  currency: string
  coverFile: File | null
  coverPreview: string | null
  bookFile: File | null
  audioFile: File | null
}

const ACCESS_OPTIONS: { value: AccessType; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "FREE", label: "Free", desc: "Anyone can read for free", icon: Globe },
  { value: "SUBSCRIPTION", label: "Subscription", desc: "Included in reader plans", icon: Check },
  { value: "PAID", label: "One-time Purchase", desc: "Readers pay once to access", icon: CreditCard },
]

const BOOK_FORM_DRAFT_KEY = "myscriptic_author_book_draft_v1"

type DraftableFields = Pick<
  BookFormState,
  "title" | "description" | "sampleExcerpt" | "category" | "tags" | "format" | "accessType" | "price" | "currency"
>

const FORMAT_OPTIONS: { value: BookFormat; label: string; icon: React.ElementType }[] = [
  { value: "ebook", label: "eBook (PDF/EPUB)", icon: FileText },
  { value: "audiobook", label: "Audiobook (MP3)", icon: Headphones },
  { value: "magazine", label: "Magazine", icon: Globe },
]

function DropZone({
  label, accept, icon: Icon, file, onFile, hint,
}: {
  label: string; accept: string; icon: React.ElementType
  file: File | null; onFile: (f: File) => void; hint?: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  return (
    <div>
      {label && <Label className="mb-1.5 block">{label}</Label>}
      <div
        role="button"
        tabIndex={0}
        aria-label={label || "Upload file"}
        onClick={() => ref.current?.click()}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click() } }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) onFile(f)
        }}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging ? "border-brand bg-brand/5" : "border-border hover:border-brand/40 hover:bg-muted/40"
        )}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check size={16} />
            <span className="font-medium truncate max-w-xs">{file.name}</span>
          </div>
        ) : (
          <>
            <Icon size={28} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Drag & drop or <span className="text-brand">browse</span></p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

function BookUploadForm() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams?.get("edit") ?? null
  const isEditMode = editId !== null

  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = React.useState<number | null>(null)
  const [parsedBook, setParsedBook] = React.useState<ParsedBook | null>(null)
  const [parsing, setParsing] = React.useState(false)
  const [parseProgress, setParseProgress] = React.useState<string | null>(null)
  const [parseError, setParseError] = React.useState<string | null>(null)
  const [editLoading, setEditLoading] = React.useState(!!editId)
  const abortRef = React.useRef<XMLHttpRequest | null>(null)

  const [form, setForm] = React.useState<BookFormState>({
    title: "", description: "", sampleExcerpt: "", category: "", tags: [], tagInput: "",
    format: "ebook", accessType: "SUBSCRIPTION",
    price: "", currency: "USD",
    coverFile: null, coverPreview: null, bookFile: null, audioFile: null,
  })

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Fauthor%2Fbooks%2Fnew")
    }
  }, [isLoading, isAuthenticated, router])

  // Edit mode: fetch existing book
  React.useEffect(() => {
    if (!editId || !apiUrlConfigured() || !laravelAuthEnabled()) {
      setEditLoading(false)
      return
    }
    let alive = true
    booksApi.get(editId).then(res => {
      if (!alive) return
      const rec = normalizeApiBookRecord(res.data)
      if (rec) {
        setForm(f => ({
          ...f,
          title: rec.title,
          description: (res.data as Record<string, unknown>).description as string || "",
          sampleExcerpt: (res.data as Record<string, unknown>).sample_excerpt as string || (res.data as Record<string, unknown>).sampleExcerpt as string || "",
          category: rec.category || "",
          tags: Array.isArray((res.data as Record<string, unknown>).tags) ? ((res.data as Record<string, unknown>).tags as string[]) : f.tags,
          format: rec.format,
          accessType: rec.accessType,
          price: rec.price != null ? String(rec.price) : "",
          currency: rec.currency || "USD",
          coverPreview: rec.coverUrl || null,
        }))
      }
      setEditLoading(false)
    }).catch(() => {
      if (alive) {
        setSubmitError("Could not load book for editing.")
        setEditLoading(false)
      }
    })
    return () => { alive = false }
  }, [editId])

  // Restore draft (only in create mode)
  React.useEffect(() => {
    if (isEditMode) return
    try {
      const raw = localStorage.getItem(BOOK_FORM_DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Partial<DraftableFields>
      setForm(f => ({
        ...f,
        title: typeof d.title === "string" ? d.title : f.title,
        description: typeof d.description === "string" ? d.description : f.description,
        sampleExcerpt: typeof d.sampleExcerpt === "string" ? d.sampleExcerpt : f.sampleExcerpt,
        category: typeof d.category === "string" ? d.category : f.category,
        tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === "string").slice(0, 8) : f.tags,
        format: d.format === "ebook" || d.format === "audiobook" || d.format === "magazine" ? d.format : f.format,
        accessType:
          d.accessType === "FREE" || d.accessType === "PAID" || d.accessType === "SUBSCRIPTION"
            ? d.accessType
            : f.accessType,
        price: typeof d.price === "string" ? d.price : f.price,
        currency: typeof d.currency === "string" ? d.currency : f.currency,
      }))
    } catch {
      /* ignore corrupt draft */
    }
  }, [isEditMode])

  // Warn before closing tab during upload (P1 item 5)
  React.useEffect(() => {
    if (!submitting) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [submitting])

  // Auto-save draft every 30s (P3 item 14)
  React.useEffect(() => {
    if (isEditMode) return
    const timer = setInterval(() => {
      if (!form.title && !form.description) return
      try {
        const payload: DraftableFields = {
          title: form.title, description: form.description, sampleExcerpt: form.sampleExcerpt,
          category: form.category, tags: form.tags, format: form.format,
          accessType: form.accessType, price: form.price, currency: form.currency,
        }
        localStorage.setItem(BOOK_FORM_DRAFT_KEY, JSON.stringify(payload))
        setDraftSavedAt(Date.now())
      } catch { /* noop */ }
    }, 30_000)
    return () => clearInterval(timer)
  }, [isEditMode, form])

  function clearBookDraft() {
    try { localStorage.removeItem(BOOK_FORM_DRAFT_KEY) } catch { /* ignore */ }
    setDraftSavedAt(null)
  }

  function saveBookDraft() {
    const payload: DraftableFields = {
      title: form.title, description: form.description, sampleExcerpt: form.sampleExcerpt,
      category: form.category, tags: form.tags, format: form.format,
      accessType: form.accessType, price: form.price, currency: form.currency,
    }
    try {
      localStorage.setItem(BOOK_FORM_DRAFT_KEY, JSON.stringify(payload))
      setDraftSavedAt(Date.now())
    } catch {
      setSubmitError("Could not save draft in this browser.")
    }
  }

  const set = (field: keyof BookFormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }))

  const addTag = () => {
    const tag = form.tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag) && form.tags.length < 8) {
      set("tags", [...form.tags, tag])
      set("tagInput", "")
    }
  }

  // P0 item 2 + P3 item 19: validate cover + revoke old URL
  const handleCover = (f: File) => {
    if (f.size > MAX_COVER_FILE_SIZE) {
      setSubmitError(`Cover image must be under ${MAX_COVER_FILE_SIZE / 1024 / 1024}MB.`)
      return
    }
    if (form.coverPreview) {
      try { URL.revokeObjectURL(form.coverPreview) } catch { /* noop */ }
    }
    set("coverFile", f)
    set("coverPreview", URL.createObjectURL(f))
  }

  // P0 items 2: validate file size before parsing
  const handleBookFile = async (f: File) => {
    if (f.size > MAX_BOOK_FILE_SIZE) {
      setSubmitError(`Book file must be under ${MAX_BOOK_FILE_SIZE / 1024 / 1024}MB.`)
      return
    }
    set("bookFile", f)
    setSubmitError(null)
    setParsedBook(null)
    setParseError(null)
    setParsing(true)
    setParseProgress("Preparing to parse…")
    try {
      const result = await parseBookFile(f, setParseProgress)
      setParsedBook(result)
      setParseProgress(null)
      if (result.title && !form.title) set("title", result.title)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse book file.")
      setParseProgress(null)
    } finally {
      setParsing(false)
    }
  }

  const handleAudioFile = (f: File) => {
    if (f.size > MAX_AUDIO_FILE_SIZE) {
      setSubmitError(`Audio file must be under ${MAX_AUDIO_FILE_SIZE / 1024 / 1024}MB.`)
      return
    }
    set("audioFile", f)
    setSubmitError(null)
  }

  const handleCancel = () => {
    if (abortRef.current) {
      try { abortRef.current.abort() } catch { /* noop */ }
      abortRef.current = null
    }
    setSubmitting(false)
    setUploadProgress(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.category) {
      setSubmitError("Please fill in all required fields (title, description, category).")
      return
    }
    if (form.accessType === "PAID") {
      const p = parseFloat(form.price)
      if (!Number.isFinite(p) || p < 0.99) {
        setSubmitError("Set a valid price (minimum 0.99) for paid books.")
        return
      }
    }
    setSubmitting(true)
    setSubmitError(null)
    setUploadProgress(null)

    const useApi = apiUrlConfigured() && laravelAuthEnabled()
    if (useApi) {
      try {
        let coverS3Key: string | null = null
        let bookFileS3Key: string | null = null
        let audioFileS3Key: string | null = null

        if (form.coverFile) {
          setUploadProgress("Uploading cover image…")
          try {
            const { key } = await booksApi.uploadToS3(form.coverFile, pct =>
              setUploadProgress(`Uploading cover… ${pct}%`)
            )
            coverS3Key = key
          } catch (e) {
            throw new Error(`Cover upload failed: ${e instanceof Error ? e.message : "unknown error"}`)
          }
        }

        const bookOrAudioFile = form.format === "audiobook" ? form.audioFile : form.bookFile
        if (bookOrAudioFile) {
          const label = form.format === "audiobook" ? "audio file" : "book file"
          setUploadProgress(`Uploading ${label}…`)
          try {
            const { key } = await booksApi.uploadToS3(bookOrAudioFile, pct =>
              setUploadProgress(`Uploading ${label}… ${pct}%`)
            )
            if (form.format === "audiobook") audioFileS3Key = key
            else bookFileS3Key = key
          } catch (e) {
            throw new Error(`${label.charAt(0).toUpperCase() + label.slice(1)} upload failed: ${e instanceof Error ? e.message : "unknown error"}`)
          }
        }

        setUploadProgress(isEditMode ? "Updating book…" : "Saving book record…")

        const payload: Record<string, unknown> = {
          title: form.title.trim(),
          description: form.description.trim(),
          sample_excerpt: form.sampleExcerpt.trim() || null,
          category: form.category,
          tags: form.tags,
          access_type: form.accessType,
          format: form.format,
          currency: form.currency,
        }
        if (coverS3Key) payload.cover_s3_key = coverS3Key
        if (bookFileS3Key) payload.book_file_s3_key = bookFileS3Key
        if (audioFileS3Key) payload.audio_file_s3_key = audioFileS3Key
        if (!coverS3Key && !isEditMode) {
          payload.cover_url = demoPic(`author-new-${Date.now()}-${form.title.slice(0, 24)}`, 480, 720)
        }
        if (parsedBook) payload.chapter_count = parsedBook.chapters.length
        if (form.accessType === "PAID") payload.price = parseFloat(form.price)

        let bookId: string
        try {
          if (isEditMode && editId) {
            await booksApi.patch(editId, payload)
            bookId = editId
          } else {
            const res = await booksApi.createJson(payload)
            bookId = String((res.data as { id?: string | number })?.id ?? "")
            if (!bookId) throw new Error("API returned success but no book ID")
          }
        } catch (e) {
          throw new Error(`Failed to save book record: ${e instanceof Error ? e.message : "unknown error"}`)
        }

        if (bookId && parsedBook) {
          saveParsedBook(bookId, parsedBook)
          setUploadProgress("Saving chapter data…")
          try {
            await booksApi.saveChapters(
              bookId,
              parsedBook.chapters.map((ch, i) => ({ index: i, title: ch.title, content: ch.content }))
            )
          } catch (chErr) {
            console.warn("Chapter save failed (book was created):", chErr)
          }
        }

        clearBookDraft()
        setUploadProgress(null)
        setSubmitting(false)
        setSubmitted(true)
      } catch (err) {
        setSubmitting(false)
        setUploadProgress(null)
        setSubmitError(err instanceof Error ? err.message : "Could not submit book. Try again.")
      }
      return
    }

    setUploadProgress("Processing…")
    await new Promise(r => setTimeout(r, 1800))
    if (parsedBook) saveParsedBook(`uploaded_${Date.now()}`, parsedBook)
    clearBookDraft()
    setUploadProgress(null)
    setSubmitting(false)
    setSubmitted(true)
  }

  // P3 item 18: full state reset
  const resetForm = () => {
    setSubmitted(false)
    clearBookDraft()
    setParsedBook(null)
    setParsing(false)
    setParseProgress(null)
    setParseError(null)
    setSubmitError(null)
    setUploadProgress(null)
    if (form.coverPreview) {
      try { URL.revokeObjectURL(form.coverPreview) } catch { /* noop */ }
    }
    setForm({
      title: "", description: "", sampleExcerpt: "", category: "", tags: [], tagInput: "",
      format: "ebook", accessType: "SUBSCRIPTION", price: "", currency: "USD",
      coverFile: null, coverPreview: null, bookFile: null, audioFile: null,
    })
  }

  if (editLoading) {
    return (
      <div className="max-w-lg mx-auto py-20 flex flex-col items-center gap-4">
        <Loader2 size={24} className="animate-spin text-brand" />
        <p className="text-sm text-muted-foreground">Loading book details…</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-5">
          <Check size={28} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
          {isEditMode ? "Book Updated!" : "Book Submitted!"}
        </h2>
        <p className="text-muted-foreground mb-8">
          {isEditMode
            ? "Your book has been updated successfully."
            : "Your book has been submitted for admin review. You\u2019ll be notified once it\u2019s approved and goes live."}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard/author/books">
            <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold">
              My Books
            </Button>
          </Link>
          {!isEditMode && (
            <Button variant="outline" onClick={resetForm}>
              Upload Another
            </Button>
          )}
        </div>
      </div>
    )
  }

  const hasRequiredFile = form.format === "audiobook" ? !!form.audioFile : !!form.bookFile
  const canSubmit = !submitting && !!form.title && !!form.description && !!form.category && (isEditMode || hasRequiredFile)

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/author/books">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft size={16} /> My Books
          </Button>
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            {isEditMode ? "Edit Book" : "Upload New Book"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? "Update your book details or replace files." : "All books require admin approval before going live."}
          </p>
        </div>
      </div>

      {!isEditMode && (
        <Alert className="mb-6 border-brand/20 bg-brand/5">
          <Info size={15} className="text-brand" />
          <AlertDescription className="text-sm text-foreground">
            Files are uploaded securely to AWS S3. Admin will review and approve within 24–48 hours.
          </AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileText size={16} className="text-brand" /> Book Details
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="book-title">Book Title <span className="text-destructive">*</span></Label>
            <Input id="book-title" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Enter book title" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="book-description">Description <span className="text-destructive">*</span></Label>
            <textarea
              id="book-description"
              value={form.description}
              onChange={e => set("description", e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              placeholder="Write a compelling description for your book..."
              rows={5}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <p className={cn("text-xs text-right", form.description.length >= MAX_DESCRIPTION_LENGTH ? "text-destructive font-medium" : "text-muted-foreground")}>
              {form.description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sample-excerpt">Opening excerpt <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <textarea
              id="sample-excerpt"
              value={form.sampleExcerpt}
              onChange={e => set("sampleExcerpt", e.target.value.slice(0, 8000))}
              placeholder="A short teaser (first scene or chapter opening). Shown on the book page in a protected preview."
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{form.sampleExcerpt.length}/8000</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="book-category">Category <span className="text-destructive">*</span></Label>
              <select
                id="book-category"
                value={form.category}
                onChange={e => set("category", e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="book-format">Book Format</Label>
              <select
                id="book-format"
                value={form.format}
                onChange={e => set("format", e.target.value as BookFormat)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="book-tags">Tags (up to 8)</Label>
            <div className="flex gap-2">
              <Input
                id="book-tags"
                value={form.tagInput}
                onChange={e => set("tagInput", e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
                placeholder="Add a tag and press Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addTag} size="sm">Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1.5">
                    {tag}
                    <button type="button" onClick={() => set("tags", form.tags.filter(t => t !== tag))} aria-label={`Remove tag ${tag}`}>
                      <X size={11} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Lock size={16} className="text-brand" /> Access & Pricing
          </h2>
          <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Access type">
            {ACCESS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={form.accessType === opt.value}
                onClick={() => set("accessType", opt.value)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left",
                  form.accessType === opt.value ? "border-brand bg-brand/5" : "border-border hover:border-brand/20"
                )}
              >
                <opt.icon size={18} className={form.accessType === opt.value ? "text-brand" : "text-muted-foreground"} />
                <div>
                  <div className={cn("text-xs font-semibold", form.accessType === opt.value ? "text-brand" : "text-foreground")}>{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
          {form.accessType === "PAID" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="book-price">Price <span className="text-destructive">*</span></Label>
                <Input id="book-price" type="number" min="0.99" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} placeholder="9.99" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-currency">Currency</Label>
                <select
                  id="book-currency"
                  value={form.currency}
                  onChange={e => set("currency", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {["USD", "NGN", "GHS", "KES"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Upload size={16} className="text-brand" /> {isEditMode ? "Replace Files (optional)" : "Upload Files (AWS S3)"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Cover Image {!isEditMode && <span className="text-destructive">*</span>}</Label>
              {form.coverPreview ? (
                <div className="relative">
                  <img src={form.coverPreview} alt="Book cover preview" className="w-full h-48 object-cover rounded-xl border border-border" />
                  <button
                    type="button"
                    onClick={() => {
                      if (form.coverPreview && form.coverFile) { try { URL.revokeObjectURL(form.coverPreview) } catch { /* noop */ } }
                      set("coverFile", null); set("coverPreview", isEditMode ? form.coverPreview : null)
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white"
                    aria-label="Remove cover image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <DropZone label="" accept="image/jpeg,image/png,image/webp" icon={ImageIcon} file={form.coverFile} onFile={handleCover} hint="JPG, PNG or WebP. Max 10MB" />
              )}
            </div>
            {form.format === "audiobook" ? (
              <DropZone label="Audio File (MP3)" accept="audio/mpeg,audio/mp3" icon={Headphones} file={form.audioFile} onFile={handleAudioFile} hint="MP3 format. Max 500MB" />
            ) : (
              <DropZone label="Book File (PDF or EPUB)" accept=".pdf,.epub" icon={FileText} file={form.bookFile} onFile={handleBookFile} hint="PDF or EPUB. Max 100MB — chapters are auto-extracted" />
            )}
          </div>
        </section>

        {(parsing || parseError || parsedBook) && (
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <FileText size={16} className="text-brand" /> Auto-detected Chapters
            </h2>
            {parsing && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status" aria-live="polite">
                <Loader2 size={16} className="animate-spin text-brand" />
                <span>{parseProgress || "Parsing…"}</span>
              </div>
            )}
            {parseError && (
              <Alert variant="destructive"><AlertDescription>{parseError}</AlertDescription></Alert>
            )}
            {parsedBook && !parsing && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Badge variant="secondary">{parsedBook.format.toUpperCase()}</Badge>
                  <span className="text-muted-foreground">{parsedBook.chapters.length} chapter{parsedBook.chapters.length !== 1 ? "s" : ""} detected</span>
                  <span className="text-muted-foreground">~{Math.round(parsedBook.totalCharacters / 1000)}k characters</span>
                </div>
                {parsedBook.title && <p className="text-sm"><span className="font-medium">Embedded title:</span> {parsedBook.title}</p>}
                {parsedBook.author && <p className="text-sm"><span className="font-medium">Embedded author:</span> {parsedBook.author}</p>}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Table of Contents</div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-border">
                    {parsedBook.chapters.map((ch, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-baseline gap-3 text-sm">
                        <span className="text-xs tabular-nums text-muted-foreground w-6 shrink-0 text-right">{i + 1}</span>
                        <span className="font-medium text-foreground flex-1 truncate">{ch.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {ch.content.length > 1000 ? `${(ch.content.length / 1000).toFixed(1)}k chars` : `${ch.content.length} chars`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="space-y-2" aria-live="polite">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={!canSubmit} className="flex-1 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12">
              {submitting ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> {uploadProgress || "Submitting…"}</>
              ) : isEditMode ? "Save Changes" : "Submit for Review"}
            </Button>
            {submitting ? (
              <Button type="button" variant="destructive" className="h-12 sm:w-40 shrink-0" onClick={handleCancel}>
                Cancel
              </Button>
            ) : !isEditMode ? (
              <Button type="button" variant="outline" className="h-12 sm:w-40 shrink-0" onClick={saveBookDraft}>
                Save draft
              </Button>
            ) : null}
          </div>
          {!isEditMode && !hasRequiredFile && form.title && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Please upload a book file before submitting.</p>
          )}
          {draftSavedAt != null && !isEditMode && (
            <p className="text-xs text-muted-foreground">
              Draft auto-saved {new Date(draftSavedAt).toLocaleTimeString()} (text, tags, pricing — not file uploads).
            </p>
          )}
        </div>
      </div>
    </form>
  )
}

export default function NewBookPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background px-4 sm:px-6">
          <React.Suspense fallback={
            <div className="max-w-lg mx-auto py-20 flex flex-col items-center gap-4">
              <Loader2 size={24} className="animate-spin text-brand" />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          }>
            <BookUploadForm />
          </React.Suspense>
        </main>
      </div>
    </Providers>
  )
}
