/** Internal navigation target from `?next=` — allows path + query; rejects scheme-relative URLs. */
export function safeInternalPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/"
  return raw
}
