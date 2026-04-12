import Link from "next/link"
import { BookOpen, Bird, Camera, UsersRound, Tv } from "lucide-react"
import { FooterNewsletter } from "@/components/layout/footer-newsletter"

const FOOTER_LINKS = {
  Platform: [
    { label: "Sign In",             href: "/auth/login" },
    { label: "Create Account",      href: "/auth/register?next=%2Fdiscover" },
    { label: "Discover Books",      href: "/discover" },
    { label: "Video courses",       href: "/courses" },
    { label: "eBooks Store",        href: "/books" },
    { label: "Audiobooks",          href: "/audiobooks" },
    { label: "Subscription Plans",  href: "/subscription" },
    { label: "Flash Sales",         href: "/sales" },
  ],
  Authors: [
    { label: "Become an Author",    href: "/become-author" },
    { label: "Author Dashboard",    href: "/dashboard/author" },
    { label: "Revenue & Earnings",  href: "/dashboard/author/earnings" },
    { label: "Upload a Book",       href: "/dashboard/author/books/new" },
    { label: "Author Guidelines",   href: "/authors/guidelines" },
  ],
  Company: [
    { label: "About MyScriptic",    href: "/about" },
    { label: "Blog",                href: "/blog" },
    { label: "Careers",             href: "/careers" },
    { label: "Press",               href: "/press" },
    { label: "Contact",             href: "/contact" },
  ],
  Legal: [
    { label: "Terms of Service",    href: "/terms" },
    { label: "Privacy Policy",      href: "/privacy" },
    { label: "Cookie Policy",       href: "/cookies" },
    { label: "DMCA Policy",         href: "/dmca" },
  ],
}

const SOCIALS = [
  { icon: Bird,       label: "Twitter / X", href: "#" },
  { icon: Camera,     label: "Instagram", href: "#" },
  { icon: UsersRound, label: "Facebook",  href: "#" },
  { icon: Tv,         label: "YouTube",   href: "#" },
]

export function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground border-t border-sidebar-border/40 mt-16 relative overflow-hidden">
      {/* Subtle ambient blob */}
      <div
        className="absolute bottom-0 left-0 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, oklch(0.769 0.188 70.08 / 0.05) 0%, transparent 70%)" }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 relative">
        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12 mb-14">

          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group">
              <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-md shadow-brand/30 group-hover:shadow-brand/50 transition-shadow">
                <span className="font-serif font-bold text-lg text-primary-foreground leading-none">M</span>
              </div>
              <span className="text-xl font-serif font-bold text-sidebar-foreground">
                My<span className="text-brand">Scriptic</span>
              </span>
            </Link>

            <p className="text-sm text-sidebar-foreground/50 leading-relaxed max-w-xs mb-6">
              Discover millions of ebooks, audiobooks, and stories. The home for readers and authors worldwide.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-2 mb-7">
              {SOCIALS.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl bg-sidebar-accent border border-sidebar-border/60 flex items-center justify-center text-sidebar-foreground/50 hover:text-brand hover:border-brand/35 hover:bg-brand/10 transition-all"
                >
                  <s.icon size={15} />
                </a>
              ))}
            </div>

            {/* Newsletter */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/35 mb-3">
                Newsletter
              </p>
              <FooterNewsletter />
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/35 mb-5">
                {heading}
              </h3>
              <ul className="space-y-3">
                {links.map(l => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-sidebar-foreground/55 hover:text-brand transition-colors leading-tight block"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="border-t border-sidebar-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-sidebar-foreground/30">
            &copy; {new Date().getFullYear()} MyScriptic Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-sidebar-foreground/30">
              USD &bull; NGN &bull; GHS &bull; KES
            </span>
            <div className="flex items-center gap-1.5 text-brand">
              <BookOpen size={13} />
              <span className="text-xs font-semibold">MyScriptic</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
