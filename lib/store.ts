/**
 * store.ts — MyScriptic Phase 2 + Phase 3 Data Store (localStorage-backed)
 *
 * Phase 2: orders, transactions, author earnings (direct sales),
 *          user library (access control), coupons, tax config.
 *
 * Phase 3: subscription plans, subscriptions, engagement tracking,
 *          revenue pool cycles, author subscription payouts, audit log.
 *
 * When the Laravel API is reachable, pages prefer API calls from lib/api.ts.
 * This store provides the offline / fallback data layer.
 *
 * Data model matches the Laravel migrations exactly so the shape
 * never needs to change when the backend is wired up.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus      = "pending" | "paid" | "failed" | "refunded"
export type PaymentGateway   = "paystack" | "flutterwave" | "paypal" | "korapay"
export type Currency         = "USD" | "NGN" | "GHS" | "KES"
export type RefundType       = "full" | "partial"

export interface OrderItem {
  bookId:    string
  title:     string
  author:    string
  coverUrl:  string
  format:    string
  price:     number // in USD
}

export interface Order {
  id:              string
  orderNumber:     string
  userId:          string
  items:           OrderItem[]
  subtotal:        number
  discount:        number
  tax:             number
  total:           number
  currency:        Currency
  localTotal:      number  // total in the chosen currency
  couponCode:      string | null
  paymentGateway:  PaymentGateway
  paymentRef:      string | null
  status:          OrderStatus
  createdAt:       string
  paidAt:          string | null
}

export interface Transaction {
  id:             string
  userId:         string
  orderId:        string
  gateway:        PaymentGateway
  amount:         number
  currency:       Currency
  status:         "success" | "failed" | "pending" | "refunded"
  referenceId:    string
  rawResponse:    Record<string, unknown> // JSON blob from gateway
  createdAt:      string
}

/**
 * Author earnings for a DIRECT SALE (access_type=PAID).
 * Separate from subscription pool earnings.
 *   gross = book price
 *   commission = admin % of gross
 *   net = gross - commission
 */
export interface AuthorEarning {
  id:          string
  authorId:    string
  bookId:      string
  orderId:     string
  gross:       number
  commission:  number
  net:         number
  createdAt:   string
  paidOut:     boolean
}

/** Records which user has access to which book (purchased or subscription). */
export interface LibraryEntry {
  id:          string
  userId:      string
  bookId:      string
  source:      "purchase" | "subscription" | "free"
  orderId:     string | null
  grantedAt:   string
  expiresAt:   string | null // null = lifetime
}

export interface Coupon {
  id:           string
  code:         string
  discountType: "pct" | "flat"
  discount:     number
  maxUses:      number
  usedCount:    number
  expiresAt:    string
  isActive:     boolean
  minOrderAmt:  number
}

export interface TaxConfig {
  id:          string
  name:        string // e.g. "VAT", "GST"
  rate:        number // e.g. 0.075 for 7.5%
  appliesTo:   "all" | "paid"
  isEnabled:   boolean
  /** Set when loaded from Laravel tax API */
  countryCode?: string | null
}

// ── Phase 3 Types ─────────────────────────────────────────────────────────────

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "trialing"
export type PayoutStatus        = "pending" | "paid" | "held"
export type CycleStatus         = "open" | "calculating" | "finalized" | "locked"

/** A subscription plan (created by admin). */
export interface SubscriptionPlan {
  id:               string
  name:             string          // e.g. "Pro Monthly"
  price:            number          // USD
  currency:         Currency
  durationDays:     number          // 30 | 365
  unlimitedReading: boolean
  isActive:         boolean
  isPopular:        boolean
  features:         string[]
  createdAt:        string
}

/** A user's subscription record. */
export interface Subscription {
  id:          string
  userId:      string
  planId:      string
  planName:    string
  price:       number
  currency:    Currency
  status:      SubscriptionStatus
  startedAt:   string
  expiresAt:   string
  cancelledAt: string | null
  gateway:     PaymentGateway
  paymentRef:  string | null
  transactionId: string | null
}

/**
 * Per-user, per-book engagement record.
 * Primary metric: completion_percentage (pages_read / total_pages).
 * Anti-manipulation: reading_speed must be < MAX_PAGES_PER_MINUTE.
 *
 * API: when Laravel is reachable this maps to → POST /api/reading/progress
 */
export interface EngagementRecord {
  id:                   string
  userId:               string
  bookId:               string
  sessionId:            string       // debounce key
  pagesRead:            number
  totalPages:           number
  completionPct:        number       // 0-100
  readingTimeSec:       number       // cumulative seconds
  lastPageAt:           string       // ISO timestamp
  cycleId:              string | null // which billing cycle
  isValid:              boolean       // false = flagged by anti-manipulation
}

/** Monthly revenue pool cycle. */
export interface RevenueCycle {
  id:               string
  cycleStart:       string
  cycleEnd:         string
  totalRevenue:     number  // sum of all subscription payments in cycle
  subscriberCount:  number
  adminCommissionPct: number // e.g. 30 = 30%
  adminEarnings:    number
  authorPool:       number  // totalRevenue * (1 - adminCommissionPct/100)
  totalEngagement:  number  // platform-wide reading minutes in cycle
  status:           CycleStatus
  calculatedAt:     string | null
  lockedAt:         string | null
}

/** Author payout record — one per author per cycle. */
export interface AuthorPayout {
  id:               string
  authorId:         string
  authorName:       string
  cycleId:          string
  totalEngagement:  number   // author's engagement minutes in cycle
  sharePct:         number   // authorEngagement / totalEngagement * 100
  grossEarnings:    number   // sharePct/100 * authorPool
  platformFee:      number   // gross * platformFeePct (e.g. 10%)
  netEarnings:      number   // gross - platformFee
  status:           PayoutStatus
  requestedAt:      string | null
  paidAt:           string | null
}

/** Audit log entry — immutable append-only. */
export interface AuditLog {
  id:        string
  action:    string
  entityId:  string
  entityType: string
  actorId:   string
  data:      Record<string, unknown>
  timestamp: string
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  // Phase 2
  orders:             "ms_orders",
  transactions:       "ms_transactions",
  authorEarnings:     "ms_author_earnings",
  library:            "ms_user_library",
  coupons:            "ms_coupons",
  taxConfig:          "ms_tax_config",
  // Phase 3
  subPlans:           "ms_subscription_plans",
  subscriptions:      "ms_subscriptions",
  engagement:         "ms_engagement",
  revenueCycles:      "ms_revenue_cycles",
  authorPayouts:      "ms_author_payouts",
  adminSettings:      "ms_admin_settings",
  auditLog:           "ms_audit_log",
} as const

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") } catch { return [] }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(data))
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA — runs once per browser session if storage is empty
// ─────────────────────────────────────────────────────────────────────────────

