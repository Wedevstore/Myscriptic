/**
 * api.ts — MyScriptic API Client
 *
 * Central HTTP client that connects to the Laravel backend.
 * All methods include the Sanctum token from localStorage when present.
 *
 * API origin is read from NEXT_PUBLIC_API_URL (scheme + host, no path), e.g.
 * `https://api.myscriptic.com`. The client always calls `${origin}/api/...` to match Laravel's `routes/api.php`.
 * Legacy: if the value already ends with `/api`, it is accepted as-is.
 *
 * Replace every TODO_MOCK comment with real fetch once Laravel is live.
 */

import type { ApiCourseCard, ApiCourseDetail } from "@/lib/courses-from-api"

const DEFAULT_API_ORIGIN = "https://api.myscriptic.com"

/** Resolves Laravel JSON API base (…/api) from NEXT_PUBLIC_API_URL. */
function laravelApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim()
  const origin = (raw && raw.length > 0 ? raw : DEFAULT_API_ORIGIN).replace(/\/+$/, "")
  if (origin.endsWith("/api")) {
    return origin
  }
  return `${origin}/api`
}

const BASE_URL = laravelApiBaseUrl()

function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("myscriptic_auth")
    if (!raw) return null
    return JSON.parse(raw)?.token ?? null
  } catch {
    return null
  }
}

/** Prefer Laravel `errors` bag on 422 when the top-level message is generic. */
function messageFromErrorPayload(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback
  const o = err as Record<string, unknown>
  const top = o.message
  const topStr = typeof top === "string" ? top : ""
  const errors = o.errors
  if (errors && typeof errors === "object" && errors !== null) {
    for (const v of Object.values(errors as Record<string, unknown>)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") {
        return v[0]
      }
    }
  }
  if (topStr && topStr !== "The given data was invalid.") return topStr
  return topStr || fallback
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    const msg = messageFromErrorPayload(err, res.statusText)
    throw new Error(msg || "API error")
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T
  }

  const text = await res.text()
  if (!text) return undefined as T

  return JSON.parse(text) as T
}

/** CSV/stream download with Bearer token (admin export endpoints). */
async function downloadAuthenticatedFile(path: string, defaultFilename: string): Promise<void> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "text/csv,*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(err || "Download failed")
  }
  const cd = res.headers.get("content-disposition")
  let filename = defaultFilename
  if (cd?.includes("filename=")) {
    const m = cd.match(/filename[^=]*=\s*"?([^";]+)/i)
    if (m) filename = m[1].trim()
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** PDF (or other binary) download with Bearer token — does not use JSON `request()`. */
async function downloadAuthenticatedPdf(path: string, defaultFilename: string): Promise<void> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/pdf,*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(err || "Download failed")
  }
  const cd = res.headers.get("content-disposition")
  let filename = defaultFilename
  if (cd?.includes("filename=")) {
    const m = cd.match(/filename[^=]*=\s*"?([^";]+)/i)
    if (m) filename = m[1].trim()
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email: string, password: string) =>
    request<{ token: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, role = "user") =>
    request<{ token: string; user: unknown }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    }),
  forgotPassword: (email: string, next?: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        email,
        ...(next && next !== "/" ? { next } : {}),
      }),
    }),
  resetPassword: (body: {
    token: string
    email: string
    password: string
    password_confirmation: string
  }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () =>
    request<void>("/auth/logout", { method: "POST" }),
  me: () =>
    request<{ user: unknown }>("/auth/me"),
  updateMe: (body: { name: string }) =>
    request<{ user: unknown }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
}

// ── Public contact ────────────────────────────────────────────────────────────
export const contactApi = {
  submit: (body: {
    name: string
    email: string
    topic: string
    message: string
    author_ref?: string | null
  }) =>
    request<{ message: string }>("/contact", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        topic: body.topic,
        message: body.message,
        ...(body.author_ref ? { author_ref: body.author_ref } : {}),
      }),
    }),
}

