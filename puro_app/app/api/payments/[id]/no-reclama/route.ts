import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Payment from "@/lib/models/Payment"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const { noReclama } = await request.json()

    const payment = await Payment.findById(params.id)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    payment.noReclama = noReclama

    await payment.save()

    return NextResponse.json({
      message: `Factura marcada como ${noReclama ? "no reclama" : "reclama"}`,
      payment,
    })
  } catch (error) {
    console.error("Update no reclama error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
