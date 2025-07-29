import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "f23a3bc54b037ba34e766976db3a7cf5953ae91633c8ba9a96e09a7aa490e9e47e3b6a82070078c88000789d2cdcf0b48f50d060c8fdabe96692da92875cebc4y"

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
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}
