import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the MyScriptic team. We're here to help with questions about your account, orders, or partnerships.",
}
export default function ContactLayout({ children }: { children: React.ReactNode }) { return children }
