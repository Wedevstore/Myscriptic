"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft, Plus, Trash2, Edit2, Copy, Check,
  Percent, DollarSign, AlertCircle, Tag, Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { couponStore, seedP4, type Coupon, type CouponType } from "@/lib/store-p4"

// ── helpers ──────────────────────────────────────────────────────────────────

function useCoupons() {
  const [coupons, setCoupons] = React.useState<Coupon[]>([])
  const reload = React.useCallback(() => {
    seedP4()
    setCoupons(couponStore.getAll())
  }, [])
  React.useEffect(() => { reload() }, [reload])
  return { coupons, reload }
}

const EMPTY_FORM = {
  code:      "",
  type:      "percent" as CouponType,
  value:     10,
  maxUses:   100,
  expiresAt: "",
  isActive:  true,
}

// ── CouponRow ─────────────────────────────────────────────────────────────────

function CouponRow({
  coupon,
  onToggle,
  onDelete,
  onEdit,
}: {
  coupon: Coupon
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onEdit: (c: Coupon) => void
}) {
  const [copied, setCopied] = React.useState(false)
  const isExpired = new Date(coupon.expiresAt) < new Date()
  const usagePercent = Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)

  const copyCode = () => {
    navigator.clipboard.writeText(coupon.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Code */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md tracking-wider">
            {coupon.code}
          </code>
          <button
            onClick={copyCode}
            className="text-muted-foreground hover:text-brand transition-colors"
            aria-label="Copy code"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </button>
        </div>
      </td>

      {/* Discount */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center",
            coupon.type === "percent"
              ? "bg-brand/10 text-brand"
              : "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
          )}>
            {coupon.type === "percent" ? <Percent size={12} /> : <DollarSign size={12} />}
          </div>
          <span className="text-sm font-semibold text-foreground">
            {coupon.type === "percent" ? `${coupon.value}%` : `$${coupon.value}`}
          </span>
        </div>
      </td>

      {/* Usage */}
      <td className="px-4 py-3">
        <div className="min-w-[100px]">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{coupon.usedCount} / {coupon.maxUses}</span>
            <span className="font-semibold text-foreground">{usagePercent.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usagePercent >= 90 ? "bg-destructive" : usagePercent >= 60 ? "bg-amber-500" : "bg-brand"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </td>

      {/* Expiry */}
      <td className="px-4 py-3">
        <div className={cn("text-xs flex items-center gap-1",
          isExpired ? "text-destructive" : "text-muted-foreground"
        )}>
          {isExpired && <AlertCircle size={11} />}
          {coupon.expiresAt
            ? new Date(coupon.expiresAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })
            : "No expiry"}
        </div>
      </td>

      {/* Status toggle */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={coupon.isActive}
            onCheckedChange={v => onToggle(coupon.id, v)}
            aria-label={`Toggle ${coupon.code}`}
          />
          <Badge className={cn(
            "text-[10px] border-0",
            coupon.isActive && !isExpired
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          )}>
            {isExpired ? "Expired" : coupon.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          <button
            onClick={() => onEdit(coupon)}
            className="p-1.5 rounded-md bg-muted hover:bg-brand/10 hover:text-brand text-muted-foreground transition-colors"
            aria-label="Edit coupon"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(coupon.id)}
            className="p-1.5 rounded-md bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
            aria-label="Delete coupon"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── CouponFormDialog ──────────────────────────────────────────────────────────

function CouponFormDialog({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean
  editing: Coupon | null
  onClose: () => void
  onSave: (data: typeof EMPTY_FORM) => void
}) {
  const [form, setForm] = React.useState(EMPTY_FORM)

  React.useEffect(() => {
    if (editing) {
      setForm({
        code:      editing.code,
        type:      editing.type,
        value:     editing.value,
        maxUses:   editing.maxUses,
        expiresAt: editing.expiresAt,
        isActive:  editing.isActive,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editing, open])

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {editing ? "Edit Coupon" : "Create Coupon"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Code */}
            <div className="col-span-2">
              <Label htmlFor="coupon-code">Coupon Code</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={e => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="e.g. SAVE20"
                className="mt-1.5 font-mono tracking-wider"
              />
            </div>

            {/* Type */}
            <div>
              <Label>Discount Type</Label>
              <Select
                value={form.type}
                onValueChange={v => set("type", v as CouponType)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Flat ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Value */}
            <div>
              <Label htmlFor="coupon-value">
                {form.type === "percent" ? "Discount %" : "Discount $"}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                min={1}
                max={form.type === "percent" ? 100 : undefined}
                value={form.value}
                onChange={e => set("value", Number(e.target.value))}
                className="mt-1.5"
              />
            </div>

            {/* Max uses */}
            <div>
              <Label htmlFor="max-uses">Max Uses</Label>
              <Input
                id="max-uses"
                type="number"
                min={1}
                value={form.maxUses}
                onChange={e => set("maxUses", Number(e.target.value))}
                className="mt-1.5"
              />
            </div>

            {/* Expiry */}
            <div>
              <Label htmlFor="expires-at">Expiry Date</Label>
              <Input
                id="expires-at"
                type="date"
                value={form.expiresAt ? form.expiresAt.slice(0, 10) : ""}
                onChange={e => set("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : "")}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">Coupon can be applied at checkout</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={v => set("isActive", v)}
              aria-label="Toggle coupon active"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-brand hover:bg-brand-dark text-primary-foreground"
              onClick={() => onSave(form)}
              disabled={!form.code.trim()}
            >
              {editing ? "Save Changes" : "Create Coupon"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCouponsPage() {
  const { coupons, reload } = useCoupons()

  const [search,     setSearch]     = React.useState("")
  const [filter,     setFilter]     = React.useState("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing,    setEditing]    = React.useState<Coupon | null>(null)
  const [deleteId,   setDeleteId]   = React.useState<string | null>(null)

  const filtered = coupons.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.code.toLowerCase().includes(q)
    const matchFilter =
      filter === "all"     ? true :
      filter === "active"  ? c.isActive && new Date(c.expiresAt) >= new Date() :
      filter === "expired" ? new Date(c.expiresAt) < new Date() :
      filter === "pct"     ? c.type === "percent" :
                             c.type === "fixed"
    return matchSearch && matchFilter
  })

  const handleSave = (data: typeof EMPTY_FORM) => {
    const payload = {
      code:      data.code.trim().toUpperCase(),
      type:      data.type,
      value:     data.value,
      maxUses:   data.maxUses,
      expiresAt: data.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString(),
      isActive:  data.isActive,
    }
    if (editing) {
      couponStore.update(editing.id, payload)
    } else {
      couponStore.create(payload)
    }
    setDialogOpen(false)
    setEditing(null)
    reload()
  }

  const handleDelete = (id: string) => {
    couponStore.delete(id)
    setDeleteId(null)
    reload()
  }

  const handleToggle = (id: string, active: boolean) => {
    couponStore.update(id, { isActive: active })
    reload()
  }

  const activeCoupons  = coupons.filter(c => c.isActive && new Date(c.expiresAt) >= new Date())
  const expiredCoupons = coupons.filter(c => new Date(c.expiresAt) < new Date())
  const totalUses      = coupons.reduce((s, c) => s + c.usedCount, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/admin" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-foreground">Coupon Codes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage discount coupons for checkout</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true) }}
          className="bg-brand hover:bg-brand-dark text-primary-foreground gap-1.5 h-9"
        >
          <Plus size={15} />New Coupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Coupons", value: coupons.length, icon: Tag },
          { label: "Active",        value: activeCoupons.length,  icon: Check,       color: "text-green-600 dark:text-green-400" },
          { label: "Expired",       value: expiredCoupons.length, icon: AlertCircle, color: "text-destructive" },
          { label: "Total Uses",    value: totalUses, icon: Percent },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <stat.icon size={16} className={stat.color ?? "text-brand"} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold text-foreground font-mono">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search coupon code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-1.5">
          {["all", "active", "expired", "pct", "flat"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize",
                filter === f
                  ? "bg-brand/10 text-brand"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "pct" ? "% Off" : f === "flat" ? "$ Off" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Code</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Discount</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Usage</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Expiry</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Status</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <Tag size={28} className="mx-auto mb-3 opacity-20" />
                  {search ? "No coupons match your search." : "No coupons yet. Create your first one."}
                </td>
              </tr>
            ) : (
              filtered.map(coupon => (
                <CouponRow
                  key={coupon.id}
                  coupon={coupon}
                  onToggle={handleToggle}
                  onDelete={id => setDeleteId(id)}
                  onEdit={c => { setEditing(c); setDialogOpen(true) }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form dialog */}
      <CouponFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        onSave={handleSave}
      />

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Coupon?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The coupon will no longer be valid at checkout.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
