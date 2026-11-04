// Script para inicializar las sucursales por defecto
// Ejecutar con MONGODB_URI configurada en el entorno.

const mongoose = require("mongoose");

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

async function initSucursales({
  mongoUri = process.env.MONGODB_URI,
  mongooseClient = mongoose,
  SucursalModel = Sucursal,
  logger = console,
} = {}) {
  if (!mongoUri) {
    throw new Error("La variable de entorno MONGODB_URI es obligatoria.");
  }

  let connectionAttempted = false;
  let initializationError;

  try {
    logger.log("🔌 Conectando a MongoDB...");
    connectionAttempted = true;
    await mongooseClient.connect(mongoUri);
    logger.log("✅ Conectado a MongoDB");

    logger.log("🏢 Inicializando sucursales...");

    for (const sucursalData of sucursalesDefault) {
      const existingSucursal = await SucursalModel.findOne({
        nombre: sucursalData.nombre,
      });

      if (!existingSucursal) {
        const sucursal = await SucursalModel.create(sucursalData);
        logger.log(`✅ Sucursal creada: ${sucursal.nombre}`);
      } else {
        logger.log(`ℹ️  Sucursal ya existe: ${sucursalData.nombre}`);
      }
    }

    logger.log("🎉 Inicialización de sucursales completada");

    // Mostrar todas las sucursales
    const allSucursales = await SucursalModel.find({});
    logger.log("\n📋 Sucursales en la base de datos:");
    allSucursales.forEach((sucursal) => {
      logger.log(
        `  - ${sucursal.nombre} (${sucursal.activa ? "Activa" : "Inactiva"})`
      );
    });
  } catch (error) {
    initializationError = error;
    throw error;
  } finally {
    if (connectionAttempted) {
      try {
        await mongooseClient.disconnect();
        logger.log("🔌 Desconectado de MongoDB");
      } catch (disconnectError) {
        if (initializationError) {
          throw new AggregateError(
            [initializationError, disconnectError],
            "Fallaron la inicialización y la desconexión de MongoDB."
          );
        }
        throw disconnectError;
      }
    }
  }
}

async function run(options = {}) {
  const logger = options.logger || console;

  try {
    await initSucursales(options);
    return 0;
  } catch (error) {
    logger.error(
      "💥 Error al inicializar sucursales:",
      error instanceof Error ? error.message : "Error desconocido"
    );
    return 1;
  }
}

if (require.main === module) {
  run().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

module.exports = { initSucursales, run };
