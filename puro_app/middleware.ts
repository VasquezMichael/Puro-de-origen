import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAuthTokenFromEnv } from "@/lib/jwt"

function loginRedirect(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/login", request.url))
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })
  return response
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  const payload = token ? await verifyAuthTokenFromEnv(token) : null
  const authenticated = Boolean(payload)

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    return authenticated ? NextResponse.next() : loginRedirect(request)
  }

  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL(authenticated ? "/dashboard" : "/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
}
