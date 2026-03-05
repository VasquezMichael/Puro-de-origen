import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Payment from "@/lib/models/Payment"
import Supplier from "@/lib/models/Supplier"
import Sucursal from "@/lib/models/Sucursal"

async function getOrCreateGeneralSucursal() {
  let sucursal = await Sucursal.findOne({ nombre: "Todas" })
  if (!sucursal) {
    sucursal = await Sucursal.create({
      nombre: "Todas",
      direccion: "Gasto general distribuido",
      activa: false,
    })
  }
  return sucursal
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const data = await request.json()

    if (data.supplierId) {
      const supplier = await Supplier.findById(data.supplierId)
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
      }
      data.supplierName = supplier.nombreSistema
    }

    if (data.sucursalId) {
      let sucursal
      if (data.sucursalId === "__TODAS__") {
        sucursal = await getOrCreateGeneralSucursal()
        data.sucursalId = sucursal._id
      } else {
        sucursal = await Sucursal.findById(data.sucursalId)
      }

      if (!sucursal) {
        return NextResponse.json({ error: "Sucursal not found" }, { status: 404 })
      }
      data.sucursalNombre = sucursal.nombre
    }

    // Recalculate saldo pendiente and estado
    if (data.montoPagado !== undefined) {
      data.saldoPendiente = data.montoTotal - data.montoPagado

      if (data.montoPagado === 0) {
        data.estado = "Pendiente"
      } else if (data.montoPagado >= data.montoTotal) {
        data.estado = "Pagado"
      } else {
        data.estado = "Parcialmente Pagado"
      }
    }

    const payment = await Payment.findByIdAndUpdate(params.id, data, { new: true, runValidators: true })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Update payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🗑️ Attempting to delete payment:", params.id)
    await dbConnect()

    const payment = await Payment.findByIdAndDelete(params.id)

    if (!payment) {
      console.log("❌ Payment not found:", params.id)
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    console.log("✅ Payment deleted successfully:", payment.idFactura)
    return NextResponse.json({ message: "Payment deleted successfully", deletedPayment: payment })
  } catch (error) {
    console.error("💥 Delete payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
