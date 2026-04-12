import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Sales & Deals",
  description: "Find the best eBook deals and discounts on MyScriptic. Limited-time offers and coupon codes for avid readers.",
}
export default function SalesLayout({ children }: { children: React.ReactNode }) { return children }
