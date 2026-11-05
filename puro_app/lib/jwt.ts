export interface AuthTokenPayload {
  userId: string
  iat?: number
  exp: number
}

export type UserExists = (userId: string) => Promise<boolean>

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function parseSegment(value: string): unknown {
  return JSON.parse(decoder.decode(decodeBase64Url(value)))
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength)
  copy.set(value)
  return copy.buffer
}

export async function verifyAuthToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<AuthTokenPayload | null> {
  if (!token || !secret) return null

  try {
    const segments = token.split(".")
    if (segments.length !== 3) return null

    const [encodedHeader, encodedPayload, encodedSignature] = segments
    const header = parseSegment(encodedHeader)
    const payload = parseSegment(encodedPayload)

    if (
      typeof header !== "object" ||
      header === null ||
      (header as { alg?: unknown }).alg !== "HS256" ||
      ((header as { typ?: unknown }).typ !== undefined && (header as { typ?: unknown }).typ !== "JWT")
    ) {
      return null
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as { userId?: unknown }).userId !== "string" ||
      !(payload as { userId: string }).userId.trim() ||
      typeof (payload as { exp?: unknown }).exp !== "number" ||
      !Number.isFinite((payload as { exp: number }).exp) ||
      (payload as { exp: number }).exp <= nowSeconds
    ) {
      return null
    }

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      toArrayBuffer(decodeBase64Url(encodedSignature)),
      encoder.encode(`${encodedHeader}.${encodedPayload}`),
    )

    return isValid ? (payload as AuthTokenPayload) : null
  } catch {
    return null
  }
}

export async function verifyAuthTokenFromEnv(token: string): Promise<AuthTokenPayload | null> {
  const secret = process.env.JWT_SECRET
  return secret ? verifyAuthToken(token, secret) : null
}

export async function authenticateSession(
  token: string,
  userExists: UserExists,
): Promise<AuthTokenPayload | null> {
  const payload = await verifyAuthTokenFromEnv(token)
  if (!payload || !(await userExists(payload.userId))) return null
  return payload
}
