// ─────────────────────────────────────────────────────────────────────────────
// lib/store-p4.ts  —  MyScriptic Phase 4 LocalStorage Store
// CMS sections · Banners · Notifications · Coupons · Tax · CMS Pages
// User activity · Activity log · Platform stats
// ─────────────────────────────────────────────────────────────────────────────

import { seedAuthorCourses } from "@/lib/author-courses-store"

// ── Utility ───────────────────────────────────────────────────────────────────
function ls<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback }
  catch { return fallback }
}
function lsSet<T>(key: string, val: T) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* quota */ }
}
function uid() { return Math.random().toString(36).slice(2, 10) }
function now() { return new Date().toISOString() }

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SectionType =
  | "banner"
  | "book_list"
  | "category_list"
  | "flash_sale"
  | "featured"
  | "course_list"

export interface CmsSection {
  id:          string
  title:       string
  type:        SectionType
  position:    number
  isActive:    boolean
  bookIds:     string[]
  categoryIds: string[]
  createdAt:   string
  updatedAt:   string
}

export interface Banner {
  id:        string
  title:     string
  subtitle:  string
  ctaText:   string
  ctaLink:   string
  imageUrl:  string
  isActive:  boolean
  position:  number
  createdAt: string
  updatedAt: string
}

export type NotifTarget = "all" | "readers" | "authors" | "subscribers"
export type NotifType   = "info" | "promo" | "alert" | "new_book" | "renewal"

export interface Notification {
  id:        string
  title:     string
  body:      string
  type:      NotifType
  target:    NotifTarget
  isRead:    boolean
  sentAt:    string
  userId?:   string
}

export type CouponType = "percent" | "fixed"

export interface Coupon {
  id:          string
  code:        string
  type:        CouponType
  value:       number
  maxUses:     number
  usedCount:   number
  expiresAt:   string
  isActive:    boolean
  createdAt:   string
}

export interface TaxConfig {
  id:        string
  label:     string          // e.g. "VAT", "GST"
  rate:      number          // percentage e.g. 7.5
  isEnabled: boolean
  region:    string          // e.g. "NG", "GLOBAL"
  updatedAt: string
}

export interface CmsPage {
  id:        string
  title:     string
  slug:      string          // "about" | "terms" | "privacy"
  content:   string          // rich text / markdown
  isPublished: boolean
  updatedAt: string
}

export interface ActivityLog {
  id:        string
  userId:    string
  userName:  string
  action:    string
  category:  "payment" | "subscription" | "auth" | "admin" | "book" | "coupon" | "system"
  metadata:  Record<string, unknown>
  createdAt: string
}