// ── Books ─────────────────────────────────────────────────────────────────────
export const booksApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/books${qs}`)
  },
  search: (q: string, perPage = 15, page = 1) => {
    const qs = new URLSearchParams({
      q,
      per_page: String(perPage),
      page: String(page),
    })
    return request<{ data: unknown[]; meta: unknown }>(`/books/search?${qs}`)
  },
  categories: () => request<{ data: string[] }>("/books/categories"),
  get:    (id: string) => request<{ data: unknown }>(`/books/${id}`),
  /** JSON metadata + URLs/keys (no multipart). */
  createJson: (body: Record<string, unknown>) =>
    request<{ data: unknown }>("/books", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  create: (formData: FormData) =>
    request<{ data: unknown }>("/books", {
      method: "POST",
      body: formData,
      headers: {} as Record<string, string>, // let browser set multipart boundary
    }),
  patch: (id: string, body: Record<string, unknown>) =>
    request<{ data: unknown }>(`/books/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  update: (id: string, formData: FormData) =>
    request<{ data: unknown }>(`/books/${id}`, { method: "POST", body: formData }),
  delete: (id: string) =>
    request<void>(`/books/${id}`, { method: "DELETE" }),

  /** Authenticated author: all own books (any approval status). */
  listMine: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/author/my-books${qs}`)
  },
  approve: (id: string) =>
    request<void>(`/admin/books/${id}/approve`, { method: "POST" }),
  reject:  (id: string, reason: string) =>
    request<void>(`/admin/books/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  /** Get a signed S3 URL for direct browser → S3 upload */
  getSignedUploadUrl: (filename: string, mimeType: string) =>
    request<{ url: string; key: string }>("/upload/signed-url", {
      method: "POST",
      body: JSON.stringify({ filename, mime_type: mimeType }),
    }),
}

// ── Authors (public trending + authenticated follows) ─────────────────────────
export const authorsApi = {
  trending: (params?: { limit?: number }) => {
    const q =
      params?.limit != null && params.limit > 0
        ? `?limit=${Math.min(48, Math.max(1, Math.floor(params.limit)))}`
        : ""
    return request<{
      data: { id: string; name: string; avatar: string; books: number; followers: number }[]
    }>(`/authors/trending${q}`)
  },

  get: (id: string) =>
    request<{
      data: {
        id: string
        name: string
        avatar: string
        books: number
        followers: number
        courses?: {
          slug: string
          title: string
          lesson_count: number
          thumbnail_url: string | null
          access_type?: string
          price?: number | null
          currency?: string | null
        }[]
      }
    }>(`/authors/${id}`),
}

/** Public published courses (GET /courses, GET /courses/{slug}). */
export const coursesPublicApi = {
  list: (params?: { q?: string }) => {
    const qRaw = params?.q?.trim() ?? ""
    const q = qRaw.length > 120 ? qRaw.slice(0, 120) : qRaw
    const qs =
      q !== ""
        ? `?${new URLSearchParams({ q }).toString()}`
        : ""
    return request<{
      data: ApiCourseCard[]
    }>(`/courses${qs}`)
  },
  get: (slug: string, opts?: { preview?: boolean }) => {
    const qs = opts?.preview ? "?preview=1" : ""
    return request<{ data: ApiCourseDetail }>(`/courses/${encodeURIComponent(slug)}${qs}`)
  },
}

export type AuthorCourseWritePayload = {
  title: string
  slug?: string | null
  description?: string | null
  thumbnail_url?: string | null
  published?: boolean
  access_type?: "FREE" | "PAID" | "SUBSCRIPTION"
  price?: number | null
  currency?: string | null
  lessons: { title: string; video_url: string }[]
}

