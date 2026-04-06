"use client"

/**
 * Admin — Revenue & Payouts
 *
 * With `NEXT_PUBLIC_API_URL`, cycles, payouts, and subscription pool commission
 * load from Laravel (`/admin/revenue-cycles`, `/admin/author-payouts`, settings PUT).
 * Without it, the local store demo engine (`runMonthlyCalculation`, etc.) is used.
 */

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DollarSign, TrendingUp, ChevronLeft, Download,
  CheckCircle, Clock, XCircle, AlertCircle, Users, BarChart3,
  Play, Lock, RefreshCw, Shield, Info, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/auth-provider"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts"
import { adminApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { apiAuthorPayoutToRow, apiRevenueCycleToRow } from "@/lib/admin-revenue-mapper"
import {
  revenueCycleStore, authorPayoutStore, adminSettingsStore,
  auditLogStore,
  seedStore,
  type RevenueCycle, type AuthorPayout, type AdminSettings,
} from "@/lib/store"

// ── Static chart data (historical baseline — in prod: from real cycle records) ──

const MONTHLY_REVENUE = [
  { month: "Aug", revenue: 88000,  adminCut: 26400,  authorPool: 61600,  subs: 52000,  purchases: 36000 },
  { month: "Sep", revenue: 104000, adminCut: 31200,  authorPool: 72800,  subs: 64000,  purchases: 40000 },
  { month: "Oct", revenue: 119000, adminCut: 35700,  authorPool: 83300,  subs: 76000,  purchases: 43000 },
  { month: "Nov", revenue: 131000, adminCut: 39300,  authorPool: 91700,  subs: 88000,  purchases: 43000 },
  { month: "Dec", revenue: 142000, adminCut: 42600,  authorPool: 99400,  subs: 98000,  purchases: 44000 },
  { month: "Jan", revenue: 148200, adminCut: 44460,  authorPool: 103740, subs: 102000, purchases: 46200 },
]

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  pending:  { label: "Pending",  icon: Clock,       cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  paid:     { label: "Paid",     icon: CheckCircle, cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  held:     { label: "On Hold",  icon: AlertCircle, cls: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
}

const CYCLE_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open:        { label: "Open",        cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
  calculating: { label: "Calculating", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  finalized:   { label: "Finalized",   cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  locked:      { label: "Locked",      cls: "bg-muted text-muted-foreground" },
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, delta, icon: Icon, colorClass }: {
  label: string; value: string; delta?: string; icon: React.ElementType; colorClass: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", colorClass)}>
          <Icon size={18} />
        </div>
        {delta && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 text-[10px]">
            {delta}
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold font-serif text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

// ── Payout row ────────────────────────────────────────────────────────────────

function PayoutRow({
  payout,
  onApprove,
  onHold,
  onPay,
}: {
  payout: AuthorPayout
  onApprove: (id: string) => void
  onHold:    (id: string) => void
  onPay:     (id: string) => void
}) {
  const status = STATUS_CONFIG[payout.status] ?? STATUS_CONFIG.pending
  const StatusIcon = status.icon
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand/15 text-brand text-xs font-bold flex items-center justify-center shrink-0">
            {payout.authorName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <span className="font-medium text-foreground text-sm">{payout.authorName}</span>
            <div className="text-[10px] text-muted-foreground">{payout.authorId}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {payout.totalEngagement.toLocaleString()} min
      </td>
      <td className="px-4 py-3 font-semibold text-foreground text-sm">{payout.sharePct.toFixed(2)}%</td>
      <td className="px-4 py-3 text-foreground text-sm">${payout.grossEarnings.toFixed(2)}</td>
      <td className="px-4 py-3 text-destructive text-sm">-${payout.platformFee.toFixed(2)}</td>
      <td className="px-4 py-3 font-bold text-brand text-sm">${payout.netEarnings.toFixed(2)}</td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium", status.cls)}>
          <StatusIcon size={10} />
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          {payout.status === "pending" && (
            <>
              <button
                onClick={() => onApprove(payout.id)}
                className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/20 text-green-600 hover:bg-green-200 transition-colors"
                aria-label="Approve"
                title="Approve payout"
              >
                <CheckCircle size={13} />
              </button>
              <button
                onClick={() => onHold(payout.id)}
                className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 transition-colors"
                aria-label="Hold"
                title="Put on hold"
              >
                <XCircle size={13} />
              </button>
            </>
          )}
          {payout.status === "held" && (
            <button
              onClick={() => onPay(payout.id)}
              className="p-1.5 rounded-md bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
              aria-label="Process payment"
              title="Release hold and mark paid"
            >
              <DollarSign size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Revenue cycle row ─────────────────────────────────────────────────────────

function CycleRow({
  cycle,
  onRunCalc,
  serverFinalization,
}: {
  cycle: RevenueCycle
  onRunCalc: (id: string) => void
  serverFinalization: boolean
}) {
  const cfg    = CYCLE_STATUS_CONFIG[cycle.status] ?? CYCLE_STATUS_CONFIG.open
  const locked = cycle.status === "locked"
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {cycle.cycleStart} — {cycle.cycleEnd}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">{cycle.subscriberCount.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm font-semibold text-foreground">${cycle.totalRevenue.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-destructive">
        {cycle.adminCommissionPct}% (${cycle.adminEarnings.toLocaleString()})
      </td>
      <td className="px-4 py-3 text-sm text-brand font-semibold">${cycle.authorPool.toLocaleString()}</td>
      <td className="px-4 py-3">
        <span className={cn("px-2 py-1 rounded-full text-[11px] font-medium", cfg.cls)}>
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {locked ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock size={11} /> Locked
          </span>
        ) : serverFinalization ? (
          <span className="text-xs text-muted-foreground max-w-[140px] inline-block">
            Finalize via server job / CLI
          </span>
        ) : (
          <Button
            size="sm"
            className="h-7 text-xs bg-brand hover:bg-brand-dark text-primary-foreground gap-1.5"
            onClick={() => onRunCalc(cycle.id)}
          >
            <Play size={10} fill="currentColor" /> Run Calc
          </Button>
        )}
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function RevenueContent() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const useLiveApi = apiUrlConfigured()
  const [liveReady, setLiveReady] = React.useState(() => !useLiveApi)
  const [liveLoading, setLiveLoading] = React.useState(false)

  const [cycles,       setCycles]       = React.useState<RevenueCycle[]>([])
  const [payouts,      setPayouts]      = React.useState<AuthorPayout[]>([])
  const [settings,     setSettings]     = React.useState<AdminSettings>({ adminCommissionPct: 30, platformFeeOnPayout: 10, maxPagesPerMinute: 5, minSessionSec: 30 })
  const [commPct,      setCommPct]      = React.useState(30)
  const [platformFee,  setPlatformFee]  = React.useState(10)
  const [running,      setRunning]      = React.useState<string | null>(null)
  const [lastCalcMsg,  setLastCalcMsg]  = React.useState<string | null>(null)
  const [saving,       setSaving]       = React.useState(false)
  const [selectedCycle,setSelectedCycle]= React.useState<string>("all")

  React.useEffect(() => {
    seedStore()
    if (useLiveApi) return
    const s = adminSettingsStore.get()
    setSettings(s)
    setCommPct(s.adminCommissionPct)
    setPlatformFee(s.platformFeeOnPayout)
    setCycles(revenueCycleStore.getAll().sort((a, b) => b.cycleStart.localeCompare(a.cycleStart)))
    setPayouts(authorPayoutStore.getAll())
  }, [user, useLiveApi])

  React.useEffect(() => {
    if (!useLiveApi || isLoading || !isAuthenticated) return
    let alive = true
    setLiveLoading(true)
    Promise.all([
      adminApi.revenueCycles(),
      adminApi.authorPayouts(),
      adminApi.subscriptionPoolSettings(),
    ])
      .then(([rc, ap, sp]) => {
        if (!alive) return
        const cRows = (Array.isArray(rc.data) ? rc.data : []).map(r =>
          apiRevenueCycleToRow(r as Record<string, unknown>))
        const pRows = (Array.isArray(ap.data) ? ap.data : []).map(r =>
          apiAuthorPayoutToRow(r as Record<string, unknown>))
        setCycles(cRows.sort((a, b) => b.cycleStart.localeCompare(a.cycleStart)))
        setPayouts(pRows)
        const pct = Number(sp.subscription_pool_commission_pct)
        if (Number.isFinite(pct)) {
          setCommPct(pct)
          setSettings(prev => ({ ...prev, adminCommissionPct: pct }))
        }
      })
      .catch(() => {
        if (!alive) return
        const s = adminSettingsStore.get()
        setSettings(s)
        setCommPct(s.adminCommissionPct)
        setPlatformFee(s.platformFeeOnPayout)
        setCycles(revenueCycleStore.getAll().sort((a, b) => b.cycleStart.localeCompare(a.cycleStart)))
        setPayouts(authorPayoutStore.getAll())
      })
      .finally(() => {
        if (alive) {
          setLiveLoading(false)
          setLiveReady(true)
        }
      })
    return () => {
      alive = false
    }
  }, [useLiveApi, isLoading, isAuthenticated])

  const refresh = () => {
    if (useLiveApi) {
      setLiveLoading(true)
      Promise.all([adminApi.revenueCycles(), adminApi.authorPayouts()])
        .then(([rc, ap]) => {
          const cRows = (Array.isArray(rc.data) ? rc.data : []).map(r =>
            apiRevenueCycleToRow(r as Record<string, unknown>))
          const pRows = (Array.isArray(ap.data) ? ap.data : []).map(r =>
            apiAuthorPayoutToRow(r as Record<string, unknown>))
          setCycles(cRows.sort((a, b) => b.cycleStart.localeCompare(a.cycleStart)))
          setPayouts(pRows)
        })
        .finally(() => setLiveLoading(false))
      return
    }
    setCycles(revenueCycleStore.getAll().sort((a, b) => b.cycleStart.localeCompare(a.cycleStart)))
    setPayouts(authorPayoutStore.getAll())
  }

  function handleRunCalc(cycleId: string) {
    if (useLiveApi) {
      setLastCalcMsg(
        "Monthly pool finalization runs on the server (e.g. `php artisan revenue:finalize-cycle` or your scheduler).",
      )
      return
    }
    setRunning(cycleId)
    setLastCalcMsg(null)
    setTimeout(() => {
      const result = revenueCycleStore.runMonthlyCalculation(cycleId, user!.id)
      setRunning(null)
      if (result.success) {
        setLastCalcMsg(`Cycle locked. ${result.payoutsCreated} payout(s) generated.`)
        refresh()
      } else {
        setLastCalcMsg(`Error: ${result.error}`)
      }
    }, 2000)
  }

  function handleApprove(payoutId: string) {
    if (useLiveApi) {
      adminApi
        .approveAuthorPayout(payoutId)
        .then(() => refresh())
        .catch((e: Error) => setLastCalcMsg(`Error: ${e.message}`))
      return
    }
    const all = authorPayoutStore.getAll()
    const idx = all.findIndex(p => p.id === payoutId)
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: "paid" as const, requestedAt: new Date().toISOString() }
      localStorage.setItem("ms_author_payouts", JSON.stringify(all))
      auditLogStore.append("payout_approved", "author_payout", payoutId, { actorId: user!.id })
      setPayouts([...all])
    }
  }

  function handleHold(payoutId: string) {
    if (useLiveApi) {
      adminApi
        .holdAuthorPayout(payoutId)
        .then(() => refresh())
        .catch((e: Error) => setLastCalcMsg(`Error: ${e.message}`))
      return
    }
    const all = authorPayoutStore.getAll()
    const idx = all.findIndex(p => p.id === payoutId)
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: "held" as const }
      localStorage.setItem("ms_author_payouts", JSON.stringify(all))
      auditLogStore.append("payout_held", "author_payout", payoutId, { actorId: user!.id })
      setPayouts([...all])
    }
  }

  function handlePay(payoutId: string) {
    if (useLiveApi) {
      adminApi
        .approveAuthorPayout(payoutId)
        .then(() => refresh())
        .catch((e: Error) => setLastCalcMsg(`Error: ${e.message}`))
      return
    }
    const all = authorPayoutStore.getAll()
    const idx = all.findIndex(p => p.id === payoutId)
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: "paid" as const, paidAt: new Date().toISOString() }
      localStorage.setItem("ms_author_payouts", JSON.stringify(all))
      auditLogStore.append("payout_paid", "author_payout", payoutId, { actorId: user!.id })
      setPayouts([...all])
    }
  }

  function handleSaveSettings() {
    if (useLiveApi) {
      setSaving(true)
      adminApi
        .updateSubscriptionPoolSettings(commPct)
        .then(() => {
          adminSettingsStore.update({ adminCommissionPct: commPct, platformFeeOnPayout: platformFee })
          setSettings(adminSettingsStore.get())
        })
        .catch((e: Error) => setLastCalcMsg(`Error: ${e.message}`))
        .finally(() => setSaving(false))
      return
    }
    setSaving(true)
    setTimeout(() => {
      adminSettingsStore.update({ adminCommissionPct: commPct, platformFeeOnPayout: platformFee })
      setSettings(adminSettingsStore.get())
      setSaving(false)
    }, 600)
  }

  const exportPayoutsCSV = () => {
    if (useLiveApi) {
      adminApi
        .authorPayoutsExport(selectedCycle === "all" ? undefined : selectedCycle)
        .catch((e: Error) => setLastCalcMsg(`Export: ${e.message}`))
      return
    }
    const header = "Author,Engagement (min),Share %,Gross,Platform Fee,Net,Status,Cycle"
    const rows = payouts.map(p => {
      const cycle = cycles.find(c => c.id === p.cycleId)
      return `"${p.authorName}",${p.totalEngagement},${p.sharePct.toFixed(2)},$${p.grossEarnings.toFixed(2)},-$${p.platformFee.toFixed(2)},$${p.netEarnings.toFixed(2)},${p.status},"${cycle?.cycleStart ?? p.cycleId}"`
    })
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a"); a.href = url; a.download = "myscriptic-payouts.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading || !user) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )

  if (useLiveApi && !liveReady) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )

  const chartLatest = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1]
  const latestCycle = cycles[0]
  const kpiRevenue    = useLiveApi && latestCycle ? latestCycle.totalRevenue : chartLatest.revenue
  const kpiAuthorPool = useLiveApi && latestCycle ? latestCycle.authorPool : chartLatest.authorPool
  const openCycle  = cycles.find(c => c.status === "open")
  const filtPayouts = selectedCycle === "all"
    ? payouts
    : payouts.filter(p => p.cycleId === selectedCycle)

  const pendingCount  = payouts.filter(p => p.status === "pending").length
  const totalNetPaidOut = payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.netEarnings, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft size={15} /> Admin
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Revenue &amp; Payouts</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Platform-wide revenue, author pool engine, and real-time payout management.
        {useLiveApi && (
          <span className="block text-xs mt-2 text-muted-foreground/90">
            Connected to Laravel admin APIs. Charts below are illustrative; cycle and payout tables are live.
          </span>
        )}
      </p>

      {/* Calc result banner */}
      {lastCalcMsg && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm",
          lastCalcMsg.startsWith("Error")
            ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            : "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
        )}>
          {lastCalcMsg.startsWith("Error") ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          {lastCalcMsg}
          <button
            onClick={() => setLastCalcMsg(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Open cycle action banner */}
      {openCycle && (
        <div className="flex items-center gap-4 p-4 bg-brand/5 border border-brand/30 rounded-xl mb-6 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <div className="p-2 bg-brand/10 rounded-lg">
              <BarChart3 size={16} className="text-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Open Cycle: {openCycle.cycleStart} — {openCycle.cycleEnd}
              </p>
              <p className="text-xs text-muted-foreground">
                Revenue: ${openCycle.totalRevenue.toLocaleString()} &bull; {openCycle.subscriberCount.toLocaleString()} subscribers &bull; Author Pool: ${openCycle.authorPool.toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2 h-9 text-xs font-semibold"
            onClick={() => handleRunCalc(openCycle.id)}
            disabled={running === openCycle.id}
          >
            {running === openCycle.id
              ? <><Loader2 size={13} className="animate-spin" /> Calculating…</>
              : <><Play size={11} fill="currentColor" /> Run Monthly Calculation</>}
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label={useLiveApi && latestCycle ? `Total Revenue (${latestCycle.cycleStart.slice(0, 7)})` : "Total Revenue (Jan)"}
          value={`$${kpiRevenue.toLocaleString()}`}
          delta={useLiveApi ? undefined : "+4.4%"}
          icon={DollarSign}
          colorClass="bg-green-50 text-green-600 dark:bg-green-900/20"
        />
        <KPICard
          label="Author Pool"
          value={`$${kpiAuthorPool.toLocaleString()}`}
          delta={useLiveApi ? undefined : "+4.4%"}
          icon={Users}
          colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
        />
        <KPICard label="Pending Payouts"     value={pendingCount.toString()} icon={Clock} colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20" />
        <KPICard label="Total Paid Out"      value={`$${totalNetPaidOut.toFixed(2)}`} icon={CheckCircle} colorClass="bg-green-50 text-green-600 dark:bg-green-900/20" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
          <TabsTrigger value="pool">Pool &amp; Commission</TabsTrigger>
          <TabsTrigger value="cycles">Billing Cycles</TabsTrigger>
          <TabsTrigger value="payouts">
            Author Payouts
            {pendingCount > 0 && (
              <span className="ml-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Revenue Overview */}
        <TabsContent value="overview">
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-foreground mb-5">6-Month Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={MONTHLY_REVENUE} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-border)" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, ""]} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-brand)" fill="url(#revGrad)" strokeWidth={2.5} name="Total Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-5">Revenue by Source</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MONTHLY_REVENUE} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-border)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-border)" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, ""]} />
                <Legend />
                <Bar dataKey="subs" name="Subscriptions" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="One-time Purchases" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Pool & Commission */}
        <TabsContent value="pool">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Formula visualizer */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-5">Revenue Pool Formula</h2>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-xl text-sm">
                  <p className="font-mono text-muted-foreground text-xs mb-2">// Pool calculation engine</p>
                  <p className="font-mono text-foreground">Total = Σ(subscriptions + purchases)</p>
                  <p className="font-mono text-destructive/80 mt-1">Admin Cut = Total × {settings.adminCommissionPct}%</p>
                  <p className="font-mono text-brand mt-1">Author Pool = Total × {100 - settings.adminCommissionPct}%</p>
                  <p className="font-mono text-muted-foreground mt-2 text-xs">Author Share = (Author Eng. / Total Eng.) × Author Pool</p>
                </div>

                {openCycle && (
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Admin ({settings.adminCommissionPct}%)</span>
                        <span className="font-semibold text-foreground">${openCycle.adminEarnings.toLocaleString()}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
                        <div className="h-full bg-destructive/60 rounded-l-full transition-all" style={{ width: `${settings.adminCommissionPct}%` }} />
                        <div className="h-full bg-brand rounded-r-full flex-1" />
                      </div>
                      <div className="flex justify-between mt-1 text-xs">
                        <span className="text-destructive/70">Admin: ${openCycle.adminEarnings.toLocaleString()}</span>
                        <span className="text-brand">Author Pool: ${openCycle.authorPool.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 bg-brand/5 border border-brand/20 rounded-lg">
                  <Info size={11} className="text-brand shrink-0 mt-0.5" />
                  Admin commission is deducted <strong className="text-foreground">before</strong> the author pool is calculated. All changes are written to the immutable audit log.
                </div>
              </div>
            </div>

            {/* Commission config */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Shield size={15} className="text-brand" />
                <h2 className="font-semibold text-foreground">Commission Configuration</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">Admin Commission</label>
                    <span className="text-sm font-bold text-brand">{commPct}%</span>
                  </div>
                  <input
                    type="range" min={10} max={50} value={commPct}
                    onChange={e => setCommPct(Number(e.target.value))}
                    className="w-full accent-brand h-2 rounded-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>10% (min)</span>
                    <span>50% (max)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Current setting: <span className="font-semibold text-foreground">{settings.adminCommissionPct}%</span>.
                    Changes apply to the <em>next</em> billing cycle only.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">Platform Fee on Payout</label>
                    <span className="text-sm font-bold text-brand">{platformFee}%</span>
                  </div>
                  <input
                    type="range" min={0} max={20} value={platformFee}
                    onChange={e => setPlatformFee(Number(e.target.value))}
                    className="w-full accent-brand h-2 rounded-full"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Deducted from author gross earnings before net payout. Current: <span className="font-semibold text-foreground">{settings.platformFeeOnPayout}%</span>.
                    {useLiveApi && (
                      <span className="block mt-1.5"> Stored locally for this UI only — not sent to the API.</span>
                    )}
                  </p>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="w-full bg-brand hover:bg-brand-dark text-primary-foreground gap-2"
                  >
                    {saving
                      ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                      : <><Shield size={14} /> Update &amp; Log to Audit</>}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={exportPayoutsCSV}
                  >
                    <Download size={14} /> Export Audit Log (CSV)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Billing Cycles */}
        <TabsContent value="cycles">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Billing Cycles</h2>
              <Button
                variant="outline" size="sm"
                className="gap-2 h-8 text-xs hover:border-brand hover:text-brand"
                onClick={refresh}
                disabled={liveLoading}
              >
                <RefreshCw size={12} className={liveLoading ? "animate-spin" : ""} /> Refresh
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Period", "Subscribers", "Total Revenue", "Admin Cut", "Author Pool", "Status", "Action"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cycles.map(cycle => (
                    <CycleRow
                      key={cycle.id}
                      cycle={cycle}
                      onRunCalc={handleRunCalc}
                      serverFinalization={useLiveApi}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Locked Cycles Are Immutable</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                Once a cycle is locked, its revenue figures, author pool, and payouts cannot be changed. This protects authors and ensures a tamper-proof audit trail.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Payouts table */}
        <TabsContent value="payouts">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Author Payouts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pendingCount} pending approval
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedCycle}
                  onChange={e => setSelectedCycle(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Cycles</option>
                  {cycles.map(c => (
                    <option key={c.id} value={c.id}>{c.cycleStart}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={exportPayoutsCSV}>
                  <Download size={12} /> Export CSV
                </Button>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-dark text-primary-foreground h-8 text-xs gap-2"
                  onClick={() => {
                    const pending = filtPayouts.filter(p => p.status === "pending")
                    if (useLiveApi) {
                      Promise.all(pending.map(p => adminApi.approveAuthorPayout(p.id)))
                        .then(() => refresh())
                        .catch((e: Error) => setLastCalcMsg(`Error: ${e.message}`))
                    } else {
                      pending.forEach(p => handleApprove(p.id))
                    }
                  }}
                >
                  <CheckCircle size={12} /> Mark all pending paid
                </Button>
              </div>
            </div>

            {filtPayouts.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign size={28} className="text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground">No payouts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Run the monthly calculation on an open billing cycle to generate payouts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {["Author", "Engagement", "Share", "Gross", "Platform Fee", "Net Payout", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtPayouts.map(p => (
                      <PayoutRow
                        key={p.id}
                        payout={p}
                        onApprove={handleApprove}
                        onHold={handleHold}
                        onPay={handlePay}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function AdminRevenuePage() {
  return <RevenueContent />
}
