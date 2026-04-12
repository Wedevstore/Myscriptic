/**
 * Error reporting facade — swap the implementation when wiring Sentry, LogRocket, etc.
 *
 * Usage:
 *   import { captureException } from "@/lib/error-reporting"
 *   captureException(error)
 */

interface ErrorContext {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  user?: { id?: string; email?: string }
}

export function captureException(error: unknown, context?: ErrorContext) {
  // When Sentry is installed, replace with:
  //   Sentry.captureException(error, { tags: context?.tags, extra: context?.extra })

  if (process.env.NODE_ENV !== "production") return

  // Production: log to the console as a structured error for Vercel log drain
  try {
    const payload = {
      level: "error",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
      timestamp: new Date().toISOString(),
    }
    // eslint-disable-next-line no-console
    console.error("[MyScriptic:Error]", JSON.stringify(payload))
  } catch {
    // swallow — never let error reporting crash the app
  }
}

export function captureMessage(message: string, context?: ErrorContext) {
  if (process.env.NODE_ENV !== "production") return
  try {
    const payload = { level: "info", message, ...context, timestamp: new Date().toISOString() }
    // eslint-disable-next-line no-console
    console.info("[MyScriptic:Info]", JSON.stringify(payload))
  } catch { /* noop */ }
}
