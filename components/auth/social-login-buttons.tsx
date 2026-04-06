"use client"

import * as React from "react"
import { GoogleLogin } from "@react-oauth/google"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { BookOpen, Loader2 } from "lucide-react"

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? ""
const APPLE_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID?.trim() ?? ""

function appleRedirectUri(): string {
  const explicit = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI?.trim()
  if (explicit) return explicit
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? ""
  return site ? `${site}/auth/login` : ""
}

const APPLE_REDIRECT = appleRedirectUri()
const APPLE_CONFIGURED = Boolean(APPLE_ID && APPLE_REDIRECT)

const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"

export function SocialLoginButtons({
  disabled,
  onSocialSuccess,
}: {
  disabled?: boolean
  onSocialSuccess?: () => void
}) {
  const { loginWithGoogleCredential, loginWithApple } = useAuth()
  const [appleLoading, setAppleLoading] = React.useState(false)
  const [socialError, setSocialError] = React.useState("")

  React.useEffect(() => {
    if (!APPLE_CONFIGURED) return
    if (document.querySelector(`script[src="${APPLE_SCRIPT_SRC}"]`)) return
    const s = document.createElement("script")
    s.src = APPLE_SCRIPT_SRC
    s.async = true
    document.head.appendChild(s)
  }, [])

  const handleApple = async () => {
    if (!APPLE_CONFIGURED) {
      setSocialError("Apple Sign-In is not configured (client ID and redirect URI).")
      return
    }
    if (typeof window.AppleID === "undefined") {
      setSocialError("Apple script is still loading. Try again in a moment.")
      return
    }
    setSocialError("")
    setAppleLoading(true)
    try {
      const nonce = [...crypto.getRandomValues(new Uint8Array(16))]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
      window.AppleID.auth.init({
        clientId: APPLE_ID,
        scope: "name email",
        redirectURI: APPLE_REDIRECT,
        usePopup: true,
        nonce,
      })
      const res = await window.AppleID.auth.signIn()
      const token = res.authorization?.id_token
      if (!token) {
        setSocialError("Apple did not return an identity token.")
        return
      }
      const userJson = res.user ? JSON.stringify(res.user) : undefined
      const result = await loginWithApple(token, nonce, userJson)
      if (result.success) onSocialSuccess?.()
      else setSocialError(result.error ?? "Apple sign-in failed.")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Apple sign-in failed."
      if (!/popup|cancel|closed|abort/i.test(msg)) {
        setSocialError(msg)
      }
    } finally {
      setAppleLoading(false)
    }
  }

  if (!GOOGLE_ID && !APPLE_CONFIGURED) {
    return null
  }

  return (
    <div className="space-y-3">
      {socialError ? (
        <p className="text-sm text-destructive" role="alert">
          {socialError}
        </p>
      ) : null}
      <div className={`grid gap-3 ${GOOGLE_ID && APPLE_CONFIGURED ? "grid-cols-2" : "grid-cols-1"}`}>
        {GOOGLE_ID ? (
          <div className="flex min-h-[44px] w-full items-center justify-center [&>div]:!w-full">
            <GoogleLogin
              onSuccess={async cred => {
                if (!cred.credential) return
                setSocialError("")
                const result = await loginWithGoogleCredential(cred.credential)
                if (result.success) onSocialSuccess?.()
                else setSocialError(result.error ?? "Google sign-in failed.")
              }}
              onError={() => setSocialError("Google sign-in was interrupted.")}
              useOneTap={false}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width="100%"
            />
          </div>
        ) : null}

        {APPLE_CONFIGURED ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            disabled={disabled || appleLoading}
            onClick={() => void handleApple()}
          >
            {appleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <BookOpen size={16} />
            )}
            Apple
          </Button>
        ) : null}
      </div>
    </div>
  )
}
