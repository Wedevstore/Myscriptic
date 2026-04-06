"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { adminApi } from "@/lib/api"
import { seedP4, cmsPageStore, type CmsPage } from "@/lib/store-p4"
import { FileText, Pencil, Eye, Globe, Lock, Save, Check, Download } from "lucide-react"

const SLUG_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  about: { label: "About Us", icon: Globe },
  terms: { label: "Terms of Service", icon: FileText },
  privacy: { label: "Privacy Policy", icon: Lock },
}

function mapApiCmsPage(row: Record<string, unknown>): CmsPage {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    content: String(row.content ?? ""),
    isPublished: Boolean(row.is_published ?? row.isPublished ?? false),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  }
}

function escPageCsv(s: string) {
  return `"${String(s).replace(/"/g, '""')}"`
}

function exportCmsPagesCsv(rows: CmsPage[], live: boolean) {
  const lines = [
    live ? "# source: API" : "# source: local demo store",
    ["id", "title", "slug", "is_published", "updated_at", "content_markdown"].join(","),
    ...rows.map(p =>
      [p.id, p.title, p.slug, p.isPublished ? "1" : "0", p.updatedAt, p.content]
        .map(escPageCsv)
        .join(","),
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `cms-pages-${live ? "api" : "demo"}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AdminCmsPagesPage() {
  const live = apiUrlConfigured()
  const [pages, setPages] = React.useState<CmsPage[]>([])
  const [dialog, setDialog] = React.useState<"edit" | null>(null)
  const [editing, setEditing] = React.useState<CmsPage | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    if (live) {
      setLoading(true)
      setError(null)
      try {
        const res = await adminApi.cmsPages()
        setPages(((res.data ?? []) as Record<string, unknown>[]).map(mapApiCmsPage))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load pages")
        setPages([])
      } finally {
        setLoading(false)
      }
      return
    }
    seedP4()
    setPages(cmsPageStore.getAll())
  }, [live])

  React.useEffect(() => {
    void reload()
  }, [reload])

  function openEdit(p: CmsPage) {
    setEditing({ ...p })
    setPreview(null)
    setDialog("edit")
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      if (live) {
        await adminApi.cmsPageUpdate(editing.id, {
          title: editing.title,
          content: editing.content,
          is_published: editing.isPublished,
        })
        await reload()
      } else {
        cmsPageStore.update(editing.id, {
          title: editing.title,
          content: editing.content,
          isPublished: editing.isPublished,
        })
        setPages(cmsPageStore.getAll())
      }
      setDialog(null)
      flash()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">CMS Pages</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit static content pages — About, Terms, and Privacy Policy.
            {live && <span className="text-brand font-medium"> Live API.</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-500 font-semibold flex items-center gap-1">
              <Check size={11} />
              Changes saved
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={loading || pages.length === 0}
            onClick={() => exportCmsPagesCsv(pages, live)}
          >
            <Download size={12} />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading pages…</p>}

      <div className="grid sm:grid-cols-3 gap-4">
        {!loading &&
          pages.map(p => {
            const meta = SLUG_LABELS[p.slug] ?? { label: p.title, icon: FileText }
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-muted">
                    <meta.icon size={15} className="text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{meta.label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">/{p.slug}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-3 flex-1">
                  {p.content.replace(/#+\s/g, "").slice(0, 140)}…
                </p>
                <div className="flex items-center justify-between pt-1">
                  <Badge
                    className={cn(
                      "text-[9px] border-0 h-5 px-2",
                      p.isPublished
                        ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {p.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <div className="flex gap-1">
                    <a href={`/pages/${p.slug}`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-brand">
                        <Eye size={12} />
                      </Button>
                    </a>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-brand" onClick={() => openEdit(p)}>
                      <Pencil size={12} />
                    </Button>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground/60">
                  Updated{" "}
                  {new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )
          })}
      </div>

      <Dialog open={dialog === "edit"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Edit Page — {editing && (SLUG_LABELS[editing.slug]?.label ?? editing.title)}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2 overflow-y-auto flex-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Page Title</Label>
                <Input
                  value={editing.title}
                  onChange={e => setEditing(v => (v ? { ...v, title: e.target.value } : v))}
                />
              </div>
              {live && (
                <p className="text-[10px] text-muted-foreground">
                  Slug <span className="font-mono">{editing.slug}</span> is managed in the database.
                </p>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold">Content (Markdown)</Label>
                  <button
                    type="button"
                    className="text-[10px] text-brand font-medium hover:underline"
                    onClick={() => setPreview(preview ? null : editing.content)}
                  >
                    {preview ? "Edit" : "Preview"}
                  </button>
                </div>
                {preview ? (
                  <div className="min-h-64 p-4 bg-muted/50 rounded-lg border border-border text-sm prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-96">
                    <pre className="whitespace-pre-wrap text-xs text-foreground">{editing.content}</pre>
                  </div>
                ) : (
                  <Textarea
                    value={editing.content}
                    onChange={e => setEditing(v => (v ? { ...v, content: e.target.value } : v))}
                    rows={14}
                    className="font-mono text-xs"
                    placeholder="Write markdown content..."
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="sw-pub"
                  checked={editing.isPublished}
                  onCheckedChange={v => setEditing(e => (e ? { ...e, isPublished: v } : e))}
                />
                <Label htmlFor="sw-pub" className="text-xs cursor-pointer">
                  Published — visible to all users
                </Label>
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void save()}
              disabled={saving}
              className="bg-brand text-primary-foreground hover:bg-brand-dark gap-1.5"
            >
              <Save size={11} />
              {saving ? "Saving…" : "Save Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
