"use client"

/**
 * app/global-error.tsx — Root-level error boundary.
 * Catches errors that break the root layout itself.
 * Must render its own <html> and <body> since the root layout is unusable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#111" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#c0392b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
            !
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#666", maxWidth: 420, marginBottom: 8 }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#999", fontFamily: "monospace", marginBottom: 24 }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
