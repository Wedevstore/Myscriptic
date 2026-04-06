"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useTheme } from "@/components/providers/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  BookOpen, Search, Sun, Moon, Bell, ShoppingCart, Menu, X,
  TrendingUp, Headphones, BookMarked, LayoutDashboard, LogOut,
  Settings, ChevronDown, Star, BookText, Tag, Users, Library,
  Heart, ShoppingBag,
  Crown, BarChart2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CoverImage } from "@/components/ui/cover-image"
import { CART_CHANGED } from "@/lib/cart-events"
import { fetchCartItemCount } from "@/lib/cart-actions"
import { MOCK_BOOKS } from "@/lib/mock-data"
import { booksApi } from "@/lib/api"
import { apiBookToCard, type ApiBookRecord } from "@/lib/book-mapper"
import type { BookCardData } from "@/components/books/book-card"
import { NotificationBell } from "@/components/layout/notification-bell"

function authReturnPath(pathname: string): string {
  if (!pathname || pathname.startsWith("/auth")) return "/"
  return pathname
}

// ── Nav links ──────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Discover",     href: "/discover",     icon: TrendingUp },
  { label: "Store",        href: "/store",         icon: ShoppingCart },
  { label: "eBooks",       href: "/books",         icon: BookOpen },
  { label: "Audiobooks",   href: "/audiobooks",    icon: Headphones },
  { label: "Subscription", href: "/subscription",  icon: BookMarked },
]

// Notifications are handled by NotificationBell (store-p4 backed)

// ── Quick-action commands (shown in search when no query) ──────────────────
const QUICK_ACTIONS = [
  { label: "Browse eBooks",      href: "/books",         icon: BookOpen },
  { label: "Browse Audiobooks",  href: "/audiobooks",    icon: Headphones },
  { label: "View My Library",    href: "/library",       icon: Library },
  { label: "My Wishlist",        href: "/wishlist",      icon: Heart },
  { label: "Order History",      href: "/orders",        icon: ShoppingBag },
  { label: "Subscription Plans", href: "/subscription",  icon: BookMarked },
]

// ── Trending tags ──────────────────────────────────────────────────────────
const TRENDING_TAGS = ["African Literature", "Self-Help", "Business", "Fantasy", "Romance", "Sci-Fi", "Poetry"]

// ── Logo ──────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group" aria-label="MyScriptic home">
      <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-primary-foreground font-bold text-lg select-none shadow-sm group-hover:shadow-brand/30 transition-shadow">
        <span className="font-serif">M</span>
      </div>
      <span className="hidden sm:block text-xl font-serif font-bold text-foreground tracking-tight">
        My<span className="text-brand">Scriptic</span>
      </span>
    </Link>
  )
}

// ── Theme toggle ──────────────────────────────────────────────────────────
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

// ── Notifications panel ───────────────────────────────────────────────────
// NotificationsDropdown replaced by NotificationBell (backed by store-p4)

