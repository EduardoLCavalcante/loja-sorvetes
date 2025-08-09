import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "./context/CartContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "D'lice Sorvetes ",
  description: "Sorvetes  premium com ingredientes selecionados. Entrega rápida e gelada na sua casa!",
  keywords: "sorvetes premium, entrega, sobremesa, d'lice",
  generator: "",
  icons: {
    icon: "public/images/dlice-logo.png",
  },
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
