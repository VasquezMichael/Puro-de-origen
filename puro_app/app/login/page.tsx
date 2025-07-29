"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogIn, UserPlus } from "lucide-react"

export default function AuthPage() {
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  })

  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })

  const [loginError, setLoginError] = useState("")
  const [registerError, setRegisterError] = useState("")
  const [registerSuccess, setRegisterSuccess] = useState("")
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isRegisterLoading, setIsRegisterLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("login")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🚀 Login form submitted")
    setIsLoginLoading(true)
    setLoginError("")

    try {
      console.log("📤 Sending login request")

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      })

      console.log("📥 Login response status:", response.status)
      const data = await response.json()
      console.log("📥 Login response data:", data)

      if (response.ok) {
        console.log("✅ Login successful, redirecting...")
        // Usar window.location en lugar de router.push para evitar problemas de módulos
        window.location.href = "/dashboard"
      } else {
        console.log("❌ Login failed:", data.error)
        setLoginError(data.error || "Error al iniciar sesión")
      }
    } catch (error) {
      console.error("💥 Login request error:", error)
      setLoginError("Error de conexión. Verifica tu conexión a internet.")
    } finally {
      setIsLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🚀 Register form submitted")
    setIsRegisterLoading(true)
    setRegisterError("")
    setRegisterSuccess("")

    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError("Las contraseñas no coinciden")
      setIsRegisterLoading(false)
      return
    }

    if (registerData.password.length < 6) {
      setRegisterError("La contraseña debe tener al menos 6 caracteres")
      setIsRegisterLoading(false)
      return
    }

    try {
      console.log("📤 Sending register request")
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerData.username,
          password: registerData.password,
        }),
      })

      console.log("📥 Register response status:", response.status)
      const data = await response.json()
      console.log("📥 Register response data:", data)

      if (response.ok) {
        setRegisterSuccess("Usuario registrado exitosamente. Ahora puedes iniciar sesión.")
        setRegisterData({
          username: "",
          password: "",
          confirmPassword: "",
        })
        // Cambiar a la pestaña de login después de 2 segundos
        setTimeout(() => {
          setActiveTab("login")
          setLoginData({ username: registerData.username, password: "" })
        }, 2000)
      } else {
        console.log("❌ Register failed:", data.error)
        setRegisterError(data.error || "Error al registrar usuario")
      }
    } catch (error) {
      console.error("💥 Register request error:", error)
      setRegisterError("Error de conexión. Verifica tu conexión a internet.")
    } finally {
      setIsRegisterLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Control de Pagos</CardTitle>
          <CardDescription>Sistema de gestión de pagos a proveedores</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <LogIn className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <Alert variant="destructive">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-username">Usuario</Label>
                  <Input
                    id="login-username"
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    required
                    disabled={isLoginLoading}
                    placeholder="Ingresa tu nombre de usuario"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    disabled={isLoginLoading}
                    placeholder="Ingresa tu contraseña"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoginLoading}>
                  {isLoginLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {registerError && (
                  <Alert variant="destructive">
                    <AlertDescription>{registerError}</AlertDescription>
                  </Alert>
                )}

                {registerSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{registerSuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="register-username">Usuario</Label>
                  <Input
                    id="register-username"
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    required
                    disabled={isRegisterLoading}
                    placeholder="Elige un nombre de usuario"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    required
                    disabled={isRegisterLoading}
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirmar Contraseña</Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    required
                    disabled={isRegisterLoading}
                    minLength={6}
                    placeholder="Repite tu contraseña"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isRegisterLoading}>
                  {isRegisterLoading ? "Registrando..." : "Crear Cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
