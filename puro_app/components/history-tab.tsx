"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, DollarSign, TrendingUp, FileText, Building2 } from "lucide-react"
import type { Payment } from "@/app/dashboard/page"

interface HistoryTabProps {
  payments: Payment[]
}

export function HistoryTab({ payments }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("all")

  // Filtrar pagos por término de búsqueda y fecha
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.idFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.sucursalNombre.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesDate = true
    if (dateFilter !== "all") {
      const now = new Date()
      const paymentDate = new Date(payment.createdAt)

      switch (dateFilter) {
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = paymentDate >= weekAgo
          break
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = paymentDate >= monthAgo
          break
        case "quarter":
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          matchesDate = paymentDate >= quarterAgo
          break
      }
    }

    return matchesSearch && matchesDate
  })

  // Ordenar por fecha más reciente
  const sortedPayments = filteredPayments.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Calcular estadísticas
  const totalPayments = payments.length
  const paidPayments = payments.filter((p) => p.estado === "Pagado")
  const partialPayments = payments.filter((p) => p.estado === "Parcialmente Pagado")
  const pendingPayments = payments.filter((p) => p.estado === "Pendiente")

  const totalPaid =
    paidPayments.reduce((sum, p) => sum + p.montoPagado, 0) + partialPayments.reduce((sum, p) => sum + p.montoPagado, 0)
  const totalPending =
    pendingPayments.reduce((sum, p) => sum + p.saldoPendiente, 0) +
    partialPayments.reduce((sum, p) => sum + p.saldoPendiente, 0)

  const getStatusBadge = (status: Payment["estado"]) => {
    switch (status) {
      case "Pagado":
        return <Badge className="bg-green-100 text-green-800">Pagado</Badge>
      case "Pendiente":
        return <Badge variant="outline">Pendiente</Badge>
      case "Parcialmente Pagado":
        return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Historial de Pagos</h2>
        <p className="text-gray-600">Revisa el historial completo de facturas y pagos por sucursal</p>
      </div>

      {/* Estadísticas resumidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-muted-foreground">Facturas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Realizados</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {paidPayments.length + partialPayments.length} facturas con pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPayments.length + partialPayments.length} facturas con saldo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Completos</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{paidPayments.length}</div>
            <p className="text-xs text-muted-foreground">Facturas completamente pagadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar en historial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fechas</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
            <SelectItem value="quarter">Último trimestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial Completo</CardTitle>
          <CardDescription>Registro cronológico de todas las facturas y pagos por sucursal</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Registro</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha Recepción</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Historial Pagos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPayments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{payment.supplierName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      {payment.sucursalNombre}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.tipoDocumento === "Remito" ? "outline" : "secondary"}>
                      {payment.tipoDocumento}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(payment.fechaRecepcion).toLocaleDateString()}</TableCell>
                  <TableCell>${payment.montoTotal.toLocaleString()}</TableCell>
                  <TableCell>${payment.montoPagado.toLocaleString()}</TableCell>
                  <TableCell className={payment.saldoPendiente > 0 ? "text-red-600" : "text-green-600"}>
                    ${payment.saldoPendiente.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.estado)}</TableCell>
                  <TableCell>
                    {payment.historialPagos.length > 0 ? (
                      <div className="text-xs space-y-1">
                        {payment.historialPagos.map((pago, index) => (
                          <div key={index} className="bg-gray-50 p-1 rounded">
                            ${pago.monto.toLocaleString()} - {pago.formaPago}
                            <br />
                            {new Date(pago.fechaPago).toLocaleDateString()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">Sin pagos</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {sortedPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron registros</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