/** Authenticated author CRUD (GET/POST /author/courses, PUT/DELETE …/{id}). */
export const authorCoursesApi = {
  list: () =>
    request<{ data: ApiCourseDetail[] }>("/author/courses"),
  create: (body: AuthorCourseWritePayload) =>
    request<{ data: ApiCourseDetail }>("/author/courses", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<AuthorCourseWritePayload>) =>
    request<{ data: ApiCourseDetail }>(`/author/courses/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<void>(`/author/courses/${encodeURIComponent(id)}`, { method: "DELETE" }),
}

export const authorFollowsApi = {
  listIds: () => request<{ data: string[] }>("/me/followed-authors"),
  follow: (authorId: string) =>
    request<{ ok: boolean }>(`/authors/${authorId}/follow`, { method: "POST" }),
  unfollow: (authorId: string) =>
    request<void>(`/authors/${authorId}/follow`, { method: "DELETE" }),
}

// ── Subscriptions (Phase 3) ─────────────────────────────────────────────────
export const subscriptionsApi = {
  plans: () => request<{ data: unknown[] }>("/subscription/plans"),

  /** Creates a pending subscription order and returns a payment URL (mock or gateway). */
  checkout: (body: {
    plan_id:         string
    payment_gateway: string
    return_url?:    string
  }) => request<{ order_id: string; payment_url: string; amount: number; currency: string }>(
    "/subscription/checkout",
    { method: "POST", body: JSON.stringify({ ...body, plan_id: Number(body.plan_id) }) }
  ),

  cancel: () =>
    request<{ success: boolean; access_until?: string }>("/subscription/cancel", { method: "POST" }),

  status: () =>
    request<{
      active:            boolean
      plan:              { id: string; name: string; slug: string } | null
      expires_at:        string | null
      subscription_id:   string | null
    }>("/subscription/status"),
}

export const subscriptionCatalogApi = {
  books: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/subscription/catalog${qs}`)
  },
}

// ── Orders / Cart ─────────────────────────────────────────────────────────────
export const ordersApi = {
  create: (items: { book_id: string; quantity: number }[], paymentToken: string, coupon?: string) =>
    request<{ data: unknown }>("/orders", {
      method: "POST",
      body: JSON.stringify({ items, payment_token: paymentToken, coupon_code: coupon }),
    }),
  list: () =>
    request<{ data: unknown[] }>("/orders"),
  get:  (id: string) =>
    request<{ data: unknown }>(`/orders/${id}`),

  /** Triggers browser download of Laravel-generated invoice PDF (auth required). */
  downloadInvoice: (orderId: string) =>
    downloadAuthenticatedPdf(`/orders/${orderId}/invoice`, `invoice-${orderId}.pdf`),
}

// ── Reading / engagement (Phase 3) ────────────────────────────────────────────

export type ReadingAnalyticsSummary = {
  total_reading_time_seconds: number
  total_pages_read:           number
  books_tracked:              number
  books_with_activity:        number
  books_completed:            number
  average_completion_pct:     number
}

export type ReadingAnalyticsBook = {
  book_id:                string
  title:                  string
  author:                 string
  cover_url:              string | null
  category?:              string | null
  format:                 string
  pages_read:             number
  pages_total:            number
  completion_percentage:  number
  reading_time_seconds:   number
  last_sync_at:           string | null
}

export const progressApi = {
  analytics: () =>
    request<{ data: { summary: ReadingAnalyticsSummary; books: ReadingAnalyticsBook[] } }>(
      "/reading-analytics"
    ),

  sync: (bookId: string, page: number, pagesTotal: number, secondsRead: number) =>
    request<{
      page_number:            number
      pages_total:            number
      percent_complete:       number
      reading_time_seconds:   number
    }>("/reading-progress", {
      method: "POST",
      body: JSON.stringify({
        book_id:       Number(bookId),
        page_number:   page,
        pages_total:   pagesTotal,
        seconds_read:  secondsRead,
      }),
    }),
  get: (bookId: string) =>
    request<{
      book_id:                string
      page_number:            number
      pages_total:            number
      percent_complete:       number
      reading_time_seconds:   number
    }>(`/reading-progress/${bookId}`),
}

export const authorSubscriptionPoolApi = {
  summary: () => request<unknown>("/author/subscription-pool/summary"),
  payouts: () => request<{ data: unknown[] }>("/author/subscription-pool/payouts"),
  cycle:    (cycleId: string) =>
    request<unknown>(`/author/subscription-pool/cycles/${cycleId}`),
}

