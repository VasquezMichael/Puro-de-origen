import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Supplier from "@/lib/Supplier"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const data = await request.json()
    const supplier = await Supplier.findByIdAndUpdate(params.id, data, { new: true, runValidators: true })

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Update supplier error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const supplier = await Supplier.findByIdAndDelete(params.id)

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Supplier deleted successfully" })
  } catch (error) {
    console.error("Delete supplier error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
