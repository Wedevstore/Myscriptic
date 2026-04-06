import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Home, Search, ArrowLeft } from "lucide-react"

/**
 * 404 Not Found — MyScriptic
 * Uses a Server Component (no "use client") for optimal static rendering.
 * Providers are not needed here — no auth state required for 404.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12 group" aria-label="Go to homepage">
        <div className="w-10 h-10 rounded-xl bg-brand text-primary-foreground flex items-center justify-center font-serif font-bold text-xl shadow-sm group-hover:shadow-brand/30 transition-shadow">
          M
        </div>
        <span className="text-2xl font-serif font-bold text-foreground">
          My<span className="text-brand">Scriptic</span>
        </span>
      </Link>

      {/* Illustration area */}
      <div className="relative mb-8">
        <div className="text-[10rem] font-serif font-bold leading-none select-none"
          style={{ color: "oklch(0.88 0.006 80)", WebkitTextStroke: "2px oklch(0.769 0.188 70.08 / 0.3)" }}>
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-brand/10 border-2 border-brand/20 flex items-center justify-center">
            <BookOpen size={36} className="text-brand" />
          </div>
        </div>
      </div>

      {/* Copy */}
      <h1 className="font-serif text-3xl font-bold text-foreground mb-3 text-balance">
        This page is a blank chapter
      </h1>
      <p className="text-muted-foreground text-base max-w-md mb-8 leading-relaxed text-pretty">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to a great story.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
        <Link href="/">
          <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold gap-2 h-11 px-6">
            <Home size={15} />
            Back to Home
          </Button>
        </Link>
        <Link href="/books">
          <Button variant="outline" className="gap-2 h-11 px-6 hover:border-brand hover:text-brand">
            <Search size={15} />
            Browse Books
          </Button>
        </Link>
      </div>

      {/* Quick links */}
      <div className="border-t border-border pt-8 w-full max-w-sm">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">
          Popular destinations
        </p>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Popular pages">
          {[
            { label: "Discover", href: "/discover" },
            { label: "Audiobooks", href: "/audiobooks" },
            { label: "Subscription", href: "/subscription" },
            { label: "Sign In", href: "/auth/login?next=%2F" },
            { label: "Create Account", href: "/auth/register?next=%2F" },
            { label: "Become an Author", href: "/become-author" },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-brand transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
