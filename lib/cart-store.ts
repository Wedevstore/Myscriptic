import { emitCartChanged } from "@/lib/cart-events"

/**
 * cart-store.ts — MyScriptic Cart State (localStorage-backed)
 *
 * In production this syncs with the server cart:
 *   GET  /api/cart
 *   POST /api/cart/items
 *   DELETE /api/cart/items/:id
 *
 * For now, uses localStorage as the source of truth.
 */

export interface CartItem {
  id: string
  bookId: string
  title: string
  author: string
  coverUrl: string
  price: number
  currency: string
  format: string
}

const CART_KEY = "myscriptic_cart"

export const cartStore = {
  getAll(): CartItem[] {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem(CART_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  add(item: Omit<CartItem, "id">): CartItem {
    const items = cartStore.getAll()
    if (items.find(i => i.bookId === item.bookId)) {
      return items.find(i => i.bookId === item.bookId)!
    }
    const newItem: CartItem = { ...item, id: `cart_${Date.now()}` }
    const updated = [...items, newItem]
    localStorage.setItem(CART_KEY, JSON.stringify(updated))
    emitCartChanged()
    return newItem
  },

  remove(bookId: string): void {
    const updated = cartStore.getAll().filter(i => i.bookId !== bookId)
    localStorage.setItem(CART_KEY, JSON.stringify(updated))
    emitCartChanged()
  },

  clear(): void {
    localStorage.removeItem(CART_KEY)
    emitCartChanged()
  },

  count(): number {
    return cartStore.getAll().length
  },

  total(): number {
    return cartStore.getAll().reduce((sum, i) => sum + i.price, 0)
  },
}
