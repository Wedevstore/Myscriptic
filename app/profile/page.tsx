"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTheme } from "@/components/providers/theme-provider"
import { authApi, subscriptionsApi } from "@/lib/api"
import { apiUrlConfigured, laravelAuthEnabled, laravelPhase3Enabled } from "@/lib/auth-mode"
import { subscriptionStore } from "@/lib/store"
import { normalizeAuthUser } from "@/components/providers/auth-provider"
import {
  User, Mail, Lock, Bell, Moon, Sun,
  CheckCircle, CreditCard, Globe, Trash2, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TwoFactorCard } from "@/components/profile/two-factor-card"

const LOCALE_STORAGE_KEY = "myscriptic-locale"

const APP_LOCALES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "yo", label: "Yoruba" },
  { value: "ig", label: "Igbo" },
  { value: "ha", label: "Hausa" },
  { value: "sw", label: "Swahili" },
] as const

type AppLocale = (typeof APP_LOCALES)[number]["value"]

function isAppLocale(s: string): s is AppLocale {
  return APP_LOCALES.some(l => l.value === s)
}

function ProfileContent() {
  const { user, isAuthenticated, isLoading, updateUser, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const [nameVal, setNameVal] = React.useState(user?.name ?? "")
  const [saved, setSaved] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [locale, setLocale] = React.useState<AppLocale>("en")
  const [preferencesSaved, setPreferencesSaved] = React.useState(false)
  const [pwForm, setPwForm] = React.useState({ current: "", next: "", confirm: "" })
  const [pwLoading, setPwLoading] = React.useState(false)
  const [pwMsg, setPwMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [notifSaved, setNotifSaved] = React.useState(false)
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [subscriptionActionLoading, setSubscriptionActionLoading] = React.useState(false)
  const [subscriptionActionMessage, setSubscriptionActionMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Notification preferences (local state)
  const [notifPrefs, setNotifPrefs] = React.useState({
    newBooks: true,
    promotions: true,
    subscriptionAlerts: true,
    weeklyDigest: false,
    authorUpdates: true,
  })

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/auth/login?next=%2Fprofile")
  }, [isLoading, isAuthenticated, router])

  React.useEffect(() => {
    if (user) setNameVal(user.name)
  }, [user])

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("myscriptic-notif-prefs")
      if (raw) setNotifPrefs(JSON.parse(raw))
    } catch { /* ignore corrupt data */ }
  }, [])

  React.useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    const next: AppLocale = stored && isAppLocale(stored) ? stored : "en"
    setLocale(next)
    if (typeof document !== "undefined") {
      document.documentElement.lang = next
    }
  }, [])

  const handleSavePreferences = () => {
    const next: AppLocale = isAppLocale(locale) ? locale : "en"
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
    document.documentElement.lang = next
    setLocale(next)
    setPreferencesSaved(true)
    window.setTimeout(() => setPreferencesSaved(false), 2500)
  }

  const handleUpdatePassword = async () => {
    setPwMsg(null)
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwMsg({ type: "error", text: "Please fill in all password fields." })
      return
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ type: "error", text: "New password must be at least 8 characters." })
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: "error", text: "New passwords do not match." })
      return
    }
    setPwLoading(true)
    try {
      if (apiUrlConfigured() && laravelAuthEnabled()) {
        await authApi.changePassword({
          current_password: pwForm.current,
          password: pwForm.next,
          password_confirmation: pwForm.confirm,
        })
      } else {
        await new Promise(r => setTimeout(r, 700))
      }
      setPwForm({ current: "", next: "", confirm: "" })
      setPwMsg({ type: "success", text: "Password updated." })
    } catch (e) {
      setPwMsg({ type: "error", text: e instanceof Error ? e.message : "Could not update password." })
    } finally {
      setPwLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const ok = window.confirm(
      "Are you sure you want to permanently delete your account? This cannot be undone."
    )
    if (!ok) return
    setDeleteLoading(true)
    try {
      if (apiUrlConfigured() && laravelAuthEnabled()) {
        await authApi.deleteMe()
      }
      logout()
      router.push("/")
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not delete account.")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSaveNotifPrefs = () => {
    localStorage.setItem("myscriptic-notif-prefs", JSON.stringify(notifPrefs))
    setNotifSaved(true)
    window.setTimeout(() => setNotifSaved(false), 2500)
  }

  async function syncSubscriptionFromApi(): Promise<void> {
    if (!laravelPhase3Enabled() || !apiUrlConfigured()) return
    try {
      const s = await subscriptionsApi.status()
      if (s.active && s.expires_at && s.plan) {
        updateUser({
          subscriptionPlan:      s.plan.name,
          subscriptionExpiresAt: s.expires_at,
        })
      } else {
        updateUser({ subscriptionPlan: null, subscriptionExpiresAt: null })
      }
    } catch {
      try {
        const me = await authApi.me()
        updateUser(normalizeAuthUser(me.user))
      } catch {
        /* ignore */
      }
    }
  }

  const handleChangePlan = () => {
    setSubscriptionActionMessage(null)
    router.push("/subscription?change=1")
  }

  const handleCancelSubscription = async () => {
    if (!user) return
    setSubscriptionActionMessage(null)
    const ok = window.confirm(
      "Cancel your subscription? You may keep access until the end of the current billing period, depending on your plan."
    )
    if (!ok) return
    setSubscriptionActionLoading(true)
    try {
      if (laravelPhase3Enabled() && apiUrlConfigured() && laravelAuthEnabled()) {
        await subscriptionsApi.cancel()
        await syncSubscriptionFromApi()
        setSubscriptionActionMessage({
          type: "success",
          text: "Your subscription was updated. If you still have access until a future date, it will show above.",
        })
      } else {
        const sub = subscriptionStore.getActiveByUser(user.id)
        if (!sub) {
          updateUser({ subscriptionPlan: null, subscriptionExpiresAt: null })
          setSubscriptionActionMessage({
            type: "success",
            text: "Local subscription state cleared.",
          })
          return
        }
        subscriptionStore.cancel(sub.id, user.id)
        updateUser({ subscriptionPlan: null, subscriptionExpiresAt: null })
        setSubscriptionActionMessage({
          type: "success",
          text: "Subscription cancelled (demo).",
        })
      }
    } catch (e) {
      setSubscriptionActionMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Could not cancel subscription. Try again.",
      })
    } finally {
      setSubscriptionActionLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    const trimmed = nameVal.trim()
    if (!trimmed || trimmed === user.name) return
    setSaving(true)
    try {
      if (apiUrlConfigured() && laravelAuthEnabled()) {
        const res = await authApi.updateMe({ name: trimmed })
        updateUser(normalizeAuthUser(res.user))
      } else {
        await new Promise(r => setTimeout(r, 700))
        updateUser({ name: trimmed })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      /* keep prior name */
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <Avatar className="w-20 h-20">
          <AvatarFallback className="bg-brand text-primary-foreground text-2xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="capitalize text-xs">{user.role}</Badge>
            {user.subscriptionPlan && (
              <Badge className="bg-brand/10 text-brand border-0 text-xs">{user.subscriptionPlan}</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2"><User size={14} /> Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Lock size={14} /> Security</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell size={14} /> Notifications</TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2"><CreditCard size={14} /> Subscription</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2"><Globe size={14} /> Preferences</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-foreground">Personal Information</h2>
            <Separator />

            {saved && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Profile updated successfully!
                </AlertDescription>
              </Alert>
            )}

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Full Name</Label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-name"
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    className="pl-9"
                    placeholder="Your full name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email Address</Label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    value={user.email}
                    disabled
                    className="pl-9 opacity-60"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Contact support to change your email.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-role">Account Role</Label>
                <Input id="profile-role" value={user.role} disabled className="capitalize opacity-60" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-joined">Member Since</Label>
                <Input
                  id="profile-joined"
                  value={new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  disabled
                  className="opacity-60"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveProfile}
                disabled={saving || nameVal.trim() === user.name || !nameVal.trim()}
                className="bg-brand hover:bg-brand-dark text-primary-foreground gap-2"
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-foreground">Security Settings</h2>
            <Separator />

            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Change Password</h3>
                {pwMsg && (
                  <Alert
                    variant={pwMsg.type === "error" ? "destructive" : "default"}
                    className={cn("mb-4 max-w-sm", pwMsg.type === "success" && "border-green-200 bg-green-50 text-green-900 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-200")}
                  >
                    <AlertDescription>{pwMsg.text}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4 max-w-sm">
                  {([
                    { label: "Current Password", key: "current" as const, id: "pw-current" },
                    { label: "New Password", key: "next" as const, id: "pw-next" },
                    { label: "Confirm New Password", key: "confirm" as const, id: "pw-confirm" },
                  ]).map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id={field.id}
                          type="password"
                          autoComplete={field.key === "current" ? "current-password" : "new-password"}
                          placeholder="••••••••"
                          className="pl-9"
                          value={pwForm[field.key]}
                          onChange={e => { setPwMsg(null); setPwForm(f => ({ ...f, [field.key]: e.target.value })) }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    className="bg-brand hover:bg-brand-dark text-primary-foreground"
                    disabled={pwLoading}
                    onClick={handleUpdatePassword}
                  >
                    {pwLoading ? <><Loader2 size={14} className="animate-spin mr-2" /> Updating…</> : "Update Password"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Two-Factor Authentication</h3>
                <TwoFactorCard user={user} updateUser={updateUser} />
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-destructive mb-3">Danger Zone</h3>
                <div className="flex items-start justify-between gap-4 p-4 border border-destructive/20 bg-destructive/5 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">Delete Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently delete your account and all associated data. This cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0 gap-2"
                    disabled={deleteLoading}
                    onClick={handleDeleteAccount}
                  >
                    {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-foreground">Notification Preferences</h2>
            <Separator />
            <div className="space-y-4">
              {[
                { key: "newBooks",            label: "New Book Releases",          desc: "Get notified when authors you follow release new books." },
                { key: "promotions",          label: "Promotions & Deals",          desc: "Flash sales, discount codes, and special offers." },
                { key: "subscriptionAlerts",  label: "Subscription Alerts",         desc: "Renewal reminders and plan change notifications." },
                { key: "weeklyDigest",        label: "Weekly Reading Digest",       desc: "A weekly summary of your reading activity and recommendations." },
                { key: "authorUpdates",       label: "Author Updates",              desc: "News and announcements from authors you follow." },
              ].map(item => (
                <div key={item.key} className="flex items-start justify-between gap-6 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      notifPrefs[item.key as keyof typeof notifPrefs] ? "bg-brand" : "bg-muted-foreground/30"
                    )}
                    role="switch"
                    aria-checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                        notifPrefs[item.key as keyof typeof notifPrefs] ? "translate-x-4" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end items-center gap-3 pt-2 border-t border-border">
              {notifSaved && (
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 shrink-0">
                  <CheckCircle size={14} aria-hidden /> Saved
                </span>
              )}
              <Button
                type="button"
                className="bg-brand hover:bg-brand-dark text-primary-foreground"
                onClick={handleSaveNotifPrefs}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-foreground">My Subscription</h2>
            <Separator />

            {user.subscriptionPlan ? (
              <div className="space-y-4">
                {subscriptionActionMessage && (
                  <Alert
                    variant={subscriptionActionMessage.type === "error" ? "destructive" : "default"}
                    className={
                      subscriptionActionMessage.type === "success"
                        ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-200"
                        : undefined
                    }
                  >
                    <AlertDescription>{subscriptionActionMessage.text}</AlertDescription>
                  </Alert>
                )}
                <div className="flex items-start justify-between gap-4 p-5 bg-brand/5 border border-brand/20 rounded-xl">
                  <div>
                    <p className="font-semibold text-foreground">{user.subscriptionPlan}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Active until {user.subscriptionExpiresAt
                        ? new Date(user.subscriptionExpiresAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0">Active</Badge>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 hover:border-brand hover:text-brand"
                    onClick={handleChangePlan}
                    disabled={subscriptionActionLoading}
                  >
                    Change Plan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 hover:border-destructive hover:text-destructive"
                    onClick={handleCancelSubscription}
                    disabled={subscriptionActionLoading}
                  >
                    {subscriptionActionLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" /> Working…
                      </span>
                    ) : (
                      "Cancel Plan"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <CreditCard size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-foreground font-semibold mb-1">No active subscription</p>
                <p className="text-sm text-muted-foreground mb-4">Subscribe to access unlimited ebooks and audiobooks.</p>
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground" onClick={() => router.push("/subscription")}>
                  View Plans
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h2 className="font-semibold text-foreground">App Preferences</h2>
            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Theme</h3>
              <div className="flex gap-3">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark",  label: "Dark",  icon: Moon },
                  { value: "system",label: "System",icon: Globe },
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value as "light" | "dark" | "system")}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                      theme === t.value
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-border text-muted-foreground hover:border-brand/30"
                    )}
                  >
                    <t.icon size={20} />
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Language</h3>
              <p className="text-xs text-muted-foreground mb-2 max-w-md">
                Applies the site language preference for this browser. Theme changes above are saved as soon as you tap an option.
              </p>
              <select
                value={locale}
                onChange={e => {
                  const v = e.target.value
                  setLocale(isAppLocale(v) ? v : "en")
                }}
                className="w-full max-w-xs h-10 px-3 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Interface language"
              >
                {APP_LOCALES.map(l => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2 border-t border-border">
              {preferencesSaved && (
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 shrink-0">
                  <CheckCircle size={14} aria-hidden /> Preferences saved
                </span>
              )}
              <Button
                type="button"
                className="bg-brand hover:bg-brand-dark text-primary-foreground"
                onClick={handleSavePreferences}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sign out */}
      <div className="mt-8 text-center">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive gap-2"
          onClick={() => { logout(); router.push("/") }}
        >
          Sign out of MyScriptic
        </Button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          <ProfileContent />
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
