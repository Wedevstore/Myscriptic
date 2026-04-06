import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

/** Fallback when `NEXT_PUBLIC_SITE_URL` is unset (must match production canonical). */
const DEFAULT_SITE_URL = "https://www.myscriptic.com"

function resolveMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return new URL(DEFAULT_SITE_URL)
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw)
  const candidate = hasScheme
    ? raw
    : /^localhost(:\d+)?$/i.test(raw) || /^127\.0\.0\.1(:\d+)?$/.test(raw)
      ? `http://${raw}`
      : `https://${raw}`
  try {
    return new URL(candidate)
  } catch {
    return new URL(DEFAULT_SITE_URL)
  }
}

const resolvedMetadataBase = resolveMetadataBase()

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: resolvedMetadataBase,
  title: {
    default: 'MyScriptic — Read, Discover & Earn',
    template: '%s | MyScriptic',
  },
  description:
    'MyScriptic is a hybrid eBook platform combining Wattpad-style discovery, Kindle-style store, and a subscription system for readers and authors worldwide.',
  keywords: ['ebooks', 'audiobooks', 'reading', 'authors', 'subscription', 'MyScriptic'],
  authors: [{ name: 'MyScriptic' }],
  creator: 'MyScriptic',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: resolvedMetadataBase.href.replace(/\/$/, ""),
    siteName: 'MyScriptic',
    title: 'MyScriptic — Read, Discover & Earn',
    description: 'Discover millions of ebooks, audiobooks & stories. Subscribe or buy once.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyScriptic — Read, Discover & Earn',
    description: 'Discover millions of ebooks, audiobooks & stories.',
    creator: '@myscriptic',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFBF5' },
    { media: '(prefers-color-scheme: dark)',  color: '#0E0F1A' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
