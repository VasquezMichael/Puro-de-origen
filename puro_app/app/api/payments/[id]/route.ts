import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Payment from "@/lib/models/Payment"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const data = await request.json()

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
