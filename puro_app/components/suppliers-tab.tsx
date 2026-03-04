"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Phone, FileText, User, Mail, Link as LinkIcon } from "lucide-react"
import type { Supplier } from "@/app/dashboard/page"

interface SuppliersTabProps {
  suppliers: Supplier[]
  setSuppliers: (suppliers: Supplier[]) => void
  onDataChange?: () => void
}

function formatSector(sector?: "cocina" | "dietetica" | "otros") {
  if (sector === "cocina") return "Cocina"
  if (sector === "dietetica") return "Dietetica"
  return "Otros"
}

export function SuppliersTab({ suppliers, setSuppliers, onDataChange }: SuppliersTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    nombreSistema: "",
    sector: "otros" as "cocina" | "dietetica" | "otros",
    telefono: "",
    nombreContacto: "",
    emailContacto: "",
    datosWeb: "",
    urlWeb: "",
    condiciones: "",
    actualizacionPrecios: "",
    estado: "Activo" as "Activo" | "Inactivo",
    debeFacturar: false,
  })

  const filteredSuppliers = suppliers.filter((supplier) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      supplier.nombre.toLowerCase().includes(q) ||
      supplier.nombreSistema.toLowerCase().includes(q) ||
      (supplier.nombreContacto || "").toLowerCase().includes(q) ||
      (supplier.contacto?.telefono || "").includes(searchTerm) ||
      (supplier.contacto?.email || "").toLowerCase().includes(q)

    const matchesStatus = statusFilter === "all" || supplier.estado === statusFilter
    return matchesSearch && matchesStatus
  })

  const resetForm = () => {
    setFormData({
      nombre: "",
      nombreSistema: "",
      sector: "otros",
      telefono: "",
      nombreContacto: "",
      emailContacto: "",
      datosWeb: "",
      urlWeb: "",
      condiciones: "",
      actualizacionPrecios: "",
      estado: "Activo",
      debeFacturar: false,
    })
    setEditingSupplier(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const supplierData = {
      nombre: formData.nombre,
      nombreSistema: formData.nombreSistema,
      sector: formData.sector,
      contacto: {
        telefono: formData.telefono,
        email: formData.emailContacto,
      },
      nombreContacto: formData.nombreContacto,
      datosWeb: formData.datosWeb,
      urlWeb: formData.urlWeb,
      condiciones: formData.condiciones,
      actualizacionPrecios: formData.actualizacionPrecios,
      estado: formData.estado,
      debeFacturar: formData.debeFacturar,
    }

    try {
      if (editingSupplier) {
        const response = await fetch(`/api/suppliers/${editingSupplier._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(supplierData),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`)
        }

        const updatedSupplier = await response.json()
        setSuppliers(suppliers.map((s) => (s._id === editingSupplier._id ? updatedSupplier : s)))
      } else {
        const response = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(supplierData),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`)
        }

        const newSupplier = await response.json()
        setSuppliers([newSupplier, ...suppliers])
      }

      setIsDialogOpen(false)
      resetForm()
      if (onDataChange) onDataChange()
    } catch (error) {
      console.error("Error saving supplier:", error)
      alert("Error al guardar el proveedor. Por favor, intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      nombre: supplier.nombre || "",
      nombreSistema: supplier.nombreSistema,
      sector: supplier.sector || "otros",
      telefono: supplier.contacto?.telefono || "",
      nombreContacto: supplier.nombreContacto || "",
      emailContacto: supplier.contacto?.email || "",
      datosWeb: supplier.datosWeb || "",
      urlWeb: supplier.urlWeb || "",
      condiciones: supplier.condiciones || "",
      actualizacionPrecios: supplier.actualizacionPrecios || "",
      estado: supplier.estado,
      debeFacturar: supplier.debeFacturar,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (supplierId: string) => {
    if (!confirm("Estas seguro de que quieres eliminar este proveedor?")) return

    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`)
      }

      setSuppliers(suppliers.filter((s) => s._id !== supplierId))
      if (onDataChange) onDataChange()
    } catch (error) {
      console.error("Error deleting supplier:", error)
      alert("Error al eliminar el proveedor. Por favor, intenta de nuevo.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestion de Proveedores</h2>
          <p className="text-gray-600">Administra la informacion de tus proveedores</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
              <DialogDescription>
                {editingSupplier ? "Modifica la informacion del proveedor" : "Ingresa los datos del nuevo proveedor"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombreSistema">Nombre en Sistema *</Label>
                <Input
                  id="nombreSistema"
                  value={formData.nombreSistema}
                  onChange={(e) => setFormData({ ...formData, nombreSistema: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector</Label>
                  <Select
                    value={formData.sector}
                    onValueChange={(value: "cocina" | "dietetica" | "otros") =>
                      setFormData({ ...formData, sector: value })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cocina">Cocina</SelectItem>
                      <SelectItem value="dietetica">Dietetica</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value: "Activo" | "Inactivo") => setFormData({ ...formData, estado: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Debe Facturar *</Label>
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="debeFacturar"
                    checked={formData.debeFacturar}
                    onCheckedChange={(checked) => setFormData({ ...formData, debeFacturar: checked as boolean })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="debeFacturar" className="text-sm">
                    Debe Facturar
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreContacto">Nombre de Contacto</Label>
                  <Input
                    id="nombreContacto"
                    value={formData.nombreContacto}
                    onChange={(e) => setFormData({ ...formData, nombreContacto: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailContacto">Email de Contacto</Label>
                  <Input
                    id="emailContacto"
                    type="email"
                    value={formData.emailContacto}
                    onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="datosWeb">Lista y Datos Web</Label>
                <Textarea
                  id="datosWeb"
                  value={formData.datosWeb}
                  onChange={(e) => setFormData({ ...formData, datosWeb: e.target.value })}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urlWeb">URL Web</Label>
                <Input
                  id="urlWeb"
                  type="url"
                  value={formData.urlWeb}
                  onChange={(e) => setFormData({ ...formData, urlWeb: e.target.value })}
                  placeholder="https://..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condiciones">Condiciones</Label>
                <Textarea
                  id="condiciones"
                  value={formData.condiciones}
                  onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actualizacionPrecios">Actualizacion de Precios</Label>
                <Textarea
                  id="actualizacionPrecios"
                  value={formData.actualizacionPrecios}
                  onChange={(e) => setFormData({ ...formData, actualizacionPrecios: e.target.value })}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : editingSupplier ? "Actualizar" : "Crear"} Proveedor
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar proveedores..."
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
            <SelectItem value="Activo">Activos</SelectItem>
            <SelectItem value="Inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier._id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{supplier.nombre || supplier.nombreSistema}</CardTitle>
                  <p className="text-sm text-gray-600">{supplier.nombreSistema}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant={supplier.estado === "Activo" ? "default" : "secondary"}>{supplier.estado}</Badge>
                    <Badge variant="outline">{formatSector(supplier.sector)}</Badge>
                    {supplier.debeFacturar && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        <FileText className="h-3 w-3 mr-1" />
                        Debe Facturar
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {supplier.nombreContacto && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Contacto:</span> {supplier.nombreContacto}
                </div>
              )}

              {supplier.contacto?.telefono && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {supplier.contacto.telefono}
                </div>
              )}

              {supplier.contacto?.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {supplier.contacto.email}
                </div>
              )}

              {supplier.urlWeb && (
                <div className="text-sm">
                  <a
                    href={supplier.urlWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Abrir URL web
                  </a>
                </div>
              )}

              {supplier.datosWeb && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Lista y datos web:</p>
                  <p className="text-xs bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto">{supplier.datosWeb}</p>
                </div>
              )}

              {supplier.condiciones && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Condiciones:</p>
                  <p className="text-xs bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto">
                    {supplier.condiciones}
                  </p>
                </div>
              )}

              {supplier.actualizacionPrecios && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Actualizacion de precios:</p>
                  <p className="text-xs bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto">
                    {supplier.actualizacionPrecios}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(supplier._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No se encontraron proveedores</p>
            {suppliers.length === 0 && <p className="text-sm text-gray-400 mt-2">Haz clic en "Nuevo Proveedor" para comenzar</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
