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
import { Plus, Edit, Trash2, Phone, FileText } from "lucide-react"
import type { Supplier } from "@/app/dashboard/page"

interface SuppliersTabProps {
  suppliers: Supplier[]
  setSuppliers: (suppliers: Supplier[]) => void
  onDataChange?: () => void
}

export function SuppliersTab({ suppliers, setSuppliers, onDataChange }: SuppliersTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    informacionVaria: "",
    estado: "Activo" as "Activo" | "Inactivo",
    debeFacturar: false,
  })

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contacto.telefono.includes(searchTerm)

    const matchesStatus = statusFilter === "all" || supplier.estado === statusFilter

    return matchesSearch && matchesStatus
  })

  const resetForm = () => {
    setFormData({
      nombre: "",
      telefono: "",
      informacionVaria: "",
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
      contacto: {
        telefono: formData.telefono,
      },
      informacionVaria: formData.informacionVaria,
      estado: formData.estado,
      debeFacturar: formData.debeFacturar,
    }

    try {
      console.log("💾 Saving supplier:", supplierData)

      if (editingSupplier) {
        const response = await fetch(`/api/suppliers/${editingSupplier._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(supplierData),
        })

        if (response.ok) {
          const updatedSupplier = await response.json()
          console.log("✅ Supplier updated:", updatedSupplier)
          setSuppliers(suppliers.map((s) => (s._id === editingSupplier._id ? updatedSupplier : s)))
        } else {
          throw new Error(`Error ${response.status}: ${await response.text()}`)
        }
      } else {
        const response = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(supplierData),
        })

        if (response.ok) {
          const newSupplier = await response.json()
          console.log("✅ Supplier created:", newSupplier)
          setSuppliers([newSupplier, ...suppliers])
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
      console.error("💥 Error saving supplier:", error)
      alert("Error al guardar el proveedor. Por favor, intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      nombre: supplier.nombre,
      telefono: supplier.contacto.telefono,
      informacionVaria: supplier.informacionVaria,
      estado: supplier.estado,
      debeFacturar: supplier.debeFacturar,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (supplierId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este proveedor?")) {
      try {
        console.log("🗑️ Deleting supplier:", supplierId)
        const response = await fetch(`/api/suppliers/${supplierId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          console.log("✅ Supplier deleted successfully")
          setSuppliers(suppliers.filter((s) => s._id !== supplierId))

          // Refrescar datos del dashboard
          if (onDataChange) {
            onDataChange()
          }
        } else {
          throw new Error(`Error ${response.status}: ${await response.text()}`)
        }
      } catch (error) {
        console.error("💥 Error deleting supplier:", error)
        alert("Error al eliminar el proveedor. Por favor, intenta de nuevo.")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Proveedores</h2>
          <p className="text-gray-600">Administra la información de tus proveedores</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
              <DialogDescription>
                {editingSupplier ? "Modifica la información del proveedor" : "Ingresa los datos del nuevo proveedor"}
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
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="informacionVaria">Información Adicional</Label>
                <Textarea
                  id="informacionVaria"
                  value={formData.informacionVaria}
                  onChange={(e) => setFormData({ ...formData, informacionVaria: e.target.value })}
                  rows={3}
                  placeholder="Información variada sobre el proveedor..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
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

                <div className="space-y-2">
                  <Label>Obligación de Facturación</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="debeFacturar"
                      checked={formData.debeFacturar}
                      onCheckedChange={(checked) => setFormData({ ...formData, debeFacturar: checked as boolean })}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="debeFacturar" className="text-sm">
                      Debe Facturar (Factura A)
                    </Label>
                  </div>
                </div>
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
                  <CardTitle className="text-lg">{supplier.nombre}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={supplier.estado === "Activo" ? "default" : "secondary"}>{supplier.estado}</Badge>
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
              {supplier.contacto.telefono && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {supplier.contacto.telefono}
                </div>
              )}

              {supplier.informacionVaria && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Información adicional:</p>
                  <p className="text-xs bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto">
                    {supplier.informacionVaria}
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
            {suppliers.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">Haz clic en "Nuevo Proveedor" para comenzar</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
