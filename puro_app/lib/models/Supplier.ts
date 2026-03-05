import mongoose from "mongoose"

export interface ISupplier extends mongoose.Document {
  nombre: string
  nombreSistema: string
  sector?: "cocina" | "dietetica" | "otros"
  nombreContacto?: string
  contacto: {
    telefono?: string
    email?: string
  }
  datosWeb?: string
  urlWeb?: string
  condiciones?: string
  actualizacionPrecios?: string
  estado: "Activo" | "Inactivo"
  informacionVaria?: string
  debeFacturar: boolean
  createdAt: Date
}

const SupplierSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, "Please provide a supplier name"],
    trim: true,
  },
  nombreSistema: {
    type: String,
    required: [true, "Please provide a supplier system name"],
    trim: true,
  },
  nombreContacto: {
    type: String,
    trim: true,
    default: "",
  },
  sector: {
    type: String,
    enum: ["cocina", "dietetica", "otros"],
    default: "otros",
  },
  contacto: {
    telefono: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
  },
  datosWeb: {
    type: String,
    default: "",
  },
  urlWeb: {
    type: String,
    default: "",
    trim: true,
  },
  condiciones: {
    type: String,
    default: "",
  },
  actualizacionPrecios: {
    type: String,
    default: "",
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
    required: true,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", SupplierSchema)
