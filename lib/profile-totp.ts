import { generateSecret, generateURI, verifySync } from "otplib"

const STORAGE_PREFIX = "myscriptic_totp_secret_v1_"

export function totpStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

export function saveTotpSecret(userId: string, secret: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(totpStorageKey(userId), secret)
}

export function loadTotpSecret(userId: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(totpStorageKey(userId))
}

export function clearTotpSecret(userId: string): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(totpStorageKey(userId))
}

export function generateTotpSecret(): string {
  return generateSecret()
}

/** otpauth URI for Google Authenticator, Authy, etc. */
export function buildTotpKeyUri(accountLabel: string, secret: string): string {
  return generateURI({
    issuer: "MyScriptic",
    label: accountLabel,
    secret,
  })
}

export function verifyTotpCode(secret: string, token: string): boolean {
  const clean = token.replace(/\s/g, "")
  if (!/^\d{6}$/.test(clean)) return false
  return verifySync({ secret, token: clean }).valid
}
