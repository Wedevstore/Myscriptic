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
  ChevronLeft, TrendingUp, Users, DollarSign, Plus,
  Edit2, Trash2, Check, X, BookOpen, Crown,
  Calendar, AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"

// ── Mock Data ─────────────────────────────────────────────────────────────────
const PLANS = [
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

// ── Plan Form ─────────────────────────────────────────────────────────────────
function PlanCard({ plan }: { plan: typeof PLANS[0] }) {
  const [active, setActive] = React.useState(plan.isActive)
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
            <span className="text-3xl font-bold text-brand">${plan.price}</span>
            <span className="text-sm text-muted-foreground">/{plan.duration === 30 ? "mo" : "yr"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Active</span>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-muted/60 rounded-xl p-3 text-center">
          <div className="text-lg font-bold font-serif text-foreground">{plan.subscribers.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">Subscribers</div>
        </div>
        <div className="bg-muted/60 rounded-xl p-3 text-center">
          <div className="text-lg font-bold font-serif text-green-600 dark:text-green-400">
            ${(plan.revenue / 1000).toFixed(0)}k
          </div>
          <div className="text-[10px] text-muted-foreground">Total Revenue</div>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-5">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check size={13} className="text-brand shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5 hover:border-brand hover:text-brand">
          <Edit2 size={13} /> Edit Plan
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:border-destructive hover:text-destructive gap-1.5">
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  )
}

function NewPlanForm() {
  const [open, setOpen] = React.useState(false)
  if (!open) {
    return (
      <button
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
        <button onClick={() => setOpen(false)}><X size={16} className="text-muted-foreground" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Plan Name</Label>
          <Input placeholder="e.g. Pro Monthly" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Price (USD)</Label>
          <Input placeholder="9.99" type="number" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Duration (days)</Label>
          <Input placeholder="30" type="number" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Currency</Label>
          <Input placeholder="USD" className="mt-1 h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Features (one per line)</Label>
        <textarea
          className="w-full mt-1 rounded-lg border border-input bg-background p-2.5 text-sm resize-none h-20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={"Unlimited book access\nAudiobook streaming\nOffline downloads"}
        />
      </div>
      <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold">
        Create Plan
      </Button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
function SubscriptionsContent() {
  const totalSubs   = PLANS.reduce((s, p) => s + p.subscribers, 0)
  const totalRevSub = PLANS.reduce((s, p) => s + p.revenue, 0)
  const churnRate   = 3.4

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
        <h1 className="font-serif text-2xl font-bold text-foreground">Subscription Management</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Manage plans, monitor subscriber growth, and track recurring revenue.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Subscribers", value: totalSubs.toLocaleString(),          icon: Users,      color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",    delta: "+6.1%" },
          { label: "Subscription Revenue", value: `$${(totalRevSub/1000).toFixed(0)}k`, icon: DollarSign, color: "text-green-500 bg-green-50 dark:bg-green-900/20", delta: "+14%" },
          { label: "Active Plans",       value: PLANS.filter(p => p.isActive).length.toString(), icon: BookOpen, color: "text-brand bg-amber-50 dark:bg-amber-900/20", delta: null },
          { label: "Monthly Churn",      value: `${churnRate}%`,                     icon: TrendingUp, color: "text-red-500 bg-red-50 dark:bg-red-900/20",        delta: "-0.4%" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-lg", kpi.color)}>
                <kpi.icon size={18} />
              </div>
              {kpi.delta && (
                <Badge className={cn(
                  "border-0 text-[10px]",
                  kpi.delta.startsWith("+") ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
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

        {/* Plans tab */}
        <TabsContent value="plans">
          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map(p => <PlanCard key={p.id} plan={p} />)}
            <NewPlanForm />
          </div>
        </TabsContent>

        {/* Growth chart */}
        <TabsContent value="growth">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-5">Subscriber Growth (6 months)</h2>
            <ResponsiveContainer width="100%" height={320}>
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
                <Area type="monotone" dataKey="monthly" name="Monthly Plan" stroke="var(--color-brand)" fill="url(#monthlyGrad)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="annual" name="Annual Plan" stroke="var(--color-accent-sky)" fill="url(#annualGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Subscribers table */}
        <TabsContent value="subscribers">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Recent Subscriptions</h2>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs hover:border-brand hover:text-brand">
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
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
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

          {/* Cancellation insight */}
          <div className="mt-5 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Churn Insight</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                3.4% churn rate this month. Top cancellation reasons: <em>price</em> (42%), <em>content selection</em> (31%), <em>technical issues</em> (18%). Consider a retention offer for at-risk subscribers.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function AdminSubscriptionsPage() {
  return <SubscriptionsContent />
}
