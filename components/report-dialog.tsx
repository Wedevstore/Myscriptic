"use client"

import * as React from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { reportsApi } from "@/lib/api"
import { apiUrlConfigured } from "@/lib/auth-mode"
import { cn } from "@/lib/utils"
import {
  Flag, AlertTriangle, ShieldAlert, Ban, Copyright,
  MessageSquareWarning, CheckCircle, Loader2, Lock,
} from "lucide-react"

export type ReportTargetType = "book" | "content" | "author"

interface ReportDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  targetType: ReportTargetType
  targetId: string
  targetTitle: string
}

const REPORT_REASONS: {
  value: string
  label: string
  icon: React.ElementType
  description: string
}[] = [
  { value: "inappropriate_content", label: "Inappropriate Content", icon: ShieldAlert, description: "Contains offensive, explicit, or harmful material" },
  { value: "copyright_violation", label: "Copyright Violation", icon: Copyright, description: "Infringes on intellectual property or is plagiarized" },
  { value: "misleading_info", label: "Misleading Information", icon: AlertTriangle, description: "Contains false, deceptive, or misleading content" },
  { value: "spam_or_scam", label: "Spam or Scam", icon: Ban, description: "Is spam, promotional junk, or a fraudulent listing" },
  { value: "hate_speech", label: "Hate Speech or Harassment", icon: MessageSquareWarning, description: "Contains discriminatory, hateful, or harassing content" },
  { value: "other", label: "Other", icon: Flag, description: "A reason not listed above" },
]

const REPORTS_STORAGE_KEY = "myscriptic_reports"

function saveReportLocally(data: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const existing = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) ?? "[]")
  existing.push({
    ...data,
    id: `rpt_${Date.now()}`,
    status: "pending",
    admin_note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(existing))
}

export function loadLocalReports(): Record<string, unknown>[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) ?? "[]")
  } catch { return [] }
}

export function updateLocalReportStatus(id: string, status: string, adminNote?: string) {
  if (typeof window === "undefined") return
  const reports = loadLocalReports()
  const updated = reports.map(r => {
    if ((r as { id: string }).id === id) {
      return { ...r, status, admin_note: adminNote ?? (r as { admin_note?: string }).admin_note, updated_at: new Date().toISOString() }
    }
    return r
  })
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(updated))
}

function canReport(user: ReturnType<typeof useAuth>["user"]): boolean {
  if (!user) return false
  const hasSub = Boolean(user.subscriptionPlan)
  const isAuthor = user.role === "author"
  const isAdmin = user.role === "admin" || user.role === "staff"
  return hasSub || isAuthor || isAdmin
}

export function ReportDialog({ open, onOpenChange, targetType, targetId, targetTitle }: ReportDialogProps) {
  const { user, isAuthenticated } = useAuth()
  const [reason, setReason] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const submitRef = React.useRef(false)

  React.useEffect(() => {
    if (open) {
      setReason("")
      setDescription("")
      setSubmitted(false)
      setError(null)
      submitRef.current = false
    }
  }, [open])

  const eligible = canReport(user)

  const targetLabel =
    targetType === "book" ? "Book" :
    targetType === "author" ? "Author" : "Content"

  async function handleSubmit() {
    if (!reason || !description.trim() || submitRef.current || submitting) return
    submitRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      if (apiUrlConfigured()) {
        await reportsApi.create({
          target_type: targetType,
          target_id: targetId,
          target_title: targetTitle,
          reason,
          description: description.trim(),
        })
      } else {
        await new Promise(r => setTimeout(r, 800))
        saveReportLocally({
          target_type: targetType,
          target_id: targetId,
          target_title: targetTitle,
          reason,
          description: description.trim(),
          reporter: user ? { id: user.id, name: user.name, email: user.email } : null,
        })
      }
      setSubmitted(true)
    } catch (err) {
      submitRef.current = false
      setError(err instanceof Error ? err.message : "Could not submit report. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag size={18} className="text-destructive" />
            Report {targetLabel}
          </DialogTitle>
          <DialogDescription>
            {submitted
              ? "Thank you for helping keep MyScriptic safe."
              : `Report "${targetTitle}" for violating our community guidelines.`}
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="py-8 text-center">
            <Lock size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground mb-1">Sign in required</p>
            <p className="text-xs text-muted-foreground">Please sign in to report content.</p>
          </div>
        ) : !eligible ? (
          <div className="py-8 text-center">
            <ShieldAlert size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground mb-1">Subscribers and buyers only</p>
            <p className="text-xs text-muted-foreground mb-4">
              Reporting is available to users with an active subscription or a purchase history.
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : submitted ? (
          <div className="py-8 text-center">
            <CheckCircle size={40} className="mx-auto mb-4 text-green-500" />
            <p className="text-sm font-medium text-foreground mb-1">Report Submitted</p>
            <p className="text-xs text-muted-foreground mb-4">
              Our moderation team will review your report and take appropriate action. You may be contacted for additional details.
            </p>
            <Button onClick={() => onOpenChange(false)} className="bg-brand text-primary-foreground hover:bg-brand-dark">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {error && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2" role="alert">
                {error}
              </p>
            )}

            {/* Reason selector */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Why are you reporting this?</p>
              <div className="grid gap-2">
                {REPORT_REASONS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 rounded-lg border text-left transition-all",
                      reason === r.value
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border hover:border-destructive/20"
                    )}
                  >
                    <r.icon size={16} className={cn(
                      "shrink-0 mt-0.5",
                      reason === r.value ? "text-destructive" : "text-muted-foreground"
                    )} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="report-desc" className="text-sm font-semibold text-foreground">
                Additional Details
              </label>
              <Textarea
                id="report-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in detail. Include specific pages, chapters, or examples if applicable."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">Minimum 10 characters. Be as specific as possible.</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!reason || description.trim().length < 10 || submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : "Submit Report"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ReportButton({
  targetType,
  targetId,
  targetTitle,
  variant = "ghost",
  className,
}: {
  targetType: ReportTargetType
  targetId: string
  targetTitle: string
  variant?: "ghost" | "outline"
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors",
          className
        )}
        aria-label={`Report ${targetTitle}`}
      >
        <Flag size={13} />
        <span>Report</span>
      </button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        targetTitle={targetTitle}
      />
    </>
  )
}
