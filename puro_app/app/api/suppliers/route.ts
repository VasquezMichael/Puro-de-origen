import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Supplier from "@/lib/models/Supplier"
import { authenticateRequest, enforceSameOrigin } from "@/lib/request-security"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.authenticated) return auth.response

  try {
    await dbConnect()
    const suppliers = await Supplier.find({}).sort({ createdAt: -1 })
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("Get suppliers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.authenticated) return auth.response
  const originError = enforceSameOrigin(request)
  if (originError) return originError

  try {
    await dbConnect()

    const data = await request.json()
    const supplier = await Supplier.create(data)

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Create supplier error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
