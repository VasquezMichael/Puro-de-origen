import mongoose from "mongoose"

export interface IPayment extends mongoose.Document {
  idFactura: string
  supplierId: mongoose.Types.ObjectId
  supplierName: string
  sucursalId: mongoose.Types.ObjectId
  sucursalNombre: string
  fechaRemito: Date
  fechaRecepcion: Date
  tipoDocumento: "Factura A" | "Factura B" | "Factura C" | "Remito"
  descripcion: string
  montoTotal: number
  montoPagado: number
  saldoPendiente: number
  estado: "Pendiente" | "Pagado" | "Parcialmente Pagado"
  historialPagos: Array<{
    fechaPago: Date
    monto: number
    formaPago: "Efectivo" | "Mercado Pago" | "BBVA" | "Transferencia bancaria"
  }>
  createdAt: Date
}

const PaymentSchema = new mongoose.Schema({
  idFactura: {
    type: String,
    required: [true, "Please provide an invoice ID"],
    unique: true,
    trim: true,
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
    enum: ["Factura A", "Factura B", "Factura C", "Remito"],
    required: true,
  },
  descripcion: {
    type: String,
    default: "",
  },
  montoTotal: {
    type: Number,
    required: true,
    min: 0,
  },
  montoPagado: {
    type: Number,
    default: 0,
    min: 0,
  },
  saldoPendiente: {
    type: Number,
    required: true,
    min: 0,
  },
  estado: {
    type: String,
    enum: ["Pendiente", "Pagado", "Parcialmente Pagado"],
    default: "Pendiente",
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
        enum: ["Efectivo", "Mercado Pago", "BBVA", "Transferencia bancaria"],
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema)