export interface UserActivity {
  userId:      string
  lastLoginAt: string
  loginCount:  number
  ipAddress:   string
  isBlocked:   boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS SECTION STORE
// ─────────────────────────────────────────────────────────────────────────────
const CMS_KEY = "mys_p4_cms"

export const cmsSectionStore = {
  getAll():            CmsSection[]                    { return ls<CmsSection[]>(CMS_KEY, []).sort((a,b) => a.position - b.position) },
  getActive():         CmsSection[]                    { return this.getAll().filter(s => s.isActive) },
  getById(id: string): CmsSection | undefined          { return this.getAll().find(s => s.id === id) },

  create(data: Omit<CmsSection, "id"|"createdAt"|"updatedAt">): CmsSection {
    const all = this.getAll()
    const rec: CmsSection = { ...data, id: uid(), createdAt: now(), updatedAt: now() }
    lsSet(CMS_KEY, [...all, rec])
    return rec
  },

  update(id: string, patch: Partial<CmsSection>) {
    const all = this.getAll().map(s => s.id === id ? { ...s, ...patch, updatedAt: now() } : s)
    lsSet(CMS_KEY, all)
  },

  delete(id: string) {
    lsSet(CMS_KEY, this.getAll().filter(s => s.id !== id))
  },

  reorder(ids: string[]) {
    const all = this.getAll()
    ids.forEach((id, i) => {
      const s = all.find(x => x.id === id)
      if (s) s.position = i
    })
    lsSet(CMS_KEY, all)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// BANNER STORE
// ─────────────────────────────────────────────────────────────────────────────
const BANNER_KEY = "mys_p4_banners"

export const bannerStore = {
  getAll():    Banner[]                    { return ls<Banner[]>(BANNER_KEY, []).sort((a,b) => a.position - b.position) },
  getActive(): Banner[]                    { return this.getAll().filter(b => b.isActive) },

  create(data: Omit<Banner, "id"|"createdAt"|"updatedAt">): Banner {
    const rec: Banner = { ...data, id: uid(), createdAt: now(), updatedAt: now() }
    lsSet(BANNER_KEY, [...this.getAll(), rec])
    return rec
  },

  update(id: string, patch: Partial<Banner>) {
    lsSet(BANNER_KEY, this.getAll().map(b => b.id === id ? { ...b, ...patch, updatedAt: now() } : b))
  },

  delete(id: string) {
    lsSet(BANNER_KEY, this.getAll().filter(b => b.id !== id))
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION STORE
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_KEY = "mys_p4_notifications"

export const notificationStore = {
  getAll():                Notification[]          { return ls<Notification[]>(NOTIF_KEY, []) },
  getForUser(uid: string): Notification[]          { return this.getAll().filter(n => n.target === "all" || n.userId === uid) },
  getUnreadCount(uid: string): number              { return this.getForUser(uid).filter(n => !n.isRead).length },
  getAdminUnread():        number                  { return this.getAll().filter(n => !n.isRead).length },

  send(data: Omit<Notification, "id"|"sentAt"|"isRead">): Notification {
    const rec: Notification = { ...data, id: uid(), sentAt: now(), isRead: false }
    lsSet(NOTIF_KEY, [rec, ...this.getAll()])
    return rec
  },

  markRead(id: string) {
    lsSet(NOTIF_KEY, this.getAll().map(n => n.id === id ? { ...n, isRead: true } : n))
  },

  markAllRead(userId: string) {
    lsSet(NOTIF_KEY, this.getAll().map(n =>
      (n.target === "all" || n.userId === userId) ? { ...n, isRead: true } : n
    ))
  },

  delete(id: string) {
    lsSet(NOTIF_KEY, this.getAll().filter(n => n.id !== id))
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// COUPON STORE
// ─────────────────────────────────────────────────────────────────────────────
const COUPON_KEY = "mys_p4_coupons"

export const couponStore = {
  getAll():            Coupon[]                    { return ls<Coupon[]>(COUPON_KEY, []) },
  getById(id: string): Coupon | undefined          { return this.getAll().find(c => c.id === id) },
  getByCode(code: string): Coupon | undefined      { return this.getAll().find(c => c.code.toUpperCase() === code.toUpperCase()) },

  create(data: Omit<Coupon, "id"|"createdAt"|"usedCount">): Coupon {
    const rec: Coupon = { ...data, id: uid(), usedCount: 0, createdAt: now() }
    lsSet(COUPON_KEY, [...this.getAll(), rec])
    return rec
  },

  update(id: string, patch: Partial<Coupon>) {
    lsSet(COUPON_KEY, this.getAll().map(c => c.id === id ? { ...c, ...patch } : c))
  },

  delete(id: string) {
    lsSet(COUPON_KEY, this.getAll().filter(c => c.id !== id))
  },

  use(code: string): { ok: boolean; discount: number; type: CouponType } {
    const coupon = this.getByCode(code)
    if (!coupon || !coupon.isActive) return { ok: false, discount: 0, type: "percent" }
    if (coupon.usedCount >= coupon.maxUses) return { ok: false, discount: 0, type: "percent" }
    if (new Date(coupon.expiresAt) < new Date()) return { ok: false, discount: 0, type: "percent" }
    this.update(coupon.id, { usedCount: coupon.usedCount + 1 })
    return { ok: true, discount: coupon.value, type: coupon.type }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TAX CONFIG STORE
// ─────────────────────────────────────────────────────────────────────────────
const TAX_KEY = "mys_p4_tax"

export const taxStore = {
  getAll():            TaxConfig[]                 { return ls<TaxConfig[]>(TAX_KEY, []) },
  getEnabled():        TaxConfig[]                 { return this.getAll().filter(t => t.isEnabled) },

  create(data: Omit<TaxConfig, "id"|"updatedAt">): TaxConfig {
    const rec: TaxConfig = { ...data, id: uid(), updatedAt: now() }
    lsSet(TAX_KEY, [...this.getAll(), rec])
    return rec
  },

  update(id: string, patch: Partial<TaxConfig>) {
    lsSet(TAX_KEY, this.getAll().map(t => t.id === id ? { ...t, ...patch, updatedAt: now() } : t))
  },

  delete(id: string) {
    lsSet(TAX_KEY, this.getAll().filter(t => t.id !== id))
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS PAGE STORE
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_KEY = "mys_p4_cms_pages"

export const cmsPageStore = {
  getAll():              CmsPage[]                 { return ls<CmsPage[]>(PAGE_KEY, []) },
  getBySlug(s: string):  CmsPage | undefined       { return this.getAll().find(p => p.slug === s) },

  create(data: Omit<CmsPage, "id"|"updatedAt">): CmsPage {
    const rec: CmsPage = { ...data, id: uid(), updatedAt: now() }
    lsSet(PAGE_KEY, [...this.getAll(), rec])
    return rec
  },

  update(id: string, patch: Partial<CmsPage>) {
    lsSet(PAGE_KEY, this.getAll().map(p => p.id === id ? { ...p, ...patch, updatedAt: now() } : p))
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY LOG STORE
// ─────────────────────────────────────────────────────────────────────────────
const LOG_KEY = "mys_p4_activity_log"

export const activityLogStore = {
  getAll():                           ActivityLog[]   { return ls<ActivityLog[]>(LOG_KEY, []) },
  getByUser(uid: string):             ActivityLog[]   { return this.getAll().filter(l => l.userId === uid) },
  getByCategory(cat: string):         ActivityLog[]   { return this.getAll().filter(l => l.category === cat) },

  log(entry: Omit<ActivityLog, "id"|"createdAt">): ActivityLog {
    const rec: ActivityLog = { ...entry, id: uid(), createdAt: now() }
    const all = [rec, ...this.getAll()].slice(0, 500)   // cap at 500 entries
    lsSet(LOG_KEY, all)
    return rec
  },

  clear() { lsSet(LOG_KEY, []) },
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ACTIVITY STORE
// ─────────────────────────────────────────────────────────────────────────────
const UA_KEY = "mys_p4_user_activity"

export const userActivityStore = {
  getAll():            UserActivity[]              { return ls<UserActivity[]>(UA_KEY, []) },
  getById(uid: string): UserActivity | undefined   { return this.getAll().find(u => u.userId === uid) },

  upsert(uid: string, ip: string) {
    const all  = this.getAll()
    const idx  = all.findIndex(u => u.userId === uid)
    if (idx >= 0) {
      all[idx] = { ...all[idx], lastLoginAt: now(), loginCount: all[idx].loginCount + 1, ipAddress: ip }
    } else {
      all.push({ userId: uid, lastLoginAt: now(), loginCount: 1, ipAddress: ip, isBlocked: false })
    }
    lsSet(UA_KEY, all)
  },

  setBlocked(uid: string, blocked: boolean) {
    lsSet(UA_KEY, this.getAll().map(u => u.userId === uid ? { ...u, isBlocked: blocked } : u))
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM STATS (derived / computed)
// ─────────────────────────────────────────────────────────────────────────────
const MONTH_LABELS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]

export interface PlatformStats {
  totalUsers:        number
  activeSubscribers: number
  monthlyRevenue:    number
  lifetimeRevenue:   number
  totalBooks:        number
  totalAuthors:      number
  pendingApprovals:  number
  revenueByMonth:    { month: string; revenue: number; subscriptions: number }[]
  subGrowth:         { month: string; subs: number }[]
}

export function getPlatformStats(): PlatformStats {
  return {
    totalUsers:        2_048_312,
    activeSubscribers:    84_200,
    monthlyRevenue:      148_200,
    lifetimeRevenue:   1_892_400,
    totalBooks:           52_410,
    totalAuthors:          8_240,
    pendingApprovals:          3,
    revenueByMonth: MONTH_LABELS.map((month, i) => ({
      month,
      revenue:       90000 + i * 8200 + Math.sin(i) * 4000,
      subscriptions: 54000 + i * 5100 + Math.cos(i) * 3000,
    })),
    subGrowth: MONTH_LABELS.map((month, i) => ({
      month,
      subs: 62000 + i * 3200,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED (idempotent — only seeds if localStorage keys are empty)
// ─────────────────────────────────────────────────────────────────────────────
export function seedP4() {
  if (typeof window === "undefined") return
  if (process.env.NODE_ENV === "production") return
  // CMS sections
  if (cmsSectionStore.getAll().length === 0) {
    const sections: Omit<CmsSection,"id"|"createdAt"|"updatedAt">[] = [
      { title: "Hero Banners",      type: "banner",        position: 0, isActive: true,  bookIds: [],                              categoryIds: [] },
      { title: "Trending Books",    type: "book_list",     position: 1, isActive: true,  bookIds: ["bk_001","bk_002","bk_003"],    categoryIds: [] },
      { title: "Featured This Week",type: "featured",      position: 2, isActive: true,  bookIds: ["bk_004","bk_005"],             categoryIds: [] },
      { title: "Browse Categories", type: "category_list", position: 3, isActive: true,  bookIds: [],                              categoryIds: ["Fiction","Self-Help","Business","Romance"] },
      { title: "Flash Sale",        type: "flash_sale",    position: 4, isActive: false, bookIds: ["bk_006","bk_007","bk_008"],    categoryIds: [] },
    ]
    sections.forEach(s => cmsSectionStore.create(s))
  }

  if (!cmsSectionStore.getAll().some(s => s.type === "course_list")) {
    const all = cmsSectionStore.getAll()
    const maxPos = all.length ? Math.max(...all.map(s => s.position)) : -1
    cmsSectionStore.create({
      title: "Author video courses",
      type: "course_list",
      position: maxPos + 1,
      isActive: true,
      bookIds: [],
      categoryIds: [],
    })
  }

  // Banners
  if (bannerStore.getAll().length === 0) {
    const banners: Omit<Banner,"id"|"createdAt"|"updatedAt">[] = [
      { title: "Read Without Limits", subtitle: "Unlimited ebooks & audiobooks from $9.99/month", ctaText: "Start Free Trial", ctaLink: "/subscription", imageUrl: "https://placehold.co/1200x400?text=Unlimited+reading+adventure+with+amber+and+dark+background", isActive: true,  position: 0 },
      { title: "New This Week",       subtitle: "Fresh titles from Africa's top authors",          ctaText: "Browse New",       ctaLink: "/browse",       imageUrl: "https://placehold.co/1200x400?text=New+arrivals+editorial+design+books+stacked+on+wooden+desk",  isActive: true,  position: 1 },
      { title: "Up to 40% Off",       subtitle: "Limited time flash sale on bestsellers",          ctaText: "Shop Sale",        ctaLink: "/browse?sale=1",imageUrl: "https://placehold.co/1200x400?text=Flash+sale+bold+red+and+amber+promotion+banner",             isActive: false, position: 2 },
    ]
    banners.forEach(b => bannerStore.create(b))
  }

  // Notifications
  if (notificationStore.getAll().length === 0) {
    const notifs: Omit<Notification,"id"|"sentAt"|"isRead">[] = [
      { title: "Welcome to MyScriptic", body: "Your account is ready. Start reading today!", type: "info",     target: "all"         },
      { title: "New: The Lagos Chronicles", body: "A gripping new novel is now available in the library.", type: "new_book", target: "subscribers" },
      { title: "20% Off This Weekend",  body: "Use code WEEKEND20 at checkout. Expires Sunday.", type: "promo",    target: "readers"     },
      { title: "Subscription Renewing", body: "Your Pro Annual plan renews in 7 days.", type: "renewal",  target: "subscribers" },
    ]
    notifs.forEach(n => notificationStore.send(n))
  }

  // Coupons
  if (couponStore.getAll().length === 0) {
    const coupons: Omit<Coupon,"id"|"createdAt"|"usedCount">[] = [
      { code: "WELCOME10", type: "percent", value: 10, maxUses: 500,  expiresAt: "2026-06-30T00:00:00.000Z", isActive: true  },
      { code: "SAVE20",    type: "percent", value: 20, maxUses: 200,  expiresAt: "2026-04-30T00:00:00.000Z", isActive: true  },
      { code: "FLAT5",     type: "fixed",   value: 5,  maxUses: 1000, expiresAt: "2026-12-31T00:00:00.000Z", isActive: true  },
      { code: "VIP30",     type: "percent", value: 30, maxUses: 50,   expiresAt: "2026-03-31T00:00:00.000Z", isActive: false },
    ]
    coupons.forEach(c => couponStore.create(c))
  }

  // Tax
  if (taxStore.getAll().length === 0) {
    const taxes: Omit<TaxConfig,"id"|"updatedAt">[] = [
      { label: "VAT",  rate: 7.5, isEnabled: true,  region: "NG"     },
      { label: "GST",  rate: 10,  isEnabled: false, region: "AU"     },
      { label: "Global Sales Tax", rate: 5, isEnabled: false, region: "GLOBAL" },
    ]
    taxes.forEach(t => taxStore.create(t))
  }

  // CMS Pages
  if (cmsPageStore.getAll().length === 0) {
    const pages: Omit<CmsPage,"id"|"updatedAt">[] = [
      { title: "About Us",       slug: "about",   isPublished: true,  content: "# About MyScriptic\n\nMyScriptic is Africa's premier digital reading platform, connecting authors and readers through a curated library of ebooks and audiobooks.\n\n## Our Mission\n\nTo democratize access to African literature and empower authors to earn a sustainable income from their work.\n\n## Our Story\n\nFounded in 2024, we started with a simple belief: great stories deserve great readers. Today we serve over 2 million readers across 40+ countries." },
      { title: "Terms of Service",slug: "terms",  isPublished: true,  content: "# Terms of Service\n\n*Last updated: January 2026*\n\n## 1. Acceptance of Terms\n\nBy accessing MyScriptic, you agree to be bound by these Terms of Service.\n\n## 2. User Accounts\n\nYou are responsible for maintaining the security of your account credentials.\n\n## 3. Subscription Plans\n\nSubscription fees are billed in advance. Cancellations take effect at the end of the current billing period.\n\n## 4. Content Policy\n\nUsers may not reproduce, distribute, or sell any content from our platform without explicit written permission.\n\n## 5. Intellectual Property\n\nAll content on MyScriptic remains the property of its respective authors and rights holders." },
      { title: "Privacy Policy", slug: "privacy", isPublished: true,  content: "# Privacy Policy\n\n*Last updated: January 2026*\n\n## Data We Collect\n\nWe collect information you provide (name, email, payment data) and usage data (reading progress, session length).\n\n## How We Use Data\n\nWe use your data to provide and improve the service, personalize recommendations, and process payments.\n\n## Data Sharing\n\nWe do not sell your personal data. We share data only with service providers necessary to operate the platform.\n\n## Your Rights\n\nYou may request deletion of your account and associated data at any time by contacting support@myscriptic.com." },
    ]
    pages.forEach(p => cmsPageStore.create(p))
  }

  // Activity log
  if (activityLogStore.getAll().length === 0) {
    const logs: Omit<ActivityLog,"id"|"createdAt">[] = [
      { userId: "u01", userName: "Chimamanda A.",  action: "Payout processed: $340.20",     category: "payment",      metadata: { amount: 340.20 } },
      { userId: "u03", userName: "Amara Obi",       action: "Subscribed to Pro Monthly",     category: "subscription", metadata: { plan: "Pro Monthly" } },
      { userId: "u07", userName: "Seun Williams",   action: "Author application submitted",  category: "admin",        metadata: { status: "pending" } },
      { userId: "u02", userName: "Tunde Balogun",   action: "Book published: The Entrepreneur's Code", category: "book", metadata: { bookId: "bk_004" } },
      { userId: "u05", userName: "Kofi Mensah",     action: "Coupon SAVE20 applied",         category: "coupon",       metadata: { code: "SAVE20", discount: 20 } },
      { userId: "u04", userName: "Yemi Adeyemi",    action: "Account blocked by admin",      category: "admin",        metadata: { reason: "TOS violation" } },
      { userId: "u01", userName: "Chimamanda A.",   action: "New book submitted for review", category: "book",         metadata: { title: "The Lagos Chronicles II" } },
      { userId: "u06", userName: "Fatima Garba",    action: "Login from new device",         category: "auth",         metadata: { ip: "197.210.4.1" } },
    ]
    logs.forEach(l => activityLogStore.log(l))
  }

  seedAuthorCourses()
}
