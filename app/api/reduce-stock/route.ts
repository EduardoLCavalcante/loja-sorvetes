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

    const errors: string[] = []

    for (const item of items) {
      const { id, quantity } = item

      if (!id || !quantity || quantity <= 0) {
        errors.push(`Item inválido: ${JSON.stringify(item)}`)
        continue
      }

      // Operação atômica: GREATEST(stock - quantity, 0) em um único UPDATE
      // Elimina race condition entre leitura e escrita
      const { error } = await supabase.rpc("reduce_product_stock", {
        product_id: Number(id),
        reduce_by: Number(quantity),
      })

      if (error) {
        console.error(`Erro ao reduzir estoque do produto ${id}:`, error)
        errors.push(`Produto ${id}: ${error.message}`)
      }
    }

    return NextResponse.json(
      { success: true, errors: errors.length > 0 ? errors : undefined },
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
