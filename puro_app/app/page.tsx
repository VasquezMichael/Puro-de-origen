"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, AlertTriangle, TrendingUp, Clock } from "lucide-react"
import { SuppliersTab } from "@/components/suppliers-tab"
import { PaymentsTab } from "@/components/payments-tab"
import { HistoryTab } from "@/components/history-tab"

// Tipos de datos
export interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  address: string
  taxId: string
  paymentTerms: number
  status: "active" | "inactive"
  createdAt: Date
}

export interface Payment {
  id: string
  supplierId: string
  supplierName: string
  invoiceNumber: string
  description: string
  amount: number
  dueDate: Date
  status: "pending" | "paid" | "overdue"
  paidDate?: Date
  createdAt: Date
}

// Datos de ejemplo
const initialSuppliers: Supplier[] = [
  {
    id: "1",
    name: "Distribuidora ABC S.A.",
    email: "contacto@abc.com",
    phone: "+1234567890",
    address: "Av. Principal 123, Ciudad",
    taxId: "12345678-9",
    paymentTerms: 30,
    status: "active",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Servicios XYZ Ltda.",
    email: "info@xyz.com",
    phone: "+0987654321",
    address: "Calle Secundaria 456, Ciudad",
    taxId: "98765432-1",
    paymentTerms: 15,
    status: "active",
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "3",
    name: "Materiales DEF Corp.",
    email: "ventas@def.com",
    phone: "+1122334455",
    address: "Industrial 789, Ciudad",
    taxId: "11223344-5",
    paymentTerms: 45,
    status: "active",
    createdAt: new Date("2024-01-20"),
  },
]

const initialPayments: Payment[] = [
  {
    id: "1",
    supplierId: "1",
    supplierName: "Distribuidora ABC S.A.",
    invoiceNumber: "INV-001",
    description: "Suministros de oficina",
    amount: 1250.0,
    dueDate: new Date("2024-12-15"),
    status: "overdue",
    createdAt: new Date("2024-11-15"),
  },
  {
    id: "2",
    supplierId: "2",
    supplierName: "Servicios XYZ Ltda.",
    invoiceNumber: "INV-002",
    description: "Mantenimiento equipos",
    amount: 850.0,
    dueDate: new Date("2025-01-10"),
    status: "pending",
    createdAt: new Date("2024-12-26"),
  },
  {
    id: "3",
    supplierId: "1",
    supplierName: "Distribuidora ABC S.A.",
    invoiceNumber: "INV-003",
    description: "Materiales construcción",
    amount: 3200.0,
    dueDate: new Date("2024-12-20"),
    status: "paid",
    paidDate: new Date("2024-12-18"),
    createdAt: new Date("2024-11-20"),
  },
  {
    id: "4",
    supplierId: "3",
    supplierName: "Materiales DEF Corp.",
    invoiceNumber: "INV-004",
    description: "Herramientas especializadas",
    amount: 2100.0,
    dueDate: new Date("2025-01-25"),
    status: "pending",
    createdAt: new Date("2024-12-10"),
  },
]

export default function Dashboard() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [activeTab, setActiveTab] = useState("dashboard")

  // Calcular métricas
  const totalSuppliers = suppliers.filter((s) => s.status === "active").length
  const pendingPayments = payments.filter((p) => p.status === "pending")
  const overduePayments = payments.filter((p) => p.status === "overdue")
  const paidPayments = payments.filter((p) => p.status === "paid")

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0)
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Control de Pagos a Proveedores</h1>
          <p className="text-gray-600">Gestiona y controla todos los pagos a tus proveedores</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
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
                  <div className="text-2xl font-bold">{totalSuppliers}</div>
                  <p className="text-xs text-muted-foreground">Total de proveedores registrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalPending.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{pendingPayments.length} facturas pendientes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pagos Vencidos</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">${totalOverdue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{overduePayments.length} facturas vencidas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pagos Realizados</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{paidPayments.length} pagos completados</p>
                </CardContent>
              </Card>
            </div>

            {/* Pagos próximos a vencer */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Pagos Próximos a Vencer
                  </CardTitle>
                  <CardDescription>Facturas que vencen en los próximos 7 días</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payments
                      .filter((p) => {
                        const today = new Date()
                        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                        return p.status === "pending" && p.dueDate <= weekFromNow && p.dueDate >= today
                      })
                      .map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{payment.supplierName}</p>
                            <p className="text-sm text-gray-600">{payment.invoiceNumber}</p>
                            <p className="text-xs text-gray-500">Vence: {payment.dueDate.toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${payment.amount.toLocaleString()}</p>
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              Próximo
                            </Badge>
                          </div>
                        </div>
                      ))}
                    {payments.filter((p) => {
                      const today = new Date()
                      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                      return p.status === "pending" && p.dueDate <= weekFromNow && p.dueDate >= today
                    }).length === 0 && <p className="text-gray-500 text-center py-4">No hay pagos próximos a vencer</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Pagos Vencidos
                  </CardTitle>
                  <CardDescription>Facturas que requieren atención inmediata</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overduePayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50"
                      >
                        <div>
                          <p className="font-medium">{payment.supplierName}</p>
                          <p className="text-sm text-gray-600">{payment.invoiceNumber}</p>
                          <p className="text-xs text-red-600">Venció: {payment.dueDate.toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${payment.amount.toLocaleString()}</p>
                          <Badge variant="destructive">Vencido</Badge>
                        </div>
                      </div>
                    ))}
                    {overduePayments.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No hay pagos vencidos</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="suppliers">
            <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab payments={payments} setPayments={setPayments} suppliers={suppliers} />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab payments={payments} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
