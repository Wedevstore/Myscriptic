"use client"

/**
 * app/error.tsx — Global error boundary for MyScriptic
 * Catches unhandled runtime errors in any route segment.
 */
import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import { captureException } from "@/lib/error-reporting"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    captureException(error, { tags: { boundary: "app-error" }, extra: { digest: error.digest } })
  }, [error])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10" aria-label="Go to homepage">
        <div className="w-9 h-9 rounded-lg bg-brand text-primary-foreground flex items-center justify-center font-serif font-bold text-lg">
          M
        </div>
        <span className="text-xl font-serif font-bold text-foreground">
          My<span className="text-brand">Scriptic</span>
        </span>
      </Link>

      {/* Error icon */}
      <div className="w-20 h-20 rounded-2xl bg-destructive/10 border-2 border-destructive/20 flex items-center justify-center mb-6">
        <AlertTriangle size={36} className="text-destructive" />
      </div>

      <h1 className="font-serif text-3xl font-bold text-foreground mb-3 text-balance">
        Something went wrong
      </h1>
      <p className="text-muted-foreground text-base max-w-md mb-2 text-pretty leading-relaxed">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60 mb-8 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      {!error.digest && <div className="mb-8" />}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={reset}
          className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2 h-11 px-6"
        >
          <RefreshCw size={15} />
          Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2 h-11 px-6 hover:border-brand hover:text-brand">
            <Home size={15} />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
