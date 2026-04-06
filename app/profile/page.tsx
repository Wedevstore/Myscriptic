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
import { authApi } from "@/lib/api"
import { apiUrlConfigured, laravelAuthEnabled } from "@/lib/auth-mode"
import { normalizeAuthUser } from "@/components/providers/auth-provider"
import {
  User, Mail, Lock, Bell, Moon, Sun, Shield,
  CheckCircle, CreditCard, Globe, Trash2, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

function ProfileContent() {
  const { user, isAuthenticated, isLoading, updateUser, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()

  const [nameVal, setNameVal] = React.useState(user?.name ?? "")
  const [saved, setSaved] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

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
                <div className="space-y-4 max-w-sm">
                  {["Current Password", "New Password", "Confirm New Password"].map((lbl, i) => (
                    <div key={lbl} className="space-y-1.5">
                      <Label>{lbl}</Label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" className="pl-9" />
                      </div>
                    </div>
                  ))}
                  <Button className="bg-brand hover:bg-brand-dark text-primary-foreground">
                    Update Password
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Two-Factor Authentication</h3>
                <div className="flex items-start justify-between gap-4 p-4 bg-muted rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">Authenticator App</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add an extra layer of security to your account with TOTP.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 gap-2">
                    <Shield size={13} /> Enable 2FA
                  </Button>
                </div>
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
                  <Button variant="destructive" size="sm" className="shrink-0 gap-2">
                    <Trash2 size={13} /> Delete
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
            <div className="flex justify-end pt-2 border-t border-border">
              <Button className="bg-brand hover:bg-brand-dark text-primary-foreground">Save Preferences</Button>
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
                  <Button variant="outline" className="flex-1 hover:border-brand hover:text-brand">Change Plan</Button>
                  <Button variant="outline" className="flex-1 hover:border-destructive hover:text-destructive">Cancel Plan</Button>
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
                    onClick={() => setTheme(t.value as "light" | "dark" | "system")}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                      resolvedTheme === t.value || (t.value === "system")
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
              <select className="w-full max-w-xs h-10 px-3 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="yo">Yoruba</option>
                <option value="ig">Igbo</option>
                <option value="ha">Hausa</option>
                <option value="sw">Swahili</option>
              </select>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button className="bg-brand hover:bg-brand-dark text-primary-foreground">Save Preferences</Button>
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
