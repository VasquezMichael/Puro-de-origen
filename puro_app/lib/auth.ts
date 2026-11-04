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
  console.log("🔍 Verifying password...")
  console.log("Password length:", password.length)
  console.log("Hash length:", hashedPassword.length)
  console.log("Hash starts with:", hashedPassword.substring(0, 10))

  try {
    const isValid = await bcrypt.compare(password, hashedPassword)
    console.log("🔍 Password verification result:", isValid)
    return isValid
  } catch (error) {
    console.error("💥 Password verification error:", error)
    return false
  }
}

export function generateToken(userId: string): string {
  console.log("🎫 Generating token for user:", userId)
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: "7d" })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string }
  } catch {
    return null
  }
}
