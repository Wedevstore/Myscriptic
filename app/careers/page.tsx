import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MapPin, Clock, Briefcase, Globe, Users, TrendingUp,
  Zap, Heart, BookOpen,
} from "lucide-react"

const OPEN_ROLES = [
  {
    id: "r1",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote (Africa)",
    type: "Full-time",
    level: "Senior",
  },
  {
    id: "r2",
    title: "Product Designer",
    department: "Design",
    location: "Lagos, Nigeria",
    type: "Full-time",
    level: "Mid-level",
  },
  {
    id: "r3",
    title: "Content Partnerships Manager",
    department: "Business",
    location: "Nairobi, Kenya / Remote",
    type: "Full-time",
    level: "Senior",
  },
  {
    id: "r4",
    title: "Data Analyst",
    department: "Analytics",
    location: "Remote",
    type: "Full-time",
    level: "Mid-level",
  },
  {
    id: "r5",
    title: "Customer Success Associate",
    department: "Support",
    location: "Lagos, Nigeria",
    type: "Full-time",
    level: "Entry-level",
  },
  {
    id: "r6",
    title: "Backend Engineer (Laravel)",
    department: "Engineering",
    location: "Remote (Africa)",
    type: "Contract",
    level: "Senior",
  },
]

const VALUES = [
  { icon: BookOpen, title: "Read More, Build More", desc: "We believe knowledge compounds. Every team member gets a free Scriptic Pro subscription." },
  { icon: Globe, title: "Africa-First Mindset", desc: "We solve for Africa before we scale globally — diversity of thought is our superpower." },
  { icon: Users, title: "Radically Transparent", desc: "Open salaries, open OKRs, open book. No politics, no silos." },
  { icon: Zap, title: "Ship Fast, Learn Faster", desc: "We iterate in weeks, not quarters. Junior or senior — your impact is felt immediately." },
  { icon: Heart, title: "People over Process", desc: "Async-first, outcome-based work. We trust you to own your results." },
  { icon: TrendingUp, title: "Grow with Us", desc: "Learning budgets, mentorship pairings, and clear paths upward." },
]

const DEPT_COLORS: Record<string, string> = {
  Engineering: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Design: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Business: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Analytics: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Support: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export default function CareersPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16 bg-background">
          {/* Hero */}
          <section className="bg-sidebar py-20 px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <Badge className="mb-4 bg-brand/20 text-brand border-0 px-3 py-1 text-xs">We&apos;re Hiring</Badge>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-sidebar-foreground mb-5 text-pretty">
                Build the future of reading in Africa
              </h1>
              <p className="text-sidebar-foreground/60 text-lg leading-relaxed max-w-xl mx-auto mb-8">
                Join a mission-driven team making books accessible to millions. Remote-friendly, fast-paced, and deeply passionate about stories.
              </p>
              <a href="#roles">
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold h-12 px-8">
                  View Open Roles
                </Button>
              </a>
            </div>
          </section>

          {/* Values */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-2 text-center">Why MyScriptic?</h2>
            <p className="text-muted-foreground text-center text-sm mb-10">Our culture in six principles</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {VALUES.map(v => (
                <div key={v.title} className="p-6 rounded-xl border border-border bg-card hover:border-brand/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                    <v.icon size={18} className="text-brand" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Open roles */}
          <section id="roles" className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-8">Open Positions ({OPEN_ROLES.length})</h2>
            <div className="space-y-3">
              {OPEN_ROLES.map(role => (
                <div
                  key={role.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card hover:border-brand/30 transition-all group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`text-[10px] px-2 py-0.5 border-0 ${DEPT_COLORS[role.department] ?? "bg-muted text-muted-foreground"}`}>
                        {role.department}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">{role.level}</Badge>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors">{role.title}</h3>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin size={11} />
                        {role.location}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock size={11} />
                        {role.type}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Briefcase size={11} />
                        {role.department}
                      </span>
                    </div>
                  </div>
                  <Link href="/contact">
                    <Button size="sm" variant="outline" className="shrink-0 hover:border-brand hover:text-brand">
                      Apply Now
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-10 p-8 rounded-2xl bg-sidebar text-center">
              <h3 className="font-serif text-xl font-bold text-sidebar-foreground mb-2">Don&apos;t see a fit?</h3>
              <p className="text-sidebar-foreground/60 text-sm mb-5">
                We&apos;re always interested in exceptional people. Send your CV and tell us how you&apos;d contribute.
              </p>
              <Link href="/contact">
                <Button className="bg-brand hover:bg-brand-dark text-primary-foreground font-semibold">
                  Send an Open Application
                </Button>
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
