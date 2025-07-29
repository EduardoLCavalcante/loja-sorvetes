import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "./context/CartContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "D'lice Sorvetes - Sorvetes Artesanais Premium",
  description: "Sorvetes artesanais premium com ingredientes selecionados. Entrega rápida e gelada na sua casa!",
  keywords: "sorvetes, artesanal, premium, entrega, gelato, sobremesa, d'lice",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}
