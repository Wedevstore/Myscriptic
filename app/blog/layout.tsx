import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Blog",
  description: "News, updates, and insights from the MyScriptic team — tips for authors, reading recommendations, and platform updates.",
}
export default function BlogLayout({ children }: { children: React.ReactNode }) { return children }
