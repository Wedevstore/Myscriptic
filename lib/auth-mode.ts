function envTruthy(v: string | undefined): boolean {
  return v === "true" || v === "1"
}

function envFalsey(v: string | undefined): boolean {
  return v === "false" || v === "0"
}

/** True when the SPA targets a real API base (`NEXT_PUBLIC_API_URL`), not the bundled default. */
export function apiUrlConfigured(): boolean {
  const u = process.env.NEXT_PUBLIC_API_URL?.trim()
  return Boolean(u && u.length > 0)
}

/**
 * When true, AuthProvider uses Laravel Sanctum via {@link ./api.ts}.
 * Defaults on when `NEXT_PUBLIC_API_URL` is set; override with `NEXT_PUBLIC_USE_LARAVEL_AUTH=false`.
 */
export function laravelAuthEnabled(): boolean {
  if (envFalsey(process.env.NEXT_PUBLIC_USE_LARAVEL_AUTH)) return false
  if (envTruthy(process.env.NEXT_PUBLIC_USE_LARAVEL_AUTH)) return true
  return apiUrlConfigured()
}

/**
 * When true, store / cart / checkout / order success use Laravel Phase 2 marketplace APIs.
 * Defaults on with Laravel auth URL; override with `NEXT_PUBLIC_USE_LARAVEL_PHASE2=false`.
 */
export function laravelPhase2Enabled(): boolean {
  if (envFalsey(process.env.NEXT_PUBLIC_USE_LARAVEL_PHASE2)) return false
  if (envTruthy(process.env.NEXT_PUBLIC_USE_LARAVEL_PHASE2)) return true
  return laravelAuthEnabled()
}

/** Subscription pool, engagement sync, subscription catalog (requires Laravel auth). */
export function laravelPhase3Enabled(): boolean {
  if (envFalsey(process.env.NEXT_PUBLIC_USE_LARAVEL_PHASE3)) return false
  if (envTruthy(process.env.NEXT_PUBLIC_USE_LARAVEL_PHASE3)) return true
  return laravelAuthEnabled()
}
