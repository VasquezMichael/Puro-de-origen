import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/lib/models/User"
import { verifyPassword, generateToken } from "@/lib/auth"
import { enforceSameOrigin } from "@/lib/request-security"

export async function POST(request: NextRequest) {
  const originError = enforceSameOrigin(request)
  if (originError) return originError

  try {
    console.log("🔐 Login attempt started")
    await dbConnect()
    console.log("✅ Database connected")

    const { username, password } = await request.json()
    console.log("📝 Login data received:", { username, passwordLength: password?.length })

    if (!username || !password) {
      console.log("❌ Missing credentials")
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    console.log("🔍 Searching for user:", username)
    const user = await User.findOne({ username })

    if (!user) {
      console.log("❌ User not found:", username)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("✅ User found:", { id: user._id, username: user.username })
    console.log("🔑 Verifying password...")

    const isValidPassword = await verifyPassword(password, user.password)
    console.log("🔑 Password verification result:", isValidPassword)

    if (!isValidPassword) {
      console.log("❌ Invalid password for user:", username)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("✅ Password verified, generating token...")
    const token = generateToken(user._id.toString())
    console.log("✅ Token generated successfully")

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: { id: user._id, username: user.username },
      },
      { status: 200 },
    )

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    console.log("✅ Login successful for user:", username)
    return response
  } catch (error) {
    console.error("💥 Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
