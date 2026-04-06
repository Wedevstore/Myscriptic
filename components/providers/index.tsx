"use client"

import { GoogleOAuthProvider } from "@react-oauth/google"
import { ThemeProvider } from "./theme-provider"
import { AuthProvider } from "./auth-provider"

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? ""

export function Providers({ children }: { children: React.ReactNode }) {
  const inner = (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )

  if (!googleClientId) {
    return inner
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {inner}
    </GoogleOAuthProvider>
  )
}
