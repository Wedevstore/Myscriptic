"use client"

import * as React from "react"
import { Mail, ArrowRight } from "lucide-react"

export function FooterNewsletter() {
  const [email, setEmail] = React.useState("")
  const [done, setDone] = React.useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = email.trim()
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return
    // No backend list yet — acknowledge locally; swap for POST /api/newsletter when ready
    setDone(true)
  }

  if (done) {
    return (
      <p className="text-xs text-sidebar-foreground/60 leading-relaxed">
        Thanks — we&apos;ll keep you posted on new releases and deals.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="flex items-center gap-2 flex-1 bg-sidebar-accent rounded-xl px-3.5 py-2.5 border border-sidebar-border/50">
        <Mail size={13} className="text-sidebar-foreground/35 shrink-0" />
        <input
          type="email"
          name="newsletter-email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="bg-transparent text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/25 outline-none w-full"
          aria-label="Email for newsletter"
          autoComplete="email"
        />
      </div>
      <button
        type="submit"
        className="w-10 h-10 bg-brand hover:bg-brand-dark text-primary-foreground rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm"
        aria-label="Subscribe to newsletter"
      >
        <ArrowRight size={15} />
      </button>
    </form>
  )
}
