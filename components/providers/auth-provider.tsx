"use client"

/**
 * AuthProvider — Laravel Sanctum Authentication
 *
 * Connects to the Laravel API:
 *   POST /api/auth/login      → {token, user}
 *   POST /api/auth/register   → {token, user}
 *   POST /api/auth/logout     → {}
 *   GET  /api/auth/me         → {user}
 *
 * Auth state (user + bearer token) is persisted in localStorage
 * and rehydrated on mount.
 */

import * as React from "react"
import { authApi, loginWithPassword } from "@/lib/api"
import { mergeLocalCartToServer } from "@/lib/cart-actions"
import { laravelAuthEnabled } from "@/lib/auth-mode"

export type UserRole = "admin" | "staff" | "author" | "user"

export interface AuthUser {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  permissions?: string[]
  subscriptionPlan?: string | null
  subscriptionExpiresAt?: string | null
  createdAt: string
  /** Client + optional API: authenticator app enrolled (secret stored separately per device). */
  twoFactorEnabled?: boolean
  /** Author application status (set after applying via /become-author). */
  authorApplicationStatus?: "pending" | "approved" | "rejected" | null
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

/** Laravel may require a second step: POST /api/auth/2fa/verify with `pending_token`. */
export type LoginResult =
  | { success: true }
  | { success: false; error?: string }
  | { success: false; needsTwoFactor: true; pendingToken: string }

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>
  verifyLoginTwoFactor: (
    pendingToken: string,
    code: string
  ) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>
  loginWithGoogleCredential: (credential: string) => Promise<{ success: boolean; error?: string }>
  loginWithApple: (identityToken: string, nonce?: string, userJson?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUser: (partial: Partial<AuthUser>) => void
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

// ── Mock user database (localStorage-backed) ──────────────────────────────────
const STORAGE_KEY = "myscriptic_auth"

function loadFromStorage(): { user: AuthUser | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { user: null, token: null }
    return JSON.parse(raw)
  } catch {
    return { user: null, token: null }
  }
}

function saveToStorage(user: AuthUser | null, token: string | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }))
  }
}

/**
 * Dev-only mock accounts — tree-shaken out of production builds.
 * When `laravelAuthEnabled()` is true the mock path is never entered.
 */
function getDevMockUsers(): (AuthUser & { password: string })[] {
  if (process.env.NODE_ENV === "production") return []
  const pic = (seed: string, w: number, h: number) =>
    `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`
  return [
    { id: "usr_admin_1", name: "Admin User", email: "admin@myscriptic.com", password: "admin123", role: "admin" as const, avatar: pic("core-admin-avatar", 160, 160), createdAt: "2024-01-01T00:00:00Z" },
    { id: "usr_staff_1", name: "Staff Member", email: "staff@myscriptic.com", password: "staff123", role: "staff" as const, avatar: pic("core-staff-member", 160, 160), createdAt: "2024-01-10T00:00:00Z" },
    { id: "usr_author_1", name: "Jane Austen", email: "author@myscriptic.com", password: "author123", role: "author" as const, avatar: pic("core-author-jane", 160, 160), createdAt: "2024-01-15T00:00:00Z" },
    { id: "usr_reader_1", name: "John Reader", email: "reader@myscriptic.com", password: "reader123", role: "user" as const, subscriptionPlan: "Pro Monthly", subscriptionExpiresAt: "2025-12-31T00:00:00Z", avatar: pic("core-reader-john", 160, 160), createdAt: "2024-02-01T00:00:00Z" },
  ]
}

function findMockUser(email: string, password: string) {
  return getDevMockUsers().find(u => u.email === email && u.password === password) ?? null
}

