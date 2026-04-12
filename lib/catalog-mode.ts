import { apiUrlConfigured } from "@/lib/auth-mode"

/**
 * When `NEXT_PUBLIC_API_URL` is set, catalog/list UIs should not substitute
 * `MOCK_BOOKS` for empty or failed API responses (avoids demo data in production).
 */
export function allowMockCatalogFallback(): boolean {
  return !apiUrlConfigured()
}
