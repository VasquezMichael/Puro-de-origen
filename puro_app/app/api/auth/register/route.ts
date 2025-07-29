import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/lib/User"
import { hashPassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("📝 Registration attempt started")
    await dbConnect()
    console.log("✅ Database connected for registration")

    const { username, password } = await request.json()
    console.log("📝 Registration data received:", { username, passwordLength: password?.length })

    if (!username || !password) {
      console.log("❌ Missing registration credentials")
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      console.log("❌ Password too short")
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Check if user already exists
    console.log("🔍 Checking if user exists:", username)
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      console.log("❌ User already exists:", username)
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    console.log("🔐 Hashing password for registration...")
    const hashedPassword = await hashPassword(password)
    console.log("✅ Password hashed, creating user...")

    const user = await User.create({
      username,
      password: hashedPassword,
    })

    console.log("✅ User created successfully:", { id: user._id, username: user.username })

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: user._id, username: user.username },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("💥 Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
