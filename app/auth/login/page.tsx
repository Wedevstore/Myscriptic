"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { safeInternalPath } from "@/lib/safe-internal-path"
import { useAuth } from "@/components/providers/auth-provider"
import { SocialLoginButtons } from "@/components/auth/social-login-buttons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, ArrowLeft,
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useAuth()
  const afterLogin = safeInternalPath(searchParams.get("next") ?? searchParams.get("redirect"))

  const goAfterLogin = React.useCallback(() => {
    router.push(afterLogin)
  }, [router, afterLogin])
  const registerHref =
    afterLogin === "/"
      ? "/auth/register"
      : `/auth/register?next=${encodeURIComponent(afterLogin)}`
  const forgotHref =
    afterLogin === "/"
      ? "/auth/forgot-password"
      : `/auth/forgot-password?next=${encodeURIComponent(afterLogin)}`

  const [form, setForm] = React.useState({ email: "", password: "" })
  const [showPw, setShowPw] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) router.replace(afterLogin)
  }, [isAuthenticated, router, afterLogin])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("")
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { setError("Please fill in all fields."); return }
    setLoading(true)
    const result = await login(form.email, form.password)
    setLoading(false)
    if (!result.success) setError(result.error ?? "Login failed.")
    else goAfterLogin()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative book stack */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-32 h-44 bg-brand rounded-sm rotate-[-8deg]" />
          <div className="absolute top-28 left-20 w-28 h-40 bg-accent-sky rounded-sm rotate-[3deg]" />
          <div className="absolute bottom-32 right-16 w-36 h-48 bg-brand rounded-sm rotate-[5deg]" />
          <div className="absolute bottom-44 right-28 w-24 h-36 bg-accent-sky rounded-sm rotate-[-4deg]" />
        </div>

        <Link href="/" className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
            <span className="font-serif font-bold text-xl text-primary-foreground">M</span>
          </div>
          <span className="text-2xl font-serif font-bold text-sidebar-foreground">
            My<span className="text-brand">Scriptic</span>
          </span>
        </Link>

        <div className="z-10">
          <h1 className="font-serif text-4xl font-bold text-sidebar-foreground leading-tight mb-4 text-pretty">
            Your world of stories<br />
            <span className="text-brand">awaits you.</span>
          </h1>
          <p className="text-sidebar-foreground/60 text-lg leading-relaxed mb-8 max-w-sm">
            Join over 2 million readers and thousands of authors on MyScriptic. Read, earn, and discover.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[["2M+", "Readers"], ["50K+", "Books"], ["10K+", "Authors"]].map(([n, l]) => (
              <div key={l} className="bg-sidebar-accent rounded-xl p-4 border border-sidebar-border">
                <div className="text-2xl font-bold text-brand font-serif">{n}</div>
                <div className="text-xs text-sidebar-foreground/50 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/30 z-10">
          &copy; {new Date().getFullYear()} MyScriptic Inc.
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft size={16} /> Back to home
          </Link>

          <div className="mb-8">
            <h2 className="font-serif text-3xl font-bold text-foreground mb-1">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to continue reading</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href={forgotHref} className="text-xs text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11"
            >
              {loading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Signing in...</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
              or continue with
            </span>
          </div>

          <SocialLoginButtons disabled={loading} onSocialSuccess={goAfterLogin} />

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don&apos;t have an account?{" "}
            <Link href={registerHref} className="text-brand hover:underline font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
