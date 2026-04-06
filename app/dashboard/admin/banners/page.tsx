"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { adminApi } from "@/lib/api"
import { seedP4, bannerStore, type Banner } from "@/lib/store-p4"
import { Plus, Image, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Save, Download } from "lucide-react"

/** Live carousel slide (homepage `hero_carousel` item_type `banner`) */
type HeroBanner = Banner & { sectionId: string; itemId: string }

function linkTypeForUrl(url: string): "external" | "store" {
  return /^https?:\/\//i.test(url.trim()) ? "external" : "store"
}

function mapHeroItem(
  sectionId: string,
  row: Record<string, unknown>,
  position: number
): HeroBanner {
  return {
    id: `item:${row.id}`,
    sectionId,
    itemId: String(row.id ?? ""),
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    ctaText: String(row.cta_label ?? ""),
    ctaLink: String(row.link_value ?? ""),
    imageUrl: String(row.image_url ?? ""),
    isActive: Boolean(row.is_active ?? true),
    position,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  }
}

function escBannerCsv(s: string) {
  return `"${String(s).replace(/"/g, '""')}"`
}

function exportBannersCsv(rows: Banner[], live: boolean) {
  const lines = [
    live ? "# source: API (hero_carousel banner items)" : "# source: local demo store",
    [
      "sort_index",
      "row_id",
      "api_item_id",
      "title",
      "subtitle",
      "cta_text",
      "cta_link",
      "image_url",
      "is_active",
      "created_at",
      "updated_at",
    ].join(","),
    ...rows.map((b, idx) => {
      const apiItemId = "itemId" in b && (b as HeroBanner).itemId ? (b as HeroBanner).itemId : ""
      return [
        String(idx + 1),
        b.id,
        apiItemId,
        b.title,
        b.subtitle,
        b.ctaText,
        b.ctaLink,
        b.imageUrl,
        b.isActive ? "1" : "0",
        b.createdAt,
        b.updatedAt,
      ]
        .map(escBannerCsv)
        .join(",")
    }),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `banners-${live ? "api" : "demo"}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AdminBannersPage() {
  const live = apiUrlConfigured()
  const [banners, setBanners] = React.useState<Banner[]>([])
  const [heroSectionId, setHeroSectionId] = React.useState<string | null>(null)
  const [dialog, setDialog] = React.useState<"edit" | "delete" | null>(null)
  const [editing, setEditing] = React.useState<
    Omit<Banner, "id" | "createdAt" | "updatedAt"> & { id?: string }
  >({
    title: "",
    subtitle: "",
    ctaText: "",
    ctaLink: "",
    imageUrl: "",
    isActive: true,
    position: 0,
  })
  const [targetId, setTargetId] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const reload = React.useCallback(async () => {
    if (live) {
      setLoading(true)
      setError(null)
      try {
        const res = await adminApi.homepageSections()
        const sections = (res.data ?? []) as Record<string, unknown>[]
        const hero = sections.find(s => String(s.section_type) === "hero_carousel")
        if (!hero) {
          setHeroSectionId(null)
          setBanners([])
          return
        }
        const sid = String(hero.id ?? "")
        setHeroSectionId(sid)
        const items = (Array.isArray(hero.items) ? hero.items : []) as Record<string, unknown>[]
        const slides = items
          .filter(i => String(i.item_type) === "banner")
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map((it, idx) => mapHeroItem(sid, it, idx))
        setBanners(slides)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load banners")
        setBanners([])
        setHeroSectionId(null)
      } finally {
        setLoading(false)
      }
      return
    }
    seedP4()
    setBanners(bannerStore.getAll())
    setHeroSectionId(null)
  }, [live])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const sorted = [...banners].sort((a, b) => a.position - b.position)

  async function ensureHeroSection(): Promise<string> {
    if (heroSectionId) return heroSectionId
    const res = await adminApi.homepageSectionCreate({
      title: "Hero carousel",
      section_type: "hero_carousel",
      is_active: true,
    })
    const d = res.data as Record<string, unknown>
    const id = String(d.id ?? "")
    setHeroSectionId(id)
    return id
  }

  function openCreate() {
    setEditing({
      title: "",
      subtitle: "",
      ctaText: "",
      ctaLink: "",
      imageUrl: "",
      isActive: true,
      position: banners.length,
    })
    setTargetId(null)
    setDialog("edit")
  }

  function openEdit(b: Banner) {
    setEditing({ ...b })
    setTargetId(b.id)
    setDialog("edit")
  }

  function openDelete(id: string) {
    setTargetId(id)
    setDialog("delete")
  }

  async function save() {
    if (!editing.title.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (live) {
        const sid = await ensureHeroSection()
        const link = editing.ctaLink.trim()
        const payload: Record<string, unknown> = {
          title: editing.title.trim(),
          subtitle: editing.subtitle.trim() || null,
          image_url: editing.imageUrl.trim() || null,
          cta_label: editing.ctaText.trim() || null,
          is_active: editing.isActive,
        }
        if (link) {
          payload.link_value = link
          payload.link_type = linkTypeForUrl(link)
        }
        if (targetId) {
          const hb = sorted.find(b => b.id === targetId) as HeroBanner | undefined
          if (!hb?.itemId) throw new Error("Missing slide id")
          await adminApi.homepageItemUpdate(hb.itemId, {
            item_type: "banner",
            ...payload,
          })
        } else {
          await adminApi.homepageItemCreate(sid, {
            item_type: "banner",
            sort_order: sorted.length,
            ...payload,
          })
        }
        await reload()
      } else {
        if (targetId) bannerStore.update(targetId, editing)
        else bannerStore.create(editing)
        setBanners(bannerStore.getAll())
      }
      setDialog(null)
      flash()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  async function deleteBanner() {
    if (!targetId) return
    setBusy(true)
    setError(null)
    try {
      if (live) {
        const hb = sorted.find(b => b.id === targetId) as HeroBanner | undefined
        if (!hb?.itemId) throw new Error("Missing slide id")
        await adminApi.homepageItemDelete(hb.itemId)
        await reload()
      } else {
        bannerStore.delete(targetId)
        setBanners(bannerStore.getAll())
      }
      setDialog(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(id: string, v: boolean) {
    if (live) {
      const hb = sorted.find(b => b.id === id) as HeroBanner | undefined
      if (!hb?.itemId) return
      try {
        await adminApi.homepageItemUpdate(hb.itemId, { is_active: v })
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed")
      }
      return
    }
    bannerStore.update(id, { isActive: v })
    setBanners(bannerStore.getAll())
  }

  async function move(id: string, dir: "up" | "down") {
    const arr = [...sorted]
    const idx = arr.findIndex(b => b.id === id)
    if (dir === "up" && idx === 0) return
    if (dir === "down" && idx === arr.length - 1) return
    const j = dir === "up" ? idx - 1 : idx + 1
    if (live) {
      const next = [...arr]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      const sectionId = (arr[idx] as HeroBanner).sectionId
      try {
        await adminApi.homepageItemsReorder(
          sectionId,
          next.map(b => Number((b as HeroBanner).itemId))
        )
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reorder failed")
      }
      return
    }
    ;[arr[idx].position, arr[j].position] = [arr[j].position, arr[idx].position]
    arr.forEach(b => bannerStore.update(b.id, { position: b.position }))
    setBanners(bannerStore.getAll())
    flash()
  }

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {live
              ? "Slides in the first Laravel `hero_carousel` homepage section (banner items)."
              : "Manage homepage carousel banners — reorder, edit, and control visibility."}
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
            onClick={() => exportBannersCsv(sorted, live)}
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
            Add Banner
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-2.5">
        {!loading &&
          sorted.map((b, idx) => (
            <div
              key={b.id}
              className={cn(
                "bg-card border border-border rounded-xl p-4 flex items-center gap-3 group",
                !b.isActive && "opacity-55"
              )}
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void move(b.id, "up")}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => void move(b.id, "down")}
                  disabled={idx === sorted.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
              <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                {idx + 1}
              </span>
              <div className="w-20 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">{b.title}</span>
                  {!b.isActive && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                      Hidden
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{b.subtitle}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch
                  checked={b.isActive}
                  onCheckedChange={v => void toggleActive(b.id, v)}
                  className="scale-75"
                />
                {b.isActive ? (
                  <Eye size={12} className="text-green-500" />
                ) : (
                  <EyeOff size={12} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-brand" onClick={() => openEdit(b)}>
                  <Pencil size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => openDelete(b.id)}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))}
        {!loading && sorted.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Image size={28} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {live
                ? "No hero carousel or no banner slides yet. Add a banner to create the section automatically."
                : "No banners yet. Add your first banner."}
            </p>
          </div>
        )}
      </div>

      <Dialog open={dialog === "edit"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{targetId ? "Edit Banner" : "New Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                placeholder="e.g. Read Without Limits"
                value={editing.title}
                onChange={e => setEditing(v => ({ ...v, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subtitle</Label>
              <Input
                placeholder="e.g. Unlimited ebooks from $9.99/month"
                value={editing.subtitle}
                onChange={e => setEditing(v => ({ ...v, subtitle: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CTA Text</Label>
                <Input
                  placeholder="e.g. Start Free Trial"
                  value={editing.ctaText}
                  onChange={e => setEditing(v => ({ ...v, ctaText: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CTA Link</Label>
                <Input
                  placeholder="e.g. /subscription or https://…"
                  value={editing.ctaLink}
                  onChange={e => setEditing(v => ({ ...v, ctaLink: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Image URL *</Label>
              <Input
                placeholder="https://placehold.co/1200x400?text=..."
                value={editing.imageUrl}
                onChange={e => setEditing(v => ({ ...v, imageUrl: e.target.value }))}
              />
              {editing.imageUrl && (
                <div className="w-full h-24 rounded-lg bg-muted overflow-hidden mt-2">
                  <img src={editing.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void save()}
              disabled={!editing.title.trim() || !editing.imageUrl.trim() || busy}
              className="bg-brand text-primary-foreground hover:bg-brand-dark"
            >
              {targetId ? "Save Changes" : "Create Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-destructive">Delete Banner?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the banner. This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void deleteBanner()} disabled={busy}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
