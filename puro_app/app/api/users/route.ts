import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/lib/User"
import { hashPassword } from "@/lib/auth"

export async function GET() {
  try {
    await dbConnect()
    const users = await User.find({}).select("-password").sort({ createdAt: -1 })
    return NextResponse.json(users)
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await User.create({
      username,
      password: hashedPassword,
    })

    return NextResponse.json(
      {
        message: "User created successfully",
        user: { id: user._id, username: user.username },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
