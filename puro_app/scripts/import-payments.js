// Importador masivo de pagos desde Excel (.xlsx/.xls)
// Uso:
//   npm run import:payments -- ./archivo.xlsx
//
// Encabezados esperados:
// supplierNombreSistema,sucursalNombre,fechaRemito,fechaRecepcion,tipoDocumento,tipoGasto,descripcion,montoTotal,montoPagado,fechaPago,formaPago,noReclama,estado
// Opcional: idFactura (si no viene, se genera automaticamente)

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
  console.error("Ejemplo: npm run import:payments -- ./pagos.xlsx")
  process.exit(1)
}

const resolvedFile = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(resolvedFile)) {
  console.error(`Error: no existe el archivo: ${resolvedFile}`)
  process.exit(1)
}

const PaymentSchema = new mongoose.Schema({
  idFactura: { type: String, required: true, unique: true, trim: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierName: { type: String, required: true },
  sucursalId: { type: mongoose.Schema.Types.ObjectId, ref: "Sucursal", required: true },
  sucursalNombre: { type: String, required: true },
  fechaRemito: { type: Date, required: true },
  fechaRecepcion: { type: Date, required: true },
  tipoDocumento: {
    type: String,
    enum: ["Factura A", "Factura B", "Factura C", "Remito", "Nota de Credito"],
    required: true,
  },
  tipoGasto: {
    type: String,
    enum: ["Mercaderia", "Cocina", "Reparaciones", "Inversion", "Oficina", "Otros"],
    required: true,
    default: "Mercaderia",
  },
  descripcion: { type: String, default: "" },
  montoTotal: { type: Number, required: true },
  montoPagado: { type: Number, default: 0, min: 0 },
  saldoPendiente: { type: Number, required: true },
  estado: { type: String, enum: ["Pendiente", "Pagado", "Parcialmente Pagado", "Cobrado"], default: "Pendiente" },
  noReclama: { type: Boolean, default: false },
  historialPagos: [
    {
      fechaPago: { type: Date, required: true },
      monto: { type: Number, required: true, min: 0 },
      formaPago: {
        type: String,
        enum: ["Efectivo", "Mercado Pago", "Mercado pago Maru", "BBVA", "BBVA credito", "Deposito"],
        required: true,
      },
    },
  ],
  createdAt: { type: Date, default: Date.now },
})

const SupplierSchema = new mongoose.Schema({
  nombreSistema: { type: String, required: true, trim: true },
  estado: { type: String, enum: ["Activo", "Inactivo"], default: "Activo" },
})

const SucursalSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  activa: { type: Boolean, default: true },
})

const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema)
const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema)
const Sucursal = mongoose.models.Sucursal || mongoose.model("Sucursal", SucursalSchema)

async function getOrCreateGeneralSucursal() {
  let sucursal = await Sucursal.findOne({ nombre: "Todas" }).select("_id nombre").lean()
  if (!sucursal) {
    const created = await Sucursal.create({
      nombre: "Todas",
      direccion: "Gasto general distribuido",
      activa: false,
    })
    sucursal = { _id: created._id, nombre: created.nombre }
  }
  return sucursal
}

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

function generateAutoInvoiceId() {
  return `AUTO-${new mongoose.Types.ObjectId().toString()}`
}

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

function normalizeHeader(value) {
  return String(value || "").trim()
}

function toStringOrEmpty(value) {
  if (value === undefined || value === null) return ""
  return String(value).trim()
}

function parseBooleanFlexible(value) {
  if (typeof value === "boolean") return value
  const normalized = toStringOrEmpty(value).toLowerCase()
  if (!normalized) return false
  if (["si", "sí", "s", "true", "1", "x"].includes(normalized)) return true
  if (["no", "n", "false", "0"].includes(normalized)) return false
  return null
}

