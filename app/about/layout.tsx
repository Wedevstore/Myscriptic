import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about MyScriptic — our mission, team, and the story behind the platform for readers and authors worldwide.",
}
export default function AboutLayout({ children }: { children: React.ReactNode }) { return children }
