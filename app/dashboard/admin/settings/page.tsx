"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { seedP4, activityLogStore } from "@/lib/store-p4"
import { Save, Check, Globe, DollarSign, BookOpen, Users, Bell, Shield, RefreshCw, Megaphone } from "lucide-react"
import { adminApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { Textarea } from "@/components/ui/textarea"

// ── Local-storage backed platform settings ────────────────────────────────────
const SETTINGS_KEY = "mys_p4_settings"

interface PlatformSettings {
  platformName:        string
  supportEmail:        string
  authorRevenueShare:  number   // percentage e.g. 70
  autoApproveAuthors:  boolean
  maxBooksPerAuthor:   number
  trialDays:           number
  emailOnNewBook:      boolean
  emailOnSubscription: boolean
  emailOnPayout:       boolean
  maintenanceMode:     boolean
}

const DEFAULTS: PlatformSettings = {
  platformName:        "MyScriptic",
  supportEmail:        "support@myscriptic.com",
  authorRevenueShare:  70,
  autoApproveAuthors:  false,
  maxBooksPerAuthor:   50,
  trialDays:           7,
  emailOnNewBook:      true,
  emailOnSubscription: true,
  emailOnPayout:       true,
  maintenanceMode:     false,
}

function loadSettings(): PlatformSettings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const v = localStorage.getItem(SETTINGS_KEY)
    return v ? { ...DEFAULTS, ...JSON.parse(v) } : DEFAULTS
  } catch { return DEFAULTS }
}

function saveSettings(s: PlatformSettings) {
  if (typeof window === "undefined") return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, className }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("bg-card border border-border rounded-xl overflow-hidden", className)}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
        <Icon size={14} className="text-muted-foreground" />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  )
}

