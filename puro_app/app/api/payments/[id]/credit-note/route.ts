import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Payment from "@/lib/models/Payment"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const { cobrado } = await request.json()
    if (typeof cobrado !== "boolean") {
      return NextResponse.json({ error: "El campo cobrado debe ser booleano" }, { status: 400 })
    }

    const payment = await Payment.findById(params.id)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.tipoDocumento !== "Nota de Credito") {
      return NextResponse.json(
        { error: "Esta accion solo aplica a Nota de Credito" },
        { status: 400 },
      )
    }

    payment.montoPagado = 0
    payment.historialPagos = []
    payment.noReclama = false

    if (cobrado) {
      payment.estado = "Cobrado"
      payment.saldoPendiente = 0
    } else {
      payment.estado = "Pendiente"
      payment.saldoPendiente = payment.montoTotal
    }

    await payment.save()

    return NextResponse.json({
      message: `Nota de Credito marcada como ${cobrado ? "cobrada" : "pendiente"}`,
      payment,
    })
  } catch (error) {
    console.error("Update credit note status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
