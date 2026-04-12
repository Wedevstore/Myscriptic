import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Browse Books",
  description: "Browse thousands of eBooks across fiction, non-fiction, technology, business, and more. Filter by category, format, and price.",
}
export default function BooksLayout({ children }: { children: React.ReactNode }) { return children }