// ── Toggle row ───────────────────────────────────────────────────────────────
function ToggleRow({ id, label, description, checked, onChange }: {
  id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const [settings, setSettings] = React.useState<PlatformSettings>(DEFAULTS)
  const [saved,    setSaved]    = React.useState(false)
  const [loading,  setLoading]  = React.useState(true)

  const [sfLoading, setSfLoading] = React.useState(() => apiUrlConfigured())
  const [sfSaved, setSfSaved] = React.useState(false)
  const [sfError, setSfError] = React.useState("")
  const [saveErr, setSaveErr] = React.useState("")
  const live = apiUrlConfigured()
  const [siteFeatures, setSiteFeatures] = React.useState({
    ads_enabled: false,
    ads_network: "adsense",
    ads_client_id: "",
    ads_slot_banner: "",
    ads_slot_feed: "",
    ads_slot_rewarded: "",
    feature_flags_json: "{}",
  })

  React.useEffect(() => { seedP4(); setSettings(loadSettings()); setLoading(false) }, [])

  React.useEffect(() => {
    if (!live) {
      setSfLoading(false)
      return
    }
    adminApi
      .siteFeatures()
      .then(r => {
        const d = r.data
        setSiteFeatures({
          ads_enabled: d.ads_enabled === "1" || d.ads_enabled === "true",
          ads_network: d.ads_network || "adsense",
          ads_client_id: d.ads_client_id || "",
          ads_slot_banner: d.ads_slot_banner || "",
          ads_slot_feed: d.ads_slot_feed || "",
          ads_slot_rewarded: d.ads_slot_rewarded || "",
          feature_flags_json: d.feature_flags_json || "{}",
        })
      })
      .catch(() => setSfError("Could not load site features (check admin session)."))
      .finally(() => setSfLoading(false))
  }, [live])

  React.useEffect(() => {
    if (!live) return
    adminApi
      .subscriptionPoolSettings()
      .then(s => {
        const commission = Number(s.subscription_pool_commission_pct ?? 30)
        const authorPct = 100 - commission
        const snapped = Math.min(90, Math.max(50, Math.round(authorPct / 5) * 5))
        setSettings(prev => ({ ...prev, authorRevenueShare: snapped }))
      })
      .catch(() => { /* keep local default */ })
  }, [live])

  function set<K extends keyof PlatformSettings>(key: K, val: PlatformSettings[K]) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function handleSaveSiteFeatures() {
    setSfError("")
    try {
      await adminApi.updateSiteFeatures({
        ads_enabled: siteFeatures.ads_enabled,
        ads_network: siteFeatures.ads_network,
        ads_client_id: siteFeatures.ads_client_id,
        ads_slot_banner: siteFeatures.ads_slot_banner,
        ads_slot_feed: siteFeatures.ads_slot_feed,
        ads_slot_rewarded: siteFeatures.ads_slot_rewarded,
        feature_flags_json: siteFeatures.feature_flags_json,
      })
      setSfSaved(true)
      setTimeout(() => setSfSaved(false), 2500)
    } catch (e) {
      setSfError(e instanceof Error ? e.message : "Save failed.")
    }
  }

  async function handleSave() {
    setSaveErr("")
    saveSettings(settings)
    if (live) {
      try {
        await adminApi.updateSubscriptionPoolSettings(100 - settings.authorRevenueShare)
      } catch (e) {
        setSaveErr(e instanceof Error ? e.message : "Could not save subscription pool settings.")
        return
      }
    }
    activityLogStore.log({
      userId:   "admin",
      userName: "Admin",
      action:   live ? "Subscription pool commission updated (API)" : "Platform settings updated",
      category: "admin",
      metadata: {},
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <RefreshCw size={20} className="animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl font-bold text-foreground">Platform Settings</h1>
            {live && <Badge variant="outline" className="text-[10px]">API</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Configure global platform behaviour and defaults.</p>
          {saveErr && <p className="text-xs text-destructive mt-1">{saveErr}</p>}
        </div>
        <Button
          onClick={handleSave}
          size="sm"
          className={cn(
            "gap-1.5 h-8 text-xs transition-all",
            saved
              ? "bg-green-500 hover:bg-green-500 text-white"
              : "bg-brand text-primary-foreground hover:bg-brand-dark"
          )}
        >
          {saved ? <><Check size={12} /> Saved</> : <><Save size={12} /> Save Changes</>}
        </Button>
      </div>

      {/* Maintenance mode banner */}
      {settings.maintenanceMode && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <Shield size={15} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-400 font-medium">
            Maintenance mode is <strong>ON</strong> — users will see a maintenance page instead of the platform.
          </p>
        </div>
      )}

      {/* General */}
      <Section title="General" icon={Globe}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Platform Name</Label>
            <Input value={settings.platformName} onChange={e => set("platformName", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Support Email</Label>
            <Input type="email" value={settings.supportEmail} onChange={e => set("supportEmail", e.target.value)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Free Trial Days</Label>
            <Input type="number" min={0} max={30} value={settings.trialDays} onChange={e => set("trialDays", Number(e.target.value))} />
            <p className="text-[10px] text-muted-foreground">Set to 0 to disable free trials.</p>
          </div>
          <div className="flex items-center justify-between pt-4">
            <Badge className={cn(
              "text-xs border-0",
              settings.trialDays > 0
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            )}>
              {settings.trialDays > 0 ? `${settings.trialDays}-day trial active` : "Trials disabled"}
            </Badge>
          </div>
        </div>
        <ToggleRow
          id="maintenance"
          label="Maintenance Mode"
          description="Temporarily shut down the platform for all non-admin users."
          checked={settings.maintenanceMode}
          onChange={v => set("maintenanceMode", v)}
        />
      </Section>

      {/* Revenue */}
      <Section title="Revenue & Payouts" icon={DollarSign}>
        {live && (
          <p className="text-xs text-muted-foreground -mt-2 mb-2">
            The slider updates Laravel <code className="text-[10px] bg-muted px-1 rounded">subscription_pool_commission_pct</code> (platform keeps{" "}
            {100 - settings.authorRevenueShare}%, authors share the remainder of the subscription engagement pool). General options below still save to this browser only.
          </p>
        )}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">
            {live ? "Subscription pool — author share (%)" : "Author Revenue Share (%)"}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="range" min={50} max={90} step={5}
              value={settings.authorRevenueShare}
              onChange={e => set("authorRevenueShare", Number(e.target.value))}
              className="flex-1 h-2 accent-brand"
            />
            <span className="text-lg font-bold font-serif text-brand w-14 text-right">{settings.authorRevenueShare}%</span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Authors: {settings.authorRevenueShare}%</span>
            <span>Platform: {100 - settings.authorRevenueShare}%</span>
          </div>
        </div>
      </Section>

      {/* Content */}
      <Section title="Content & Authors" icon={BookOpen}>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Max Books per Author</Label>
          <Input type="number" min={1} max={500} value={settings.maxBooksPerAuthor} onChange={e => set("maxBooksPerAuthor", Number(e.target.value))} className="max-w-[160px]" />
          <p className="text-[10px] text-muted-foreground">Limit the number of books each author can publish.</p>
        </div>
        <ToggleRow
          id="autoApprove"
          label="Auto-approve Author Applications"
          description="New author applications will be approved automatically without manual review."
          checked={settings.autoApproveAuthors}
          onChange={v => set("autoApproveAuthors", v)}
        />
      </Section>

      {/* Notifications */}
      <Section title="Email Notifications" icon={Bell}>
        <ToggleRow
          id="emailNewBook"
          label="New Book Published"
          description="Send email to subscribers when a new book is published."
          checked={settings.emailOnNewBook}
          onChange={v => set("emailOnNewBook", v)}
        />
        <ToggleRow
          id="emailSub"
          label="Subscription Events"
          description="Send email on new subscription, upgrade, or cancellation."
          checked={settings.emailOnSubscription}
          onChange={v => set("emailOnSubscription", v)}
        />
        <ToggleRow
          id="emailPayout"
          label="Payout Processed"
          description="Notify authors when a payout is processed."
          checked={settings.emailOnPayout}
          onChange={v => set("emailOnPayout", v)}
        />
      </Section>

      {/* Ads & remote flags (API-backed) */}
      <Section title="Ads & feature flags" icon={Megaphone}>
        {sfLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading…
          </p>
        ) : (
          <>
            {sfError && (
              <p className="text-xs text-destructive">{sfError}</p>
            )}
            <ToggleRow
              id="ads_enabled"
              label="Enable ads"
              description="Shows AdSense placements on the storefront when client ID and slots are set."
              checked={siteFeatures.ads_enabled}
              onChange={v => setSiteFeatures(s => ({ ...s, ads_enabled: v }))}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ad network</Label>
                <Input
                  value={siteFeatures.ads_network}
                  onChange={e => setSiteFeatures(s => ({ ...s, ads_network: e.target.value }))}
                  placeholder="adsense"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Publisher client ID (ca-pub-…)</Label>
                <Input
                  value={siteFeatures.ads_client_id}
                  onChange={e => setSiteFeatures(s => ({ ...s, ads_client_id: e.target.value }))}
                  placeholder="ca-pub-xxxxxxxx"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Banner ad slot</Label>
                <Input
                  value={siteFeatures.ads_slot_banner}
                  onChange={e => setSiteFeatures(s => ({ ...s, ads_slot_banner: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">In-feed ad slot</Label>
                <Input
                  value={siteFeatures.ads_slot_feed}
                  onChange={e => setSiteFeatures(s => ({ ...s, ads_slot_feed: e.target.value }))}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Rewarded slot (optional)</Label>
                <Input
                  value={siteFeatures.ads_slot_rewarded}
                  onChange={e => setSiteFeatures(s => ({ ...s, ads_slot_rewarded: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Feature flags (JSON)</Label>
              <Textarea
                value={siteFeatures.feature_flags_json}
                onChange={e => setSiteFeatures(s => ({ ...s, feature_flags_json: e.target.value }))}
                rows={4}
                className="font-mono text-xs"
                placeholder='{"beta_reader":false}'
              />
              <p className="text-[10px] text-muted-foreground">Exposed publicly as booleans via GET /api/site-config.</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSiteFeatures}
              className={cn(
                "gap-1.5 h-8 text-xs",
                sfSaved ? "bg-green-500 hover:bg-green-500 text-white" : "bg-brand text-primary-foreground hover:bg-brand-dark"
              )}
            >
              {sfSaved ? <><Check size={12} /> Saved</> : <><Save size={12} /> Save ads & flags</>}
            </Button>
          </>
        )}
      </Section>

      {/* Admin security */}
      <Section title="Access & Security" icon={Shield}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-1">
            <Users size={16} className="text-muted-foreground mb-1" />
            <p className="text-xs font-semibold text-foreground">Admin Role</p>
            <p className="text-[10px] text-muted-foreground">Only users with role = "admin" can access this panel. Roles are managed in the auth system.</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 space-y-1">
            <Shield size={16} className="text-muted-foreground mb-1" />
            <p className="text-xs font-semibold text-foreground">Session Security</p>
            <p className="text-[10px] text-muted-foreground">Sessions are protected by HTTP-only cookies with a 24-hour expiry. All admin actions are audit-logged.</p>
          </div>
        </div>
      </Section>
    </div>
  )
}
