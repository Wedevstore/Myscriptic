import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/checkout", "/orders", "/library", "/wishlist", "/invoice"]
const AUTH_COOKIE = "myscriptic_auth"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const hasToken =
    request.cookies.has(AUTH_COOKIE) ||
    request.headers.get("authorization")?.startsWith("Bearer ") ||
    request.cookies.has("myscriptic_token")

  if (!hasToken) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/library/:path*",
    "/wishlist/:path*",
    "/invoice/:path*",
  ],
}