const SEED_COUPONS: Coupon[] = [
  { id: "cpn_001", code: "READ20",   discountType: "pct",  discount: 20,  maxUses: 500, usedCount: 138, expiresAt: "2026-12-31", isActive: true, minOrderAmt: 0 },
  { id: "cpn_002", code: "WELCOME5", discountType: "flat", discount: 5,   maxUses: 100, usedCount: 42,  expiresAt: "2026-06-30", isActive: true, minOrderAmt: 10 },
  { id: "cpn_003", code: "AFRICA10", discountType: "pct",  discount: 10,  maxUses: 1000,usedCount: 367, expiresAt: "2026-03-31", isActive: true, minOrderAmt: 5 },
  { id: "cpn_004", code: "FLASH50",  discountType: "pct",  discount: 50,  maxUses: 50,  usedCount: 50,  expiresAt: "2025-12-01", isActive: false, minOrderAmt: 15 },
  { id: "cpn_005", code: "NEWBOOK",  discountType: "flat", discount: 3,   maxUses: 200, usedCount: 89,  expiresAt: "2026-09-30", isActive: true, minOrderAmt: 0 },
]

const SEED_TAX: TaxConfig[] = [
  { id: "tax_001", name: "VAT",  rate: 0.075,  appliesTo: "all",  isEnabled: true },
  { id: "tax_002", name: "GST",  rate: 0.10,   appliesTo: "paid", isEnabled: false },
]

const SEED_ORDERS: Order[] = [
  {
    id: "ord_seed_001",
    orderNumber: "MS-20250112-001",
    userId: "usr_reader_1",
    items: [
      { bookId: "bk_002", title: "Atomic Habits: African Edition", author: "James Okafor",   coverUrl: "https://placehold.co/240x360?text=Atomic+Habits+modern+self-help+clean+white+cover+bold+typography", format: "ebook",     price: 12.99 },
      { bookId: "bk_008", title: "Currency of Knowledge",          author: "Dr. Amaka Eze",  coverUrl: "https://placehold.co/240x360?text=Currency+of+Knowledge+finance+economics+gold+premium+textbook+cover", format: "audiobook", price: 19.99 },
    ],
    subtotal: 32.98, discount: 0, tax: 2.47, total: 35.45,
    currency: "USD", localTotal: 35.45,
    couponCode: null, paymentGateway: "paystack",
    paymentRef: "PS_REF_AB12CD34",
    status: "paid", createdAt: "2025-01-12T10:23:00Z", paidAt: "2025-01-12T10:23:45Z",
  },
  {
    id: "ord_seed_002",
    orderNumber: "MS-20250218-002",
    userId: "usr_reader_1",
    items: [
      { bookId: "bk_010", title: "Python for Data Scientists", author: "Kofi Mensah", coverUrl: "https://placehold.co/240x360?text=Python+Data+Science+programming+book+dark+green+code+terminal", format: "ebook", price: 24.99 },
    ],
    subtotal: 24.99, discount: 5.00, tax: 1.50, total: 21.49,
    currency: "USD", localTotal: 21.49,
    couponCode: "WELCOME5", paymentGateway: "paypal",
    paymentRef: "PP_REF_XY98ZW76",
    status: "paid", createdAt: "2025-02-18T14:05:00Z", paidAt: "2025-02-18T14:06:10Z",
  },
  {
    id: "ord_seed_003",
    orderNumber: "MS-20250301-003",
    userId: "usr_reader_1",
    items: [
      { bookId: "bk_005", title: "Midnight in Accra", author: "Efua Asante", coverUrl: "https://placehold.co/240x360?text=Midnight+in+Accra+romance+novel+city+lights+dark+blue+purple+warm", format: "ebook", price: 8.99 },
    ],
    subtotal: 8.99, discount: 0, tax: 0.67, total: 9.66,
    currency: "USD", localTotal: 9.66,
    couponCode: null, paymentGateway: "flutterwave",
    paymentRef: "FLW_REF_MN45OP67",
    status: "refunded", createdAt: "2025-03-01T09:00:00Z", paidAt: "2025-03-01T09:01:00Z",
  },
  {
    id: "ord_seed_004",
    orderNumber: "MS-20250322-004",
    userId: "usr_reader_1",
    items: [
      { bookId: "bk_002", title: "Atomic Habits: African Edition", author: "James Okafor", coverUrl: "https://placehold.co/240x360?text=Atomic+Habits+modern+self-help+clean+white+cover+bold+typography", format: "ebook", price: 12.99 },
    ],
    subtotal: 12.99, discount: 0, tax: 0.97, total: 13.96,
    currency: "NGN", localTotal: 22336,
    couponCode: null, paymentGateway: "korapay",
    paymentRef: null,
    status: "pending", createdAt: "2025-03-22T16:45:00Z", paidAt: null,
  },
]

const SEED_TRANSACTIONS: Transaction[] = [
  { id: "txn_001", userId: "usr_reader_1", orderId: "ord_seed_001", gateway: "paystack",    amount: 35.45, currency: "USD", status: "success", referenceId: "PS_REF_AB12CD34", rawResponse: { message: "Approved", channel: "card" }, createdAt: "2025-01-12T10:23:45Z" },
  { id: "txn_002", userId: "usr_reader_1", orderId: "ord_seed_002", gateway: "paypal",      amount: 21.49, currency: "USD", status: "success", referenceId: "PP_REF_XY98ZW76", rawResponse: { status: "COMPLETED", payerId: "PAYER_001" }, createdAt: "2025-02-18T14:06:10Z" },
  { id: "txn_003", userId: "usr_reader_1", orderId: "ord_seed_003", gateway: "flutterwave", amount: 9.66,  currency: "USD", status: "refunded", referenceId: "FLW_REF_MN45OP67", rawResponse: { status: "successful", account_id: 20910 }, createdAt: "2025-03-01T09:01:00Z" },
  { id: "txn_004", userId: "usr_reader_1", orderId: "ord_seed_004", gateway: "korapay",     amount: 22336, currency: "NGN", status: "pending", referenceId: "KP_PENDING_001", rawResponse: {}, createdAt: "2025-03-22T16:45:00Z" },
]

const SEED_LIBRARY: LibraryEntry[] = [
  { id: "lib_001", userId: "usr_reader_1", bookId: "bk_002", source: "purchase", orderId: "ord_seed_001", grantedAt: "2025-01-12T10:23:45Z", expiresAt: null },
  { id: "lib_002", userId: "usr_reader_1", bookId: "bk_008", source: "purchase", orderId: "ord_seed_001", grantedAt: "2025-01-12T10:23:45Z", expiresAt: null },
  { id: "lib_003", userId: "usr_reader_1", bookId: "bk_010", source: "purchase", orderId: "ord_seed_002", grantedAt: "2025-02-18T14:06:10Z", expiresAt: null },
]

const SEED_AUTHOR_EARNINGS: AuthorEarning[] = [
  { id: "ae_001", authorId: "usr_author_1", bookId: "bk_002", orderId: "ord_seed_001", gross: 12.99, commission: 2.60, net: 10.39, createdAt: "2025-01-12T10:23:45Z", paidOut: true },
  { id: "ae_002", authorId: "usr_author_1", bookId: "bk_008", orderId: "ord_seed_001", gross: 19.99, commission: 4.00, net: 15.99, createdAt: "2025-01-12T10:23:45Z", paidOut: true },
  { id: "ae_003", authorId: "usr_author_1", bookId: "bk_010", orderId: "ord_seed_002", gross: 24.99, commission: 5.00, net: 19.99, createdAt: "2025-02-18T14:06:10Z", paidOut: true },
]