function parseNumberFlexible(value) {
  if (typeof value === "number") return value
  const normalized = toStringOrEmpty(value).replace(",", ".")
  if (!normalized) return null
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

function parseDateFlexible(value) {
  if (!value && value !== 0) return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  }

  const str = toStringOrEmpty(value)
  if (!str) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T00:00:00.000Z`)
  }

  const dmY = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (dmY) {
    const d = Number(dmY[1])
    const m = Number(dmY[2])
    const y = Number(dmY[3])
    return new Date(Date.UTC(y, m - 1, d))
  }

  const maybe = new Date(str)
  if (!Number.isNaN(maybe.getTime())) return maybe
  return null
}

function normalizeTipoDocumento(value) {
  const normalized = toStringOrEmpty(value).toLowerCase()
  const map = {
    "factura a": "Factura A",
    "factura b": "Factura B",
    "factura c": "Factura C",
    remito: "Remito",
    "nota de credito": "Nota de Credito",
    "nota de crédito": "Nota de Credito",
    nc: "Nota de Credito",
  }
  return map[normalized] || null
}

function normalizeTipoGasto(value) {
  const normalized = toStringOrEmpty(value).toLowerCase()
  const map = {
    mercaderia: "Mercaderia",
    "mercadería": "Mercaderia",
    cocina: "Cocina",
    reparaciones: "Reparaciones",
    inversion: "Inversion",
    "inversión": "Inversion",
    oficina: "Oficina",
    otros: "Otros",
  }
  return map[normalized] || null
}

function normalizeEstado(value, tipoDocumento, montoTotal, montoPagado) {
  const normalized = toStringOrEmpty(value).toLowerCase()
  const map = {
    pendiente: "Pendiente",
    pagado: "Pagado",
    "parcialmente pagado": "Parcialmente Pagado",
    parcial: "Parcialmente Pagado",
    cobrado: "Cobrado",
    cobrada: "Cobrado",
    "ya cobrado": "Cobrado",
    "ya cobrada": "Cobrado",
    aplicado: "Cobrado",
  }
  if (map[normalized]) return map[normalized]

  // Si no viene estado, se calcula en base al pago.
  if (tipoDocumento === "Nota de Credito") return "Pendiente"
  if (montoPagado <= 0) return "Pendiente"
  if (montoPagado >= montoTotal) return "Pagado"
  return "Parcialmente Pagado"
}

function normalizeFormaPago(value) {
  const normalized = toStringOrEmpty(value).toLowerCase()
  const map = {
    efectivo: "Efectivo",
    "mercado pago": "Mercado Pago",
    "mercado pago maru": "Mercado pago Maru",
    bbva: "BBVA",
    "bbva credito": "BBVA credito",
    deposito: "Deposito",
    depósito: "Deposito",
  }
  return map[normalized] || null
}

function validateHeaders(headers) {
  const normalized = headers.map(normalizeHeader)
  const missingRequired = REQUIRED_HEADERS.filter((h) => !normalized.includes(h))
  return { normalized, missingRequired }
}

function mapRow(row, rowNumber) {
  const idFactura = toStringOrEmpty(row.idFactura)
  const supplierNombreSistema = toStringOrEmpty(row.supplierNombreSistema)
  const sucursalNombre = toStringOrEmpty(row.sucursalNombre)
  const fechaRemito = parseDateFlexible(row.fechaRemito)
  const fechaRecepcion = parseDateFlexible(row.fechaRecepcion)
  const tipoDocumento = normalizeTipoDocumento(row.tipoDocumento)
  const tipoGasto = normalizeTipoGasto(row.tipoGasto)
  const descripcion = toStringOrEmpty(row.descripcion)
  const montoTotal = parseNumberFlexible(row.montoTotal)
  const montoPagadoRaw = parseNumberFlexible(row.montoPagado)
  const montoPagado = montoPagadoRaw === null ? 0 : montoPagadoRaw
  const fechaPago = parseDateFlexible(row.fechaPago)
  const formaPago = normalizeFormaPago(row.formaPago)
  const noReclama = parseBooleanFlexible(row.noReclama)
  const estado = normalizeEstado(row.estado, tipoDocumento, montoTotal ?? 0, montoPagado)

  const errors = []
  if (!supplierNombreSistema) errors.push("supplierNombreSistema es obligatorio")
  if (!sucursalNombre) errors.push("sucursalNombre es obligatorio")
  if (!fechaRemito) errors.push("fechaRemito invalida")
  if (!fechaRecepcion) errors.push("fechaRecepcion invalida")
  if (!tipoDocumento) errors.push("tipoDocumento invalido")
  if (!tipoGasto) errors.push("tipoGasto invalido")
  if (montoTotal === null) errors.push("montoTotal invalido")
  if (montoPagadoRaw === null && toStringOrEmpty(row.montoPagado)) errors.push("montoPagado invalido")
  if (montoPagado > 0 && !fechaPago) errors.push("fechaPago es obligatoria cuando montoPagado > 0")
  if (montoPagado > 0 && !formaPago) errors.push("formaPago es obligatoria cuando montoPagado > 0")
  if (noReclama === null) errors.push("noReclama invalido")
  if (!estado) errors.push("estado invalido")

  if (tipoDocumento === "Nota de Credito") {
    if (montoTotal !== null && montoTotal >= 0) {
      errors.push("para Nota de Credito el montoTotal debe ser negativo")
    }
    if (montoPagado > 0) {
      errors.push("una Nota de Credito no debe tener montoPagado")
    }
    if (estado !== "Pendiente" && estado !== "Cobrado") {
      errors.push("para Nota de Credito el estado debe ser Pendiente o Cobrado")
    }
  } else if (montoTotal !== null && montoTotal < 0) {
    errors.push("solo Nota de Credito permite montoTotal negativo")
  } else if (estado === "Cobrado") {
    errors.push('el estado "Cobrado" solo aplica a Nota de Credito')
  }

  if (montoPagado < 0) errors.push("montoPagado no puede ser negativo")
  if (montoTotal !== null && montoTotal >= 0 && montoPagado > montoTotal) {
    errors.push("montoPagado no puede superar montoTotal")
  }

  if (errors.length > 0) {
    return { ok: false, rowNumber, errors, raw: row }
  }

  const saldoPendiente =
    tipoDocumento === "Nota de Credito" && estado === "Cobrado"
      ? 0
      : Number((montoTotal - montoPagado).toFixed(2))

  return {
    ok: true,
    rowNumber,
    payment: {
      idFactura,
      supplierNombreSistema,
      sucursalNombre,
      fechaRemito,
      fechaRecepcion,
      tipoDocumento,
      tipoGasto,
      descripcion,
      montoTotal,
      montoPagado,
      fechaPago,
      formaPago,
      saldoPendiente,
      estado,
      noReclama,
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
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: true })
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
  const validRows = mapped.filter((m) => m.ok).map((m) => m.payment)

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

  const supplierNames = [...new Set(validRows.map((p) => p.supplierNombreSistema))]
  const sucursalNames = [...new Set(validRows.map((p) => p.sucursalNombre))]

  const suppliers = await Supplier.find({ nombreSistema: { $in: supplierNames } }).select("_id nombreSistema").lean()
  const sucursales = await Sucursal.find({ nombre: { $in: sucursalNames } }).select("_id nombre").lean()

  const needsGeneralSucursal = sucursalNames.some((name) => name.toLowerCase() === "todas")
  if (needsGeneralSucursal && !sucursales.some((s) => s.nombre === "Todas")) {
    const general = await getOrCreateGeneralSucursal()
    sucursales.push(general)
  }

  const supplierMap = new Map(suppliers.map((s) => [String(s.nombreSistema).toLowerCase(), s]))
  const sucursalMap = new Map(sucursales.map((s) => [String(s.nombre).toLowerCase(), s]))

  const unresolvedRows = []
  for (const row of validRows) {
    const supplierKey = String(row.supplierNombreSistema).toLowerCase()
    const sucursalKey = String(row.sucursalNombre).toLowerCase()

    if (!supplierMap.has(supplierKey)) {
      unresolvedRows.push(`Proveedor no encontrado: ${row.supplierNombreSistema}`)
    }
    if (!sucursalMap.has(sucursalKey)) {
      unresolvedRows.push(`Sucursal no encontrada: ${row.sucursalNombre}`)
    }
  }
  if (unresolvedRows.length > 0) {
    const unique = [...new Set(unresolvedRows)]
    throw new Error(`No se pudieron resolver referencias:\n- ${unique.join("\n- ")}`)
  }

  const providedIds = validRows.map((p) => p.idFactura).filter(Boolean)
  const existingIds = new Set(
    (await Payment.find({ idFactura: { $in: providedIds } }).select("idFactura").lean()).map((p) => p.idFactura)
  )

  // Evita duplicados internos por idFactura
  const seen = new Set()
  const deduped = []
  let duplicatesInFile = 0
  for (const row of validRows) {
    if (!row.idFactura) {
      deduped.push(row)
      continue
    }

    if (seen.has(row.idFactura)) {
      duplicatesInFile += 1
      continue
    }
    seen.add(row.idFactura)
    deduped.push(row)
  }

  let inserted = 0
  let skippedExisting = 0
  const usedIds = new Set([...existingIds])

  for (const row of deduped) {
    const idFactura = row.idFactura || generateAutoInvoiceId()

    if (usedIds.has(idFactura)) {
      skippedExisting += 1
      continue
    }

    const supplier = supplierMap.get(String(row.supplierNombreSistema).toLowerCase())
    const sucursal = sucursalMap.get(String(row.sucursalNombre).toLowerCase())

    await Payment.create({
      idFactura,
      supplierId: supplier._id,
      supplierName: supplier.nombreSistema,
      sucursalId: sucursal._id,
      sucursalNombre: sucursal.nombre,
      fechaRemito: row.fechaRemito,
      fechaRecepcion: row.fechaRecepcion,
      tipoDocumento: row.tipoDocumento,
      tipoGasto: row.tipoGasto,
      descripcion: row.descripcion,
      montoTotal: row.montoTotal,
      montoPagado: row.montoPagado,
      saldoPendiente: row.saldoPendiente,
      estado: row.estado,
      noReclama: row.noReclama,
      historialPagos:
        row.montoPagado > 0
          ? [
              {
                fechaPago: row.fechaPago,
                monto: row.montoPagado,
                formaPago: row.formaPago,
              },
            ]
          : [],
    })

    inserted += 1
    usedIds.add(idFactura)
  }

  console.log("\nResumen de importacion:")
  console.log(`- Insertados: ${inserted}`)
  console.log(`- Duplicados en archivo omitidos: ${duplicatesInFile}`)
  console.log(`- Ya existentes en DB omitidos: ${skippedExisting}`)
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