// ── Wishlist ──────────────────────────────────────────────────────────────────
export const wishlistApi = {
  list:   () => request<{ data: unknown[] }>("/wishlist"),
  add:    (bookId: string) => request<void>("/wishlist", { method: "POST", body: JSON.stringify({ book_id: bookId }) }),
  remove: (bookId: string) => request<void>(`/wishlist/${bookId}`, { method: "DELETE" }),
}

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsApi = {
  list:   (bookId: string) => request<{ data: unknown[] }>(`/books/${bookId}/reviews`),
  create: (bookId: string, rating: number, comment: string) =>
    request<{ data: unknown }>(`/books/${bookId}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  /** KPI metrics (users, revenue, books, pending counts). */
  dashboard: () => request<Record<string, number>>("/admin/dashboard"),
  dashboardCharts: (days?: number) =>
    request<{
      revenue_by_day: { date: string; amount: number }[]
      subscriptions_active_by_day: { date: string; active: number }[]
      engagement_by_day: { date: string; engagements: number }[]
    }>(`/admin/dashboard/charts${days != null ? `?days=${days}` : ""}`),

  users: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/admin/users${qs}`)
  },
  userDetail: (id: string) => request<{ data: unknown }>(`/admin/users/${id}`),
  userSetBlocked: (id: string, blocked: boolean) =>
    request<{ data: unknown }>(`/admin/users/${id}/block`, {
      method: "PATCH",
      body: JSON.stringify({ blocked }),
    }),

  pendingBooks: () => request<{ data: unknown[] }>("/admin/books/pending"),

  authorCourses: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{
      data: {
        id: string
        slug: string
        title: string
        published: boolean
        access_type: string
        price: number | null
        currency: string | null
        author: { id: string; name: string | null; email: string | null }
        lessons_count: number
        updated_at: string | null
      }[]
      meta: { current_page: number; last_page: number; per_page: number; total: number }
    }>(`/admin/author-courses${qs}`)
  },

  approveBook: (id: string) =>
    request<{ data: unknown }>(`/admin/books/${id}/approve`, { method: "POST" }),
  rejectBook: (id: string, reason: string) =>
    request<{ data: unknown }>(`/admin/books/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  homepageSections: () => request<{ data: unknown[] }>("/admin/homepage/sections"),
  homepageSectionCreate: (body: unknown) =>
    request<{ data: unknown }>("/admin/homepage/sections", { method: "POST", body: JSON.stringify(body) }),
  homepageSectionUpdate: (id: string | number, body: unknown) =>
    request<{ data: unknown }>(`/admin/homepage/sections/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  homepageSectionDelete: (id: string | number) =>
    request<void>(`/admin/homepage/sections/${id}`, { method: "DELETE" }),
  homepageSectionsReorder: (order: number[]) =>
    request<{ success: boolean }>("/admin/homepage/sections/reorder", {
      method: "POST",
      body: JSON.stringify({ order }),
    }),
  homepageItemCreate: (sectionId: string | number, body: unknown) =>
    request<{ data: unknown }>(`/admin/homepage/sections/${sectionId}/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  homepageItemUpdate: (itemId: string | number, body: unknown) =>
    request<{ data: unknown }>(`/admin/homepage/items/${itemId}`, { method: "PUT", body: JSON.stringify(body) }),
  homepageItemDelete: (itemId: string | number) =>
    request<void>(`/admin/homepage/items/${itemId}`, { method: "DELETE" }),
  homepageItemsReorder: (sectionId: string | number, order: number[]) =>
    request<{ success: boolean }>(`/admin/homepage/sections/${sectionId}/items/reorder`, {
      method: "POST",
      body: JSON.stringify({ order }),
    }),

  cmsPages: () => request<{ data: unknown[] }>("/admin/cms-pages"),
  cmsPageCreate: (body: unknown) =>
    request<{ data: unknown }>("/admin/cms-pages", { method: "POST", body: JSON.stringify(body) }),
  cmsPageUpdate: (id: string | number, body: unknown) =>
    request<{ data: unknown }>(`/admin/cms-pages/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  cmsPageDelete: (id: string | number) =>
    request<void>(`/admin/cms-pages/${id}`, { method: "DELETE" }),

  analyticsRevenue: (granularity: "daily" | "monthly" = "daily") =>
    request<{ data: { period: string; amount: number }[] }>(`/admin/analytics/revenue?granularity=${granularity}`),
  analyticsTopBooksSales: () => request<{ data: unknown[] }>("/admin/analytics/top-books/sales"),
  analyticsTopBooksEngagement: () => request<{ data: unknown[] }>("/admin/analytics/top-books/engagement"),
  analyticsTopAuthors: () => request<{ data: unknown[] }>("/admin/analytics/top-authors"),
  analyticsCohort: (returnAfterDays?: number) =>
    request<{ data: unknown[] }>(
      `/admin/analytics/cohort-retention${returnAfterDays != null ? `?return_after_days=${returnAfterDays}` : ""}`
    ),

  authorStats: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/admin/authors/stats${qs}`)
  },
  authorsPendingApplications: () =>
    request<{ data: unknown[] }>("/admin/authors/pending-applications"),

  platformActivities: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/admin/platform-activities${qs}`)
  },

  notificationBroadcasts: () => request<{ data: unknown[] }>("/admin/notification-broadcasts"),
  notificationBroadcastCreate: (body: { title: string; body?: string; audience: "all" | "subscribers"; type?: string }) =>
    request<{ data: { id: string; status: string } }>("/admin/notification-broadcasts", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  revenueCycles: () => request<{ data: unknown[] }>("/admin/revenue-cycles"),
  authorPayouts: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[] }>(`/admin/author-payouts${qs}`)
  },
  approveAuthorPayout: (id: string) =>
    request<{ success?: boolean }>(`/admin/author-payouts/${id}/approve`, { method: "POST" }),
  holdAuthorPayout: (id: string) =>
    request<{ success?: boolean }>(`/admin/author-payouts/${id}/hold`, { method: "POST" }),
  authorPayoutsExport: (cycleId?: string) => {
    const qs =
      cycleId && cycleId !== "all" ? `?cycle_id=${encodeURIComponent(cycleId)}` : ""
    return downloadAuthenticatedFile(`/admin/author-payouts/export${qs}`, "author-payouts.csv")
  },

  /** Paginated orders with line items (admin). */
  orders: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{
      data: unknown[]
      meta: { current_page: number; last_page: number; total: number }
    }>(`/admin/orders${qs}`)
  },
  subscriptionPoolSettings: () =>
    request<{ subscription_pool_commission_pct: number }>("/admin/subscription-pool/settings"),
  updateSubscriptionPoolSettings: (subscription_pool_commission_pct: number) =>
    request<{ success?: boolean }>("/admin/subscription-pool/settings", {
      method: "PUT",
      body: JSON.stringify({ subscription_pool_commission_pct }),
    }),

  subscriptionPlans: () => request<{ data: unknown[] }>("/admin/subscription-plans"),
  subscriptionPlanCreate: (body: Record<string, unknown>) =>
    request<{ data: unknown }>("/admin/subscription-plans", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  subscriptionPlanUpdate: (id: string | number, body: Record<string, unknown>) =>
    request<{ data: unknown }>(`/admin/subscription-plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  subscriptionPlanDelete: (id: string | number) =>
    request<void>(`/admin/subscription-plans/${id}`, { method: "DELETE" }),

  auditLogs: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[] }>(`/admin/audit-logs${qs}`)
  },

  siteFeatures: () =>
    request<{
      data: {
        ads_enabled: string
        ads_network: string
        ads_client_id: string
        ads_slot_banner: string
        ads_slot_feed: string
        ads_slot_rewarded: string
        feature_flags_json: string
      }
    }>("/admin/site-features"),
  updateSiteFeatures: (body: Record<string, unknown>) =>
    request<{
      data: {
        ads_enabled: string
        ads_network: string
        ads_client_id: string
        ads_slot_banner: string
        ads_slot_feed: string
        ads_slot_rewarded: string
        feature_flags_json: string
      }
    }>("/admin/site-features", { method: "PUT", body: JSON.stringify(body) }),

  contactSubmissions: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/admin/contact-submissions${qs}`)
  },
}