// ── Phase 3 Seed Data ─────────────────────────────────────────────────────────

const SEED_SUB_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_monthly", name: "Pro Monthly", price: 9.99, currency: "USD",
    durationDays: 30, unlimitedReading: true, isActive: true, isPopular: false,
    features: ["Unlimited book access","Audiobook streaming","Reading progress sync","Offline downloads (5 books)","Priority customer support"],
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "plan_yearly", name: "Pro Annual", price: 79.99, currency: "USD",
    durationDays: 365, unlimitedReading: true, isActive: true, isPopular: true,
    features: ["Everything in Monthly","Unlimited offline downloads","Early access to new releases","Author livestream access","Ad-free experience"],
    createdAt: "2025-01-01T00:00:00Z",
  },
]

const SEED_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub_001", userId: "usr_reader_1", planId: "plan_monthly",
    planName: "Pro Monthly", price: 9.99, currency: "USD",
    status: "active",
    startedAt: "2026-01-01T00:00:00Z", expiresAt: "2026-12-31T23:59:59Z",
    cancelledAt: null, gateway: "paystack", paymentRef: "PS_SUB_001", transactionId: "txn_sub_001",
  },
]

const SEED_ENGAGEMENT: EngagementRecord[] = [
  { id: "eng_001", userId: "usr_reader_1", bookId: "bk_001", sessionId: "sess_a1", pagesRead: 280, totalPages: 342, completionPct: 81.9,  readingTimeSec: 7200,  lastPageAt: "2026-01-10T20:00:00Z", cycleId: "cyc_202601", isValid: true },
  { id: "eng_002", userId: "usr_reader_1", bookId: "bk_004", sessionId: "sess_a2", pagesRead: 190, totalPages: 280, completionPct: 67.9,  readingTimeSec: 5400,  lastPageAt: "2026-01-15T18:30:00Z", cycleId: "cyc_202601", isValid: true },
  { id: "eng_003", userId: "usr_reader_1", bookId: "bk_006", sessionId: "sess_a3", pagesRead: 95,  totalPages: 220, completionPct: 43.2,  readingTimeSec: 2700,  lastPageAt: "2026-01-20T12:00:00Z", cycleId: "cyc_202601", isValid: true },
  { id: "eng_004", userId: "usr_reader_1", bookId: "bk_009", sessionId: "sess_a4", pagesRead: 310, totalPages: 410, completionPct: 75.6,  readingTimeSec: 9000,  lastPageAt: "2026-01-25T16:00:00Z", cycleId: "cyc_202601", isValid: true },
  { id: "eng_005", userId: "usr_reader_1", bookId: "bk_011", sessionId: "sess_a5", pagesRead: 220, totalPages: 380, completionPct: 57.9,  readingTimeSec: 6300,  lastPageAt: "2026-01-28T09:00:00Z", cycleId: "cyc_202601", isValid: true },
]

const SEED_REVENUE_CYCLES: RevenueCycle[] = [
  {
    id: "cyc_202601", cycleStart: "2026-01-01", cycleEnd: "2026-01-31",
    totalRevenue: 12480, subscriberCount: 1248, adminCommissionPct: 30,
    adminEarnings: 3744, authorPool: 8736, totalEngagement: 1850000,
    status: "open", calculatedAt: null, lockedAt: null,
  },
  {
    id: "cyc_202512", cycleStart: "2025-12-01", cycleEnd: "2025-12-31",
    totalRevenue: 11600, subscriberCount: 1160, adminCommissionPct: 30,
    adminEarnings: 3480, authorPool: 8120, totalEngagement: 1720000,
    status: "locked", calculatedAt: "2026-01-01T06:00:00Z", lockedAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "cyc_202511", cycleStart: "2025-11-01", cycleEnd: "2025-11-30",
    totalRevenue: 10400, subscriberCount: 1040, adminCommissionPct: 30,
    adminEarnings: 3120, authorPool: 7280, totalEngagement: 1520000,
    status: "locked", calculatedAt: "2025-12-01T06:00:00Z", lockedAt: "2025-12-02T00:00:00Z",
  },
]

const SEED_AUTHOR_PAYOUTS: AuthorPayout[] = [
  {
    id: "payout_001", authorId: "usr_author_1", authorName: "Jane Austen",
    cycleId: "cyc_202601", totalEngagement: 43300, sharePct: 2.34,
    grossEarnings: 204.42, platformFee: 20.44, netEarnings: 183.98,
    status: "pending", requestedAt: null, paidAt: null,
  },
  {
    id: "payout_002", authorId: "usr_author_1", authorName: "Jane Austen",
    cycleId: "cyc_202512", totalEngagement: 39200, sharePct: 2.28,
    grossEarnings: 185.14, platformFee: 18.51, netEarnings: 166.63,
    status: "paid", requestedAt: "2026-01-03T10:00:00Z", paidAt: "2026-01-05T14:30:00Z",
  },
  {
    id: "payout_003", authorId: "usr_author_1", authorName: "Jane Austen",
    cycleId: "cyc_202511", totalEngagement: 31100, sharePct: 2.05,
    grossEarnings: 149.24, platformFee: 14.92, netEarnings: 134.32,
    status: "paid", requestedAt: "2025-12-03T09:00:00Z", paidAt: "2025-12-06T11:00:00Z",
  },
]

