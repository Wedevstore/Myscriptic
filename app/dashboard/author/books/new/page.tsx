"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

type AccessType = "FREE" | "PAID" | "SUBSCRIPTION"
type BookFormat  = "ebook" | "audiobook" | "magazine"

interface BookFormState {
  title: string
  description: string
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
      <Label className="mb-1.5 block">{label}</Label>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) onFile(f)
        }}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
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
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const [form, setForm] = React.useState<BookFormState>({
    title: "", description: "", category: "", tags: [], tagInput: "",
    format: "ebook", accessType: "SUBSCRIPTION",
    price: "", currency: "USD",
    coverFile: null, coverPreview: null, bookFile: null, audioFile: null,
  })

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?next=%2Fdashboard%2Fauthor%2Fbooks%2Fnew")
    }
  }, [isLoading, isAuthenticated, router])

  const set = (field: keyof BookFormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }))

  const addTag = () => {
    const tag = form.tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag) && form.tags.length < 8) {
      set("tags", [...form.tags, tag])
      set("tagInput", "")
    }
  }

  const handleCover = (f: File) => {
    set("coverFile", f)
    const url = URL.createObjectURL(f)
    set("coverPreview", url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.category) return
    setSubmitting(true)
    // TODO: REAL_API → POST /api/books (multipart/form-data) with S3 upload
    // 1. Get signed S3 URL from  POST /api/upload/signed-url
    // 2. Upload files directly to S3
    // 3. POST /api/books with S3 URLs and metadata
    await new Promise(r => setTimeout(r, 1800))
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-5">
          <Check size={28} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Book Submitted!</h2>
        <p className="text-muted-foreground mb-8">
          Your book has been submitted for admin review. You&apos;ll be notified once it&apos;s approved and goes live.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard/author">
            <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold">
              Back to Dashboard
            </Button>
          </Link>
          <Button variant="outline" onClick={() => { setSubmitted(false); setForm(f => ({ ...f, title: "", description: "" })) }}>
            Upload Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/author">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft size={16} /> Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Upload New Book</h1>
          <p className="text-sm text-muted-foreground">All books require admin approval before going live.</p>
        </div>
      </div>

      <Alert className="mb-6 border-brand/20 bg-brand/5">
        <Info size={15} className="text-brand" />
        <AlertDescription className="text-sm text-foreground">
          Files are uploaded securely to AWS S3. Admin will review and approve within 24–48 hours.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {/* Basic info */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileText size={16} className="text-brand" /> Book Details
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="title">Book Title <span className="text-destructive">*</span></Label>
            <Input id="title" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Enter book title" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
            <textarea
              id="description"
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Write a compelling description for your book..."
              rows={5}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{form.description.length}/2000</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Book Format</Label>
              <select
                value={form.format}
                onChange={e => set("format", e.target.value as BookFormat)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags (up to 8)</Label>
            <div className="flex gap-2">
              <Input
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
                    <button type="button" onClick={() => set("tags", form.tags.filter(t => t !== tag))}>
                      <X size={11} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Access & Pricing */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Lock size={16} className="text-brand" /> Access & Pricing
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {ACCESS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("accessType", opt.value)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left",
                  form.accessType === opt.value ? "border-brand bg-brand/5" : "border-border hover:border-brand/20"
                )}
              >
                <opt.icon size={18} className={form.accessType === opt.value ? "text-brand" : "text-muted-foreground"} />
                <div>
                  <div className={cn("text-xs font-semibold", form.accessType === opt.value ? "text-brand" : "text-foreground")}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {form.accessType === "PAID" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price <span className="text-destructive">*</span></Label>
                <Input id="price" type="number" min="0.99" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} placeholder="9.99" />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <select
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

        {/* File uploads */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Upload size={16} className="text-brand" /> Upload Files (AWS S3)
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Cover */}
            <div>
              <Label className="mb-1.5 block">Cover Image <span className="text-destructive">*</span></Label>
              {form.coverPreview ? (
                <div className="relative">
                  <img src={form.coverPreview} alt="Book cover preview" className="w-full h-48 object-cover rounded-xl border border-border" />
                  <button
                    type="button"
                    onClick={() => { set("coverFile", null); set("coverPreview", null) }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <DropZone
                  label=""
                  accept="image/jpeg,image/png,image/webp"
                  icon={ImageIcon}
                  file={form.coverFile}
                  onFile={handleCover}
                  hint="JPG, PNG or WebP. Min 400×600px"
                />
              )}
            </div>

            {/* Book file */}
            {form.format === "audiobook" ? (
              <DropZone
                label="Audio File (MP3)"
                accept="audio/mpeg,audio/mp3"
                icon={Headphones}
                file={form.audioFile}
                onFile={f => set("audioFile", f)}
                hint="MP3 format. Max 500MB"
              />
            ) : (
              <DropZone
                label="Book File (PDF or EPUB)"
                accept=".pdf,.epub"
                icon={FileText}
                file={form.bookFile}
                onFile={f => set("bookFile", f)}
                hint="PDF or EPUB. Max 100MB"
              />
            )}
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={submitting || !form.title || !form.description || !form.category}
            className="flex-1 bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12"
          >
            {submitting ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Uploading to S3...</>
            ) : (
              "Submit for Review"
            )}
          </Button>
          <Button type="button" variant="outline" className="h-12">Save Draft</Button>
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
          <BookUploadForm />
        </main>
      </div>
    </Providers>
  )
}