// ── Author Earnings ───────────────────────────────────────────────────────────
export const earningsApi = {
  summary:  () => request<unknown>("/author/earnings/summary"),
  monthly:  (year: number, month: number) =>
    request<unknown>(`/author/earnings/${year}/${month}`),
  payouts:  () => request<{ data: unknown[] }>("/author/earnings/payouts"),
}

// ── Public site config (Phase 5 — ads, CDN hint, feature flags) ─────────────
export const siteConfigApi = {
  get: () =>
    request<{
      ads: {
        enabled: boolean
        network: string
        client_id: string
        slot_banner: string
        slot_feed: string
        slot_rewarded: string
      }
      cdn: { asset_base: string | null }
      feature_flags: Record<string, boolean>
    }>("/site-config"),
}

// ── CMS / Homepage ────────────────────────────────────────────────────────────
export const cmsApi = {
  homepage: () => request<unknown>("/cms/homepage"),
  page: (slug: string) => request<{ data: { title: string; slug: string; content: string; updatedAt: string } }>(`/cms/pages/${slug}`),
}

// ── User notifications (Phase 4) ─────────────────────────────────────────────
export const userNotificationsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/notifications${qs}`)
  },
  markRead: (id: string) =>
    request<{ data: unknown }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request<{ success: boolean }>("/notifications/read-all", { method: "POST" }),
  registerFcm: (token: string, platform = "web") =>
    request<{ success: boolean }>("/devices/fcm", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    }),
}

// ── Cart (server-side sync) ───────────────────────────────────────────────────
export const cartApi = {
  get:    () => request<{ data: unknown[] }>("/cart"),
  add:    (bookId: string, quantity = 1) =>
    request<{ data: unknown }>("/cart", {
      method: "POST",
      body:   JSON.stringify({ book_id: Number(bookId), quantity }),
    }),
  updateQty: (bookId: string, quantity: number) =>
    request<{ data: unknown }>(`/cart/${bookId}`, {
      method: "PATCH",
      body:   JSON.stringify({ quantity }),
    }),
  remove: (bookId: string) =>
    request<void>(`/cart/${bookId}`, { method: "DELETE" }),
  clear:  () =>
    request<void>("/cart", { method: "DELETE" }),
}

// ── Orders (Phase 2) ──────────────────────────────────────────────────────────
export const ordersApiV2 = {
  /**
   * Creates an order and returns payment init URL.
   * POST /api/orders
   * Body: { items, coupon_code, payment_gateway, currency }
   * Response: { order_id, payment_url, order_number }
   */
  create: (body: {
    items?:           { book_id: string; quantity: number }[]
    coupon_code?:    string
    payment_gateway: string
    currency:        string
    return_url?:     string
  }) => request<{ order_id: string; payment_url: string; order_number: string }>("/orders", {
    method: "POST",
    body:   JSON.stringify(body),
  }),

  get:   (id: string)  => request<{ data: unknown }>(`/orders/${id}`),
  list:  ()            => request<{ data: unknown[] }>("/orders"),

  /**
   * Verify payment after gateway callback.
   * GET /api/orders/:id/verify
   * Response: { verified: boolean; order: unknown }
   */
  verify: (orderId: string) =>
    request<{ verified: boolean; order: unknown }>(`/orders/${orderId}/verify`),

  /** Same as {@link ordersApi.downloadInvoice}. */
  invoice: (orderId: string) => downloadAuthenticatedPdf(`/orders/${orderId}/invoice`, `invoice-${orderId}.pdf`),
}

// ── Payments / Webhooks ────────────────────────────────────────────────────────
export const paymentsApi = {
  /**
   * Initialize a payment with a specific gateway.
   * POST /api/payments/initialize
   * Body: { order_id, gateway, currency, return_url }
   */
  initialize: (orderId: string, gateway: string, currency: string, returnUrl: string) =>
    request<{ payment_url: string; reference: string }>("/payments/initialize", {
      method: "POST",
      body:   JSON.stringify({ order_id: orderId, gateway, currency, return_url: returnUrl }),
    }),

  /**
   * Called by the frontend after gateway callback to trigger server-side
   * verification. Backend calls the gateway API to verify.
   * POST /api/payments/verify
   */
  verify: (reference: string, gateway: string) =>
    request<{ verified: boolean; order_id: string; status: string }>("/payments/verify", {
      method: "POST",
      body:   JSON.stringify({ reference, gateway }),
    }),
}

// ── Coupons ───────────────────────────────────────────────────────────────────
export const couponsApi = {
  validate: (code: string, subtotal: number) =>
    request<{ valid: boolean; discount: number; coupon: unknown }>("/coupons/validate", {
      method: "POST",
      body:   JSON.stringify({ code, subtotal }),
    }),
  // Admin CRUD
  list:   () => request<{ data: unknown[] }>("/admin/coupons"),
  create: (body: unknown) =>
    request<{ data: unknown }>("/admin/coupons", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: unknown) =>
    request<{ data: unknown }>(`/admin/coupons/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<void>(`/admin/coupons/${id}`, { method: "DELETE" }),
}

