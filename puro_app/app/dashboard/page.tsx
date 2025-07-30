"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, AlertTriangle, LogOut, RefreshCw, Building2 } from "lucide-react"
import { SuppliersTab } from "@/components/suppliers-tab"
import { PaymentsTab } from "@/components/payments-tab"
import { HistoryTab } from "@/components/history-tab"
import { UsersTab } from "@/components/users-tab"
import { SucursalesTab } from "@/components/sucursales-tab"
import { useRouter } from "next/navigation"

export interface Supplier {
  _id: string
  nombre: string
  contacto: {
    telefono: string
  }
  estado: "Activo" | "Inactivo"
  informacionVaria: string
  debeFacturar: boolean
  createdAt: string
}

export interface Sucursal {
  _id: string
  nombre: string
  direccion?: string
  activa: boolean
  createdAt: string
}

export interface Payment {
  _id: string
  idFactura: string
  supplierId: string
  supplierName: string
  sucursalId: string
  sucursalNombre: string
  fechaRemito: string
  fechaRecepcion: string
  tipoDocumento: "Factura A" | "Factura B" | "Factura C" | "Remito"
  descripcion: string
  montoTotal: number
  montoPagado: number
  saldoPendiente: number
  estado: "Pendiente" | "Pagado" | "Parcialmente Pagado"
  historialPagos: Array<{
    fechaPago: string
    monto: number
    formaPago: "Efectivo" | "Mercado Pago" | "BBVA" | "Transferencia bancaria"
  }>
  createdAt: string
}

