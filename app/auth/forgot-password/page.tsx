"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { safeInternalPath } from "@/lib/safe-internal-path"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Mail, CheckCircle2, Loader2, AlertCircle, BookOpen } from "lucide-react"
import { authApi } from "@/lib/api"
function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const returnTarget = safeInternalPath(searchParams.get("next") ?? searchParams.get("redirect"))
  const loginBackHref =
    returnTarget === "/"
      ? "/auth/login"
      : `/auth/login?next=${encodeURIComponent(returnTarget)}`

  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError("Please enter your email address."); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address."); return }

    setLoading(true)
    setError("")
    try {
      await authApi.forgotPassword(
        email,
        returnTarget !== "/" ? returnTarget : undefined
      )
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send reset link.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-32 h-44 bg-brand rounded-sm rotate-[-8deg]" />
          <div className="absolute top-28 left-20 w-28 h-40 bg-accent-sky rounded-sm rotate-[3deg]" />
          <div className="absolute bottom-32 right-16 w-36 h-48 bg-brand rounded-sm rotate-[5deg]" />
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
          <div className="w-16 h-16 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center mb-6">
            <Mail size={28} className="text-brand" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-sidebar-foreground leading-snug mb-3 text-pretty">
            Password reset<br />
            <span className="text-brand">made easy.</span>
          </h2>
          <p className="text-sidebar-foreground/60 leading-relaxed max-w-sm">
            Enter your email and we&apos;ll send you a secure link to reset your password. The link expires in 60 minutes.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/30 z-10">
          &copy; {new Date().getFullYear()} MyScriptic Inc.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <Link
            href={loginBackHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft size={16} /> Back to sign in
          </Link>

          {sent ? (
            /* Success state */
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={36} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Check your inbox</h2>
              <p className="text-muted-foreground mb-2">
                We sent a password reset link to:
              </p>
              <p className="font-semibold text-foreground mb-6">{email}</p>
              <p className="text-sm text-muted-foreground mb-8">
                The link will expire in 60 minutes. If you don&apos;t see it, check your spam folder.
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSent(false); setEmail("") }}
                >
                  Try a different email
                </Button>
                <Link href={loginBackHref}>
                  <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold">
                    Back to sign in
                  </Button>
                </Link>
              </div>
              <div className="mt-8 p-4 bg-muted rounded-xl border border-border text-left">
                <div className="flex items-start gap-3">
                  <BookOpen size={16} className="text-brand mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Still can&apos;t get in?</p>
                    <p className="text-xs text-muted-foreground">
                      Contact our support team at{" "}
                      <a href="mailto:support@myscriptic.com" className="text-brand hover:underline">
                        support@myscriptic.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="mb-8">
                <h2 className="font-serif text-3xl font-bold text-foreground mb-1">Forgot password?</h2>
                <p className="text-muted-foreground">
                  No worries. Enter your email and we&apos;ll send you reset instructions.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-5">
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
                      autoFocus
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError("") }}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11"
                >
                  {loading ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Sending reset link...</>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Remember your password?{" "}
                <Link href={loginBackHref} className="text-brand hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-brand" aria-label="Loading" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </React.Suspense>
  )
}
