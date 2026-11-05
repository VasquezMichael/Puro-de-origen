import { type NextRequest, NextResponse } from "next/server"
import { authenticateSession, type UserExists, verifyAuthTokenFromEnv } from "@/lib/jwt"

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

  const userExists = options.userExists || defaultUserExists
  const payload = options.checkUser === false
    ? await verifyAuthTokenFromEnv(token)
    : await authenticateSession(token, userExists)
  if (!payload) return { authenticated: false, response: unauthorizedResponse() }

  return { authenticated: true, userId: payload.userId }
}

export function enforceSameOrigin(request: NextRequest): NextResponse | null {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null

  const origin = request.headers.get("origin")
  const configuredOrigins = [process.env.APP_ORIGIN, process.env.URL, process.env.DEPLOY_PRIME_URL]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => {
      try {
        const parsed = new URL(value)
        return parsed.protocol === "http:" || parsed.protocol === "https:" ? [parsed.origin] : []
      } catch {
        return []
      }
    })

  if (configuredOrigins.length === 0 && process.env.NODE_ENV !== "production") {
    const host = request.headers.get("host")
    if (host) configuredOrigins.push(`${request.nextUrl.protocol}//${host}`)
    configuredOrigins.push(request.nextUrl.origin)
  }

  try {
    const originUrl = origin ? new URL(origin) : null
    const netlifySiteName = process.env.SITE_NAME?.toLowerCase()
    const isTrustedNetlifyPreview = Boolean(
      originUrl &&
      netlifySiteName &&
      originUrl.protocol === "https:" &&
      new RegExp(`^deploy-preview-\\d+--${netlifySiteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.netlify\\.app$`)
        .test(originUrl.hostname.toLowerCase()),
    )

    if (!originUrl || (!configuredOrigins.includes(originUrl.origin) && !isTrustedNetlifyPreview)) {
      return forbiddenResponse("Invalid request origin")
    }
  } catch {
    return forbiddenResponse("Invalid request origin")
  }

  return null
}
