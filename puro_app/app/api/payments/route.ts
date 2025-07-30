import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Payment from "@/lib/models/Payment"
import Supplier from "@/lib/models/Supplier"
import Sucursal from "@/lib/models/Sucursal"

export async function GET() {
  try {
    await dbConnect()
    const payments = await Payment.find({}).sort({ createdAt: -1 })
    return NextResponse.json(payments)
  } catch (error) {
    console.error("Get payments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const data = await request.json()

    // Get supplier name
    const supplier = await Supplier.findById(data.supplierId)
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    // Get sucursal name
    const sucursal = await Sucursal.findById(data.sucursalId)
    if (!sucursal) {
      return NextResponse.json({ error: "Sucursal not found" }, { status: 404 })
    }

    // Calculate saldo pendiente
    const saldoPendiente = data.montoTotal - (data.montoPagado || 0)

    const payment = await Payment.create({
      ...data,
      supplierName: supplier.nombre,
      sucursalNombre: sucursal.nombre,
      saldoPendiente,
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Create payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
