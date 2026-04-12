import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Authors",
  description: "Discover talented authors on MyScriptic. Browse profiles, follow your favorites, and explore their published works.",
}
export default function AuthorsLayout({ children }: { children: React.ReactNode }) { return children }