export function normalizeAuthUser(raw: unknown): AuthUser {
  const u = raw as Record<string, unknown>
  const twoFactorEnabled =
    u.two_factor_enabled === true || u.twoFactorEnabled === true ? true : undefined
  const permissions = Array.isArray(u.permissions) ? u.permissions.map(String) : undefined
  const appStatus = u.author_application_status ?? u.authorApplicationStatus
  return {
    id: String(u.id),
    name: String(u.name),
    email: String(u.email),
    avatar: u.avatar != null ? String(u.avatar) : undefined,
    role: u.role as UserRole,
    permissions,
    subscriptionPlan:
      u.subscriptionPlan != null ? (u.subscriptionPlan as string | null) : undefined,
    subscriptionExpiresAt:
      u.subscriptionExpiresAt != null
        ? (u.subscriptionExpiresAt as string | null)
        : undefined,
    createdAt: String(u.createdAt),
    twoFactorEnabled,
    authorApplicationStatus:
      typeof appStatus === "string" && ["pending", "approved", "rejected"].includes(appStatus)
        ? (appStatus as "pending" | "approved" | "rejected")
        : undefined,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const laravel = laravelAuthEnabled()
  const [state, setState] = React.useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  })

  // Rehydrate from localStorage on mount
  React.useEffect(() => {
    const { user, token } = loadFromStorage()
    setState({ user, token, isLoading: false, isAuthenticated: !!user })
  }, [])

  const login = React.useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      if (laravel) {
        const out = await loginWithPassword(email, password)
        if (out.kind === "error") {
          return { success: false, error: out.message }
        }
        if (out.kind === "two_factor") {
          return { success: false, needsTwoFactor: true, pendingToken: out.pendingToken }
        }
        try {
          const user = normalizeAuthUser(out.user)
          saveToStorage(user, out.token)
          setState({ user, token: out.token, isLoading: false, isAuthenticated: true })
          await mergeLocalCartToServer()
          return { success: true }
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : "Invalid email or password.",
          }
        }
      }

      await new Promise(r => setTimeout(r, 400))
      const found = findMockUser(email, password)
      if (!found) return { success: false, error: "Invalid email or password." }

      const { password: _pw, ...user } = found
      const token = `mock_token_${user.id}_${Date.now()}`
      saveToStorage(user, token)
      setState({ user, token, isLoading: false, isAuthenticated: true })
      return { success: true }
    },
    [laravel]
  )

  const verifyLoginTwoFactor = React.useCallback(
    async (
      pendingToken: string,
      code: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!laravel) {
        return { success: false, error: "Two-factor sign-in requires the Laravel API." }
      }
      try {
        const res = await authApi.twoFactorVerify({
          pending_token: pendingToken,
          code: code.replace(/\s/g, ""),
        })
        const user = normalizeAuthUser(res.user)
        saveToStorage(user, res.token)
        setState({ user, token: res.token, isLoading: false, isAuthenticated: true })
        await mergeLocalCartToServer()
        return { success: true }
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Invalid or expired code.",
        }
      }
    },
    [laravel]
  )

  const register = React.useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: UserRole = "user"
    ): Promise<{ success: boolean; error?: string }> => {
      if (laravel) {
        const apiRole = role === "admin" ? "user" : role
        try {
          const res = await authApi.register(name, email, password, apiRole)
          const user = normalizeAuthUser(res.user)
          saveToStorage(user, res.token)
          setState({ user, token: res.token, isLoading: false, isAuthenticated: true })
          await mergeLocalCartToServer()
          return { success: true }
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : "Registration failed.",
          }
        }
      }

      await new Promise(r => setTimeout(r, 400))
      const devUsers = getDevMockUsers()
      if (devUsers.find(u => u.email === email)) {
        return { success: false, error: "An account with this email already exists." }
      }

      const user: AuthUser = {
        id: `usr_${Date.now()}`,
        name,
        email,
        role,
        createdAt: new Date().toISOString(),
      }
      const token = `mock_token_${user.id}_${Date.now()}`
      saveToStorage(user, token)
      setState({ user, token, isLoading: false, isAuthenticated: true })
      return { success: true }
    },
    [laravel]
  )

  const loginWithGoogleCredential = React.useCallback(
    async (credential: string): Promise<{ success: boolean; error?: string }> => {
      if (!laravel) {
        return {
          success: false,
          error: "Google sign-in needs the API (set NEXT_PUBLIC_API_URL and Laravel auth).",
        }
      }
      try {
        const res = await authApi.google(credential)
        const user = normalizeAuthUser(res.user)
        saveToStorage(user, res.token)
        setState({ user, token: res.token, isLoading: false, isAuthenticated: true })
        await mergeLocalCartToServer()
        return { success: true }
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Google sign-in failed.",
        }
      }
    },
    [laravel]
  )

  const loginWithApple = React.useCallback(
    async (
      identityToken: string,
      nonce?: string,
      userJson?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!laravel) {
        return {
          success: false,
          error: "Apple sign-in needs the API (set NEXT_PUBLIC_API_URL and Laravel auth).",
        }
      }
      try {
        const res = await authApi.apple(identityToken, nonce, userJson)
        const user = normalizeAuthUser(res.user)
        saveToStorage(user, res.token)
        setState({ user, token: res.token, isLoading: false, isAuthenticated: true })
        await mergeLocalCartToServer()
        return { success: true }
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Apple sign-in failed.",
        }
      }
    },
    [laravel]
  )

  const logout = React.useCallback(() => {
    if (laravel && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const { token } = JSON.parse(raw) as { token?: string | null }
          if (token) void authApi.logout().catch(() => {})
        }
      } catch {
        /* ignore */
      }
    }
    saveToStorage(null, null)
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
  }, [laravel])

  const updateUser = React.useCallback((partial: Partial<AuthUser>) => {
    setState(prev => {
      if (!prev.user) return prev
      const updated = { ...prev.user, ...partial }
      saveToStorage(updated, prev.token)
      return { ...prev, user: updated }
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        verifyLoginTwoFactor,
        register,
        loginWithGoogleCredential,
        loginWithApple,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
