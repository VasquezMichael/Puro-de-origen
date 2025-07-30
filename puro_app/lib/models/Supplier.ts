import mongoose from "mongoose"

export interface ISupplier extends mongoose.Document {
  nombre: string
  contacto: {
    telefono: string
  }
  estado: "Activo" | "Inactivo"
  informacionVaria: string
  debeFacturar: boolean
  createdAt: Date
}

const SupplierSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, "Please provide a supplier name"],
    trim: true,
  },
  contacto: {
    telefono: {
      type: String,
      default: "",
    },
  },
  estado: {
    type: String,
    enum: ["Activo", "Inactivo"],
    default: "Activo",
  },
  informacionVaria: {
    type: String,
    default: "",
  },
  debeFacturar: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", SupplierSchema)
