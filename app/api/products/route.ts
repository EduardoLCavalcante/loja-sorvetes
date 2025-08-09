import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anon) {
      return NextResponse.json(
        { error: "Supabase env not configured (SUPABASE_URL / SUPABASE_ANON_KEY)." },
        { status: 500 },
      )
    }

    const supabase = createClient(url, anon)

    // Select everything to be tolerant to schema differences
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    // Base public path for images in the 'products' bucket (in case caminho is just the filename)
    const supabasePublicImagesBase = `${url.replace(/\/$/, "")}/storage/v1/object/public/products/images/`

    const out = (products || []).map((p: any) => {
      const priceVal = p?.price != null ? Number(p.price) : 0
      const originalVal = p?.original_price != null ? Number(p.original_price) : priceVal

      // caminho:
      // - If absolute URL (starts with http), use it directly
      // - Else, construct Supabase public URL with the known bucket path
      let imageUrl: string | null = null
      if (typeof p?.caminho === "string" && p.caminho.length > 0) {
        imageUrl = p.caminho.startsWith("http")
          ? p.caminho
          : `${supabasePublicImagesBase}${encodeURIComponent(p.caminho)}`
      }

      return {
        id: p.id,
        nome_produto: p.nome_produto,
        descricao: p.descricao ?? null,
        price: priceVal,
        original_price: originalVal,
        categoria: Array.isArray(p?.categoria) ? p.categoria : [],
        caminho: p.caminho,
        is_new: !!p?.is_new,
        is_best_seller: !!p?.is_best_seller,
        image_url: imageUrl,
      }
    })

    // Distinct category list
    const catSet = new Set<string>()
    for (const p of out) {
      for (const c of p.categoria || []) if (c) catSet.add(c)
    }
    const categories = Array.from(catSet).sort((a, b) => a.localeCompare(b, "pt-BR"))

    return NextResponse.json({ products: out, categories })
  } catch (err: any) {
    console.error("GET /api/products error:", err?.message || err)
    // Always return JSON
    return NextResponse.json({ error: "Internal error while listing products." }, { status: 500 })
  }
}
