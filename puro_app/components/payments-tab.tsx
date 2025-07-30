"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, DollarSign, AlertTriangle, Trash2, Building2, Calculator } from "lucide-react"
import type { Payment, Supplier, Sucursal } from "@/app/dashboard/page"

interface PaymentsTabProps {
  payments: Payment[]
  setPayments: (payments: Payment[]) => void
  suppliers: Supplier[]
  sucursales: Sucursal[]
  discrepancies: Payment[]
  onDataChange?: () => void
}

export function PaymentsTab({
  payments,
  setPayments,
  suppliers,
  sucursales,
  discrepancies,
  onDataChange,
}: PaymentsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [processingPayment, setProcessingPayment] = useState<Payment | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [documentFilter, setDocumentFilter] = useState("all")
  const [sucursalFilter, setSucursalFilter] = useState("all")
  const [discrepancyFilter, setDiscrepancyFilter] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    supplierId: "",
    sucursalId: "",
    idFactura: "",
    fechaRemito: "",
    fechaRecepcion: "",
    tipoDocumento: "Factura A" as "Factura A" | "Factura B" | "Factura C" | "Remito",
    descripcion: "",
    montoTotal: "",
  })

  const [paymentData, setPaymentData] = useState({
    monto: "",
    fechaPago: "",
    formaPago: "Efectivo" as "Efectivo" | "Mercado Pago" | "BBVA" | "Transferencia bancaria",
  })

  // Filtrar pagos con todos los filtros aplicados
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch =
        payment.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.sucursalNombre.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || payment.estado === statusFilter
      const matchesDocument = documentFilter === "all" || payment.tipoDocumento === documentFilter
      const matchesSucursal = sucursalFilter === "all" || payment.sucursalId === sucursalFilter
      const matchesDiscrepancy = !discrepancyFilter || discrepancies.some((d) => d._id === payment._id)

      return matchesSearch && matchesStatus && matchesDocument && matchesSucursal && matchesDiscrepancy
    })
  }, [payments, searchTerm, statusFilter, documentFilter, sucursalFilter, discrepancyFilter, discrepancies])

  // Calcular totales de los pagos filtrados
  const filteredTotals = useMemo(() => {
    const totalFacturas = filteredPayments.length
    const montoTotal = filteredPayments.reduce((sum, p) => sum + p.montoTotal, 0)
    const montoPagado = filteredPayments.reduce((sum, p) => sum + p.montoPagado, 0)
    const saldoPendiente = filteredPayments.reduce((sum, p) => sum + p.saldoPendiente, 0)

    return {
      totalFacturas,
      montoTotal,
      montoPagado,
      saldoPendiente,
    }
  }, [filteredPayments])

  const resetForm = () => {
    setFormData({
      supplierId: "",
      sucursalId: "",
      idFactura: "",
      fechaRemito: "",
      fechaRecepcion: "",
      tipoDocumento: "Factura A",
      descripcion: "",
      montoTotal: "",
    })
    setEditingPayment(null)
  }

  const resetPaymentForm = () => {
    setPaymentData({
      monto: "",
      fechaPago: "",
      formaPago: "Efectivo",
    })
    setProcessingPayment(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const paymentDataToSend = {
      ...formData,
      montoTotal: Number.parseFloat(formData.montoTotal),
      fechaRemito: new Date(formData.fechaRemito).toISOString(),
      fechaRecepcion: new Date(formData.fechaRecepcion).toISOString(),
    }

    try {
      console.log("💾 Saving payment:", paymentDataToSend)

      if (editingPayment) {
        const response = await fetch(`/api/payments/${editingPayment._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentDataToSend),
        })

        if (response.ok) {
          const updatedPayment = await response.json()
          console.log("✅ Payment updated:", updatedPayment)
          setPayments(payments.map((p) => (p._id === editingPayment._id ? updatedPayment : p)))
        } else {
          throw new Error(`Error ${response.status}: ${await response.text()}`)
        }
      } else {
        const response = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentDataToSend),
        })

        if (response.ok) {
          const newPayment = await response.json()
          console.log("✅ Payment created:", newPayment)
          setPayments([newPayment, ...payments])
        } else {
          throw new Error(`Error ${response.status}: ${await response.text()}`)
        }
      }

      setIsDialogOpen(false)
      resetForm()

      // Refrescar datos del dashboard
      if (onDataChange) {
        onDataChange()
      }
    } catch (error) {
      console.error("💥 Error saving payment:", error)
      alert("Error al guardar la factura. Por favor, intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!processingPayment) return

    setIsSubmitting(true)

    try {
      console.log("💰 Processing payment:", paymentData)
      const response = await fetch(`/api/payments/${processingPayment._id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      })

      if (response.ok) {
        const updatedPayment = await response.json()
        console.log("✅ Payment processed:", updatedPayment)
        setPayments(payments.map((p) => (p._id === processingPayment._id ? updatedPayment : p)))
        setIsPaymentDialogOpen(false)
        resetPaymentForm()

        // Refrescar datos del dashboard
        if (onDataChange) {
          onDataChange()
        }
      } else {
        throw new Error(`Error ${response.status}: ${await response.text()}`)
      }
    } catch (error) {
      console.error("💥 Error processing payment:", error)
      alert("Error al procesar el pago. Por favor, intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setFormData({
      supplierId: payment.supplierId,
      sucursalId: payment.sucursalId,
      idFactura: payment.idFactura,
      fechaRemito: new Date(payment.fechaRemito).toISOString().split("T")[0],
      fechaRecepcion: new Date(payment.fechaRecepcion).toISOString().split("T")[0],
      tipoDocumento: payment.tipoDocumento,
      descripcion: payment.descripcion,
      montoTotal: payment.montoTotal.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleProcessPayment = (payment: Payment) => {
    setProcessingPayment(payment)
    setPaymentData({
      monto: payment.saldoPendiente.toString(),
      fechaPago: new Date().toISOString().split("T")[0],
      formaPago: "Efectivo",
    })
    setIsPaymentDialogOpen(true)
  }

  const handleDeletePayment = async (payment: Payment) => {
    try {
      console.log("🗑️ Deleting payment:", payment.idFactura)
      const response = await fetch(`/api/payments/${payment._id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        console.log("✅ Payment deleted successfully")
        setPayments(payments.filter((p) => p._id !== payment._id))

        // Refrescar datos del dashboard
        if (onDataChange) {
          onDataChange()
        }
      } else {
        throw new Error(`Error ${response.status}: ${await response.text()}`)
      }
    } catch (error) {
      console.error("💥 Delete payment error:", error)
      alert("Error al eliminar la factura. Por favor, intenta de nuevo.")
    }
  }

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

  const isDiscrepancy = (payment: Payment) => {
    return discrepancies.some((d) => d._id === payment._id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Pagos</h2>
          <p className="text-gray-600">Controla las facturas y pagos a proveedores por sucursal</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingPayment ? "Editar Factura" : "Nueva Factura"}</DialogTitle>
              <DialogDescription>
                {editingPayment ? "Modifica los datos de la factura" : "Registra una nueva factura"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Proveedor *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers
                        .filter((s) => s.estado === "Activo")
                        .map((supplier) => (
                          <SelectItem key={supplier._id} value={supplier._id}>
                            {supplier.nombre}
                            {supplier.debeFacturar && " (Debe Facturar)"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sucursal">Sucursal *</Label>
                  <Select
                    value={formData.sucursalId}
                    onValueChange={(value) => setFormData({ ...formData, sucursalId: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursales
                        .filter((s) => s.activa)
                        .map((sucursal) => (
                          <SelectItem key={sucursal._id} value={sucursal._id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {sucursal.nombre}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idFactura">ID Factura *</Label>
                <Input
                  id="idFactura"
                  value={formData.idFactura}
                  onChange={(e) => setFormData({ ...formData, idFactura: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaRemito">Fecha Remito *</Label>
                  <Input
                    id="fechaRemito"
                    type="date"
                    value={formData.fechaRemito}
                    onChange={(e) => setFormData({ ...formData, fechaRemito: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaRecepcion">Fecha Recepción *</Label>
                  <Input
                    id="fechaRecepcion"
                    type="date"
                    value={formData.fechaRecepcion}
                    onChange={(e) => setFormData({ ...formData, fechaRecepcion: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
                  <Select
                    value={formData.tipoDocumento}
                    onValueChange={(value: "Factura A" | "Factura B" | "Factura C" | "Remito") =>
                      setFormData({ ...formData, tipoDocumento: value })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Factura A">Factura A</SelectItem>
                      <SelectItem value="Factura B">Factura B</SelectItem>
                      <SelectItem value="Factura C">Factura C</SelectItem>
                      <SelectItem value="Remito">Remito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="montoTotal">Monto Total *</Label>
                  <Input
                    id="montoTotal"
                    type="number"
                    step="0.01"
                    value={formData.montoTotal}
                    onChange={(e) => setFormData({ ...formData, montoTotal: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              {/* Alerta de discrepancia */}
              {formData.supplierId &&
                formData.tipoDocumento === "Remito" &&
                (() => {
                  const supplier = suppliers.find((s) => s._id === formData.supplierId)
                  return supplier?.debeFacturar ? (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Discrepancia detectada:</strong> Este proveedor debe entregar Factura A, pero se está
                        registrando un Remito.
                      </AlertDescription>
                    </Alert>
                  ) : null
                })()}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : editingPayment ? "Actualizar" : "Crear"} Factura
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para procesar pagos */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Procesar Pago</DialogTitle>
              <DialogDescription>Registra un pago para la factura {processingPayment?.idFactura}</DialogDescription>
            </DialogHeader>
            {processingPayment && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Proveedor: <span className="font-medium">{processingPayment.supplierName}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Sucursal: <span className="font-medium">{processingPayment.sucursalNombre}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Saldo pendiente:{" "}
                    <span className="font-bold text-red-600">${processingPayment.saldoPendiente.toLocaleString()}</span>
                  </p>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="monto">Monto a Pagar *</Label>
                    <Input
                      id="monto"
                      type="number"
                      step="0.01"
                      max={processingPayment.saldoPendiente}
                      value={paymentData.monto}
                      onChange={(e) => setPaymentData({ ...paymentData, monto: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fechaPago">Fecha de Pago *</Label>
                    <Input
                      id="fechaPago"
                      type="date"
                      value={paymentData.fechaPago}
                      onChange={(e) => setPaymentData({ ...paymentData, fechaPago: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="formaPago">Forma de Pago *</Label>
                    <Select
                      value={paymentData.formaPago}
                      onValueChange={(value: "Efectivo" | "Mercado Pago" | "BBVA" | "Transferencia bancaria") =>
                        setPaymentData({ ...paymentData, formaPago: value })
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                        <SelectItem value="BBVA">BBVA</SelectItem>
                        <SelectItem value="Transferencia bancaria">Transferencia bancaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPaymentDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Procesando..." : "Procesar Pago"}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <Input
          placeholder="Buscar facturas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Pendiente">Pendientes</SelectItem>
            <SelectItem value="Pagado">Pagados</SelectItem>
            <SelectItem value="Parcialmente Pagado">Parcialmente Pagados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={documentFilter} onValueChange={setDocumentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los documentos</SelectItem>
            <SelectItem value="Factura A">Factura A</SelectItem>
            <SelectItem value="Factura B">Factura B</SelectItem>
            <SelectItem value="Factura C">Factura C</SelectItem>
            <SelectItem value="Remito">Remito</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sucursalFilter} onValueChange={setSucursalFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales</SelectItem>
            {sucursales.map((sucursal) => (
              <SelectItem key={sucursal._id} value={sucursal._id}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {sucursal.nombre}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={discrepancyFilter ? "default" : "outline"}
          onClick={() => setDiscrepancyFilter(!discrepancyFilter)}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Solo Discrepancias
        </Button>
      </div>

      {/* Totalizador */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Calculator className="h-5 w-5" />
            Resumen de Facturas Mostradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredTotals.totalFacturas}</div>
              <p className="text-sm text-blue-700">Facturas</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">${filteredTotals.montoTotal.toLocaleString()}</div>
              <p className="text-sm text-gray-700">Monto Total</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${filteredTotals.montoPagado.toLocaleString()}</div>
              <p className="text-sm text-green-700">Pagado</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">${filteredTotals.saldoPendiente.toLocaleString()}</div>
              <p className="text-sm text-red-700">Saldo Pendiente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de facturas */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas Registradas</CardTitle>
          <CardDescription>Lista de todas las facturas y su estado de pago por sucursal</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha Recepción</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment._id} className={isDiscrepancy(payment) ? "bg-red-50" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {payment.supplierName}
                      {isDiscrepancy(payment) && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.tipoDocumento === "Remito" ? "outline" : "secondary"}>
                      {payment.tipoDocumento}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(payment.fechaRecepcion).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      {payment.sucursalNombre}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{payment.descripcion}</TableCell>
                  <TableCell>${payment.montoTotal.toLocaleString()}</TableCell>
                  <TableCell>${payment.montoPagado.toLocaleString()}</TableCell>
                  <TableCell className={payment.saldoPendiente > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                    ${payment.saldoPendiente.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.estado)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(payment)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {payment.saldoPendiente > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProcessPayment(payment)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar Factura?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que quieres eliminar la factura <strong>{payment.idFactura}</strong> de{" "}
                              <strong>{payment.supplierName}</strong> en <strong>{payment.sucursalNombre}</strong>?
                              <br />
                              <br />
                              Esta acción no se puede deshacer y se perderá toda la información asociada, incluyendo el
                              historial de pagos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePayment(payment)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar Factura
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron facturas</p>
              {payments.length === 0 && (
                <p className="text-sm text-gray-400 mt-2">Haz clic en "Nueva Factura" para comenzar</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
