import mongoose from "mongoose"

export interface ISupplier extends mongoose.Document {
  nombreSistema: string
  nombreContacto: string
  contacto: {
    telefono: string
  }
  estado: "Activo" | "Inactivo"
  informacionVaria: string
  debeFacturar: boolean
  createdAt: Date
}

const SupplierSchema = new mongoose.Schema({
  nombreSistema: {
    type: String,
    required: [true, "Please provide a supplier system name"],
    trim: true,
  },
  nombreContacto: {
    type: String,
    required: [true, "Please provide a contact name"],
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
