import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  console.log("🛡️ Middleware executing for:", request.nextUrl.pathname)

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth-token")?.value
    console.log("🔍 Checking auth token:", token ? "exists" : "missing")

    if (!token) {
      console.log("❌ No token found, redirecting to login")
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Simple token validation (you can make this more robust)
    try {
      // For now, just check if token exists
      console.log("✅ Token found, allowing access to dashboard")
      return NextResponse.next()
    } catch (error) {
      console.log("❌ Invalid token, redirecting to login")
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Redirect root to login if not authenticated
  if (request.nextUrl.pathname === "/") {
    const token = request.cookies.get("auth-token")?.value

    if (token) {
      console.log("✅ User authenticated, redirecting to dashboard")
      return NextResponse.redirect(new URL("/dashboard", request.url))
    } else {
      console.log("❌ User not authenticated, redirecting to login")
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
}
