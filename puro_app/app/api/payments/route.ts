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
    const idFactura = typeof data.idFactura === "string" ? data.idFactura.trim() : ""

    // Si viene vacio, dejamos que el schema genere uno automatico.
    if (!idFactura) {
      delete data.idFactura
    } else {
      data.idFactura = idFactura
    }

    // Get supplier name - usar nombreSistema en lugar de nombre
    const supplier = await Supplier.findById(data.supplierId)
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    // Get sucursal name
    let sucursal
    if (data.sucursalId === "__TODAS__") {
      sucursal = await getOrCreateGeneralSucursal()
      data.sucursalId = sucursal._id
    } else {
      sucursal = await Sucursal.findById(data.sucursalId)
      if (!sucursal) {
        return NextResponse.json({ error: "Sucursal not found" }, { status: 404 })
      }
    }

    // Calculate saldo pendiente
    if (data.tipoDocumento === "Nota de Credito") {
      if (data.montoTotal >= 0) {
        return NextResponse.json(
          { error: "Para Nota de Credito el montoTotal debe ser negativo" },
          { status: 400 },
        )
      }
      data.montoPagado = 0
      data.estado = "Pendiente"
      data.noReclama = false
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

    const saldoPendiente = data.montoTotal - (data.montoPagado || 0)

    const payment = await Payment.create({
      ...data,
      supplierName: supplier.nombreSistema, // Cambiar de supplier.nombre a supplier.nombreSistema
      sucursalNombre: sucursal.nombre,
      saldoPendiente,
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Create payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
