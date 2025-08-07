import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Payment from "@/lib/models/Payment"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const { confirmacion } = await request.json()

    if (confirmacion !== "CONFIRMAR_CANCELACION") {
      return NextResponse.json({ error: "Confirmación requerida" }, { status: 400 })
    }

    const payment = await Payment.findById(params.id)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.montoPagado === 0) {
      return NextResponse.json({ error: "No hay pagos para cancelar" }, { status: 400 })
    }

    // Cancelar todos los pagos
    payment.historialPagos = []
    payment.montoPagado = 0
    payment.saldoPendiente = payment.montoTotal
    payment.estado = "Pendiente"
    payment.noReclama = false // Reset no reclama al cancelar

    await payment.save()

    return NextResponse.json({
      message: "Pagos cancelados exitosamente",
      payment,
    })
  } catch (error) {
    console.error("Cancel payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
