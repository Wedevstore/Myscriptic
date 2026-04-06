export const WISHLIST_CHANGED = "myscriptic:wishlist-changed"

export function emitWishlistChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(WISHLIST_CHANGED))
}
