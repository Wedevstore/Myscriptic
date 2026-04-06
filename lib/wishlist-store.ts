import { emitWishlistChanged } from "@/lib/wishlist-events"

const KEY = "myscriptic_wishlist_ids"

function read(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(ids))
  emitWishlistChanged()
}

export const wishlistStore = {
  getIds(): string[] {
    return read()
  },

  has(id: string): boolean {
    return read().includes(id)
  },

  add(id: string): void {
    const ids = read()
    if (ids.includes(id)) return
    write([...ids, id])
  },

  remove(id: string): void {
    write(read().filter(i => i !== id))
  },

  /** Replace persisted ids (e.g. after server sync). */
  replaceIds(ids: string[]): void {
    write([...new Set(ids)])
  },

  /** @returns whether the book is wishlisted after toggle */
  toggle(id: string): boolean {
    if (read().includes(id)) {
      wishlistStore.remove(id)
      return false
    }
    wishlistStore.add(id)
    return true
  },
}