export default function Dashboard() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Función para obtener datos de la API
  const fetchData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      console.log("🔄 Fetching data from API...")

      const [suppliersRes, sucursalesRes, paymentsRes] = await Promise.all([
        fetch("/api/suppliers", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
        fetch("/api/sucursales", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
        fetch("/api/payments", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
      ])

      console.log("📥 API Response status:", {
        suppliers: suppliersRes.status,
        sucursales: sucursalesRes.status,
        payments: paymentsRes.status,
      })

      if (!suppliersRes.ok || !sucursalesRes.ok || !paymentsRes.ok) {
        throw new Error(
          `API Error: Suppliers ${suppliersRes.status}, Sucursales ${sucursalesRes.status}, Payments ${paymentsRes.status}`,
        )
      }

      const [suppliersData, sucursalesData, paymentsData] = await Promise.all([
        suppliersRes.json(),
        sucursalesRes.json(),
        paymentsRes.json(),
      ])

      console.log("✅ Data fetched successfully:", {
        suppliers: suppliersData.length,
        sucursales: sucursalesData.length,
        payments: paymentsData.length,
      })

      setSuppliers(suppliersData)
      setSucursales(sucursalesData)
      setPayments(paymentsData)
    } catch (error) {
      console.error("💥 Error fetching data:", error)
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData()
  }, [])

  // Función para refrescar datos manualmente
  const handleRefresh = () => {
    fetchData(true)
  }

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Funciones para actualizar datos en tiempo real
  const updateSuppliers = (newSuppliers: Supplier[]) => {
    console.log("🔄 Updating suppliers in real-time:", newSuppliers.length)
    setSuppliers(newSuppliers)
  }

  const updateSucursales = (newSucursales: Sucursal[]) => {
    console.log("🔄 Updating sucursales in real-time:", newSucursales.length)
    setSucursales(newSucursales)
  }

  const updatePayments = (newPayments: Payment[]) => {
    console.log("🔄 Updating payments in real-time:", newPayments.length)
    setPayments(newPayments)
  }

  // Calcular métricas
  const activeSuppliers = suppliers.filter((s) => s.estado === "Activo").length
  const activeSucursales = sucursales.filter((s) => s.activa).length
  const pendingPayments = payments.filter((p) => p.estado === "Pendiente")
  const paidPayments = payments.filter((p) => p.estado === "Pagado")
  const partialPayments = payments.filter((p) => p.estado === "Parcialmente Pagado")

  const totalPending =
    pendingPayments.reduce((sum, p) => sum + p.saldoPendiente, 0) +
    partialPayments.reduce((sum, p) => sum + p.saldoPendiente, 0)
  const totalPaid =
    paidPayments.reduce((sum, p) => sum + p.montoPagado, 0) + partialPayments.reduce((sum, p) => sum + p.montoPagado, 0)

  // Detectar discrepancias (Remito + Debe Facturar)
  const discrepancies = payments.filter((payment) => {
    const supplier = suppliers.find((s) => s._id === payment.supplierId)
    return supplier?.debeFacturar && payment.tipoDocumento === "Remito"
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Error de Conexión</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchData()} className="mr-2">
            Reintentar
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Control de Pagos a Proveedores</h1>
              <p className="text-gray-600">Gestiona y controla todos los pagos a tus proveedores</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {suppliers.length} Proveedores
                </Badge>
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  {sucursales.length} Sucursales
                </Badge>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {payments.length} Facturas
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Actualizando..." : "Actualizar"}
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
            <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
            <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
           {/* <TabsTrigger value="users">Usuarios</TabsTrigger>*/}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Métricas principales */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeSuppliers}</div>
                  <p className="text-xs text-muted-foreground">Total de proveedores activos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sucursales Activas</CardTitle>
                  <Building2 className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeSucursales}</div>
                  <p className="text-xs text-muted-foreground">Sucursales operativas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
                  <DollarSign className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalPending.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {pendingPayments.length + partialPayments.length} facturas con saldo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Discrepancias</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{discrepancies.length}</div>
                  <p className="text-xs text-muted-foreground">Remitos de proveedores que deben facturar</p>
                </CardContent>
              </Card>
            </div>

            {/* Pagos pendientes y discrepancias */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-orange-500" />
                    Pagos Pendientes
                  </CardTitle>
                  <CardDescription>Facturas con saldo pendiente de pago</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...pendingPayments, ...partialPayments].slice(0, 5).map((payment) => (
                      <div key={payment._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{payment.supplierName}</p>
                          <p className="text-sm text-gray-600">{payment.sucursalNombre}</p>
                          <p className="text-xs text-gray-500">
                            {payment.tipoDocumento} - {new Date(payment.fechaRecepcion).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${payment.saldoPendiente.toLocaleString()}</p>
                          <Badge variant={payment.estado === "Pendiente" ? "outline" : "secondary"}>
                            {payment.estado}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {pendingPayments.length + partialPayments.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No hay pagos pendientes</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Discrepancias Detectadas
                  </CardTitle>
                  <CardDescription>Remitos de proveedores que deben facturar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {discrepancies.slice(0, 5).map((payment) => (
                      <div
                        key={payment._id}
                        className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50"
                      >
                        <div>
                          <p className="font-medium">{payment.supplierName}</p>
                          <p className="text-sm text-gray-600">{payment.sucursalNombre}</p>
                          <p className="text-xs text-red-600">Remito presentado - Debe entregar Factura A</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${payment.montoTotal.toLocaleString()}</p>
                          <Badge variant="destructive">Discrepancia</Badge>
                        </div>
                      </div>
                    ))}
                    {discrepancies.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No hay discrepancias detectadas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="suppliers">
            <SuppliersTab suppliers={suppliers} setSuppliers={updateSuppliers} onDataChange={handleRefresh} />
          </TabsContent>

          <TabsContent value="sucursales">
            <SucursalesTab sucursales={sucursales} setSucursales={updateSucursales} onDataChange={handleRefresh} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab
              payments={payments}
              setPayments={updatePayments}
              suppliers={suppliers}
              sucursales={sucursales}
              discrepancies={discrepancies}
              onDataChange={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab payments={payments} />
          </TabsContent>

         <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