// ── Refunds (Admin) ───────────────────────────────────────────────────────────
export const refundsApi = {
  /**
   * Issue a full or partial refund.
   * POST /api/admin/refunds
   * Body: { order_id, type: "full"|"partial", amount? }
   */
  create: (orderId: string, type: "full" | "partial", amount?: number) =>
    request<{ success: boolean; refund_id: string }>("/admin/refunds", {
      method: "POST",
      body: JSON.stringify({
        order_id: Number(orderId),
        type,
        ...(type === "partial" && amount != null ? { amount } : {}),
      }),
    }),
  list: () =>
    request<{ data: unknown[] }>("/admin/refunds"),
}

// ── Transactions (Admin) ──────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/admin/transactions${qs}`)
  },
  get:  (id: string) => request<{ data: unknown }>(`/admin/transactions/${id}`),
}

// ── User Library / Access Control ────────────────────────────────────────────
export const libraryApi = {
  /**
   * Get the current user's accessible books.
   * GET /api/library
   * Response: { data: LibraryEntry[] }
   */
  list: () => request<{ data: unknown[] }>("/library"),

  /**
   * Check access to a specific book.
   * GET /api/library/:bookId/access
   * Response: { has_access: boolean; source: "purchase"|"subscription"|null; expires_at: string|null }
   */
  checkAccess: (bookId: string) =>
    request<{ has_access: boolean; source: string | null; expires_at: string | null }>(
      `/library/${bookId}/access`
    ),

  /**
   * Get a signed S3 URL for the book file (read or download).
   * POST /api/library/:bookId/signed-url
   * Response: { url: string; expires_at: string }
   * Security: URL expires in 15 minutes. Only granted to users with access.
   */
  getSignedUrl: (bookId: string) =>
    request<{ url: string; expires_at: string }>(`/library/${bookId}/signed-url`, {
      method: "POST",
    }),
}

