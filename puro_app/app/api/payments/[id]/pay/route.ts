import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Payment from "@/lib/Payment"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const { monto, fechaPago, formaPago } = await request.json()

    if (!monto || !fechaPago || !formaPago) {
      return NextResponse.json({ error: "Monto, fecha de pago y forma de pago son requeridos" }, { status: 400 })
    }

    const payment = await Payment.findById(params.id)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Add payment to history
    payment.historialPagos.push({
      fechaPago: new Date(fechaPago),
      monto: Number.parseFloat(monto),
      formaPago,
    })

    // Update totals
    payment.montoPagado += Number.parseFloat(monto)
    payment.saldoPendiente = payment.montoTotal - payment.montoPagado

    // Update status
    if (payment.montoPagado >= payment.montoTotal) {
      payment.estado = "Pagado"
      payment.saldoPendiente = 0
    } else if (payment.montoPagado > 0) {
      payment.estado = "Parcialmente Pagado"
    }

    await payment.save()

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Process payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
