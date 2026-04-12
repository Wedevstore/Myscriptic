"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { authorsApi, contactApi } from "@/lib/api"
import { laravelAuthEnabled } from "@/lib/auth-mode"
import { resolveMockAuthorId } from "@/lib/mock-data"
import {
  Mail, MessageSquare, Phone, MapPin, Clock,
  Bird, Camera, Loader2, CheckCircle2,
} from "lucide-react"

const TOPICS = [
  "General Enquiry",
  "Technical Support",
  "Author / Publishing",
  "Billing & Payments",
  "Report Content",
  "Partnership",
]

const CONTACT_CARDS = [
  {
    icon: Mail,
    title: "Email Us",
    detail: "hello@myscriptic.com",
    sub: "We respond within 24 hours",
    href: "mailto:hello@myscriptic.com",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    detail: "Chat with our team",
    sub: "Available Mon–Fri, 9am–6pm WAT",
    href: "mailto:hello@myscriptic.com?subject=MyScriptic%20chat%20request",
  },
  {
    icon: Bird,
    title: "Twitter / X",
    detail: "@myscriptic",
    sub: "DMs open for quick questions",
    href: "https://twitter.com/myscriptic",
  },
]

type ContactAuthorContext = { id: string; displayName: string }

function ContactForm({ authorContext }: { authorContext: ContactAuthorContext | null }) {
  const [form, setForm] = React.useState({
    name: "", email: "", topic: TOPICS[0], message: "",
  })
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const prefilledAuthorId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!authorContext) {
      prefilledAuthorId.current = null
      return
    }
    if (prefilledAuthorId.current === authorContext.id) return
    prefilledAuthorId.current = authorContext.id
    setForm(f => ({
      ...f,
      topic: "Author / Publishing",
      message:
        f.message.trim() === ""
          ? `Regarding ${authorContext.displayName} (author id: ${authorContext.id}):\n\n`
          : f.message,
    }))
  }, [authorContext])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setLoading(true)
    try {
      await contactApi.submit({
        name: form.name,
        email: form.email,
        topic: form.topic,
        message: form.message,
        author_ref: authorContext?.id,
      })
      setSent(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not send message. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
        </div>
        <h3 className="font-serif text-xl font-bold text-foreground">Message Sent!</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Thanks for reaching out. Our team will get back to you within 24 hours.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setSent(false)
            setSubmitError(null)
            setForm({ name: "", email: "", topic: TOPICS[0], message: "" })
            prefilledAuthorId.current = null
          }}
        >
          Send Another
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {submitError && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2" role="alert">
          {submitError}
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="topic">Topic</Label>
        <select
          id="topic"
          name="topic"
          value={form.topic}
          onChange={handleChange}
          aria-label="Inquiry topic"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TOPICS.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="How can we help you?"
          rows={5}
          value={form.message}
          onChange={handleChange}
          required
          className="resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-11"
      >
        {loading ? <><Loader2 size={16} className="mr-2 animate-spin" />Sending...</> : "Send Message"}
      </Button>
    </form>
  )
}

function ContactPageContent() {
  const searchParams = useSearchParams()
  const raw = (searchParams.get("author") ?? searchParams.get("author_id"))?.trim() || null
  const [authorContext, setAuthorContext] = React.useState<ContactAuthorContext | null>(null)

  React.useEffect(() => {
    if (!raw) {
      setAuthorContext(null)
      return
    }
    let alive = true
    const mock = resolveMockAuthorId(raw)
    if (mock) {
      setAuthorContext({ id: mock.id, displayName: mock.name })
      return
    }
    if (raw.startsWith("auth_")) {
      setAuthorContext({ id: raw, displayName: "Unknown author" })
      return
    }
    if (/^\d+$/.test(raw)) {
      if (laravelAuthEnabled()) {
        setAuthorContext(null)
        authorsApi
          .get(raw)
          .then(res => {
            if (!alive) return
            const name = res.data?.name
            setAuthorContext({ id: raw, displayName: name ?? `Author #${raw}` })
          })
          .catch(() => {
            if (alive) setAuthorContext({ id: raw, displayName: `Author #${raw}` })
          })
        return () => {
          alive = false
        }
      }
      setAuthorContext({ id: raw, displayName: `Author #${raw}` })
      return
    }
    setAuthorContext({ id: raw, displayName: raw })
  }, [raw])

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1 pt-16 bg-background">
        <section className="bg-sidebar py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-brand/20 text-brand border-0 text-xs px-3 py-1">Contact Us</Badge>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-sidebar-foreground mb-4 text-pretty">
              We&apos;d love to hear from you
            </h1>
            <p className="text-sidebar-foreground/60 text-lg max-w-xl mx-auto leading-relaxed">
              Got a question, feedback, or partnership idea? Our team is standing by.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-foreground mb-6">Get in Touch</h2>

              {CONTACT_CARDS.map(card => (
                <a
                  key={card.title}
                  href={card.href}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-brand/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
                    <card.icon size={18} className="text-brand" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{card.title}</p>
                    <p className="text-sm text-brand">{card.detail}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                  </div>
                </a>
              ))}

              <div className="p-4 rounded-xl bg-muted border border-border space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} className="text-brand shrink-0" />
                  <span>Lagos, Nigeria &bull; Global Team</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock size={14} className="text-brand shrink-0" />
                  <span>Mon–Fri: 9am–6pm (WAT, GMT+1)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={14} className="text-brand shrink-0" />
                  <span>+234 800 SCRIPTIC</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <a href="https://x.com/myscriptic" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" className="p-2 rounded-lg bg-muted hover:bg-accent border border-border transition-colors">
                  <Bird size={16} className="text-muted-foreground" />
                </a>
                <a href="https://instagram.com/myscriptic" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2 rounded-lg bg-muted hover:bg-accent border border-border transition-colors">
                  <Camera size={16} className="text-muted-foreground" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-8">
              <h2 className="font-serif text-xl font-bold text-foreground mb-6">Send a Message</h2>
              {authorContext && (
                <div className="mb-6 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-foreground">
                  <p>
                    You&apos;re reaching out in context of{" "}
                    <span className="font-semibold">{authorContext.displayName}</span>
                    {" "}
                    <span className="text-muted-foreground">
                      (id: <code className="text-xs bg-muted px-1 py-0.5 rounded">{authorContext.id}</code>)
                    </span>
                    .
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-brand">
                    <Link href={`/authors/${authorContext.id}`} className="font-medium hover:underline">
                      Author profile
                    </Link>
                    <Link href={`/books?author_id=${encodeURIComponent(authorContext.id)}`} className="font-medium hover:underline">
                      Their books
                    </Link>
                    <Link href="/contact" className="text-muted-foreground font-medium hover:text-foreground hover:underline">
                      Clear author context
                    </Link>
                  </p>
                </div>
              )}
              <ContactForm authorContext={authorContext} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function ContactFallback() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1 pt-16 bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </main>
      <Footer />
    </div>
  )
}

export default function ContactPage() {
  return (
    <Providers>
      <Suspense fallback={<ContactFallback />}>
        <ContactPageContent />
      </Suspense>
    </Providers>
  )
}
