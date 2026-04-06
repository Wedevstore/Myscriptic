import { wishlistApi } from "@/lib/api"
import { apiUrlConfigured, laravelAuthEnabled } from "@/lib/auth-mode"
import { wishlistStore } from "@/lib/wishlist-store"

/** Merge server list with localStorage and push local-only ids to the API. */
export async function syncWishlistWithServer(): Promise<void> {
  if (!apiUrlConfigured() || !laravelAuthEnabled()) return

  const res = await wishlistApi.list()
  const server = (res.data as unknown[]).filter((x): x is string => typeof x === "string")
  const local = wishlistStore.getIds()
  const union = [...new Set([...server, ...local])]
  wishlistStore.replaceIds(union)

  await Promise.all(
    local.filter(id => !server.includes(id)).map(id => wishlistApi.add(id).catch(() => {}))
  )
}
