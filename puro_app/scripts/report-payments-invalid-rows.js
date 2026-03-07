// Reporte completo de filas invalidas para importacion de pagos.
// Uso:
//   npm run report:payments:invalid -- ./pagos_import.xlsx

const fs = require("fs")
const path = require("path")
const XLSX = require("xlsx")

const fileArg = process.argv[2]
if (!fileArg) {
  console.error("Error: falta ruta de archivo Excel.")
  console.error("Ejemplo: npm run report:payments:invalid -- ./pagos_import.xlsx")
  process.exit(1)
}

const resolvedFile = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(resolvedFile)) {
  console.error(`Error: no existe el archivo: ${resolvedFile}`)
  process.exit(1)
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

function mapRow(row, rowNumber) {
  const supplierNombreSistema = toStringOrEmpty(row.supplierNombreSistema)
  const sucursalNombre = toStringOrEmpty(row.sucursalNombre)
  const fechaRemito = parseDateFlexible(row.fechaRemito)
  const fechaRecepcion = parseDateFlexible(row.fechaRecepcion)
  const tipoDocumento = normalizeTipoDocumento(row.tipoDocumento)
  const tipoGasto = normalizeTipoGasto(row.tipoGasto)
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

  return {
    rowNumber,
    supplierNombreSistema,
    sucursalNombre,
    montoPagado,
    fechaPagoOriginal: toStringOrEmpty(row.fechaPago),
    formaPagoOriginal: toStringOrEmpty(row.formaPago),
    errors,
  }
}

function run() {
  const workbook = XLSX.readFile(resolvedFile)
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error("El archivo Excel no tiene hojas.")

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: true })
  if (rows.length === 0) throw new Error("La hoja esta vacia.")

  const checked = rows.map((row, i) => mapRow(row, i + 2))
  const invalidRows = checked.filter((x) => x.errors.length > 0)

  const reportsDir = path.join(process.cwd(), "reports")
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, "-")

  const jsonPath = path.join(reportsDir, `invalid-payments-rows-${ts}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(invalidRows, null, 2), "utf8")

  const csvHeader = [
    "rowNumber",
    "supplierNombreSistema",
    "sucursalNombre",
    "montoPagado",
    "fechaPagoOriginal",
    "formaPagoOriginal",
    "errors",
  ]
  const csvLines = [csvHeader.join(",")]
  for (const row of invalidRows) {
    const cols = [
      row.rowNumber,
      row.supplierNombreSistema,
      row.sucursalNombre,
      row.montoPagado,
      row.fechaPagoOriginal,
      row.formaPagoOriginal,
      row.errors.join(" | "),
    ].map((v) => `"${String(v).replaceAll('"', '""')}"`)
    csvLines.push(cols.join(","))
  }
  const csvPath = path.join(reportsDir, `invalid-payments-rows-${ts}.csv`)
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8")

  console.log(`Total filas leidas: ${rows.length}`)
  console.log(`Filas invalidas: ${invalidRows.length}`)
  if (invalidRows.length > 0) {
    console.log("\nPrimeras filas invalidas:")
    invalidRows.slice(0, 20).forEach((r) => {
      console.log(`- Fila ${r.rowNumber}: ${r.errors.join(" | ")}`)
    })
  }
  console.log(`\nReporte JSON: ${jsonPath}`)
  console.log(`Reporte CSV: ${csvPath}`)
}

try {
  run()
} catch (error) {
  console.error("Error:", error.message || error)
  process.exit(1)
}
