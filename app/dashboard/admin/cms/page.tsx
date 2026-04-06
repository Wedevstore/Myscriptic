"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { adminApi } from "@/lib/api"
import { seedP4, cmsSectionStore, type CmsSection, type SectionType } from "@/lib/store-p4"
import {
  Plus, GripVertical, Pencil, Trash2, Eye, EyeOff,
  Image, BookOpen, LayoutGrid, Zap, Star, ChevronUp, ChevronDown, Save, Download,
} from "lucide-react"

type SectionRow = CmsSection & { laravelType?: string }

const TYPE_META: Record<SectionType, { label: string; icon: React.ElementType; color: string }> = {
  banner: { label: "Banner", icon: Image, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500" },
  book_list: { label: "Book List", icon: BookOpen, color: "bg-amber-50 dark:bg-amber-900/20 text-brand" },
  category_list: { label: "Categories", icon: LayoutGrid, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-500" },
  flash_sale: { label: "Flash Sale", icon: Zap, color: "bg-red-50 dark:bg-red-900/20 text-red-500" },
  featured: { label: "Featured", icon: Star, color: "bg-green-50 dark:bg-green-900/20 text-green-500" },
}

const BOOK_OPTIONS = [
  { id: "bk_001", title: "The Lagos Chronicles" },
  { id: "bk_002", title: "Atomic Habits: African Ed." },
  { id: "bk_003", title: "Voices from the Savanna" },
  { id: "bk_004", title: "The Entrepreneur's Code" },
  { id: "bk_005", title: "Daughters of Abuja" },
  { id: "bk_006", title: "Sacred Grounds" },
  { id: "bk_007", title: "Midnight in Nairobi" },
  { id: "bk_008", title: "The Red Earth" },
]
const CATEGORY_OPTIONS = ["Fiction", "Self-Help", "Business", "Poetry", "Romance", "History", "Science", "Technology"]

const BLANK: Omit<CmsSection, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  type: "book_list",
  position: 0,
  isActive: true,
  bookIds: [],
  categoryIds: [],
}

const FRONT_TO_API: Record<SectionType, string> = {
  banner: "hero_carousel",
  book_list: "book_list",
  category_list: "category_strip",
  flash_sale: "flash_sale",
  featured: "subscription_cta",
}

function mapHomepageSection(row: Record<string, unknown>): SectionRow {
  const st = String(row.section_type ?? "book_list")
  const typeMap: Record<string, SectionType> = {
    hero_carousel: "banner",
    book_list: "book_list",
    category_strip: "category_list",
    flash_sale: "flash_sale",
    subscription_cta: "featured",
    custom_html: "featured",
  }
  const items = (Array.isArray(row.items) ? row.items : []) as Record<string, unknown>[]
  const bookIds = items.map(i => i.book_id).filter(Boolean).map(x => String(x))
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    type: typeMap[st] ?? "book_list",
    position: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
    bookIds,
    categoryIds: [],
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    laravelType: st,
  }
}

function escCmsSectionCsv(s: string) {
  return `"${String(s).replace(/"/g, '""')}"`
}

