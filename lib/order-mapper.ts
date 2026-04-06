import type { Currency, Order, OrderItem, OrderStatus, PaymentGateway } from "@/lib/store"
import { demoPic } from "@/lib/demo-images"

const GW: PaymentGateway[] = ["paystack", "flutterwave", "paypal", "korapay"]
const ST: OrderStatus[] = ["pending", "paid", "failed", "refunded"]

/** Map `GET /api/orders` row to local `Order` for the SPA order history UI. */
export function apiOrderToStore(row: Record<string, unknown>, userId: string): Order {
  const gw = String(row.payment_gateway ?? "paystack")
  const paymentGateway = (GW.includes(gw as PaymentGateway) ? gw : "paystack") as PaymentGateway
  const st = String(row.status ?? "pending")
  const status = (ST.includes(st as OrderStatus) ? st : "pending") as OrderStatus
  const cur = (String(row.currency ?? "USD") || "USD") as Currency

  const itemsRaw = Array.isArray(row.items) ? row.items : []
  const items: OrderItem[] = itemsRaw.map((raw: unknown) => {
    const it = raw as Record<string, unknown>
    const unit = Number(it.unit_price ?? 0)
    const qty = Math.max(1, Number(it.quantity ?? 1))
    const cover =
      typeof it.cover_url === "string" && it.cover_url.trim().length > 0
        ? it.cover_url
        : demoPic("fallback-cover")
    return {
      bookId: String(it.book_id ?? ""),
      title: String(it.title ?? ""),
      author: String(it.author ?? ""),
      coverUrl: cover,
      format: String(it.format ?? "ebook"),
      price: unit * qty,
    }
  })

  const total = Number(row.total ?? 0)
  const localRaw = row.local_total
  const localTotal =
    localRaw !== null && localRaw !== undefined && String(localRaw).length > 0
      ? Number(localRaw)
      : total

  return {
    id: String(row.id),
    orderNumber: String(row.order_number ?? ""),
    userId,
    items,
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    tax: Number(row.tax ?? 0),
    total,
    currency: cur,
    localTotal,
    couponCode: null,
    paymentGateway,
    paymentRef: row.payment_ref != null ? String(row.payment_ref) : null,
    status,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    paidAt: row.paid_at != null ? String(row.paid_at) : null,
  }
}
