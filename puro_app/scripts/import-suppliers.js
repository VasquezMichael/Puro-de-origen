// Importador masivo de proveedores desde Excel (.xlsx/.xls)
// Uso:
//   MONGODB_URI="tu_uri" npm run import:suppliers -- ./archivo.xlsx
//
// Encabezados esperados:
// nombre, nombreSistema, sector, telefono, nombreContacto, emailContacto,
// datosWeb, urlWeb, debeFacturar, condiciones, actualizacionPrecios, estado

const fs = require("fs")
const path = require("path")
const mongoose = require("mongoose")
const XLSX = require("xlsx")

const MONGODB_URI = process.env.MONGODB_URI
const fileArg = process.argv[2]

if (!MONGODB_URI) {
  console.error("Error: falta MONGODB_URI en variables de entorno.")
  process.exit(1)
}

if (!fileArg) {
  console.error("Error: falta ruta de archivo Excel.")
  console.error("Ejemplo: npm run import:suppliers -- ./proveedores.xlsx")
  process.exit(1)
}

const resolvedFile = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(resolvedFile)) {
  console.error(`Error: no existe el archivo: ${resolvedFile}`)
  process.exit(1)
}

const SupplierSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  nombreSistema: { type: String, required: true, trim: true },
  sector: { type: String, enum: ["cocina", "dietetica", "otros"], default: "otros" },
  nombreContacto: { type: String, trim: true, default: "" },
  contacto: {
    telefono: { type: String, default: "" },
    email: { type: String, default: "", trim: true, lowercase: true },
  },
  datosWeb: { type: String, default: "" },
  urlWeb: { type: String, default: "", trim: true },
  debeFacturar: { type: Boolean, required: true, default: false },
  condiciones: { type: String, default: "" },
  actualizacionPrecios: { type: String, default: "" },
  estado: { type: String, enum: ["Activo", "Inactivo"], default: "Activo" },
  createdAt: { type: Date, default: Date.now },
})

const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema)

const REQUIRED_HEADERS = ["nombre", "nombreSistema", "debeFacturar", "estado"]
const OPTIONAL_HEADERS = [
  "sector",
  "telefono",
  "nombreContacto",
  "emailContacto",
  "datosWeb",
  "urlWeb",
  "condiciones",
  "actualizacionPrecios",
]

function normalizeHeader(value) {
  return String(value || "").trim()
}

function toStringOrEmpty(value) {
  if (value === undefined || value === null) return ""
  return String(value).trim()
}

function parseSector(value) {
  const normalized = toStringOrEmpty(value).toLowerCase()
  if (!normalized) return "otros"
  if (["cocina", "dietetica", "otros"].includes(normalized)) return normalized
  return null
}

function parseEstado(value) {
  const normalized = toStringOrEmpty(value).toLowerCase()
  if (!normalized) return "Activo"
  if (normalized === "activo") return "Activo"
  if (normalized === "inactivo") return "Inactivo"
  return null
}

function parseBooleanFlexible(value) {
  if (typeof value === "boolean") return value
  const normalized = toStringOrEmpty(value).toLowerCase()
  if (!normalized) return null
  if (["si", "sí", "s", "true", "1", "x"].includes(normalized)) return true
  if (["no", "n", "false", "0"].includes(normalized)) return false
  return null
}

function validateHeaders(headers) {
  const normalized = headers.map(normalizeHeader)
  const missingRequired = REQUIRED_HEADERS.filter((h) => !normalized.includes(h))
  return { normalized, missingRequired }
}

