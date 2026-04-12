import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Store",
  description: "Shop eBooks on MyScriptic — buy once, read forever. Browse featured titles, bestsellers, and new releases.",
}
export default function StoreLayout({ children }: { children: React.ReactNode }) { return children }
