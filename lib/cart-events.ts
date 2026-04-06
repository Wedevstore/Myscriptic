/** Fired when cart contents change (same tab). Navbar also listens to `storage` for other tabs. */
export const CART_CHANGED = "myscriptic:cart-changed"

export function emitCartChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CART_CHANGED))
}
