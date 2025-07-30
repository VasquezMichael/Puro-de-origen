import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Sucursal from "@/lib/models/Sucursal"
import Payment from "@/lib/models/Payment"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const data = await request.json()
    const sucursal = await Sucursal.findByIdAndUpdate(params.id, data, { new: true, runValidators: true })

    if (!sucursal) {
      return NextResponse.json({ error: "Sucursal not found" }, { status: 404 })
    }

    // Si se cambió el nombre, actualizar en todas las facturas
    if (data.nombre && data.nombre !== sucursal.nombre) {
      await Payment.updateMany({ sucursalId: params.id }, { sucursalNombre: data.nombre })
    }

    return NextResponse.json(sucursal)
  } catch (error) {
    console.error("Update sucursal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    // Verificar si hay facturas usando esta sucursal
    const paymentsCount = await Payment.countDocuments({ sucursalId: params.id })
    if (paymentsCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar la sucursal porque tiene ${paymentsCount} facturas asociadas` },
        { status: 400 },
      )
    }

    const sucursal = await Sucursal.findByIdAndDelete(params.id)

    if (!sucursal) {
      return NextResponse.json({ error: "Sucursal not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Sucursal deleted successfully" })
  } catch (error) {
    console.error("Delete sucursal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
