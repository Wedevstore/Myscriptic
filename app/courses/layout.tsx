import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Video courses",
  description:
    "Learn from MyScriptic authors. Each lesson streams from YouTube or Vimeo — no video files hosted on our servers.",
}

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children
}
