import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items são obrigatórios" }, { status: 400 })
    }

    for (const item of items) {
      const { id, quantity } = item

      // Buscar estoque atual
      const { data: product, error: fetchError } = await supabase.from("products").select("stock").eq("id", id).single()

      if (fetchError) {
        console.error("Erro ao buscar produto:", fetchError)
        continue
      }

      // Calcular novo estoque (não permitir negativo)
      const newStock = Math.max(0, (product.stock || 0) - quantity)

      // Atualizar estoque
      const { error: updateError } = await supabase.from("products").update({ stock: newStock }).eq("id", id)

      if (updateError) {
        console.error("Erro ao atualizar estoque:", updateError)
      }
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("Erro ao reduzir estoque:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
