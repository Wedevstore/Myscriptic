import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Audiobooks",
  description: "Listen to audiobooks on MyScriptic — immerse yourself in stories narrated by professional voice artists.",
}
export default function AudiobooksLayout({ children }: { children: React.ReactNode }) { return children }
