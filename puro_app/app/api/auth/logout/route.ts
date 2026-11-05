import { type NextRequest, NextResponse } from "next/server"
import { enforceSameOrigin } from "@/lib/request-security"

export async function POST(request: NextRequest) {
  const originError = enforceSameOrigin(request)
  if (originError) return originError

  const response = NextResponse.json({ message: "Logout successful" })
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  })
  return response
}
