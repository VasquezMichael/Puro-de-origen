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
import { Plus, Edit, Trash2, Building2, MapPin } from "lucide-react"
import type { Sucursal } from "@/app/dashboard/page"

interface SucursalesTabProps {
  sucursales: Sucursal[]
  setSucursales: (sucursales: Sucursal[]) => void
  onDataChange?: () => void
}

export function SucursalesTab({ sucursales, setSucursales, onDataChange }: SucursalesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    activa: true,
  })

  const [isInitializing, setIsInitializing] = useState(false)

  const filteredSucursales = sucursales.filter((sucursal) => {
    const matchesSearch =
      sucursal.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sucursal.direccion && sucursal.direccion.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || (statusFilter === "activa" ? sucursal.activa : !sucursal.activa)

    return matchesSearch && matchesStatus
  })

  const resetForm = () => {
    setFormData({
      nombre: "",
      direccion: "",
      activa: true,
    })
    setEditingSucursal(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const sucursalData = {
      nombre: formData.nombre,
      direccion: formData.direccion,
      activa: formData.activa,
    }

    try {
      console.log("💾 Saving sucursal:", sucursalData)

      if (editingSucursal) {
        const response = await fetch(`/api/sucursales/${editingSucursal._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sucursalData),
        })

        if (response.ok) {
          const updatedSucursal = await response.json()
          console.log("✅ Sucursal updated:", updatedSucursal)
          setSucursales(sucursales.map((s) => (s._id === editingSucursal._id ? updatedSucursal : s)))
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || `Error ${response.status}`)
        }
      } else {
        const response = await fetch("/api/sucursales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sucursalData),
        })

        if (response.ok) {
          const newSucursal = await response.json()
          console.log("✅ Sucursal created:", newSucursal)
          setSucursales([newSucursal, ...sucursales])
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || `Error ${response.status}`)
        }
      }

      setIsDialogOpen(false)
      resetForm()

      // Refrescar datos del dashboard
      if (onDataChange) {
        onDataChange()
      }
    } catch (error) {
      console.error("💥 Error saving sucursal:", error)
      alert(`Error al guardar la sucursal: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (sucursal: Sucursal) => {
    setEditingSucursal(sucursal)
    setFormData({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion || "",
      activa: sucursal.activa,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (sucursalId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta sucursal?")) {
      try {
        console.log("🗑️ Deleting sucursal:", sucursalId)
        const response = await fetch(`/api/sucursales/${sucursalId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          console.log("✅ Sucursal deleted successfully")
          setSucursales(sucursales.filter((s) => s._id !== sucursalId))

          // Refrescar datos del dashboard
          if (onDataChange) {
            onDataChange()
          }
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || `Error ${response.status}`)
        }
      } catch (error) {
        console.error("💥 Error deleting sucursal:", error)
        alert(`Error al eliminar la sucursal: ${error instanceof Error ? error.message : "Error desconocido"}`)
      }
    }
  }

  const handleInitialize = async () => {
    if (confirm("¿Quieres crear las sucursales por defecto (Calle 59, Calle 50, Calle 13, Cocina)?")) {
      setIsInitializing(true)
      try {
        console.log("🏢 Inicializando sucursales por defecto...")
        const response = await fetch("/api/sucursales/init", {
          method: "POST",
        })

        if (response.ok) {
          const data = await response.json()
          console.log("✅ Sucursales inicializadas:", data)
          alert(
            `Inicialización completada:\n${data.results.map((r) => `${r.action === "created" ? "✅ Creada" : "ℹ️ Ya existía"}: ${r.sucursal}`).join("\n")}`,
          )

          // Refrescar datos
          if (onDataChange) {
            onDataChange()
          }
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || `Error ${response.status}`)
        }
      } catch (error) {
        console.error("💥 Error initializing sucursales:", error)
        alert(`Error al inicializar sucursales: ${error instanceof Error ? error.message : "Error desconocido"}`)
      } finally {
        setIsInitializing(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Sucursales</h2>
          <p className="text-gray-600">Administra las sucursales de tu empresa</p>
        </div>

        <div className="flex gap-2">
          {sucursales.length === 0 && (
            <Button variant="outline" onClick={handleInitialize} disabled={isInitializing}>
              {isInitializing ? "Inicializando..." : "Crear Sucursales por Defecto"}
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sucursal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingSucursal ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
                <DialogDescription>
                  {editingSucursal
                    ? "Modifica la información de la sucursal"
                    : "Ingresa los datos de la nueva sucursal"}
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
                    placeholder="Ej: Calle 59, Calle 50, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Textarea
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Dirección completa de la sucursal..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="activa"
                      checked={formData.activa}
                      onCheckedChange={(checked) => setFormData({ ...formData, activa: checked as boolean })}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="activa" className="text-sm">
                      Sucursal activa
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : editingSucursal ? "Actualizar" : "Crear"} Sucursal
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar sucursales..."
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
            <SelectItem value="activa">Activas</SelectItem>
            <SelectItem value="inactiva">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSucursales.map((sucursal) => (
          <Card key={sucursal._id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {sucursal.nombre}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={sucursal.activa ? "default" : "secondary"}>
                      {sucursal.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sucursal.direccion && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{sucursal.direccion}</span>
                </div>
              )}

              <div className="text-xs text-gray-500">Creada: {new Date(sucursal.createdAt).toLocaleDateString()}</div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(sucursal)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(sucursal._id)}
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

      {filteredSucursales.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No se encontraron sucursales</p>
            {sucursales.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">Haz clic en "Nueva Sucursal" para comenzar</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
