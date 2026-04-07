"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { normalizeAuthUser, type AuthUser } from "@/components/providers/auth-provider"
import { authApi } from "@/lib/api"
import { laravelAuthEnabled } from "@/lib/auth-mode"
import {
  buildTotpKeyUri,
  clearTotpSecret,
  generateTotpSecret,
  loadTotpSecret,
  saveTotpSecret,
  verifyTotpCode,
} from "@/lib/profile-totp"
import { Shield, Loader2, Copy, CheckCircle } from "lucide-react"

type Props = {
  user: Pick<AuthUser, "id" | "email" | "twoFactorEnabled">
  updateUser: (partial: Partial<AuthUser>) => void
}

function secretFromOtpauthUri(uri: string): string | null {
  try {
    const u = new URL(uri)
    const s = u.searchParams.get("secret")
    return s && s.length > 0 ? s : null
  } catch {
    return null
  }
}

function userFromTwoFactorPayload(res: { user?: unknown; data?: unknown }): unknown {
  if (res.user != null) return res.user
  const d = res.data
  if (d && typeof d === "object" && d !== null && "user" in d) {
    return (d as { user: unknown }).user
  }
  return null
}

export function TwoFactorCard({ user, updateUser }: Props) {
  const remote = laravelAuthEnabled()

  const [setupOpen, setSetupOpen] = React.useState(false)
  const [disableOpen, setDisableOpen] = React.useState(false)
  const [pendingSecret, setPendingSecret] = React.useState<string | null>(null)
  const [pendingOtpauthUri, setPendingOtpauthUri] = React.useState<string | null>(null)
  const [otpInput, setOtpInput] = React.useState("")
  const [disableOtpInput, setDisableOtpInput] = React.useState("")
  const [verifyError, setVerifyError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [hasLocalSecret, setHasLocalSecret] = React.useState(false)

  React.useEffect(() => {
    if (remote) return
    setHasLocalSecret(Boolean(loadTotpSecret(user.id)))
  }, [remote, user.id, user.twoFactorEnabled, setupOpen, disableOpen])

  const enabled = remote
    ? Boolean(user.twoFactorEnabled)
    : Boolean(user.twoFactorEnabled && hasLocalSecret)

  React.useEffect(() => {
    if (remote) return
    if (user.twoFactorEnabled && !loadTotpSecret(user.id)) {
      updateUser({ twoFactorEnabled: false })
    }
  }, [remote, user.id, user.twoFactorEnabled, updateUser])

  const displayKeyUri =
    pendingOtpauthUri ??
    (pendingSecret != null ? buildTotpKeyUri(user.email, pendingSecret) : "")
  const qrSrc =
    displayKeyUri.length > 0
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&data=${encodeURIComponent(displayKeyUri)}`
      : ""

  function closeSetup(open: boolean) {
    setSetupOpen(open)
    if (!open) {
      setPendingSecret(null)
      setPendingOtpauthUri(null)
      setOtpInput("")
      setVerifyError("")
    }
  }

  async function openSetupRemote() {
    setVerifyError("")
    setOtpInput("")
    setBusy(true)
    try {
      const res = await authApi.twoFactorSetup()
      const uri = res.otpauth_uri ?? res.otpauthUrl ?? ""
      const secretFromApi =
        res.secret && res.secret.length > 0 ? res.secret : uri ? secretFromOtpauthUri(uri) : null
      if (!secretFromApi && !uri) {
        setVerifyError("The API did not return a setup secret or otpauth URI.")
        return
      }
      setPendingSecret(secretFromApi)
      setPendingOtpauthUri(uri.length > 0 ? uri : null)
      setSetupOpen(true)
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Could not start 2FA setup.")
    } finally {
      setBusy(false)
    }
  }

  function openSetupLocal() {
    setVerifyError("")
    setOtpInput("")
    setPendingOtpauthUri(null)
    setPendingSecret(generateTotpSecret())
    setSetupOpen(true)
  }

  async function copySecret() {
    if (!pendingSecret) return
    try {
      await navigator.clipboard.writeText(pendingSecret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setVerifyError("Could not copy — select the secret and copy manually.")
    }
  }

  async function handleVerify() {
    if (remote) {
      const clean = otpInput.replace(/\s/g, "")
      if (clean.length !== 6) {
        setVerifyError("Enter a valid 6-digit code.")
        return
      }
      setBusy(true)
      setVerifyError("")
      try {
        const res = await authApi.twoFactorConfirm(clean)
        const rawUser = userFromTwoFactorPayload(res)
        if (rawUser) {
          updateUser(normalizeAuthUser(rawUser))
        } else {
          const me = await authApi.me()
          updateUser(normalizeAuthUser(me.user))
        }
        closeSetup(false)
      } catch (e) {
        setVerifyError(e instanceof Error ? e.message : "Verification failed.")
      } finally {
        setBusy(false)
      }
      return
    }

    if (!pendingSecret) return
    setVerifyError("")
    if (!verifyTotpCode(pendingSecret, otpInput)) {
      setVerifyError("Invalid code. Check the time on your phone and try a new code.")
      return
    }
    saveTotpSecret(user.id, pendingSecret)
    updateUser({ twoFactorEnabled: true })
    setHasLocalSecret(true)
    closeSetup(false)
  }

  async function handleDisableRemote() {
    const clean = disableOtpInput.replace(/\s/g, "")
    if (clean.length !== 6) {
      setVerifyError("Enter your current 6-digit code to disable 2FA.")
      return
    }
    setBusy(true)
    setVerifyError("")
    try {
      const res = await authApi.twoFactorDisable({ code: clean })
      const rawUser = userFromTwoFactorPayload(res)
      if (rawUser) {
        updateUser(normalizeAuthUser(rawUser))
      } else {
        const me = await authApi.me()
        updateUser(normalizeAuthUser(me.user))
      }
      setDisableOpen(false)
      setDisableOtpInput("")
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Could not disable 2FA.")
    } finally {
      setBusy(false)
    }
  }

  function handleDisableLocal() {
    setBusy(true)
    try {
      clearTotpSecret(user.id)
      updateUser({ twoFactorEnabled: false })
      setHasLocalSecret(false)
      setDisableOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4 rounded-xl bg-muted p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">Authenticator App</p>
            {enabled ? (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                On
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {remote
              ? "Managed by your account on the MyScriptic API (run migrations so 2FA columns exist)."
              : "Demo mode: secret stays in this browser only."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          disabled={busy}
          onClick={() =>
            enabled ? setDisableOpen(true) : remote ? void openSetupRemote() : openSetupLocal()
          }
        >
          <Shield size={13} />
          {enabled ? "Disable 2FA" : "Enable 2FA"}
        </Button>
      </div>

      {verifyError && !setupOpen && !disableOpen ? (
        <p className="text-sm text-destructive mt-2">{verifyError}</p>
      ) : null}

      <Dialog open={setupOpen} onOpenChange={closeSetup}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up authenticator</DialogTitle>
            <DialogDescription>
              Scan the QR code or enter the secret in Google Authenticator, Authy, or another TOTP
              app. Then enter the 6-digit code to confirm.
            </DialogDescription>
          </DialogHeader>

          {pendingSecret || pendingOtpauthUri ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- external QR data URL service */}
                <img
                  src={qrSrc}
                  alt="QR code for authenticator setup"
                  width={200}
                  height={200}
                  className="rounded-lg border border-border bg-white p-2"
                />
                <p className="text-center text-[10px] text-muted-foreground">
                  QR loads from api.qrserver.com (setup only).
                </p>
              </div>

              {pendingSecret ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Secret key (manual entry)</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={pendingSecret} className="font-mono text-xs" />
                    <Button type="button" variant="secondary" size="icon" onClick={() => void copySecret()}>
                      {copied ? <CheckCircle size={16} className="text-green-600" /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="totp-verify">6-digit code</Label>
                <Input
                  id="totp-verify"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="000000"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="font-mono tracking-widest"
                />
              </div>

              {verifyError ? <p className="text-sm text-destructive">{verifyError}</p> : null}
            </div>
          ) : (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => closeSetup(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-brand text-primary-foreground hover:bg-brand-dark"
              disabled={
                busy ||
                (!remote && !pendingSecret) ||
                (remote && !pendingSecret && !pendingOtpauthUri) ||
                otpInput.length !== 6
              }
              onClick={() => void handleVerify()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={disableOpen}
        onOpenChange={open => {
          setDisableOpen(open)
          if (!open) {
            setDisableOtpInput("")
            setVerifyError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable two-factor authentication?</DialogTitle>
            <DialogDescription>
              {remote
                ? "Enter a valid code from your authenticator app to confirm."
                : "You can turn it on again anytime from this page. Your account will rely on your password only until you re-enable 2FA."}
            </DialogDescription>
          </DialogHeader>
          {remote ? (
            <div className="space-y-1.5 py-2">
              <Label htmlFor="totp-disable">6-digit code</Label>
              <Input
                id="totp-disable"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="000000"
                value={disableOtpInput}
                onChange={e =>
                  setDisableOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="font-mono tracking-widest"
              />
              {verifyError ? <p className="text-sm text-destructive">{verifyError}</p> : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || (remote && disableOtpInput.replace(/\s/g, "").length !== 6)}
              onClick={() => (remote ? void handleDisableRemote() : handleDisableLocal())}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