// ── User menu ─────────────────────────────────────────────────────────────
function UserMenu() {
  const { user, logout } = useAuth()

  const initials = user?.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  const dashboardHref = user?.role === "admin"
    ? "/dashboard/admin"
    : user?.role === "author"
    ? "/dashboard/author"
    : "/dashboard/reader"

  const isReader    = user?.role === "user"
  const isAuthor    = user?.role === "author"
  const isSubscriber = !!user?.subscriptionPlan

  // Build menu items based on role
  const primaryItems: { label: string; href: string; icon: React.ElementType; highlight?: boolean }[] = [
    { label: "Dashboard",          href: dashboardHref,   icon: LayoutDashboard },
    { label: "My Library",         href: "/library",      icon: Library },
    ...(isSubscriber ? [{ label: "Subscription Library", href: "/subscription/library", icon: Crown, highlight: true }] : []),
    ...(isReader ? [{ label: "Reading Analytics", href: "/dashboard/reader/analytics", icon: BarChart2 }] : []),
    ...(isAuthor ? [{ label: "Earnings & Payouts", href: "/dashboard/author/earnings", icon: BarChart2 }] : []),
    { label: "Orders",             href: "/orders",       icon: ShoppingBag },
    { label: "Profile & Settings", href: "/profile",      icon: Settings },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-brand/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback className="bg-brand text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium max-w-[100px] truncate">{user?.name}</span>
          <ChevronDown size={14} className="hidden md:block text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">{user?.name}</span>
            <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] capitalize py-0">{user?.role}</Badge>
              {user?.subscriptionPlan && (
                <Badge className="bg-brand/10 text-brand border-0 text-[10px] py-0 gap-1">
                  <Crown size={8} />
                  {user.subscriptionPlan}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {primaryItems.map(item => (
          <DropdownMenuItem key={item.href} asChild>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                item.highlight && "text-brand focus:text-brand"
              )}
            >
              <item.icon size={14} className={cn(item.highlight ? "text-brand" : "text-muted-foreground")} />
              {item.label}
              {item.highlight && (
                <Crown size={10} className="ml-auto text-brand" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Search palette ─────────────────────────────────────────────────────────
function SearchPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [activeIdx, setActiveIdx] = React.useState(-1)

  // Focus on mount
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const [apiResults, setApiResults] = React.useState<BookCardData[]>([])
  const [searchBusy, setSearchBusy] = React.useState(false)

  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setApiResults([])
      setSearchBusy(false)
      return
    }
    setSearchBusy(true)
    const t = window.setTimeout(() => {
      booksApi
        .search(q, 8, 1)
        .then(res => setApiResults((res.data as ApiBookRecord[]).map(apiBookToCard)))
        .catch(() => setApiResults([]))
        .finally(() => setSearchBusy(false))
    }, 280)
    return () => window.clearTimeout(t)
  }, [query])

  const results = React.useMemo((): BookCardData[] => {
    const q = query.trim()
    if (!q) return []
    if (q.length >= 2) return apiResults.slice(0, 6)
    const ql = q.toLowerCase()
    return MOCK_BOOKS.filter(
      b => b.title.toLowerCase().includes(ql) || b.author.toLowerCase().includes(ql) || b.category.toLowerCase().includes(ql)
    ).slice(0, 6)
  }, [query, apiResults])

  const hasResults = results.length > 0
  const showQuickActions = !query.trim()

  // Keyboard navigation
  const totalItems = showQuickActions
    ? QUICK_ACTIONS.length
    : searchBusy
      ? 0
      : hasResults
        ? results.length
        : 0
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (totalItems > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => (i + 1) % totalItems) }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => (i - 1 + totalItems) % totalItems) }
    }
    if (e.key === "Enter" && activeIdx >= 0) {
      if (showQuickActions && QUICK_ACTIONS[activeIdx]) {
        window.location.href = QUICK_ACTIONS[activeIdx].href
        onClose()
      } else if (hasResults && results[activeIdx]) {
        window.location.href = `/books/${results[activeIdx].id}`
        onClose()
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-2xl mx-auto mt-20 mx-4 sm:mx-auto px-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
              onKeyDown={handleKeyDown}
              placeholder="Search books, authors, categories..."
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Search"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground shrink-0">
                <X size={16} />
              </button>
            )}
            <kbd className="hidden sm:flex text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[440px] overflow-y-auto">
            {searchBusy && query.trim().length >= 2 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Searching…</div>
            ) : hasResults ? (
              <div>
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                  </p>
                </div>
                {results.map((book, i) => (
                  <Link
                    key={book.id}
                    href={`/books/${book.id}`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border last:border-0",
                      activeIdx === i && "bg-muted/60"
                    )}
                  >
                    <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden shadow-sm">
                      <CoverImage
                        src={book.coverUrl}
                        alt={`Cover of ${book.title}`}
                        sizes="40px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] py-0">{book.category}</Badge>
                        <Badge variant="secondary" className="text-[10px] py-0 capitalize">{book.format}</Badge>
                        {book.accessType === "FREE" && (
                          <Badge className="text-[10px] py-0 bg-green-100 text-green-700 border-0">Free</Badge>
                        )}
                        {book.accessType === "PAID" && book.price && (
                          <span className="text-xs font-bold text-brand">${book.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Star size={11} className="fill-brand text-brand" />
                      {book.rating.toFixed(1)}
                    </div>
                  </Link>
                ))}
                {/* View all results */}
                <Link
                  href={`/books?q=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-brand hover:bg-muted/60 transition-colors font-medium"
                >
                  <Search size={13} />
                  View all results for &ldquo;{query}&rdquo;
                </Link>
              </div>
            ) : query.trim() ? (
              <div className="py-12 text-center">
                <BookText size={36} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No books found</p>
                <p className="text-xs text-muted-foreground">
                  {query.trim().length < 2
                    ? "Type at least 2 characters for server search, or browse by category."
                    : "Try a different search term or browse by category."}
                </p>
              </div>
            ) : (
              <div>
                {/* Quick actions */}
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>
                </div>
                {QUICK_ACTIONS.map((action, i) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors",
                      activeIdx === i && "bg-muted/60"
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <action.icon size={14} className="text-muted-foreground" />
                    </div>
                    <span className="text-sm text-foreground">{action.label}</span>
                  </Link>
                ))}

                {/* Trending searches */}
                <div className="px-4 pt-3 pb-2 border-t border-border mt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <TrendingUp size={11} /> Trending Searches
                  </p>
                  <div className="flex flex-wrap gap-2 pb-2">
                    {TRENDING_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => { setQuery(tag); setActiveIdx(-1) }}
                        className="px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                      >
                        <Tag size={10} />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Keyboard hint */}
        <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="bg-background/80 border border-border rounded px-1 font-mono">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-background/80 border border-border rounded px-1 font-mono">↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-background/80 border border-border rounded px-1 font-mono">ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Main Navbar ────────────────────────────────────────────────────────────
export function Navbar() {
  const pathname = usePathname() ?? "/"
  const loginHref = `/auth/login?next=${encodeURIComponent(authReturnPath(pathname))}`
  const registerHref = `/auth/register?next=${encodeURIComponent(authReturnPath(pathname))}`
  const { isAuthenticated, user } = useAuth()
  const [mobileOpen,  setMobileOpen]  = React.useState(false)
  const [searchOpen,  setSearchOpen]  = React.useState(false)
  const [scrolled,    setScrolled]    = React.useState(false)
  const [cartCount,   setCartCount]   = React.useState(0)

  // Cart badge: localStorage cart, or server count when Phase 2 + logged in
  React.useEffect(() => {
    let cancelled = false
    const sync = () => {
      fetchCartItemCount().then(n => {
        if (!cancelled) setCartCount(n)
      })
    }
    sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === "myscriptic_cart" || e.key === "myscriptic_auth") sync()
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener(CART_CHANGED, sync)
    return () => {
      cancelled = true
      window.removeEventListener("storage", onStorage)
      window.removeEventListener(CART_CHANGED, sync)
    }
  }, [isAuthenticated])

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  React.useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Keyboard shortcut: Cmd+K / Ctrl+K to open search
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/92 backdrop-blur-xl border-b border-border/70 shadow-[0_1px_24px_-4px_oklch(0_0_0/0.08)]"
            : "bg-background/60 backdrop-blur-md"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Logo */}
            <Logo />

            {/* Center: Nav links (desktop) */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/80 hover:shadow-sm transition-all duration-150"
                >
                  <link.icon size={15} />
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
              {/* Search button with Cmd+K hint */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground group"
                aria-label="Open search (Ctrl+K)"
              >
                <Search size={17} />
                <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
                  <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px] border border-border">⌘K</kbd>
                </span>
              </button>

              <ThemeToggle />

              {isAuthenticated ? (
                <>
                  <NotificationBell userId={user?.id} />
                  {/* Cart */}
                  <Link
                    href="/cart"
                    className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} item${cartCount !== 1 ? "s" : ""}` : ""}`}
                  >
                    <ShoppingCart size={18} />
                    {cartCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-brand text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center"
                        aria-hidden
                      >
                        {cartCount > 9 ? "9+" : cartCount}
                      </span>
                    )}
                  </Link>
                  <UserMenu />
                </>
              ) : (
                <>
                  <Link href={loginHref} className="hidden sm:block">
                    <Button variant="ghost" size="sm" className="text-sm">Sign in</Button>
                  </Link>
                  <Link href={registerHref}>
                    <Button size="sm" className="bg-brand hover:bg-brand-dark text-primary-foreground text-sm font-semibold">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
                onClick={() => setMobileOpen(o => !o)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-md px-4 py-4 space-y-1">
            {/* Mobile search */}
            <button
              onClick={() => { setMobileOpen(false); setSearchOpen(true) }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-dashed border-border mb-2"
            >
              <Search size={16} />
              Search books, authors...
            </button>

            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="pt-2 border-t border-border space-y-1">
                {[
                  { label: "My Library",    href: "/library",    icon: Library },
                  { label: "My Orders",     href: "/orders",     icon: ShoppingBag },
                  { label: "My Wishlist",   href: "/wishlist",   icon: Heart },
                  { label: "Cart",          href: "/cart",       icon: ShoppingCart },
                ].map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <item.icon size={15} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="pt-3 border-t border-border flex flex-col gap-2">
                <Link href={loginHref} onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">Sign in</Button>
                </Link>
                <Link href={registerHref} onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold">
                    Get Started — Free
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Search Palette */}
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </>
  )
}
