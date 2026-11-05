import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required")
  }

  return secret
}

export async function hashPassword(password: string): Promise<string> {
  console.log("🔐 Hashing password...")
  const hash = await bcrypt.hash(password, 12)
  console.log("✅ Password hashed successfully")
  return hash
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hashedPassword)
    return isValid
  } catch (error) {
    console.error("💥 Password verification error:", error)
    return false
  }
}

export function generateToken(userId: string): string {
  console.log("🎫 Generating token for user:", userId)
  return jwt.sign({ userId }, getJwtSecret(), { algorithm: "HS256", expiresIn: "7d" })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as { userId: string }
  } catch {
    return null
  }
}
