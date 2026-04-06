"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { seedP4, bannerStore, type Banner } from "@/lib/store-p4"
import { Plus, Image, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Save } from "lucide-react"

export default function AdminBannersPage() {
  const [banners, setBanners] = React.useState<Banner[]>([])
  const [dialog, setDialog] = React.useState<"edit" | "delete" | null>(null)
  const [editing, setEditing] = React.useState<Omit<Banner, "id" | "createdAt" | "updatedAt"> & { id?: string }>({
    title: "", subtitle: "", ctaText: "", ctaLink: "", imageUrl: "", isActive: true, position: 0,
  })
  const [targetId, setTargetId] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => { seedP4(); setBanners(bannerStore.getAll()) }, [])

  const sorted = [...banners].sort((a, b) => a.position - b.position)

  function openCreate() { setEditing({ title: "", subtitle: "", ctaText: "", ctaLink: "", imageUrl: "", isActive: true, position: banners.length }); setTargetId(null); setDialog("edit") }
  function openEdit(b: Banner) { setEditing({ ...b }); setTargetId(b.id); setDialog("edit") }
  function openDelete(id: string) { setTargetId(id); setDialog("delete") }

  function save() {
    if (!editing.title.trim()) return
    if (targetId) bannerStore.update(targetId, editing)
    else bannerStore.create(editing)
    setBanners(bannerStore.getAll()); setDialog(null); flash()
  }
  function deleteBanner() {
    if (!targetId) return
    bannerStore.delete(targetId)
    setBanners(bannerStore.getAll()); setDialog(null)
  }
  function toggleActive(id: string, v: boolean) {
    bannerStore.update(id, { isActive: v }); setBanners(bannerStore.getAll())
  }
  function move(id: string, dir: "up" | "down") {
    const arr = [...sorted]; const idx = arr.findIndex(b => b.id === id)
    if (dir === "up" && idx === 0) return; if (dir === "down" && idx === arr.length - 1) return
    const swap = dir === "up" ? idx - 1 : idx + 1
      ;[arr[idx].position, arr[swap].position] = [arr[swap].position, arr[idx].position]
    arr.forEach(b => bannerStore.update(b.id, { position: b.position }))
    setBanners(bannerStore.getAll()); flash()
  }
  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage homepage carousel banners — reorder, edit, and control visibility.</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-500 font-semibold flex items-center gap-1"><Save size={11} />Saved</span>}
          <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs bg-brand text-primary-foreground hover:bg-brand-dark">
            <Plus size={12} />Add Banner
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {sorted.map((b, idx) => (
          <div key={b.id} className={cn("bg-card border border-border rounded-xl p-4 flex items-center gap-3 group", !b.isActive && "opacity-55")}>
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => move(b.id, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5">
                <ChevronUp size={13} />
              </button>
              <button onClick={() => move(b.id, "down")} disabled={idx === sorted.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5">
                <ChevronDown size={13} />
              </button>
            </div>
            <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground shrink-0">{idx + 1}</span>
            <div className="w-20 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
              <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-foreground truncate">{b.title}</span>
                {!b.isActive && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Hidden</Badge>}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{b.subtitle}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Switch checked={b.isActive} onCheckedChange={v => toggleActive(b.id, v)} className="scale-75" />
              {b.isActive ? <Eye size={12} className="text-green-500" /> : <EyeOff size={12} className="text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-brand" onClick={() => openEdit(b)}><Pencil size={12} /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => openDelete(b.id)}><Trash2 size={12} /></Button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Image size={28} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No banners yet. Add your first banner.</p>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={dialog === "edit"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{targetId ? "Edit Banner" : "New Banner"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input placeholder="e.g. Read Without Limits" value={editing.title} onChange={e => setEditing(v => ({ ...v, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subtitle</Label>
              <Input placeholder="e.g. Unlimited ebooks from $9.99/month" value={editing.subtitle} onChange={e => setEditing(v => ({ ...v, subtitle: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CTA Text</Label>
                <Input placeholder="e.g. Start Free Trial" value={editing.ctaText} onChange={e => setEditing(v => ({ ...v, ctaText: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CTA Link</Label>
                <Input placeholder="e.g. /subscription" value={editing.ctaLink} onChange={e => setEditing(v => ({ ...v, ctaLink: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Image URL *</Label>
              <Input placeholder="https://placehold.co/1200x400?text=..." value={editing.imageUrl} onChange={e => setEditing(v => ({ ...v, imageUrl: e.target.value }))} />
              {editing.imageUrl && (
                <div className="w-full h-24 rounded-lg bg-muted overflow-hidden mt-2">
                  <img src={editing.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sw-active" checked={editing.isActive} onCheckedChange={v => setEditing(e => ({ ...e, isActive: v }))} />
              <Label htmlFor="sw-active" className="text-xs cursor-pointer">Active — visible on homepage</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={!editing.title.trim() || !editing.imageUrl.trim()} className="bg-brand text-primary-foreground hover:bg-brand-dark">
              {targetId ? "Save Changes" : "Create Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={dialog === "delete"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-serif text-destructive">Delete Banner?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the banner. This action cannot be undone.</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={deleteBanner}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
