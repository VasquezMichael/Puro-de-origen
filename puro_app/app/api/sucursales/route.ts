import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Sucursal from "@/lib/models/Sucursal"

export async function GET() {
  try {
    await dbConnect()
    const sucursales = await Sucursal.find({}).sort({ createdAt: -1 })
    return NextResponse.json(sucursales)
  } catch (error) {
    console.error("Get sucursales error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const data = await request.json()

    // Verificar que no exista una sucursal con el mismo nombre
    const existingSucursal = await Sucursal.findOne({ nombre: data.nombre })
    if (existingSucursal) {
      return NextResponse.json({ error: "Ya existe una sucursal con ese nombre" }, { status: 400 })
    }

    const sucursal = await Sucursal.create(data)
    return NextResponse.json(sucursal, { status: 201 })
  } catch (error) {
    console.error("Create sucursal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
