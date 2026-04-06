"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { safeInternalPath } from "@/lib/safe-internal-path"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, KeyRound, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { authApi } from "@/lib/api"

function ResetPasswordInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const email = searchParams.get("email") ?? ""
  const returnTarget = safeInternalPath(searchParams.get("next") ?? searchParams.get("redirect"))
  const loginBackHref =
    returnTarget === "/"
      ? "/auth/login"
      : `/auth/login?next=${encodeURIComponent(returnTarget)}`
  const forgotHref =
    returnTarget === "/"
      ? "/auth/forgot-password"
      : `/auth/forgot-password?next=${encodeURIComponent(returnTarget)}`

  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [done, setDone] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!token || !email) {
      setError("Invalid reset link. Request a new password reset from the login page.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({
        token,
        email,
        password,
        password_confirmation: confirm,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.")
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full space-y-4 text-center">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This link is missing a token or email. Open the link from your email or request a new reset.
            </AlertDescription>
          </Alert>
          <Link href={forgotHref}>
            <Button variant="outline" className="w-full">Request new link</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-green-600 dark:text-green-400 w-8 h-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Password updated</h1>
          <p className="text-muted-foreground text-sm">You can sign in with your new password.</p>
          <Link href={loginBackHref}>
            <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold">Sign in</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <Link
          href={loginBackHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center">
            <KeyRound className="text-brand w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Set new password</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[240px]" title={email}>{email}</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11"
          >
            {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</> : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      }
    >
      <ResetPasswordInner />
    </React.Suspense>
  )
}
