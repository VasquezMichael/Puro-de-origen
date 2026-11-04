// Script para inicializar las sucursales por defecto
// Ejecutar con MONGODB_URI configurada en el entorno.

const mongoose = require("mongoose");

// Configuración de conexión
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Error: la variable de entorno MONGODB_URI es obligatoria.");
  process.exit(1);
}

// Schema de Sucursal
const SucursalSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
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
});

const Sucursal = mongoose.model("Sucursal", SucursalSchema);

// Sucursales por defecto
const sucursalesDefault = [
  {
    nombre: "Calle 59",
    direccion: "Calle 59 - Sucursal Principal",
    activa: true,
  },
  {
    nombre: "Calle 50",
    direccion: "Calle 50 - Sucursal Secundaria",
    activa: true,
  },
  {
    nombre: "Calle 13",
    direccion: "Calle 13 - Sucursal Norte",
    activa: true,
  },
  {
    nombre: "Cocina",
    direccion: "Área de Cocina - Departamento Gastronómico",
    activa: true,
  },
];

async function initSucursales() {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    console.log("🏢 Inicializando sucursales...");

    for (const sucursalData of sucursalesDefault) {
      const existingSucursal = await Sucursal.findOne({
        nombre: sucursalData.nombre,
      });

      if (!existingSucursal) {
        const sucursal = await Sucursal.create(sucursalData);
        console.log(`✅ Sucursal creada: ${sucursal.nombre}`);
      } else {
        console.log(`ℹ️  Sucursal ya existe: ${sucursalData.nombre}`);
      }
    }

    console.log("🎉 Inicialización de sucursales completada");

    // Mostrar todas las sucursales
    const allSucursales = await Sucursal.find({});
    console.log("\n📋 Sucursales en la base de datos:");
    allSucursales.forEach((sucursal) => {
      console.log(
        `  - ${sucursal.nombre} (${sucursal.activa ? "Activa" : "Inactiva"})`
      );
    });
  } catch (error) {
    console.error("💥 Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Desconectado de MongoDB");
    process.exit(0);
  }
}

// Ejecutar el script
initSucursales();
