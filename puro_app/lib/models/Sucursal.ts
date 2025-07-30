import mongoose from "mongoose"

export interface ISucursal extends mongoose.Document {
  nombre: string
  direccion?: string
  activa: boolean
  createdAt: Date
}

const SucursalSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, "Please provide a sucursal name"],
    unique: true,
    trim: true,
  },
  direccion: {
    type: String,
    default: "",
    trim: true,
  },
  activa: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.models.Sucursal || mongoose.model<ISucursal>("Sucursal", SucursalSchema)