function mapRow(row, rowNumber) {
  const nombre = toStringOrEmpty(row.nombre)
  const nombreSistema = toStringOrEmpty(row.nombreSistema)
  const sector = parseSector(row.sector)
  const telefono = toStringOrEmpty(row.telefono)
  const nombreContacto = toStringOrEmpty(row.nombreContacto)
  const emailContacto = toStringOrEmpty(row.emailContacto).toLowerCase()
  const datosWeb = toStringOrEmpty(row.datosWeb)
  const urlWeb = toStringOrEmpty(row.urlWeb)
  const debeFacturar = parseBooleanFlexible(row.debeFacturar)
  const condiciones = toStringOrEmpty(row.condiciones)
  const actualizacionPrecios = toStringOrEmpty(row.actualizacionPrecios)
  const estado = parseEstado(row.estado)

  const errors = []
  if (!nombre) errors.push("nombre es obligatorio")
  if (!nombreSistema) errors.push("nombreSistema es obligatorio")
  if (sector === null) errors.push("sector debe ser cocina, dietetica u otros")
  if (debeFacturar === null) errors.push("debeFacturar debe ser SI/NO, TRUE/FALSE, 1/0")
  if (estado === null) errors.push("estado debe ser Activo o Inactivo")

  if (errors.length > 0) {
    return { ok: false, rowNumber, errors, raw: row }
  }

  return {
    ok: true,
    rowNumber,
    supplier: {
      nombre,
      nombreSistema,
      sector,
      nombreContacto,
      contacto: {
        telefono,
        email: emailContacto,
      },
      datosWeb,
      urlWeb,
      debeFacturar,
      condiciones,
      actualizacionPrecios,
      estado,
    },
  }
}

async function run() {
  console.log("Conectando a MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("Conectado.")

  const workbook = XLSX.readFile(resolvedFile)
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error("El archivo Excel no tiene hojas.")

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
  if (rows.length === 0) throw new Error("La hoja esta vacia.")

  const headers = Object.keys(rows[0]).map(normalizeHeader)
  const { missingRequired } = validateHeaders(headers)
  if (missingRequired.length > 0) {
    throw new Error(`Faltan columnas obligatorias: ${missingRequired.join(", ")}`)
  }

  const unknownHeaders = headers.filter((h) => !REQUIRED_HEADERS.includes(h) && !OPTIONAL_HEADERS.includes(h))
  if (unknownHeaders.length > 0) {
    console.log(`Aviso: columnas extra ignoradas: ${unknownHeaders.join(", ")}`)
  }

  const mapped = rows.map((row, i) => mapRow(row, i + 2))
  const invalidRows = mapped.filter((m) => !m.ok)
  const validRows = mapped.filter((m) => m.ok).map((m) => m.supplier)

  console.log(`Total de filas leidas: ${rows.length}`)
  console.log(`Filas validas: ${validRows.length}`)
  console.log(`Filas invalidas: ${invalidRows.length}`)

  if (invalidRows.length > 0) {
    console.log("\nDetalle de errores:")
    invalidRows.slice(0, 50).forEach((row) => {
      console.log(`- Fila ${row.rowNumber}: ${row.errors.join(" | ")}`)
    })
    if (invalidRows.length > 50) {
      console.log(`... y ${invalidRows.length - 50} filas invalidas mas.`)
    }
  }

  if (validRows.length === 0) {
    console.log("No hay filas validas para importar.")
    return
  }

  const deduped = []
  const seen = new Set()
  for (const row of validRows) {
    const key = `${row.nombre.toLowerCase()}::${row.nombreSistema.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }

  let inserted = 0
  let duplicates = 0
  for (const row of deduped) {
    const exists = await Supplier.findOne({
      nombre: row.nombre,
      nombreSistema: row.nombreSistema,
    }).lean()

    if (exists) {
      duplicates += 1
      continue
    }

    await Supplier.create(row)
    inserted += 1
  }

  console.log("\nResumen de importacion:")
  console.log(`- Insertados: ${inserted}`)
  console.log(`- Duplicados omitidos: ${duplicates}`)
  console.log(`- Invalidos: ${invalidRows.length}`)
}

run()
  .catch((error) => {
    console.error("Error en importacion:", error.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
    console.log("Conexion cerrada.")
  })
