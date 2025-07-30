import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Sucursal from "@/lib/models/Sucursal"

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
]

export async function POST() {
  try {
    console.log("🔌 Conectando a MongoDB...")
    await dbConnect()
    console.log("✅ Conectado a MongoDB")

    console.log("🏢 Inicializando sucursales...")

    const results = []

    for (const sucursalData of sucursalesDefault) {
      const existingSucursal = await Sucursal.findOne({ nombre: sucursalData.nombre })

      if (!existingSucursal) {
        const sucursal = await Sucursal.create(sucursalData)
        results.push({ action: "created", sucursal: sucursal.nombre })
        console.log(`✅ Sucursal creada: ${sucursal.nombre}`)
      } else {
        results.push({ action: "exists", sucursal: sucursalData.nombre })
        console.log(`ℹ️  Sucursal ya existe: ${sucursalData.nombre}`)
      }
    }

    // Obtener todas las sucursales
    const allSucursales = await Sucursal.find({})

    console.log("🎉 Inicialización de sucursales completada")

    return NextResponse.json({
      message: "Inicialización completada",
      results,
      totalSucursales: allSucursales.length,
      sucursales: allSucursales.map((s) => ({
        nombre: s.nombre,
        activa: s.activa,
      })),
    })
  } catch (error) {
    console.error("💥 Error:", error)
    return NextResponse.json({ error: "Error al inicializar sucursales", details: error.message }, { status: 500 })
  }
}
