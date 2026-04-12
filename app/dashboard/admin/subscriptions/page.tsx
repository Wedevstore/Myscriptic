"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronLeft, TrendingUp, Users, DollarSign, Plus,
  Edit2, Trash2, Check, X, BookOpen, Crown,
  Calendar, AlertCircle, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { adminApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"

// ── Types & mock ─────────────────────────────────────────────────────────────
type PlanVm = {
  id: string
  name: string
  price: number
  currency: string
  duration: number
  subscribers: number
  revenue: number
  isActive: boolean
  isPopular: boolean
  features: string[]
}

const PLANS: PlanVm[] = [
  {
    id: "plan_monthly",
    name: "Pro Monthly",
    price: 9.99,
    currency: "USD",
    duration: 30,
    subscribers: 62400,
    revenue: 623376,
    isActive: true,
    isPopular: false,
    features: [
      "Unlimited book access",
      "Audiobook streaming",
      "Reading progress sync",
      "Offline downloads (5 books)",
      "Priority customer support",
    ],
  },
  {
    id: "plan_yearly",
    name: "Pro Annual",
    price: 79.99,
    currency: "USD",
    duration: 365,
    subscribers: 21800,
    revenue: 1743782,
    isActive: true,
    isPopular: true,
    features: [
      "Everything in Monthly",
      "Unlimited offline downloads",
      "Early access to new releases",
      "Author livestream access",
      "Ad-free experience",
    ],
  },
]

const SUBSCRIPTION_GROWTH = [
  { month: "Aug", monthly: 41200, annual: 14300 },
  { month: "Sep", monthly: 47800, annual: 15900 },
  { month: "Oct", monthly: 52100, annual: 17200 },
  { month: "Nov", monthly: 56800, annual: 18700 },
  { month: "Dec", monthly: 59400, annual: 20100 },
  { month: "Jan", monthly: 62400, annual: 21800 },
]

const RECENT_SUBS = [
  { id: "sub_001", user: "Amara Okafor", email: "amara@gmail.com", plan: "Pro Annual",  startDate: "Jan 22, 2026", status: "active",   renewsAt: "Jan 22, 2027" },
  { id: "sub_002", user: "Kola Mensah",  email: "kola@yahoo.com",   plan: "Pro Monthly", startDate: "Jan 20, 2026", status: "active",   renewsAt: "Feb 20, 2026" },
  { id: "sub_003", user: "Ife Balogun",  email: "ife@mail.com",     plan: "Pro Monthly", startDate: "Jan 19, 2026", status: "cancelled", renewsAt: "—" },
  { id: "sub_004", user: "Fatima Yaro",  email: "fatima@ng.com",    plan: "Pro Annual",  startDate: "Jan 17, 2026", status: "active",   renewsAt: "Jan 17, 2027" },
  { id: "sub_005", user: "Tunde Adeyemi",email: "tunde@gh.com",     plan: "Pro Monthly", startDate: "Jan 15, 2026", status: "expired",  renewsAt: "—" },
]

const STATUS_CFG = {
  active:    { label: "Active",    cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" },
  expired:   { label: "Expired",   cls: "bg-muted text-muted-foreground" },
}

function mapPlanFromApi(row: Record<string, unknown>): PlanVm {
  const ul = Boolean(row.unlimited_reading ?? true)
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? "USD"),
    duration: Number(row.duration_days ?? 30),
    subscribers: 0,
    revenue: 0,
    isActive: String(row.status ?? "inactive") === "active",
    isPopular: false,
    features: ["Subscription catalog access", ...(ul ? ["Unlimited reading"] : [])],
  }
}

// ── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  live,
  onToggleActive,
  onEdit,
  onDelete,
  busy,
}: {
  plan: PlanVm
  live?: boolean
  onToggleActive?: (id: string, active: boolean) => void
  onEdit?: (p: PlanVm) => void
  onDelete?: (p: PlanVm) => void
  busy?: string | null
}) {
  const [localActive, setLocalActive] = React.useState(plan.isActive)
  React.useEffect(() => { setLocalActive(plan.isActive) }, [plan.id, plan.isActive])
  const checked = live ? plan.isActive : localActive
  const isBusy = busy === plan.id

  return (
    <div className={cn(
      "bg-card border rounded-2xl p-6 relative transition-all",
      plan.isPopular ? "border-brand shadow-lg shadow-brand/10" : "border-border"
    )}>
      {plan.isPopular && (
        <div className="absolute -top-3 left-6">
          <Badge className="bg-brand text-primary-foreground gap-1 px-3 py-1 text-xs font-semibold">
            <Crown size={10} /> Most Popular
          </Badge>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-foreground">{plan.name}</h3>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold text-brand">
              {plan.currency === "USD" ? "$" : `${plan.currency} `}{plan.price}
            </span>
            <span className="text-sm text-muted-foreground">
              /{plan.duration >= 300 ? "yr" : plan.duration >= 28 ? "mo" : `${plan.duration}d`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Active</span>
          <Switch
            checked={checked}
            disabled={isBusy || (live && !onToggleActive)}
            onCheckedChange={v => {
              if (live && onToggleActive) void onToggleActive(plan.id, v)
              else setLocalActive(v)
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-muted/60 rounded-xl p-3 text-center">
          <div className="text-lg font-bold font-serif text-foreground">
            {live ? "—" : plan.subscribers.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">Subscribers</div>
        </div>
        <div className="bg-muted/60 rounded-xl p-3 text-center">
          <div className="text-lg font-bold font-serif text-green-600 dark:text-green-400">
            {live ? "—" : `$${(plan.revenue / 1000).toFixed(0)}k`}
          </div>
          <div className="text-[10px] text-muted-foreground">Total Revenue</div>
        </div>
      </div>

      <ul className="space-y-2 mb-5">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check size={13} className="text-brand shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 hover:border-brand hover:text-brand"
          disabled={!live || isBusy}
          onClick={() => onEdit?.(plan)}
        >
          <Edit2 size={13} /> Edit Plan
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:border-destructive hover:text-destructive gap-1.5"
          disabled={!live || isBusy}
          onClick={() => onDelete?.(plan)}
        >
          <Trash2 size={13} />
        </Button>
      </div>
      {!live && (
        <p className="text-[10px] text-muted-foreground mt-3 text-center">Connect API to edit plans.</p>
      )}
    </div>
  )
}

function NewPlanForm({
  live,
  onCreated,
}: {
  live?: boolean
  onCreated?: () => void | Promise<void>
}) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [duration, setDuration] = React.useState("30")
  const [currency, setCurrency] = React.useState("USD")
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState("")

  async function submit() {
    setErr("")
    if (!name.trim()) { setErr("Name required"); return }
    const p = Number(price)
    const d = Number(duration)
    if (!Number.isFinite(p) || p < 0) { setErr("Invalid price"); return }
    if (!Number.isFinite(d) || d < 1) { setErr("Invalid duration"); return }
    if (live) {
      setSaving(true)
      try {
        await adminApi.subscriptionPlanCreate({
          name: name.trim(),
          price: p,
          currency: (currency.trim() || "USD").slice(0, 8),
          duration_days: Math.floor(d),
          unlimited_reading: true,
          status: "active",
        })
        setName("")
        setPrice("")
        setDuration("30")
        setCurrency("USD")
        setOpen(false)
        await onCreated?.()
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Create failed")
      } finally {
        setSaving(false)
      }
      return
    }
    setName("")
    setPrice("")
    setDuration("30")
    setCurrency("USD")
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-card border-2 border-dashed border-border hover:border-brand rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-brand transition-all w-full h-full min-h-[280px]"
      >
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <Plus size={22} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm">Create New Plan</p>
          <p className="text-xs mt-0.5">Add a custom subscription tier</p>
        </div>
      </button>
    )
  }
  return (
    <div className="bg-card border border-brand rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">New Plan</h3>
        <button type="button" onClick={() => setOpen(false)}><X size={16} className="text-muted-foreground" /></button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {!live && (
        <p className="text-xs text-muted-foreground">Set NEXT_PUBLIC_API_URL to create plans against Laravel.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Plan Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pro Monthly" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Price</Label>
          <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="9.99" type="number" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Duration (days)</Label>
          <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="30" type="number" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Currency</Label>
          <Input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="USD" className="mt-1 h-9" />
        </div>
      </div>
      <Button
        type="button"
        className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold"
        disabled={saving}
        onClick={() => void submit()}
      >
        {saving ? "Creating…" : "Create Plan"}
      </Button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
function SubscriptionsContent() {
  const live = apiUrlConfigured()
  const [apiPlans, setApiPlans] = React.useState<PlanVm[]>([])
  const [dash, setDash] = React.useState<Record<string, number> | null>(null)
  const [growthLive, setGrowthLive] = React.useState<{ label: string; active: number }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadErr, setLoadErr] = React.useState("")
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [editPlan, setEditPlan] = React.useState<PlanVm | null>(null)
  const [deletePlan, setDeletePlan] = React.useState<PlanVm | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editPrice, setEditPrice] = React.useState("")
  const [editDuration, setEditDuration] = React.useState("")
  const [editCurrency, setEditCurrency] = React.useState("")
  const [editSaving, setEditSaving] = React.useState(false)

  const displayPlans = live ? apiPlans : PLANS

  const reload = React.useCallback(async () => {
    if (!live) return
    setLoadErr("")
    const [pr, d, ch] = await Promise.all([
      adminApi.subscriptionPlans(),
      adminApi.dashboard(),
      adminApi.dashboardCharts(90),
    ])
    setApiPlans((pr.data as unknown[]).map(r => mapPlanFromApi(r as Record<string, unknown>)))
    setDash(d)
    const subs = ch.subscriptions_active_by_day ?? []
    const step = Math.max(1, Math.floor(subs.length / 28))
    setGrowthLive(
      subs
        .filter((_, i) => i % step === 0 || i === subs.length - 1)
        .map((row: { date: string; active: number }) => ({
          label: row.date.slice(5),
          active: row.active,
        }))
    )
  }, [live])

  React.useEffect(() => {
    if (!live) return
    let cancel = false
    setLoading(true)
    reload()
      .catch(e => { if (!cancel) setLoadErr(e instanceof Error ? e.message : "Load failed") })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [live, reload])

  React.useEffect(() => {
    if (!editPlan) return
    setEditName(editPlan.name)
    setEditPrice(String(editPlan.price))
    setEditDuration(String(editPlan.duration))
    setEditCurrency(editPlan.currency)
  }, [editPlan])

  const totalSubsMock = PLANS.reduce((s, p) => s + p.subscribers, 0)
  const totalRevMock = PLANS.reduce((s, p) => s + p.revenue, 0)
  const totalSubs = live && dash ? dash.subscriptions_active : totalSubsMock
  const totalRevLabel = live && dash
    ? `$${dash.revenue_month_usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : `$${(totalRevMock / 1000).toFixed(0)}k`
  const revSubLabel = live ? "Platform revenue (MTD)" : "Subscription Revenue"
  const activePlans = displayPlans.filter(p => p.isActive).length
  const churnRate = live ? null : 3.4

  function exportRecentSubscriptionsCsv() {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
    const lines = [
      live
        ? "# source: demo table only — plans load from API; subscriber list is not exposed on admin API yet"
        : "# source: local demo store",
      ["id", "user", "email", "plan", "start_date", "status", "renews_at"].join(","),
      ...RECENT_SUBS.map(s =>
        [s.id, s.user, s.email, s.plan, s.startDate, s.status, s.renewsAt].map(esc).join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `recent-subscriptions-demo-table-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleToggle(id: string, next: boolean) {
    setBusyId(id)
    try {
      await adminApi.subscriptionPlanUpdate(id, { status: next ? "active" : "inactive" })
      await reload()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Update failed")
    } finally {
      setBusyId(null)
    }
  }

  async function saveEdit() {
    if (!editPlan) return
    const p = Number(editPrice)
    const d = Number(editDuration)
    if (!editName.trim() || !Number.isFinite(p) || !Number.isFinite(d) || d < 1) return
    setEditSaving(true)
    try {
      await adminApi.subscriptionPlanUpdate(editPlan.id, {
        name: editName.trim(),
        price: p,
        currency: (editCurrency.trim() || "USD").slice(0, 8),
        duration_days: Math.floor(d),
        unlimited_reading: true,
      })
      setEditPlan(null)
      await reload()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Save failed")
    } finally {
      setEditSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deletePlan) return
    setBusyId(deletePlan.id)
    try {
      await adminApi.subscriptionPlanDelete(deletePlan.id)
      setDeletePlan(null)
      await reload()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft size={15} /> Admin
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Subscription Management</h1>
        {live && (
          <Badge variant="outline" className="text-[10px] ml-2">API</Badge>
        )}
        {live && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1 ml-auto" type="button" onClick={() => void reload()} disabled={loading}>
            <RefreshCw size={12} className={cn(loading && "animate-spin")} /> Refresh
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Manage plans, monitor subscriber growth, and track recurring revenue.
      </p>

      {loadErr && (
        <div className="mb-4 text-sm text-destructive border border-destructive/30 rounded-lg px-3 py-2">{loadErr}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Subscribers", value: totalSubs.toLocaleString(), icon: Users, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", delta: live ? null : "+6.1%" },
          { label: revSubLabel, value: totalRevLabel, icon: DollarSign, color: "text-green-500 bg-green-50 dark:bg-green-900/20", delta: live ? null : "+14%" },
          { label: "Active Plans", value: activePlans.toString(), icon: BookOpen, color: "text-brand bg-amber-50 dark:bg-amber-900/20", delta: null },
          { label: "Monthly Churn", value: churnRate != null ? `${churnRate}%` : "—", icon: TrendingUp, color: "text-red-500 bg-red-50 dark:bg-red-900/20", delta: live ? null : "-0.4%" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-lg", kpi.color)}>
                <kpi.icon size={18} />
              </div>
              {kpi.delta && (
                <Badge className={cn(
                  "border-0 text-[10px]",
                  String(kpi.delta).startsWith("+")
                    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                )}>
                  {kpi.delta}
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold font-serif text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="mb-6">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {loading && live ? (
            <div className="flex justify-center py-16 text-muted-foreground text-sm">
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading plans…
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {displayPlans.map(p => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  live={live}
                  busy={busyId}
                  onToggleActive={live ? handleToggle : undefined}
                  onEdit={live ? setEditPlan : undefined}
                  onDelete={live ? setDeletePlan : undefined}
                />
              ))}
              <NewPlanForm live={live} onCreated={() => void reload()} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="growth">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-5">
              {live ? "Active subscriptions (API, up to 90 days)" : "Subscriber Growth (6 months)"}
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              {live && growthLive.length > 0 ? (
                <AreaChart data={growthLive} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="activeSubGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                  <Tooltip formatter={(v) => [Number(v ?? 0).toLocaleString(), "Active"]} />
                  <Area type="monotone" dataKey="active" name="Active subscriptions" stroke="var(--color-brand)" fill="url(#activeSubGrad)" strokeWidth={2.5} />
                </AreaChart>
              ) : (
                <AreaChart data={SUBSCRIPTION_GROWTH} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="monthlyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="annualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent-sky)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent-sky)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--color-border)" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [Number(v ?? 0).toLocaleString(), ""]} />
                  <Legend />
                  <Area type="monotone" dataKey="monthly" name="Monthly Plan" stroke="var(--color-brand)" fill="url(#monthlyGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="annual" name="Annual Plan" stroke="var(--color-accent-sky)" fill="url(#annualGrad)" strokeWidth={2.5} />
                </AreaChart>
              )}
            </ResponsiveContainer>
            {live && growthLive.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground mt-2">No chart data yet.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="subscribers">
          {live && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Subscriber list is not exposed on the admin API yet; the table below is demo data.</span>
            </div>
          )}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Recent Subscriptions</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs hover:border-brand hover:text-brand"
                onClick={exportRecentSubscriptionsCsv}
              >
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["User", "Plan", "Start Date", "Renews At", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {RECENT_SUBS.map(sub => {
                    const status = STATUS_CFG[sub.status as keyof typeof STATUS_CFG]
                    return (
                      <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{sub.user}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                            <Crown size={11} className="text-brand" />
                            {sub.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar size={11} />
                            {sub.startDate}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{sub.renewsAt}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-1 rounded-full text-[11px] font-medium", status.cls)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => window.alert(`Subscription ${sub.id}: ${sub.plan} for ${sub.user}.\n\nFull management requires the admin API (cancel / extend / refund). This data is demo-only.`)}
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Churn Insight</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                {live
                  ? "Churn analytics require additional reporting endpoints."
                  : "3.4% churn rate this month. Top cancellation reasons: price (42%), content selection (31%), technical issues (18%). Consider a retention offer for at-risk subscribers."}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editPlan)} onOpenChange={o => { if (!o) setEditPlan(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1 h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Price</Label>
                <Input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Duration (days)</Label>
                <Input value={editDuration} onChange={e => setEditDuration(e.target.value)} type="number" className="mt-1 h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Input value={editCurrency} onChange={e => setEditCurrency(e.target.value)} className="mt-1 h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditPlan(null)}>Cancel</Button>
            <Button type="button" size="sm" className="bg-brand" disabled={editSaving} onClick={() => void saveEdit()}>
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletePlan)} onOpenChange={o => { if (!o) setDeletePlan(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete plan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes <strong className="text-foreground">{deletePlan?.name}</strong> from the catalog. Existing subscriptions may be affected.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setDeletePlan(null)}>Cancel</Button>
            <Button type="button" size="sm" variant="destructive" disabled={busyId === deletePlan?.id} onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminSubscriptionsPage() {
  return <SubscriptionsContent />
}
