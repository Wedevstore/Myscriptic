import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Press",
  description: "MyScriptic press room — media coverage, press releases, and brand assets for journalists and partners.",
}
export default function PressLayout({ children }: { children: React.ReactNode }) { return children }
