import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  weight: "100 900",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Control de Pagos a Proveedores",
  description: "Sistema de gestión de pagos y proveedores",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={geist.className}>{children}</body>
    </html>
  )
}
