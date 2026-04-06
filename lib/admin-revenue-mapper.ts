import type { AuthorPayout, RevenueCycle } from "@/lib/store"

function fmtDate(v: unknown): string {
  if (typeof v === "string") return v.slice(0, 10)
  if (v && typeof v === "object" && "slice" in (v as object)) return String(v).slice(0, 10)
  return String(v ?? "")
}

/** Map Laravel `RevenueCycle` JSON (snake_case) to local dashboard row type. */
export function apiRevenueCycleToRow(raw: Record<string, unknown>): RevenueCycle {
  const meta = raw.meta && typeof raw.meta === "object" ? (raw.meta as Record<string, unknown>) : {}
  const status = String(raw.status ?? "open")
  let mapped: RevenueCycle["status"] = "open"
  if (status === "finalized") mapped = "finalized"
  else if (status === "locked") mapped = "locked"
  else if (status === "calculating") mapped = "calculating"

  return {
    id: String(raw.id ?? ""),
    cycleStart: fmtDate(raw.cycle_start),
    cycleEnd: fmtDate(raw.cycle_end),
    totalRevenue: Number(raw.gross_subscription_revenue ?? 0),
    subscriberCount: Number(meta.subscriber_count ?? 0),
    adminCommissionPct: Number(raw.admin_commission_pct ?? 0),
    adminEarnings: Number(raw.admin_earnings ?? 0),
    authorPool: Number(raw.author_pool ?? 0),
    totalEngagement: Number(raw.total_engagement_weight ?? 0),
    status: mapped,
    calculatedAt: raw.finalized_at ? String(raw.finalized_at) : null,
    lockedAt: status === "locked" && raw.finalized_at ? String(raw.finalized_at) : null,
  }
}

/** Map Laravel `AuthorPayout` JSON + nested `author` to local dashboard row type. */
export function apiAuthorPayoutToRow(raw: Record<string, unknown>): AuthorPayout {
  const author = raw.author && typeof raw.author === "object" ? (raw.author as Record<string, unknown>) : {}
  const gross = Number(raw.gross_earnings ?? 0)
  const statusRaw = String(raw.status ?? "pending")
  const uiStatus: AuthorPayout["status"] =
    statusRaw === "hold" ? "held" : statusRaw === "paid" ? "paid" : "pending"

  return {
    id: String(raw.id ?? ""),
    authorId: String(raw.author_id ?? ""),
    authorName: typeof author.name === "string" && author.name.trim() ? author.name : "Unknown",
    cycleId: String(raw.revenue_cycle_id ?? ""),
    totalEngagement: Number(raw.engagement_weight ?? 0),
    sharePct: Number(raw.share_percentage ?? 0),
    grossEarnings: gross,
    platformFee: 0,
    netEarnings: gross,
    status: uiStatus,
    requestedAt: null,
    paidAt: statusRaw === "paid" ? (raw.updated_at ? String(raw.updated_at) : null) : null,
  }
}
