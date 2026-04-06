"use client"

import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Shield, AlertTriangle, CheckCircle, Mail, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

const PROCESS_STEPS = [
  {
    icon: FileText,
    step: "1",
    title: "Submit a Notice",
    description:
      "Send a written DMCA takedown notice to our designated agent at copyright@myscriptic.com. Your notice must include all required elements listed below.",
  },
  {
    icon: AlertTriangle,
    step: "2",
    title: "We Review Your Claim",
    description:
      "Our content team reviews every notice within 5 business days. We verify the claim against our catalogue and assess whether the reported content qualifies for removal.",
  },
  {
    icon: CheckCircle,
    step: "3",
    title: "Content Removed or Counter-Notice",
    description:
      "If the claim is valid, content is removed and the author is notified. The author may submit a counter-notice if they believe the takedown was made in error.",
  },
]

const REQUIRED_ELEMENTS = [
  "Your physical or electronic signature",
  "Identification of the copyrighted work you claim has been infringed",
  "Identification of the material on MyScriptic that you claim infringes your copyright, with sufficient detail for us to locate it (e.g., a direct URL)",
  "Your contact information (name, address, telephone number, and email address)",
  "A statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent, or the law",
  "A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorised to act on their behalf",
]

const COUNTER_NOTICE_ELEMENTS = [
  "Your physical or electronic signature",
  "Identification of the removed material and its prior location on MyScriptic",
  "A statement under penalty of perjury that you have a good-faith belief the material was removed by mistake or misidentification",
  "Your name, address, telephone number, and email address",
  "A statement that you consent to the jurisdiction of the Federal District Court for your address, or if outside the US, any judicial district in which MyScriptic may be found",
]

const PROSE_SECTIONS = [
  {
    heading: "Our Commitment",
    content:
      "MyScriptic respects the intellectual property rights of others and expects our authors and users to do the same. We comply fully with the Digital Millennium Copyright Act (DMCA) and respond promptly to valid takedown notices. Authors who repeatedly infringe copyright may have their accounts suspended or terminated.",
  },
  {
    heading: "Repeat Infringers",
    content:
      "MyScriptic maintains a policy of terminating accounts of users who are determined to be repeat infringers of intellectual property rights. We reserve the right to terminate any user's access to MyScriptic at any time, with or without notice, for repeated infringement or other reasons at our sole discretion.",
  },
  {
    heading: "Good-Faith Use & Misuse",
    content:
      "Anyone who knowingly misrepresents that material is infringing, or that material was removed by mistake or misidentification, may be subject to liability under Section 512(f) of the DMCA. Please only submit a notice if you have a genuine, good-faith belief that your copyright has been infringed.",
  },
  {
    heading: "Counter-Notice Procedure",
    content:
      "If you believe your content was removed incorrectly, you may submit a counter-notice to our copyright agent. Upon receipt of a valid counter-notice, we will forward it to the original complainant and reinstate the material within 10–14 business days unless the complainant files a court action seeking to restrain you from engaging in infringing activity.",
  },
]

export default function DmcaPage() {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1 pt-16">
          {/* Hero */}
          <section className="pt-24 pb-12 px-4 sm:px-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-brand" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand">Legal</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-4 text-balance">
              DMCA Policy
            </h1>
            <p className="text-muted-foreground text-sm mb-4">
              Last updated: <strong>January 28, 2026</strong>
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm text-pretty">
              MyScriptic complies with the Digital Millennium Copyright Act (DMCA). If you believe content on our platform infringes your copyright, this page explains how to file a takedown notice and what to expect next.
            </p>
          </section>

          {/* Process steps */}
          <section className="pb-12 px-4 sm:px-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Takedown Process</h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {PROCESS_STEPS.map(step => (
                <div key={step.step} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                      <step.icon size={16} className="text-brand" />
                    </div>
                    <span className="text-2xl font-serif font-bold text-foreground/20">{step.step}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="pb-12 px-4 sm:px-6 max-w-4xl mx-auto space-y-10">
            {/* Required elements */}
            <div>
              <h2 className="text-xl font-serif font-bold text-foreground mb-4">Required Elements of a DMCA Notice</h2>
              <p className="text-sm text-muted-foreground mb-4">
                To be considered valid under the DMCA, your takedown notice must include all of the following:
              </p>
              <div className="bg-card border border-border rounded-xl p-6">
                <ul className="space-y-3">
                  {REQUIRED_ELEMENTS.map((el, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-brand/15 text-brand font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {el}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Counter-notice elements */}
            <div>
              <h2 className="text-xl font-serif font-bold text-foreground mb-4">Required Elements of a Counter-Notice</h2>
              <p className="text-sm text-muted-foreground mb-4">
                If you believe your content was removed in error, include the following in your counter-notice:
              </p>
              <div className="bg-card border border-border rounded-xl p-6">
                <ul className="space-y-3">
                  {COUNTER_NOTICE_ELEMENTS.map((el, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-brand/15 text-brand font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {el}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Prose sections */}
            <div className="space-y-8">
              {PROSE_SECTIONS.map(section => (
                <div key={section.heading}>
                  <h2 className="text-xl font-serif font-bold text-foreground mb-3">{section.heading}</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm">{section.content}</p>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="bg-brand/5 border border-brand/20 rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-2">Designated Copyright Agent</h3>
              <p className="text-sm text-muted-foreground mb-1">Send all DMCA notices to:</p>
              <p className="text-sm font-medium text-foreground">MyScriptic Inc. — Copyright Agent</p>
              <p className="text-sm text-muted-foreground">14 Innovation Drive, Lagos, Nigeria</p>
              <a href="mailto:copyright@myscriptic.com" className="inline-flex items-center gap-1.5 text-brand hover:underline text-sm font-medium mt-2">
                <Mail size={13} />
                copyright@myscriptic.com
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </Providers>
  )
}
