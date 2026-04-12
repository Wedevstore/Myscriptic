"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { safeInternalPath } from "@/lib/safe-internal-path"
import { useAuth, type UserRole } from "@/components/providers/auth-provider"
import { SocialLoginButtons } from "@/components/auth/social-login-buttons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import {
  Eye, EyeOff, Mail, Lock, User, BookOpen, PenLine, AlertCircle, Loader2, ArrowLeft, Check,
} from "lucide-react"

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "user", label: "Reader", desc: "Browse, buy & subscribe to books", icon: BookOpen },
  { value: "author", label: "Author", desc: "Publish books & earn revenue", icon: PenLine },
]

function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "Contains a number", pass: /\d/.test(password) },
    { label: "Contains uppercase", pass: /[A-Z]/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      {rules.map(r => (
        <div key={r.label} className={cn("flex items-center gap-2 text-xs", r.pass ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
          <div className={cn("w-4 h-4 rounded-full flex items-center justify-center border", r.pass ? "bg-green-500 border-green-500 text-white" : "border-border")}>
            {r.pass && <Check size={10} />}
          </div>
          {r.label}
        </div>
      ))}
    </div>
  )
}

function RegisterPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, isAuthenticated } = useAuth()
  const afterRegister = safeInternalPath(searchParams.get("next") ?? searchParams.get("redirect"))
  const loginBackHref =
    afterRegister === "/"
      ? "/auth/login"
      : `/auth/login?next=${encodeURIComponent(afterRegister)}`

  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [role, setRole] = React.useState<UserRole>("user")
  const [showPw, setShowPw] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const goAfterRegister = React.useCallback(() => {
    router.push(afterRegister)
  }, [router, afterRegister])

  React.useEffect(() => {
    if (isAuthenticated) router.replace(afterRegister)
  }, [isAuthenticated, router, afterRegister])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("")
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { setError("Please fill in all fields."); return }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return }
    setLoading(true)
    try {
      const result = await register(form.name, form.email, form.password, role)
      if (!result.success) setError(result.error ?? "Registration failed.")
      else router.push(afterRegister)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute bg-brand rounded-sm"
              style={{
                width: `${80 + i * 20}px`, height: `${110 + i * 24}px`,
                top: `${10 + i * 15}%`, left: `${5 + i * 12}%`,
                transform: `rotate(${-6 + i * 3}deg)`,
              }}
            />
          ))}
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
            Start your reading<br />
            <span className="text-brand">journey today.</span>
          </h1>
          <p className="text-sidebar-foreground/60 text-lg leading-relaxed mb-8 max-w-sm">
            Create a free account and access thousands of ebooks and audiobooks instantly.
          </p>
          <ul className="space-y-3">
            {[
              "Free access to thousands of books",
              "Unlimited subscription plans available",
              "Authors earn from every read",
              "Multiple payment options (USD, NGN, GHS, KES)",
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-sidebar-foreground/70">
                <span className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center text-brand shrink-0">
                  <Check size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/30 z-10">&copy; {new Date().getFullYear()} MyScriptic Inc.</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <Link href={loginBackHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft size={16} /> Back to sign in
          </Link>

          <div className="mb-8">
            <h2 className="font-serif text-3xl font-bold text-foreground mb-1">Create account</h2>
            <p className="text-muted-foreground">Join millions of readers and authors</p>
          </div>

          {/* Role selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left",
                  role === opt.value
                    ? "border-brand bg-brand/5"
                    : "border-border hover:border-border/80 hover:bg-muted"
                )}
              >
                <opt.icon size={20} className={role === opt.value ? "text-brand" : "text-muted-foreground"} />
                <div>
                  <div className={cn("text-sm font-semibold", role === opt.value ? "text-brand" : "text-foreground")}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight mt-0.5">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" name="name" placeholder="Jane Doe" value={form.name} onChange={handleChange} className="pl-9" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className="pl-9" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password" name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={handleChange}
                  className="pl-9 pr-10" required
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password visibility">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} className="pl-9" required />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11 mt-2">
              {loading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Creating account...</>
              ) : (
                `Create ${role === "author" ? "Author" : "Reader"} Account`
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">or</span>
          </div>

          <SocialLoginButtons disabled={loading} onSocialSuccess={goAfterRegister} />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href={loginBackHref} className="text-brand hover:underline font-medium">Sign in</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground/60 mt-3">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="hover:text-brand transition-colors">Terms</Link> and{" "}
            <Link href="/privacy" className="hover:text-brand transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-brand" aria-label="Loading" />
        </div>
      }
    >
      <RegisterPageInner />
    </Suspense>
  )
}
