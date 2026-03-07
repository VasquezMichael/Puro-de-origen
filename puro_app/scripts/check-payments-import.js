// Pre-chequeo de importacion de pagos (sin insertar datos).
// Uso:
//   npm run check:payments -- ./archivo.xlsx
//
// Reporta:
// 1) filas con pagos incompletos (montoPagado > 0 sin fechaPago/formaPago)
// 2) proveedores del excel no existentes en DB
// 3) sucursales del excel no existentes en DB

const fs = require("fs")
const path = require("path")
const mongoose = require("mongoose")
const XLSX = require("xlsx")

loadEnvLocalIfExists()

const MONGODB_URI = process.env.MONGODB_URI
const fileArg = process.argv[2]

if (!MONGODB_URI) {
  console.error("Error: falta MONGODB_URI en variables de entorno (.env.local o entorno de shell).")
  process.exit(1)
}

if (!fileArg) {
  console.error("Error: falta ruta de archivo Excel.")
  console.error("Ejemplo: npm run check:payments -- ./pagos_import.xlsx")
  process.exit(1)
}

const resolvedFile = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(resolvedFile)) {
  console.error(`Error: no existe el archivo: ${resolvedFile}`)
  process.exit(1)
}

const SupplierSchema = new mongoose.Schema({
  nombreSistema: { type: String, required: true, trim: true },
})

const SucursalSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
})

const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema)
const Sucursal = mongoose.models.Sucursal || mongoose.model("Sucursal", SucursalSchema)

const REQUIRED_HEADERS = [
  "supplierNombreSistema",
  "sucursalNombre",
  "fechaRemito",
  "fechaRecepcion",
  "tipoDocumento",
  "tipoGasto",
  "montoTotal",
]

const OPTIONAL_HEADERS = [
  "idFactura",
  "descripcion",
  "montoPagado",
  "fechaPago",
  "formaPago",
  "noReclama",
  "estado",
]

function loadEnvLocalIfExists() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, "utf8")
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function toStringOrEmpty(value) {
  if (value === undefined || value === null) return ""
  return String(value).trim()
}

function normalizeHeader(value) {
  return toStringOrEmpty(value)
}

function parseNumberFlexible(value) {
  if (typeof value === "number") return value
  const normalized = toStringOrEmpty(value).replace(",", ".")
  if (!normalized) return null
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

function validateHeaders(headers) {
  const normalized = headers.map(normalizeHeader)
  const missingRequired = REQUIRED_HEADERS.filter((h) => !normalized.includes(h))
  const unknownHeaders = normalized.filter((h) => !REQUIRED_HEADERS.includes(h) && !OPTIONAL_HEADERS.includes(h))
  return { missingRequired, unknownHeaders }
}

function pushRowReference(map, key, rowNumber) {
  const normalized = toStringOrEmpty(key).toLowerCase()
  if (!normalized) return
  const found = map.get(normalized)
  if (found) {
    found.rows.push(rowNumber)
  } else {
    map.set(normalized, { value: toStringOrEmpty(key), rows: [rowNumber] })
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
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
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: true })
  if (rows.length === 0) throw new Error("La hoja esta vacia.")

  const headers = Object.keys(rows[0]).map(normalizeHeader)
  const { missingRequired, unknownHeaders } = validateHeaders(headers)

  const supplierRefs = new Map()
  const sucursalRefs = new Map()
  const incompletePaidRows = []

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const rowNumber = i + 2
    const supplier = toStringOrEmpty(row.supplierNombreSistema)
    const sucursal = toStringOrEmpty(row.sucursalNombre)
    const montoPagadoRaw = parseNumberFlexible(row.montoPagado)
    const montoPagado = montoPagadoRaw === null ? 0 : montoPagadoRaw
    const fechaPago = toStringOrEmpty(row.fechaPago)
    const formaPago = toStringOrEmpty(row.formaPago)

    if (supplier) pushRowReference(supplierRefs, supplier, rowNumber)
    if (sucursal) pushRowReference(sucursalRefs, sucursal, rowNumber)

    if (montoPagado > 0 && (!fechaPago || !formaPago)) {
      incompletePaidRows.push({
        rowNumber,
        supplierNombreSistema: supplier,
        sucursalNombre: sucursal,
        montoPagado,
        faltaFechaPago: !fechaPago,
        faltaFormaPago: !formaPago,
      })
    }
  }

  const supplierNames = [...supplierRefs.values()].map((x) => x.value)
  const sucursalNames = [...sucursalRefs.values()].map((x) => x.value)

  const [supplierDocs, sucursalDocs] = await Promise.all([
    Supplier.find({ nombreSistema: { $in: supplierNames } }).select("nombreSistema").lean(),
    Sucursal.find({ nombre: { $in: sucursalNames } }).select("nombre").lean(),
  ])

  const existingSuppliers = new Set(supplierDocs.map((s) => toStringOrEmpty(s.nombreSistema).toLowerCase()))
  const existingSucursales = new Set(sucursalDocs.map((s) => toStringOrEmpty(s.nombre).toLowerCase()))

  // "Todas" se permite aunque no exista todavia en DB (el importador la puede crear).
  existingSucursales.add("todas")

  const missingSuppliers = [...supplierRefs.entries()]
    .filter(([key]) => !existingSuppliers.has(key))
    .map(([, entry]) => ({
      proveedor: entry.value,
      filas: entry.rows,
      cantidadApariciones: entry.rows.length,
    }))
    .sort((a, b) => a.proveedor.localeCompare(b.proveedor))

  const missingSucursales = [...sucursalRefs.entries()]
    .filter(([key]) => !existingSucursales.has(key))
    .map(([, entry]) => ({
      sucursal: entry.value,
      filas: entry.rows,
      cantidadApariciones: entry.rows.length,
    }))
    .sort((a, b) => a.sucursal.localeCompare(b.sucursal))

  const report = {
    file: path.basename(resolvedFile),
    sheet: firstSheetName,
    totalRows: rows.length,
    headers,
    missingRequiredHeaders: missingRequired,
    unknownHeaders,
    resumen: {
      pagosIncompletos: incompletePaidRows.length,
      proveedoresNoEncontrados: missingSuppliers.length,
      sucursalesNoEncontradas: missingSucursales.length,
      listoParaImportar:
        missingRequired.length === 0 &&
        unknownHeaders.length === 0 &&
        incompletePaidRows.length === 0 &&
        missingSuppliers.length === 0 &&
        missingSucursales.length === 0,
    },
    pagosIncompletos: incompletePaidRows,
    proveedoresNoEncontrados: missingSuppliers,
    sucursalesNoEncontradas: missingSucursales,
  }

  const reportsDir = path.join(process.cwd(), "reports")
  ensureDir(reportsDir)
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const outPath = path.join(reportsDir, `check-payments-${ts}.json`)
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8")

  console.log("\nResumen de chequeo:")
  console.log(`- Filas leidas: ${rows.length}`)
  console.log(`- Pagos incompletos: ${incompletePaidRows.length}`)
  console.log(`- Proveedores no encontrados: ${missingSuppliers.length}`)
  console.log(`- Sucursales no encontradas: ${missingSucursales.length}`)
  console.log(`- Headers faltantes: ${missingRequired.length}`)
  console.log(`- Headers desconocidos: ${unknownHeaders.length}`)
  console.log(`- Listo para importar: ${report.resumen.listoParaImportar ? "SI" : "NO"}`)
  console.log(`\nReporte guardado en: ${outPath}`)
}

run()
  .catch((error) => {
    console.error("Error en chequeo:", error.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
    console.log("Conexion cerrada.")
  })
