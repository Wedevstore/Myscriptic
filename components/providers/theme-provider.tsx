"use client"

import * as React from "react"

type Theme = "dark" | "light" | "system"

interface ThemeProviderContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const ThemeProviderContext = React.createContext<ThemeProviderContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = React.useState<"dark" | "light">("light")

  // Initialise from localStorage
  React.useEffect(() => {
    const stored = (localStorage.getItem("myscriptic-theme") as Theme) || "system"
    setThemeState(stored)
  }, [])

  /** Profile → Preferences stores `myscriptic-locale`; keep `<html lang>` in sync on load. */
  React.useEffect(() => {
    const allowed = new Set(["en", "fr", "yo", "ig", "ha", "sw"])
    const loc = localStorage.getItem("myscriptic-locale")
    if (loc && allowed.has(loc)) {
      document.documentElement.lang = loc
    }
  }, [])

  // Apply class to <html>
  React.useEffect(() => {
    const root = window.document.documentElement
    const applyTheme = (t: "dark" | "light") => {
      root.classList.remove("dark", "light")
      root.classList.add(t)
      setResolvedTheme(t)
    }

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      applyTheme(mq.matches ? "dark" : "light")
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light")
      mq.addEventListener("change", listener)
      return () => mq.removeEventListener("change", listener)
    } else {
      applyTheme(theme)
    }
  }, [theme])

  const setTheme = React.useCallback((t: Theme) => {
    localStorage.setItem("myscriptic-theme", t)
    setThemeState(t)
  }, [])

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const ctx = React.useContext(ThemeProviderContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