// ── Author Sales Analytics (Phase 2) ─────────────────────────────────────────
export const authorSalesApi = {
  /**
   * Sales summary for the authenticated author.
   * GET /api/author/sales/summary
   */
  summary: () => request<unknown>("/author/sales/summary"),

  /**
   * Per-book sales breakdown.
   * GET /api/author/sales/books
   */
  books: () => request<{ data: unknown[] }>("/author/sales/books"),

  /**
   * Recent transactions for this author's books.
   * GET /api/author/sales/transactions
   */
  transactions: () => request<{ data: unknown[] }>("/author/sales/transactions"),

  /**
   * Payout bank/PayPal details.
   * GET  /api/author/payout-details
   * POST /api/author/payout-details
   */
  getPayoutDetails: () => request<unknown>("/author/payout-details"),
  setPayoutDetails: (body: unknown) =>
    request<void>("/author/payout-details", { method: "POST", body: JSON.stringify(body) }),
}

// ── Author Onboarding ─────────────────────────────────────────────────────────
export const authorApi = {
  /**
   * Apply to become an author.
   * POST /api/author/apply
   * Body: { bio, payout_method, payout_details }
   */
  apply: (body: { bio: string; payout_method: string; payout_details: unknown }) =>
    request<{ application_id: string }>("/author/apply", {
      method: "POST",
      body:   JSON.stringify(body),
    }),

  /**
   * Admin: list all author applications.
   * GET /api/admin/author-applications
   */
  adminList: () => request<{ data: unknown[] }>("/admin/author-applications"),

  adminApprove: (id: string) =>
    request<void>(`/admin/author-applications/${id}/approve`, { method: "POST" }),
  adminReject:  (id: string, reason: string) =>
    request<void>(`/admin/author-applications/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
}

// ── Tax Config (Admin) ─────────────────────────────────────────────────────────
export const taxApi = {
  list:   () => request<{ data: unknown[] }>("/admin/tax"),
  update: (id: string, body: unknown) =>
    request<void>(`/admin/tax/${id}`, { method: "PUT", body: JSON.stringify(body) }),
}

// ── Store / Marketplace ───────────────────────────────────────────────────────
export const storeApi = {
  /**
   * Paginated list of paid books for the marketplace.
   * GET /api/store/books?category=&sort=&min_price=&max_price=&page=
   */
  books: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request<{ data: unknown[]; meta: unknown }>(`/store/books${qs}`)
  },

  /**
   * Featured / promoted books on the store homepage.
   * GET /api/store/featured
   */
  featured: () => request<{ data: unknown[] }>("/store/featured"),
}
