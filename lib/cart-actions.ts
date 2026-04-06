import { cartApi } from "@/lib/api"
import { laravelPhase2Enabled } from "@/lib/auth-mode"
import { cartStore } from "@/lib/cart-store"
import { emitCartChanged } from "@/lib/cart-events"

const AUTH_KEY = "myscriptic_auth"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    return (JSON.parse(raw) as { token?: string | null }).token ?? null
  } catch {
    return null
  }
}

export interface AddBookCartPayload {
  bookId: string
  title: string
  author: string
  coverUrl: string
  price: number
  currency: string
  format: string
}

export async function addBookToCart(
  payload: AddBookCartPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const phase2 = laravelPhase2Enabled()
  const token = getToken()

  if (phase2 && token) {
    try {
      await cartApi.add(payload.bookId, 1)
      emitCartChanged()
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Could not add to cart.",
      }
    }
  }

  if (payload.price == null || Number.isNaN(payload.price)) {
    return { ok: false, error: "This item is not for sale." }
  }

  cartStore.add({
    bookId: payload.bookId,
    title: payload.title,
    author: payload.author,
    coverUrl: payload.coverUrl,
    price: payload.price,
    currency: payload.currency,
    format: payload.format,
  })
  return { ok: true }
}

/** Local cart only; use {@link refreshBookInCart} when Phase 2 + logged in. */
export function isBookInLocalCart(bookId: string): boolean {
  return cartStore.getAll().some(i => i.bookId === bookId)
}

export async function isBookInServerCart(bookId: string): Promise<boolean> {
  if (!laravelPhase2Enabled() || !getToken()) return false
  try {
    const res = await cartApi.get()
    const rows = res.data as { book_id: string | number }[]
    return rows.some(r => String(r.book_id) === String(bookId))
  } catch {
    return false
  }
}

export async function refreshBookInCart(bookId: string): Promise<boolean> {
  const phase2 = laravelPhase2Enabled()
  if (phase2 && getToken()) return isBookInServerCart(bookId)
  return isBookInLocalCart(bookId)
}

export async function fetchCartItemCount(): Promise<number> {
  const phase2 = laravelPhase2Enabled()
  if (phase2 && getToken()) {
    try {
      const res = await cartApi.get()
      return Array.isArray(res.data) ? res.data.length : 0
    } catch {
      return 0
    }
  }
  return cartStore.count()
}

/** After Laravel login/register: push local cart lines to the API, then clear local storage. */
export async function mergeLocalCartToServer(): Promise<void> {
  if (typeof window === "undefined") return
  if (!laravelPhase2Enabled() || !getToken()) return
  const local = cartStore.getAll()
  if (local.length === 0) return
  for (const item of local) {
    try {
      await cartApi.add(item.bookId, 1)
    } catch {
      /* duplicate or invalid book_id — skip */
    }
  }
  cartStore.clear()
  emitCartChanged()
}
