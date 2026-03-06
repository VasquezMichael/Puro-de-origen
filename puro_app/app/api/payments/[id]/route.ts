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

    const shouldRecalculate =
      data.montoPagado !== undefined ||
      data.montoTotal !== undefined ||
      data.tipoDocumento !== undefined ||
      data.estado !== undefined

    // Recalculate saldo pendiente and estado
    if (shouldRecalculate) {
      const current = await Payment.findById(params.id)
      if (!current) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      data.tipoDocumento = data.tipoDocumento ?? current.tipoDocumento
      data.montoTotal = data.montoTotal ?? current.montoTotal
      data.montoPagado = data.montoPagado ?? current.montoPagado

      if (data.tipoDocumento === "Nota de Credito") {
        if (data.montoTotal >= 0) {
          return NextResponse.json(
            { error: "Para Nota de Credito el montoTotal debe ser negativo" },
            { status: 400 },
          )
        }
        data.montoPagado = 0
        if (data.estado && data.estado !== "Pendiente" && data.estado !== "Cobrado") {
          return NextResponse.json(
            { error: "Para Nota de Credito el estado debe ser Pendiente o Cobrado" },
            { status: 400 },
          )
        }
      } else if (data.montoTotal < 0) {
        return NextResponse.json(
          { error: "Solo Nota de Credito permite montoTotal negativo" },
          { status: 400 },
        )
      } else if (data.estado === "Cobrado") {
        return NextResponse.json(
          { error: "El estado Cobrado solo aplica a Nota de Credito" },
          { status: 400 },
        )
      }

      if (data.tipoDocumento === "Nota de Credito") {
        const estadoNotaCredito = data.estado ?? current.estado
        if (estadoNotaCredito === "Cobrado") {
          data.estado = "Cobrado"
          data.saldoPendiente = 0
        } else {
          data.estado = "Pendiente"
          data.saldoPendiente = data.montoTotal
        }
      } else if (data.montoPagado === 0) {
        data.saldoPendiente = data.montoTotal - data.montoPagado
        data.estado = "Pendiente"
      } else if (data.montoPagado >= data.montoTotal) {
        data.saldoPendiente = data.montoTotal - data.montoPagado
        data.estado = "Pagado"
      } else {
        data.saldoPendiente = data.montoTotal - data.montoPagado
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
