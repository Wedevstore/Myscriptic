/**
 * Staff permissions model.
 *
 * Admin users have all permissions implicitly.
 * Staff members (role="staff") have a subset of permissions
 * assigned by an admin via the Staff Management page.
 *
 * Permissions map to admin dashboard sections/features.
 * When the Laravel API is live, permissions come from the user object.
 * Locally they are stored in localStorage for dev/demo.
 */

export const STAFF_PERMISSIONS = {
  dashboard_view:      { label: "Dashboard Overview",    group: "Overview",  description: "View KPIs and charts" },
  analytics_view:      { label: "Analytics",             group: "Overview",  description: "View platform analytics" },
  cms_manage:          { label: "CMS Builder",           group: "Content",   description: "Create and edit homepage sections" },
  banners_manage:      { label: "Banners",               group: "Content",   description: "Manage promotional banners" },
  pages_manage:        { label: "CMS Pages",             group: "Content",   description: "Create and edit static pages" },
  books_manage:        { label: "Books",                 group: "Content",   description: "Review, approve, and reject books" },
  courses_manage:      { label: "Author Courses",        group: "Content",   description: "Manage author video courses" },
  users_manage:        { label: "Users",                 group: "People",    description: "View and manage user accounts" },
  authors_manage:      { label: "Authors",               group: "People",    description: "Review author applications" },
  subscriptions_view:  { label: "Subscriptions",         group: "People",    description: "View subscription data" },
  revenue_view:        { label: "Revenue Pool",          group: "Revenue",   description: "View revenue and payouts" },
  orders_manage:       { label: "Orders",                group: "Revenue",   description: "View and manage orders" },
  coupons_manage:      { label: "Coupons",               group: "Revenue",   description: "Create and manage coupons" },
  tax_manage:          { label: "Tax Config",            group: "Revenue",   description: "Manage tax settings" },
  notifications_manage:{ label: "Notifications",         group: "Platform",  description: "Send notification broadcasts" },
  contacts_view:       { label: "Contact Inbox",         group: "Platform",  description: "View contact form submissions" },
  reports_manage:      { label: "Reports",               group: "Platform",  description: "Review and moderate user reports" },
  activity_view:       { label: "Activity Log",          group: "Platform",  description: "View audit / activity log" },
  settings_manage:     { label: "Settings",              group: "Platform",  description: "Manage site settings and features" },
  staff_manage:        { label: "Staff Management",      group: "Platform",  description: "Add, edit, and remove staff members" },
  refunds_manage:      { label: "Refunds",               group: "Revenue",   description: "Issue and manage refunds" },
  transactions_view:   { label: "Transactions",          group: "Revenue",   description: "View transaction history" },
} as const

export type StaffPermission = keyof typeof STAFF_PERMISSIONS

export const ALL_PERMISSIONS = Object.keys(STAFF_PERMISSIONS) as StaffPermission[]

export function getPermissionGroups(): { group: string; permissions: StaffPermission[] }[] {
  const map = new Map<string, StaffPermission[]>()
  for (const [key, val] of Object.entries(STAFF_PERMISSIONS)) {
    const existing = map.get(val.group) ?? []
    existing.push(key as StaffPermission)
    map.set(val.group, existing)
  }
  return Array.from(map.entries()).map(([group, permissions]) => ({ group, permissions }))
}

/** Map nav item hrefs to the permission required to see them. */
export const NAV_PERMISSION_MAP: Record<string, StaffPermission> = {
  "/dashboard/admin":                   "dashboard_view",
  "/dashboard/admin/analytics":         "analytics_view",
  "/dashboard/admin/cms":               "cms_manage",
  "/dashboard/admin/banners":           "banners_manage",
  "/dashboard/admin/pages":             "pages_manage",
  "/dashboard/admin/books":             "books_manage",
  "/dashboard/admin/author-courses":    "courses_manage",
  "/dashboard/admin/users":             "users_manage",
  "/dashboard/admin/authors":           "authors_manage",
  "/dashboard/admin/subscriptions":     "subscriptions_view",
  "/dashboard/admin/revenue":           "revenue_view",
  "/dashboard/admin/orders":            "orders_manage",
  "/dashboard/admin/coupons":           "coupons_manage",
  "/dashboard/admin/tax":               "tax_manage",
  "/dashboard/admin/notifications":     "notifications_manage",
  "/dashboard/admin/contact-messages":  "contacts_view",
  "/dashboard/admin/reports":           "reports_manage",
  "/dashboard/admin/activity":          "activity_view",
  "/dashboard/admin/settings":          "settings_manage",
  "/dashboard/admin/staff":             "staff_manage",
  "/dashboard/admin/refunds":           "refunds_manage",
  "/dashboard/admin/transactions":      "transactions_view",
}

export interface StaffMember {
  id: string
  name: string
  email: string
  avatar?: string
  permissions: StaffPermission[]
  active: boolean
  createdAt: string
}

const STAFF_STORAGE_KEY = "myscriptic_staff_members"

export function loadStaffMembers(): StaffMember[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STAFF_STORAGE_KEY) ?? "[]")
  } catch { return [] }
}

export function saveStaffMembers(members: StaffMember[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(members))
}

export function getStaffPermissions(userId: string): StaffPermission[] {
  const members = loadStaffMembers()
  const member = members.find(m => m.id === userId && m.active)
  return member?.permissions ?? []
}

export function hasPermission(
  userRole: string,
  userId: string,
  permission: StaffPermission
): boolean {
  if (userRole === "admin") return true
  if (userRole !== "staff") return false
  return getStaffPermissions(userId).includes(permission)
}

/** Check if a user can access a given admin nav href. */
export function canAccessRoute(userRole: string, userId: string, href: string): boolean {
  if (userRole === "admin") return true
  const perm = NAV_PERMISSION_MAP[href]
  if (!perm) return false
  return hasPermission(userRole, userId, perm)
}
