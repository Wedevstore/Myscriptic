"use client"

import * as React from "react"

/**
 * Soft deterrence only: blocks common copy/cut/context-menu paths on a DOM subtree.
 * Does not stop screenshots, screen recorders, devtools, disabled JS, or OS-level capture.
 * For real ebook/audio protection use legal terms, watermarking, and/or DRM (e.g. Widevine for video).
 */
export function useContentProtection(
  ref: React.RefObject<HTMLElement | null>,
  enabled = true,
  /** When false, listeners are removed (e.g. gated content not mounted yet). */
  active = true
) {
  React.useLayoutEffect(() => {
    if (!enabled || !active) return
    const el = ref.current
    if (!el) return

    const stop = (e: Event) => {
      e.preventDefault()
    }

    const isProtectedFocus = () => {
      const a = document.activeElement
      return a ? el.contains(a) : false
    }

    const selectionInEl = () => {
      const s = window.getSelection()
      if (!s || s.rangeCount === 0 || s.isCollapsed) return false
      try {
        return el.contains(s.getRangeAt(0).commonAncestorContainer)
      } catch {
        return false
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isProtectedFocus() && !el.contains(e.target as Node) && !selectionInEl()) return
      if (!e.ctrlKey && !e.metaKey) return
      const k = e.key.toLowerCase()
      if (k === "c" || k === "x" || k === "a" || k === "s" || k === "u") {
        e.preventDefault()
      }
    }

    el.addEventListener("copy", stop)
    el.addEventListener("cut", stop)
    el.addEventListener("contextmenu", stop)
    el.addEventListener("dragstart", stop)

    document.addEventListener("keydown", onKeyDown, true)

    return () => {
      el.removeEventListener("copy", stop)
      el.removeEventListener("cut", stop)
      el.removeEventListener("contextmenu", stop)
      el.removeEventListener("dragstart", stop)
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [active, enabled, ref])
}
