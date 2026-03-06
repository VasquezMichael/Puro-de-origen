import mongoose from "mongoose"

export interface IPayment extends mongoose.Document {
  idFactura: string
  supplierId: mongoose.Types.ObjectId
  supplierName: string
  sucursalId: mongoose.Types.ObjectId
  sucursalNombre: string
  fechaRemito: Date
  fechaRecepcion: Date
  tipoDocumento: "Factura A" | "Factura B" | "Factura C" | "Remito" | "Nota de Credito"
  tipoGasto: "Mercaderia" | "Cocina" | "Reparaciones" | "Inversion" | "Oficina" | "Otros"
  descripcion: string
  montoTotal: number
  montoPagado: number
  saldoPendiente: number
  estado: "Pendiente" | "Pagado" | "Parcialmente Pagado" | "Cobrado"
  noReclama: boolean
  historialPagos: Array<{
    fechaPago: Date
    monto: number
    formaPago: "Efectivo" | "Mercado Pago" | "Mercado pago Maru" | "BBVA" | "BBVA credito" | "Deposito"
  }>
  createdAt: Date
}

const PaymentSchema = new mongoose.Schema({
  idFactura: {
    type: String,
    required: [true, "Please provide an invoice ID"],
    unique: true,
    trim: true,
    default: () => `AUTO-${new mongoose.Types.ObjectId().toString()}`,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  supplierName: {
    type: String,
    required: true,
  },
  sucursalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sucursal",
    required: true,
  },
  sucursalNombre: {
    type: String,
    required: true,
  },
  fechaRemito: {
    type: Date,
    required: true,
  },
  fechaRecepcion: {
    type: Date,
    required: true,
  },
  tipoDocumento: {
    type: String,
    enum: ["Factura A", "Factura B", "Factura C", "Remito", "Nota de Credito"],
    required: true,
  },
  tipoGasto: {
    type: String,
    enum: ["Mercaderia", "Cocina", "Reparaciones", "Inversion", "Oficina", "Otros"],
    required: true,
    default: "Mercaderia",
  },
  descripcion: {
    type: String,
    default: "",
  },
  montoTotal: {
    type: Number,
    required: true,
  },
  montoPagado: {
    type: Number,
    default: 0,
    min: 0,
  },
  saldoPendiente: {
    type: Number,
    required: true,
  },
  estado: {
    type: String,
    enum: ["Pendiente", "Pagado", "Parcialmente Pagado", "Cobrado"],
    default: "Pendiente",
  },
  noReclama: {
    type: Boolean,
    default: false,
  },
  historialPagos: [
    {
      fechaPago: {
        type: Date,
        required: true,
      },
      monto: {
        type: Number,
        required: true,
        min: 0,
      },
      formaPago: {
        type: String,
        enum: ["Efectivo", "Mercado Pago", "Mercado pago Maru", "BBVA", "BBVA credito", "Deposito"],
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Garantiza idFactura incluso si el cliente envia "".
PaymentSchema.pre("validate", function (this: any, next) {
  const current = typeof this.idFactura === "string" ? this.idFactura.trim() : ""
  if (!current) {
    this.idFactura = `AUTO-${new mongoose.Types.ObjectId().toString()}`
  }
  next()
})

export default mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema)