export function seedStore(): void {
  if (typeof window === "undefined") return
  if (process.env.NODE_ENV === "production") return
  // Phase 2
  if (!localStorage.getItem(KEYS.coupons))       save(KEYS.coupons,       SEED_COUPONS)
  if (!localStorage.getItem(KEYS.taxConfig))     save(KEYS.taxConfig,     SEED_TAX)
  if (!localStorage.getItem(KEYS.orders))        save(KEYS.orders,        SEED_ORDERS)
  if (!localStorage.getItem(KEYS.transactions))  save(KEYS.transactions,  SEED_TRANSACTIONS)
  if (!localStorage.getItem(KEYS.library))       save(KEYS.library,       SEED_LIBRARY)
  if (!localStorage.getItem(KEYS.authorEarnings))save(KEYS.authorEarnings,SEED_AUTHOR_EARNINGS)
  // Phase 3
  if (!localStorage.getItem(KEYS.subPlans))      save(KEYS.subPlans,      SEED_SUB_PLANS)
  if (!localStorage.getItem(KEYS.subscriptions)) save(KEYS.subscriptions, SEED_SUBSCRIPTIONS)
  if (!localStorage.getItem(KEYS.engagement))    save(KEYS.engagement,    SEED_ENGAGEMENT)
  if (!localStorage.getItem(KEYS.revenueCycles)) save(KEYS.revenueCycles, SEED_REVENUE_CYCLES)
  if (!localStorage.getItem(KEYS.authorPayouts)) save(KEYS.authorPayouts, SEED_AUTHOR_PAYOUTS)
  if (!localStorage.getItem(KEYS.adminSettings)) {
    localStorage.setItem(KEYS.adminSettings, JSON.stringify({
      adminCommissionPct:  30,   // 30% admin cut
      platformFeeOnPayout: 10,   // 10% platform fee on author gross payout
      maxPagesPerMinute:   5,    // anti-manipulation: cap
      minSessionSec:       30,   // minimum valid reading session
    }))
  }
  if (!localStorage.getItem(KEYS.auditLog)) save(KEYS.auditLog, [])
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY UTILS
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCY_RATES: Record<Currency, number>  = { USD: 1, NGN: 1600, GHS: 15.2, KES: 130 }
export const CURRENCY_SYMBOLS: Record<Currency, string> = { USD: "$", NGN: "₦", GHS: "₵", KES: "KSh" }

export function toLocalCurrency(usd: number, currency: Currency): number {
  return parseFloat((usd * CURRENCY_RATES[currency]).toFixed(2))
}

// ─────────────────────────────────────────────────────────────────────────────
// COUPON STORE
// ─────────────────────────────────────────────────────────────────────────────

export const couponStore = {
  getAll():    Coupon[] { return load<Coupon>(KEYS.coupons) },

  validate(code: string, subtotal: number): { valid: boolean; coupon?: Coupon; error?: string } {
    const all = couponStore.getAll()
    const coupon = all.find(c => c.code === code.toUpperCase())
    if (!coupon)          return { valid: false, error: "Invalid coupon code." }
    if (!coupon.isActive) return { valid: false, error: "This coupon has expired." }
    if (new Date(coupon.expiresAt) < new Date()) return { valid: false, error: "This coupon has expired." }
    if (coupon.usedCount >= coupon.maxUses)      return { valid: false, error: "This coupon has reached its usage limit." }
    if (subtotal < coupon.minOrderAmt)           return { valid: false, error: `Minimum order of $${coupon.minOrderAmt} required.` }
    return { valid: true, coupon }
  },

  calcDiscount(coupon: Coupon, subtotal: number): number {
    if (coupon.discountType === "pct")  return parseFloat(((subtotal * coupon.discount) / 100).toFixed(2))
    return Math.min(coupon.discount, subtotal)
  },

  use(code: string): void {
    const all = couponStore.getAll()
    const idx = all.findIndex(c => c.code === code.toUpperCase())
    if (idx === -1) return
    all[idx].usedCount += 1
    save(KEYS.coupons, all)
  },

  create(coupon: Omit<Coupon, "id" | "usedCount">): Coupon {
    const all = couponStore.getAll()
    const created: Coupon = { ...coupon, id: uid("cpn"), usedCount: 0 }
    save(KEYS.coupons, [...all, created])
    return created
  },

  update(id: string, patch: Partial<Coupon>): void {
    const all = couponStore.getAll().map(c => c.id === id ? { ...c, ...patch } : c)
    save(KEYS.coupons, all)
  },

  delete(id: string): void {
    save(KEYS.coupons, couponStore.getAll().filter(c => c.id !== id))
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TAX STORE
// ─────────────────────────────────────────────────────────────────────────────

export const taxStore = {
  getAll(): TaxConfig[] { return load<TaxConfig>(KEYS.taxConfig) },

  getActive(): TaxConfig | null {
    return taxStore.getAll().find(t => t.isEnabled) ?? null
  },

  calcTax(subtotal: number, discount: number): number {
    const active = taxStore.getActive()
    if (!active) return 0
    return parseFloat(((subtotal - discount) * active.rate).toFixed(2))
  },

  update(id: string, patch: Partial<TaxConfig>): void {
    const all = taxStore.getAll().map(t => t.id === id ? { ...t, ...patch } : t)
    save(KEYS.taxConfig, all)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STORE
// ─────────────────────────────────────────────────────────────────────────────

/** Admin commission rate on direct book sales */
export const SALES_COMMISSION_PCT = 0.20 // 20%

export const orderStore = {
  getAll():   Order[] { return load<Order>(KEYS.orders) },
  getById(id: string): Order | null {
    return orderStore.getAll().find(o => o.id === id) ?? null
  },
  getByUser(userId: string): Order[] {
    return orderStore.getAll().filter(o => o.userId === userId)
  },

  /**
   * Creates a new order and — on success — grants library access + records
   * author earnings. Simulates DB::transaction atomicity.
   *
   * API: when Laravel is reachable this maps to → POST /api/orders
   * Body: { items, coupon_code, payment_gateway, currency }
   * Response: { order, payment_init_url }
   */
  create(
    userId:   string,
    items:    OrderItem[],
    opts: {
      couponCode?:    string
      coupon?:        Coupon | null
      paymentGateway: PaymentGateway
      currency:       Currency
    }
  ): Order {
    const subtotal  = parseFloat(items.reduce((s, i) => s + i.price, 0).toFixed(2))
    const discount  = opts.coupon ? couponStore.calcDiscount(opts.coupon, subtotal) : 0
    const tax       = taxStore.calcTax(subtotal, discount)
    const total     = parseFloat((subtotal - discount + tax).toFixed(2))
    const localTotal = toLocalCurrency(total, opts.currency)

    const now = new Date().toISOString()
    const orderNum = `MS-${now.slice(0,10).replace(/-/g, "")}-${String(orderStore.getAll().length + 1).padStart(3,"0")}`

    const order: Order = {
      id:             uid("ord"),
      orderNumber:    orderNum,
      userId,
      items,
      subtotal, discount, tax, total,
      currency:       opts.currency,
      localTotal,
      couponCode:     opts.couponCode ?? null,
      paymentGateway: opts.paymentGateway,
      paymentRef:     null,
      status:         "pending",
      createdAt:      now,
      paidAt:         null,
    }

    save(KEYS.orders, [...orderStore.getAll(), order])
    return order
  },

  /**
   * Mark order as PAID.  Also:
   * - Records transaction log
   * - Grants library access for each book
   * - Records author earnings per book
   *
   * API: when Laravel is reachable this maps to → POST /api/webhooks/:gateway
   * This logic runs server-side on webhook receipt, not client-side.
   */
  markPaid(orderId: string, paymentRef: string): Order | null {
    const all   = orderStore.getAll()
    const idx   = all.findIndex(o => o.id === orderId)
    if (idx === -1) return null

    const now = new Date().toISOString()
    all[idx] = { ...all[idx], status: "paid", paymentRef, paidAt: now }
    save(KEYS.orders, all)

    const order = all[idx]

    // Record transaction
    const txn: Transaction = {
      id:          uid("txn"),
      userId:      order.userId,
      orderId:     order.id,
      gateway:     order.paymentGateway,
      amount:      order.total,
      currency:    order.currency,
      status:      "success",
      referenceId: paymentRef,
      rawResponse: { simulated: true, gateway: order.paymentGateway },
      createdAt:   now,
    }
    transactionStore._append(txn)

    // Grant library access
    order.items.forEach(item => {
      libraryStore._grant({
        userId:  order.userId,
        bookId:  item.bookId,
        source:  "purchase",
        orderId: order.id,
      })
    })

    // Record author earnings (20% admin commission)
    order.items.forEach(item => {
      const commission = parseFloat((item.price * SALES_COMMISSION_PCT).toFixed(2))
      const net        = parseFloat((item.price - commission).toFixed(2))
      authorEarningsStore._record({
        authorId: "usr_author_1", // API: when Laravel is reachable this maps to → look up book.author_id
        bookId:   item.bookId,
        orderId:  order.id,
        gross:    item.price,
        commission,
        net,
      })
    })

    // Use coupon
    if (order.couponCode) couponStore.use(order.couponCode)

    return order
  },

  markRefunded(orderId: string, type: RefundType = "full", amount?: number): Order | null {
    const all = orderStore.getAll()
    const idx = all.findIndex(o => o.id === orderId)
    if (idx === -1) return null
    all[idx] = { ...all[idx], status: "refunded" }
    save(KEYS.orders, all)
    // API: when Laravel is reachable this maps to → POST /api/admin/refunds { order_id, type, amount }
    return all[idx]
  },

  markFailed(orderId: string): Order | null {
    const all = orderStore.getAll()
    const idx = all.findIndex(o => o.id === orderId)
    if (idx === -1) return null
    all[idx] = { ...all[idx], status: "failed" }
    save(KEYS.orders, all)
    return all[idx]
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION STORE
// ─────────────────────────────────────────────────────────────────────────────

export const transactionStore = {
  getAll():            Transaction[] { return load<Transaction>(KEYS.transactions) },
  getByOrder(orderId: string): Transaction[] {
    return transactionStore.getAll().filter(t => t.orderId === orderId)
  },
  getByUser(userId: string): Transaction[] {
    return transactionStore.getAll().filter(t => t.userId === userId)
  },
  _append(txn: Transaction): void {
    save(KEYS.transactions, [...transactionStore.getAll(), txn])
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY / ACCESS CONTROL STORE
// ─────────────────────────────────────────────────────────────────────────────

export const libraryStore = {
  getAll():           LibraryEntry[] { return load<LibraryEntry>(KEYS.library) },
  getByUser(userId: string): LibraryEntry[] {
    return libraryStore.getAll().filter(e => e.userId === userId)
  },

  /**
   * Returns true if the user has access to read/download this book.
   * Checks both purchase records and active subscription access.
   */
  hasAccess(userId: string, bookId: string): boolean {
    const all = libraryStore.getAll()
    return all.some(e => {
      if (e.userId !== userId || e.bookId !== bookId) return false
      if (!e.expiresAt) return true
      return new Date(e.expiresAt) > new Date()
    })
  },

  /** Grant subscription access (expires when subscription expires) */
  grantSubscription(userId: string, expiresAt: string): void {
    // In production: called when subscription is activated
    // API: when Laravel is reachable this maps to → handled server-side, not needed client-side
  },

  _grant(entry: Omit<LibraryEntry, "id" | "grantedAt" | "expiresAt">): void {
    const all = libraryStore.getAll()
    if (all.some(e => e.userId === entry.userId && e.bookId === entry.bookId && e.source === "purchase")) return
    const created: LibraryEntry = {
      ...entry,
      id: uid("lib"),
      grantedAt: new Date().toISOString(),
      expiresAt: null,
    }
    save(KEYS.library, [...all, created])
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHOR EARNINGS STORE (Direct Sales)
// ─────────────────────────────────────────────────────────────────────────────

export const authorEarningsStore = {
  getAll():             AuthorEarning[] { return load<AuthorEarning>(KEYS.authorEarnings) },
  getByAuthor(authorId: string): AuthorEarning[] {
    return authorEarningsStore.getAll().filter(e => e.authorId === authorId)
  },

  summary(authorId: string) {
    const all = authorEarningsStore.getByAuthor(authorId)
    const paid    = all.filter(e => e.paidOut)
    const pending = all.filter(e => !e.paidOut)
    return {
      totalGross:    all.reduce((s, e) => s + e.gross, 0),
      totalNet:      all.reduce((s, e) => s + e.net, 0),
      paidOutNet:    paid.reduce((s, e) => s + e.net, 0),
      pendingNet:    pending.reduce((s, e) => s + e.net, 0),
      totalSales:    all.length,
    }
  },

  _record(entry: Omit<AuthorEarning, "id" | "createdAt" | "paidOut">): void {
    const created: AuthorEarning = {
      ...entry,
      id: uid("ae"),
      createdAt: new Date().toISOString(),
      paidOut: false,
    }
    save(KEYS.authorEarnings, [...authorEarningsStore.getAll(), created])
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SERVICE (Client-side simulation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * paymentService.initiate() simulates the payment gateway initialization.
 *
 * In production:
 *   1. Frontend calls POST /api/orders → gets order_id + payment_init_url
 *   2. Frontend redirects or opens popup to payment_init_url
 *   3. Gateway redirects to /checkout/callback?ref=xxx&status=success|failed
 *   4. Backend webhook verifies + calls orderStore.markPaid()
 *
 * Here we simulate with a 2.5s delay + 95% success rate.
 */
export const paymentService = {
  async initiate(
    order: Order,
    cardDetails?: { number: string; expiry: string; cvv: string; name: string }
  ): Promise<{ success: boolean; ref: string; error?: string }> {
    // API: when Laravel is reachable this maps to
    // Paystack:    POST https://api.paystack.co/transaction/initialize
    // Flutterwave: POST https://api.flutterwave.com/v3/payments
    // PayPal:      POST https://api.paypal.com/v2/checkout/orders
    // Korapay:     POST https://api.korapay.com/merchant/api/v1/charges/initialize

    await new Promise(r => setTimeout(r, 2500))

    const shouldFail = Math.random() < 0.05 // 5% failure rate in simulation
    if (shouldFail) return { success: false, ref: "", error: "Payment declined. Please try again or use a different card." }

    const prefixes: Record<PaymentGateway, string> = {
      paystack: "PS", flutterwave: "FLW", paypal: "PP", korapay: "KP",
    }
    const ref = `${prefixes[order.paymentGateway]}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    return { success: true, ref }
  },

  /**
   * Verifies a payment reference. In production this is ALWAYS server-side.
   * Frontend should never be trusted for payment verification.
   *
   * API: when Laravel is reachable this maps to → GET /api/orders/:id/verify (backend calls gateway verify API)
   */
  async verify(gateway: PaymentGateway, ref: string): Promise<boolean> {
    await new Promise(r => setTimeout(r, 500))
    return ref.length > 0 // simulate
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — ADMIN SETTINGS (commission rates, limits)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminSettings {
  adminCommissionPct:   number  // % of revenue kept by admin (e.g. 30)
  platformFeeOnPayout:  number  // % fee on author gross before payout (e.g. 10)
  maxPagesPerMinute:    number  // anti-manipulation cap
  minSessionSec:        number  // min reading session to count
}

export const adminSettingsStore = {
  get(): AdminSettings {
    if (typeof window === "undefined") {
      return { adminCommissionPct: 30, platformFeeOnPayout: 10, maxPagesPerMinute: 5, minSessionSec: 30 }
    }
    try {
      const raw = localStorage.getItem(KEYS.adminSettings)
      return raw ? JSON.parse(raw) : { adminCommissionPct: 30, platformFeeOnPayout: 10, maxPagesPerMinute: 5, minSessionSec: 30 }
    } catch {
      return { adminCommissionPct: 30, platformFeeOnPayout: 10, maxPagesPerMinute: 5, minSessionSec: 30 }
    }
  },

  update(patch: Partial<AdminSettings>): AdminSettings {
    const current = adminSettingsStore.get()
    const updated = { ...current, ...patch }
    if (typeof window !== "undefined") localStorage.setItem(KEYS.adminSettings, JSON.stringify(updated))
    auditLogStore.append("admin_settings_updated", "admin_settings", "system", { before: current, after: updated })
    return updated
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — AUDIT LOG (append-only)
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogStore = {
  getAll(): AuditLog[] { return load<AuditLog>(KEYS.auditLog) },

  append(action: string, entityType: string, entityId: string, data: Record<string, unknown> = {}): void {
    const log: AuditLog = {
      id:         uid("log"),
      action,
      entityType,
      entityId,
      actorId:    "system",
      data,
      timestamp:  new Date().toISOString(),
    }
    save(KEYS.auditLog, [...auditLogStore.getAll(), log])
  },

  getByEntity(entityType: string): AuditLog[] {
    return auditLogStore.getAll().filter(l => l.entityType === entityType)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — SUBSCRIPTION PLANS
// ─────────────────────────────────────────────────────────────────────────────

export const subPlanStore = {
  getAll():           SubscriptionPlan[] { return load<SubscriptionPlan>(KEYS.subPlans) },
  getActive():        SubscriptionPlan[] { return subPlanStore.getAll().filter(p => p.isActive) },
  getById(id: string): SubscriptionPlan | null { return subPlanStore.getAll().find(p => p.id === id) ?? null },

  create(data: Omit<SubscriptionPlan, "id" | "createdAt">): SubscriptionPlan {
    const plan: SubscriptionPlan = { ...data, id: uid("plan"), createdAt: new Date().toISOString() }
    save(KEYS.subPlans, [...subPlanStore.getAll(), plan])
    auditLogStore.append("plan_created", "subscription_plan", plan.id, { plan })
    return plan
  },

  update(id: string, patch: Partial<SubscriptionPlan>): void {
    const all = subPlanStore.getAll().map(p => p.id === id ? { ...p, ...patch } : p)
    save(KEYS.subPlans, all)
    auditLogStore.append("plan_updated", "subscription_plan", id, { patch })
  },

  delete(id: string): void {
    save(KEYS.subPlans, subPlanStore.getAll().filter(p => p.id !== id))
    auditLogStore.append("plan_deleted", "subscription_plan", id, {})
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionStore = {
  getAll():          Subscription[] { return load<Subscription>(KEYS.subscriptions) },
  getByUser(userId: string): Subscription | null {
    const subs = subscriptionStore.getAll().filter(s => s.userId === userId)
    // return the most recent active one
    return subs.find(s => s.status === "active" && new Date(s.expiresAt) > new Date()) ?? null
  },

  getActiveByUser(userId: string): Subscription | null {
    return subscriptionStore.getByUser(userId)
  },

  isActive(userId: string): boolean {
    return subscriptionStore.getActiveByUser(userId) !== null
  },

  /**
   * Book access check for subscription users:
   *   - FREE books: always accessible
   *   - SUBSCRIPTION books: accessible if user has active subscription
   *   - PAID books: NEVER accessible via subscription; must purchase
   */
  canAccess(userId: string, accessType: "FREE" | "PAID" | "SUBSCRIPTION"): boolean {
    if (accessType === "FREE") return true
    if (accessType === "PAID") return false  // must purchase even with subscription
    return subscriptionStore.isActive(userId)
  },

  /**
   * Unified access gate: checks purchase + subscription + free access.
   * API: when Laravel is reachable this maps to → GET /api/books/:id/access
   */
  checkBookAccess(
    userId: string,
    bookId: string,
    accessType: "FREE" | "PAID" | "SUBSCRIPTION"
  ): { allowed: boolean; reason: "free" | "purchased" | "subscription" | "denied" } {
    if (accessType === "FREE") return { allowed: true, reason: "free" }
    if (libraryStore.hasAccess(userId, bookId)) return { allowed: true, reason: "purchased" }
    if (accessType === "SUBSCRIPTION" && subscriptionStore.isActive(userId)) {
      return { allowed: true, reason: "subscription" }
    }
    return { allowed: false, reason: "denied" }
  },

  /**
   * Purchase a subscription plan.
   * Enforces: one active subscription per user.
   * API: when Laravel is reachable this maps to → POST /api/subscriptions
   */
  async purchase(
    userId: string,
    planId: string,
    gateway: PaymentGateway,
    currency: Currency
  ): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    // Check for existing active sub
    if (subscriptionStore.isActive(userId)) {
      return { success: false, error: "You already have an active subscription." }
    }

    const plan = subPlanStore.getById(planId)
    if (!plan) return { success: false, error: "Plan not found." }

    // Simulate payment
    await new Promise(r => setTimeout(r, 2000))
    const shouldFail = Math.random() < 0.05
    if (shouldFail) return { success: false, error: "Payment declined. Please try again." }

    const now     = new Date()
    const expires = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
    const paymentRef = `${gateway.toUpperCase()}_SUB_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const sub: Subscription = {
      id:            uid("sub"),
      userId,
      planId,
      planName:      plan.name,
      price:         plan.price,
      currency,
      status:        "active",
      startedAt:     now.toISOString(),
      expiresAt:     expires.toISOString(),
      cancelledAt:   null,
      gateway,
      paymentRef,
      transactionId: uid("txn"),
    }

    save(KEYS.subscriptions, [...subscriptionStore.getAll(), sub])

    // Record transaction
    const txn: Transaction = {
      id:          sub.transactionId!,
      userId,
      orderId:     sub.id,
      gateway,
      amount:      toLocalCurrency(plan.price, currency),
      currency,
      status:      "success",
      referenceId: paymentRef,
      rawResponse: { type: "subscription", planId, simulated: true },
      createdAt:   now.toISOString(),
    }
    transactionStore._append(txn)

    // Update user's auth session fields (in real app handled by backend)
    auditLogStore.append("subscription_purchased", "subscription", sub.id, { userId, planId, expires: sub.expiresAt })

    return { success: true, subscription: sub }
  },

  cancel(subId: string, userId: string): boolean {
    const all = subscriptionStore.getAll()
    const idx = all.findIndex(s => s.id === subId && s.userId === userId)
    if (idx === -1) return false
    all[idx] = { ...all[idx], status: "cancelled", cancelledAt: new Date().toISOString() }
    save(KEYS.subscriptions, all)
    auditLogStore.append("subscription_cancelled", "subscription", subId, { userId })
    return true
  },

  /** Cron job: expire subscriptions whose expiresAt has passed. */
  runExpirationCheck(): number {
    let expired = 0
    const all = subscriptionStore.getAll()
    const now = new Date()
    const updated = all.map(s => {
      if (s.status === "active" && new Date(s.expiresAt) < now) {
        expired++
        return { ...s, status: "expired" as SubscriptionStatus }
      }
      return s
    })
    save(KEYS.subscriptions, updated)
    if (expired > 0) auditLogStore.append("subscriptions_expired", "subscription", "batch", { count: expired })
    return expired
  },

  getAll_admin(): Subscription[] { return subscriptionStore.getAll() },
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — ENGAGEMENT TRACKING
// Anti-manipulation: debounce, speed cap, min session validation.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PAGES_PER_MIN_DEFAULT = 5

export const engagementStore = {
  getAll():               EngagementRecord[] { return load<EngagementRecord>(KEYS.engagement) },
  getByUser(userId: string): EngagementRecord[] {
    return engagementStore.getAll().filter(e => e.userId === userId)
  },
  getByBook(bookId: string): EngagementRecord[] {
    return engagementStore.getAll().filter(e => e.bookId === bookId)
  },
  getByUserBook(userId: string, bookId: string): EngagementRecord | null {
    // most recent session
    return engagementStore.getAll()
      .filter(e => e.userId === userId && e.bookId === bookId)
      .sort((a, b) => new Date(b.lastPageAt).getTime() - new Date(a.lastPageAt).getTime())[0] ?? null
  },
  getByCycle(cycleId: string): EngagementRecord[] {
    return engagementStore.getAll().filter(e => e.cycleId === cycleId && e.isValid)
  },

  /**
   * Record or update reading progress.
   * Anti-manipulation rules applied server-side in production.
   *
   * API: when Laravel is reachable this maps to → POST /api/reading/progress (debounced, 10s)
   */
  upsert(
    userId: string,
    bookId: string,
    data: {
      pagesRead:      number
      totalPages:     number
      readingTimeSec: number
      sessionId:      string
      cycleId?:       string
    }
  ): { ok: boolean; record?: EngagementRecord; flagged?: boolean } {
    const settings = adminSettingsStore.get()
    const maxPPM = settings.maxPagesPerMinute ?? MAX_PAGES_PER_MIN_DEFAULT
    const minSec = settings.minSessionSec     ?? 30

    // Anti-manipulation: validate reading speed
    const sessionMinutes = data.readingTimeSec / 60
    const pagesPerMin    = sessionMinutes > 0 ? data.pagesRead / sessionMinutes : 0
    const isValid        = pagesPerMin <= maxPPM && data.readingTimeSec >= minSec

    const completionPct = data.totalPages > 0
      ? parseFloat(((data.pagesRead / data.totalPages) * 100).toFixed(2))
      : 0

    // Find existing record for this session
    const all = engagementStore.getAll()
    const existingIdx = all.findIndex(e => e.userId === userId && e.bookId === bookId)

    // Determine current cycle
    const currentCycle = revenueCycleStore.getCurrentOpenCycle()
    const cycleId = data.cycleId ?? currentCycle?.id ?? null

    if (existingIdx >= 0) {
      // Update — only if new data is more progressed (no regression fraud)
      const existing = all[existingIdx]
      const updated: EngagementRecord = {
        ...existing,
        pagesRead:      Math.max(existing.pagesRead, data.pagesRead),
        readingTimeSec: Math.max(existing.readingTimeSec, data.readingTimeSec),
        completionPct:  Math.max(existing.completionPct, completionPct),
        lastPageAt:     new Date().toISOString(),
        isValid:        isValid && existing.isValid,
      }
      all[existingIdx] = updated
      save(KEYS.engagement, all)
      return { ok: true, record: updated, flagged: !isValid }
    }

    const record: EngagementRecord = {
      id:             uid("eng"),
      userId,
      bookId,
      sessionId:      data.sessionId,
      pagesRead:      data.pagesRead,
      totalPages:     data.totalPages,
      completionPct,
      readingTimeSec: data.readingTimeSec,
      lastPageAt:     new Date().toISOString(),
      cycleId,
      isValid,
    }
    save(KEYS.engagement, [...all, record])
    return { ok: true, record, flagged: !isValid }
  },

  /**
   * Compute total engagement minutes for a user (for author dashboard).
   * Uses completion-weighted reading time as the engagement metric.
   */
  computeAuthorEngagement(authorId: string, cycleId: string): number {
    // In production: engagement is aggregated across all users reading author's books
    // Here we use seed data and derive reading minutes
    const all = engagementStore.getAll().filter(e => e.cycleId === cycleId && e.isValid)
    return all.reduce((sum, e) => sum + Math.floor(e.readingTimeSec / 60), 0)
  },

  /**
   * Platform-wide total engagement minutes for a cycle.
   * API: when Laravel is reachable this maps to → GET /api/cycles/:id/engagement-total
   */
  computeTotalPlatformEngagement(cycleId: string): number {
    const cycle = revenueCycleStore.getAll().find(c => c.id === cycleId)
    return cycle?.totalEngagement ?? 0
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — REVENUE POOL CYCLES
// ─────────────────────────────────────────────────────────────────────────────

export const revenueCycleStore = {
  getAll():           RevenueCycle[] { return load<RevenueCycle>(KEYS.revenueCycles) },
  getById(id: string): RevenueCycle | null { return revenueCycleStore.getAll().find(c => c.id === id) ?? null },
  getCurrentOpenCycle(): RevenueCycle | null {
    return revenueCycleStore.getAll().find(c => c.status === "open") ?? null
  },
  getLocked(): RevenueCycle[] {
    return revenueCycleStore.getAll().filter(c => c.status === "locked")
  },

  /**
   * Revenue Pool Calculation Engine — runs monthly (1st of each month).
   *
   * Steps:
   * 1. Gather all subscription payments in the cycle
   * 2. Deduct admin commission (configurable, stored historically)
   * 3. Remaining = author pool
   * 4. For each author: share = (authorEngagement / totalEngagement) × authorPool
   * 5. Lock cycle + create author payouts
   *
   * Security: only runs once per cycle (status gate). Locked cycles immutable.
   * API: when Laravel is reachable this maps to → App\Jobs\CalculateRevenueCycle (queue, monthly cron)
   */
  runMonthlyCalculation(cycleId: string, actorId = "system"): {
    success: boolean
    cycle?: RevenueCycle
    payoutsCreated: number
    error?: string
  } {
    const all   = revenueCycleStore.getAll()
    const idx   = all.findIndex(c => c.id === cycleId)
    if (idx === -1) return { success: false, payoutsCreated: 0, error: "Cycle not found." }
    const cycle = all[idx]
    if (cycle.status === "locked") return { success: false, payoutsCreated: 0, error: "Cycle already locked." }

    const settings = adminSettingsStore.get()

    // Mark as calculating
    all[idx] = { ...cycle, status: "calculating" }
    save(KEYS.revenueCycles, all)

    // Calculate pool
    const adminCommissionPct = settings.adminCommissionPct
    const adminEarnings  = parseFloat((cycle.totalRevenue * (adminCommissionPct / 100)).toFixed(2))
    const authorPool     = parseFloat((cycle.totalRevenue - adminEarnings).toFixed(2))
    const totalEngagement = cycle.totalEngagement || 1 // prevent /0

    // Get all unique authors who have engagement this cycle
    const engRecords = engagementStore.getByCycle(cycleId)
    // Group by authorId (in production: join with books table for author lookup)
    // Here: simulate using seed author data
    const authorGroups: Record<string, { engagement: number; authorName: string }> = {}
    const subPlans = subPlanStore.getAll()

    // For demo: assign all engagement to usr_author_1 (in production: use book.author_id)
    const totalAuthorEngagement = engRecords.reduce((s, e) => s + Math.floor(e.readingTimeSec / 60), 0)
    if (totalAuthorEngagement > 0) {
      authorGroups["usr_author_1"] = { engagement: totalAuthorEngagement, authorName: "Jane Austen" }
    }

    let payoutsCreated = 0
    const existingPayouts = authorPayoutStore.getAll()

    Object.entries(authorGroups).forEach(([authorId, { engagement, authorName }]) => {
      // Skip if payout already exists for this cycle
      if (existingPayouts.some(p => p.authorId === authorId && p.cycleId === cycleId)) return

      const sharePct    = parseFloat(((engagement / totalEngagement) * 100).toFixed(4))
      const gross       = parseFloat(((sharePct / 100) * authorPool).toFixed(2))
      const platformFee = parseFloat((gross * (settings.platformFeeOnPayout / 100)).toFixed(2))
      const net         = parseFloat((gross - platformFee).toFixed(2))

      authorPayoutStore.create({
        authorId,
        authorName,
        cycleId,
        totalEngagement: engagement,
        sharePct,
        grossEarnings: gross,
        platformFee,
        netEarnings: net,
        status: "pending",
        requestedAt: null,
        paidAt: null,
      })
      payoutsCreated++
    })

    // Lock the cycle
    const now = new Date().toISOString()
    const updatedAll = revenueCycleStore.getAll()
    const updatedIdx = updatedAll.findIndex(c => c.id === cycleId)
    if (updatedIdx >= 0) {
      updatedAll[updatedIdx] = {
        ...updatedAll[updatedIdx],
        adminCommissionPct,
        adminEarnings,
        authorPool,
        status: "locked",
        calculatedAt: now,
        lockedAt: now,
      }
      save(KEYS.revenueCycles, updatedAll)
    }

    auditLogStore.append("cycle_locked", "revenue_cycle", cycleId, {
      adminCommissionPct, adminEarnings, authorPool, payoutsCreated, actorId,
    })

    return { success: true, cycle: updatedAll[updatedIdx], payoutsCreated }
  },

  /** Open a new cycle (admin action). */
  openNewCycle(start: string, end: string, totalRevenue: number, subscriberCount: number): RevenueCycle {
    const settings = adminSettingsStore.get()
    const cycle: RevenueCycle = {
      id:               uid("cyc"),
      cycleStart:       start,
      cycleEnd:         end,
      totalRevenue,
      subscriberCount,
      adminCommissionPct: settings.adminCommissionPct,
      adminEarnings:    parseFloat((totalRevenue * (settings.adminCommissionPct / 100)).toFixed(2)),
      authorPool:       parseFloat((totalRevenue * (1 - settings.adminCommissionPct / 100)).toFixed(2)),
      totalEngagement:  0,
      status:           "open",
      calculatedAt:     null,
      lockedAt:         null,
    }
    save(KEYS.revenueCycles, [...revenueCycleStore.getAll(), cycle])
    auditLogStore.append("cycle_opened", "revenue_cycle", cycle.id, { start, end, totalRevenue })
    return cycle
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — AUTHOR PAYOUTS
// ─────────────────────────────────────────────────────────────────────────────

export const authorPayoutStore = {
  getAll():                  AuthorPayout[] { return load<AuthorPayout>(KEYS.authorPayouts) },
  getByAuthor(authorId: string): AuthorPayout[] {
    return authorPayoutStore.getAll().filter(p => p.authorId === authorId)
  },
  getByCycle(cycleId: string): AuthorPayout[] {
    return authorPayoutStore.getAll().filter(p => p.cycleId === cycleId)
  },

  create(data: Omit<AuthorPayout, "id">): AuthorPayout {
    const payout: AuthorPayout = { ...data, id: uid("pout") }
    save(KEYS.authorPayouts, [...authorPayoutStore.getAll(), payout])
    return payout
  },

  markPaid(id: string): boolean {
    const all = authorPayoutStore.getAll()
    const idx = all.findIndex(p => p.id === id)
    if (idx === -1) return false
    all[idx] = { ...all[idx], status: "paid", paidAt: new Date().toISOString() }
    save(KEYS.authorPayouts, all)
    auditLogStore.append("payout_marked_paid", "author_payout", id, { paidAt: all[idx].paidAt })
    return true
  },

  markHeld(id: string, reason: string): boolean {
    const all = authorPayoutStore.getAll()
    const idx = all.findIndex(p => p.id === id)
    if (idx === -1) return false
    all[idx] = { ...all[idx], status: "held" }
    save(KEYS.authorPayouts, all)
    auditLogStore.append("payout_held", "author_payout", id, { reason })
    return true
  },

  /** Summary for author dashboard. */
  summary(authorId: string) {
    const all     = authorPayoutStore.getByAuthor(authorId)
    const paid    = all.filter(p => p.status === "paid")
    const pending = all.filter(p => p.status === "pending")
    return {
      totalGross:      all.reduce((s, p) => s + p.grossEarnings, 0),
      totalNet:        all.reduce((s, p) => s + p.netEarnings,   0),
      paidNet:         paid.reduce((s, p) => s + p.netEarnings,  0),
      pendingNet:      pending.reduce((s, p) => s + p.netEarnings, 0),
      totalPayouts:    all.length,
      pendingPayouts:  pending.length,
    }
  },

  /** Export all payouts as CSV string (for admin download). */
  exportCSV(cycleId?: string): string {
    const records = cycleId ? authorPayoutStore.getByCycle(cycleId) : authorPayoutStore.getAll()
    const cycles  = revenueCycleStore.getAll()
    const header  = "Author,Cycle,Engagement (min),Share %,Gross ($),Platform Fee ($),Net ($),Status,Paid At"
    const rows    = records.map(p => {
      const cycle = cycles.find(c => c.id === p.cycleId)
      return [
        p.authorName,
        cycle ? `${cycle.cycleStart} – ${cycle.cycleEnd}` : p.cycleId,
        p.totalEngagement,
        `${p.sharePct.toFixed(4)}%`,
        p.grossEarnings.toFixed(2),
        p.platformFee.toFixed(2),
        p.netEarnings.toFixed(2),
        p.status,
        p.paidAt ?? "—",
      ].join(",")
    })
    return [header, ...rows].join("\n")
  },
}