function exportHomepageSectionsCsv(rows: SectionRow[], live: boolean) {
  const lines = [
    live ? "# source: API" : "# source: local demo store",
    [
      "id",
      "title",
      "ui_type",
      "laravel_section_type",
      "sort_order",
      "is_active",
      "book_ids_pipe",
      "category_ids_pipe",
    ].join(","),
    ...rows.map(s =>
      [
        s.id,
        s.title,
        s.type,
        s.laravelType ?? "",
        String(s.position),
        s.isActive ? "1" : "0",
        s.bookIds.join("|"),
        s.categoryIds.join("|"),
      ]
        .map(escCmsSectionCsv)
        .join(","),
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `homepage-sections-${live ? "api" : "demo"}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function SectionCard({
  sec,
  idx,
  total,
  onEdit,
  onDelete,
  onToggle,
  onMove,
}: {
  sec: SectionRow
  idx: number
  total: number
  onEdit: () => void
  onDelete: () => void
  onToggle: (v: boolean) => void
  onMove: (dir: "up" | "down") => void
}) {
  const meta = TYPE_META[sec.type]
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 flex items-center gap-3 group transition-all",
        !sec.isActive && "opacity-55"
      )}
    >
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onMove("up")}
          disabled={idx === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          onClick={() => onMove("down")}
          disabled={idx === total - 1}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5"
        >
          <ChevronDown size={13} />
        </button>
      </div>
      <GripVertical size={14} className="text-muted-foreground/30 shrink-0 hidden sm:block" />
      <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground shrink-0">
        {idx + 1}
      </span>
      <div className={cn("p-2 rounded-lg shrink-0", meta.color)}>
        <meta.icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{sec.title}</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
            {meta.label}
          </Badge>
          {sec.laravelType && (
            <Badge variant="secondary" className="text-[8px] h-4 px-1 font-mono">
              {sec.laravelType}
            </Badge>
          )}
          {!sec.isActive && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              Hidden
            </Badge>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
          {sec.bookIds.length > 0 && <span>{sec.bookIds.length} books</span>}
          {sec.categoryIds.length > 0 && <span>{sec.categoryIds.length} categories</span>}
          {!sec.bookIds.length && !sec.categoryIds.length && <span className="italic">No items assigned</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Switch checked={sec.isActive} onCheckedChange={onToggle} className="scale-75" />
        {sec.isActive ? (
          <Eye size={12} className="text-green-500" />
        ) : (
          <EyeOff size={12} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-brand" onClick={onEdit}>
          <Pencil size={12} />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  )
}

export default function CmsBuilderPage() {
  const live = apiUrlConfigured()
  const [sections, setSections] = React.useState<SectionRow[]>([])
  const [dialog, setDialog] = React.useState<"edit" | "delete" | null>(null)
  const [editing, setEditing] = React.useState<Omit<SectionRow, "id" | "createdAt" | "updatedAt"> & { id?: string }>(
    BLANK
  )
  const [targetId, setTargetId] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    if (live) {
      setLoading(true)
      setError(null)
      try {
        const res = await adminApi.homepageSections()
        const rows = ((res.data ?? []) as Record<string, unknown>[]).map(mapHomepageSection)
        setSections(rows.sort((a, b) => a.position - b.position))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sections")
        setSections([])
      } finally {
        setLoading(false)
      }
      return
    }
    seedP4()
    setSections(cmsSectionStore.getAll() as SectionRow[])
  }, [live])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const sorted = [...sections].sort((a, b) => a.position - b.position)

  function openCreate() {
    setEditing({ ...BLANK, position: sections.length })
    setTargetId(null)
    setDialog("edit")
  }
  function openEdit(s: SectionRow) {
    setEditing({ ...s })
    setTargetId(s.id)
    setDialog("edit")
  }
  function openDelete(id: string) {
    setTargetId(id)
    setDialog("delete")
  }

  async function saveSection() {
    if (!editing.title.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (live) {
        if (targetId) {
          await adminApi.homepageSectionUpdate(targetId, {
            title: editing.title.trim(),
            is_active: editing.isActive,
          })
        } else {
          await adminApi.homepageSectionCreate({
            title: editing.title.trim(),
            section_type: FRONT_TO_API[editing.type],
            is_active: editing.isActive,
            sort_order: sections.length,
          })
        }
        await reload()
      } else {
        if (targetId) cmsSectionStore.update(targetId, editing)
        else cmsSectionStore.create(editing)
        setSections(cmsSectionStore.getAll() as SectionRow[])
      }
      setDialog(null)
      flash()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  async function deleteSection() {
    if (!targetId) return
    setBusy(true)
    setError(null)
    try {
      if (live) {
        await adminApi.homepageSectionDelete(targetId)
        await reload()
      } else {
        cmsSectionStore.delete(targetId)
        setSections(cmsSectionStore.getAll() as SectionRow[])
      }
      setDialog(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(id: string, val: boolean) {
    if (live) {
      try {
        await adminApi.homepageSectionUpdate(id, { is_active: val })
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed")
      }
      return
    }
    cmsSectionStore.update(id, { isActive: val })
    setSections(cmsSectionStore.getAll() as SectionRow[])
  }

  async function moveSection(id: string, dir: "up" | "down") {
    const arr = [...sorted]
    const idx = arr.findIndex(s => s.id === id)
    if (dir === "up" && idx === 0) return
    if (dir === "down" && idx === arr.length - 1) return
    const j = dir === "up" ? idx - 1 : idx + 1
    if (live) {
      const next = [...arr]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      try {
        await adminApi.homepageSectionsReorder(next.map(s => Number(s.id)))
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reorder failed")
      }
      return
    }
    ;[arr[idx].position, arr[j].position] = [arr[j].position, arr[idx].position]
    cmsSectionStore.reorder(arr.map(s => s.id))
    setSections(cmsSectionStore.getAll() as SectionRow[])
    flash()
  }

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleBook(id: string) {
    setEditing(e => ({
      ...e,
      bookIds: e.bookIds.includes(id) ? e.bookIds.filter(b => b !== id) : [...e.bookIds, id],
    }))
  }
  function toggleCat(cat: string) {
    setEditing(e => ({
      ...e,
      categoryIds: e.categoryIds.includes(cat) ? e.categoryIds.filter(c => c !== cat) : [...e.categoryIds, cat],
    }))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">CMS Homepage Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reorder sections, assign content, and control visibility without code.
            {live && <span className="text-brand font-medium"> Live API — book/category picks are mock-only.</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-500 font-semibold flex items-center gap-1">
              <Save size={11} />
              Saved
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={loading || sorted.length === 0}
            onClick={() => exportHomepageSectionsCsv(sorted, live)}
          >
            <Download size={12} />
            Export CSV
          </Button>
          <Button
            onClick={openCreate}
            size="sm"
            className="gap-1.5 h-8 text-xs bg-brand text-primary-foreground hover:bg-brand-dark"
          >
            <Plus size={12} />
            Add Section
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-muted-foreground">Loading sections…</p>}

      <div className="flex items-center gap-2 px-3 py-2.5 bg-brand/8 border border-brand/20 rounded-lg text-xs text-brand font-medium">
        <Eye size={13} />
        Sections marked as Active will appear on the live homepage in the order shown below.
      </div>

      <div className="space-y-2.5">
        {!loading &&
          sorted.map((sec, idx) => (
            <SectionCard
              key={sec.id}
              sec={sec}
              idx={idx}
              total={sorted.length}
              onEdit={() => openEdit(sec)}
              onDelete={() => openDelete(sec.id)}
              onToggle={v => void toggleActive(sec.id, v)}
              onMove={dir => void moveSection(sec.id, dir)}
            />
          ))}
        {!loading && sorted.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <LayoutGrid size={28} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No sections yet. Add your first homepage section.</p>
          </div>
        )}
      </div>

      <Dialog open={dialog === "edit"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{targetId ? "Edit Section" : "New Section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Section Title *</Label>
              <Input
                placeholder="e.g. Trending Books"
                value={editing.title}
                onChange={e => setEditing(v => ({ ...v, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Type</Label>
              <Select
                value={editing.type}
                onValueChange={v => setEditing(e => ({ ...e, type: v as SectionType }))}
                disabled={Boolean(live && targetId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_META) as [SectionType, typeof TYPE_META[SectionType]][]).map(([k, m]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        <m.icon size={12} />
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {live && targetId && (
                <p className="text-[10px] text-muted-foreground">Section type cannot be changed after creation.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="sw-active"
                checked={editing.isActive}
                onCheckedChange={v => setEditing(e => ({ ...e, isActive: v }))}
              />
              <Label htmlFor="sw-active" className="text-xs cursor-pointer">
                Active — visible on homepage
              </Label>
            </div>
            {!live && (editing.type === "book_list" || editing.type === "featured" || editing.type === "flash_sale") && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Assign Books</Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {BOOK_OPTIONS.map(b => (
                    <label
                      key={b.id}
                      className={cn(
                        "flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                        editing.bookIds.includes(b.id)
                          ? "border-brand bg-brand/8 text-brand font-semibold"
                          : "border-border text-muted-foreground hover:border-brand/40"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={editing.bookIds.includes(b.id)}
                        onChange={() => toggleBook(b.id)}
                      />
                      <BookOpen size={10} />
                      <span className="truncate">{b.title}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{editing.bookIds.length} selected</p>
              </div>
            )}
            {!live && editing.type === "category_list" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Assign Categories</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCat(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                        editing.categoryIds.includes(cat)
                          ? "bg-brand border-brand text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-brand/50"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void saveSection()}
              disabled={!editing.title.trim() || busy}
              className="bg-brand text-primary-foreground hover:bg-brand-dark"
            >
              {targetId ? "Save Changes" : "Create Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-destructive">Delete Section?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the section. This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void deleteSection()} disabled={busy}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
