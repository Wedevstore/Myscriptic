export type CourseAccessType = "FREE" | "PAID" | "SUBSCRIPTION"

export function formatCourseAccessLabel(
  access: CourseAccessType,
  price: number | null | undefined,
  currency: string | undefined
): string {
  if (access === "FREE") return "Free"
  if (access === "SUBSCRIPTION") return "Subscription"
  if (access === "PAID" && price != null && Number.isFinite(price)) {
    return `${currency ?? "USD"} ${price.toFixed(2)}`
  }
  return "One-time purchase"
}
