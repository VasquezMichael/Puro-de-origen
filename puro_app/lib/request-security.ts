import { type NextRequest, NextResponse } from "next/server"
import { verifyAuthTokenFromEnv } from "@/lib/jwt"

type UserExists = (userId: string) => Promise<boolean>

export type AuthenticationResult =
  | { authenticated: true; userId: string }
  | { authenticated: false; response: NextResponse }

async function defaultUserExists(userId: string): Promise<boolean> {
  try {
    const [{ default: dbConnect }, { default: User }] = await Promise.all([
      import("@/lib/mongodb"),
      import("@/lib/models/User"),
    ])
    await dbConnect()
    return Boolean(await User.exists({ _id: userId }))
  } catch {
    return false
  }
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbiddenResponse(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function authenticateRequest(
  request: NextRequest,
  options: { checkUser?: boolean; userExists?: UserExists } = {},
): Promise<AuthenticationResult> {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return { authenticated: false, response: unauthorizedResponse() }

  const payload = await verifyAuthTokenFromEnv(token)
  if (!payload) return { authenticated: false, response: unauthorizedResponse() }

  if (options.checkUser !== false) {
    const userExists = options.userExists || defaultUserExists
    if (!(await userExists(payload.userId))) {
      return { authenticated: false, response: unauthorizedResponse() }
    }
  }

  return { authenticated: true, userId: payload.userId }
}

export function enforceSameOrigin(request: NextRequest): NextResponse | null {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null

  const origin = request.headers.get("origin")
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const requestHost = forwardedHost || request.headers.get("host")
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const requestProtocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "")

  try {
    const originUrl = origin ? new URL(origin) : null
    if (!originUrl || originUrl.host !== requestHost || originUrl.protocol !== `${requestProtocol}:`) {
      return forbiddenResponse("Invalid request origin")
    }
  } catch {
    return forbiddenResponse("Invalid request origin")
  }

  return null
}
