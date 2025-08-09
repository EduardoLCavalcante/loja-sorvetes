import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { unstable_noStore as noStore } from "next/cache"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

function parsePrice(input: unknown): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === "number" && Number.isFinite(input)) return input

  const raw = String(input).trim()
  if (!raw) return null

  // Remove "R$", espaços e caracteres não numéricos (exceto . , -)
  let s = raw.replace(/[Rr]\$|\s/g, "")

  // Se tiver ponto e vírgula, assume "." como milhar e "," como decimal -> remove pontos e troca vírgula por ponto
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(/,/g, ".")
  } else if (s.includes(",")) {
    // Só vírgula -> decimal pt-BR
    s = s.replace(/,/g, ".")
  }

  // Remover quaisquer caracteres restantes que não sejam dígitos, ponto ou sinal
  s = s.replace(/[^0-9.-]/g, "")

  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  try {
    noStore()
    const noStoreHeaders = {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anon) {
      return NextResponse.json(
        { error: "Supabase env not configured (SUPABASE_URL / SUPABASE_ANON_KEY)." },
        { status: 500, headers: noStoreHeaders },
      )
    }

    const supabase = createClient(url, anon)

    // Select tudo para tolerar diferenças de schema
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("price", { ascending: false })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500, headers: noStoreHeaders })
    }

    // Caminho base público (caso caminho não seja URL absoluta)
    const supabasePublicImagesBase = `${url.replace(/\/$/, "")}/storage/v1/object/public/products/images/`

    const out = (products || []).map((p: any) => {
      // Parse robusto de price e original_price (aceita "12,90", "R$ 12,90", "12.90", etc.)
      let priceVal = parsePrice(p?.price)
      let originalVal = parsePrice(p?.original_price)

      // Fallbacks razoáveis
      if (priceVal == null && originalVal != null) priceVal = originalVal
      if (originalVal == null && priceVal != null) originalVal = priceVal

      // Se ainda assim não houver valor, define 0 explicitamente
      if (priceVal == null) priceVal = 0
      if (originalVal == null) originalVal = priceVal

      // Arredonda para 2 casas
      priceVal = Math.round(priceVal * 100) / 100
      originalVal = Math.round(originalVal * 100) / 100

      // URL da imagem
      let imageUrl: string | null = null
      if (typeof p?.caminho === "string" && p.caminho.length > 0) {
        imageUrl = p.caminho.startsWith("http") ? p.caminho : `${supabasePublicImagesBase}${encodeURI(p.caminho)}`
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

    // Lista de categorias distintas
    const catSet = new Set<string>()
    for (const p of out) {
      for (const c of p.categoria || []) if (c) catSet.add(c)
    }
    const categories = Array.from(catSet).sort((a, b) => a.localeCompare(b, "pt-BR"))

    return NextResponse.json({ products: out, categories }, { headers: noStoreHeaders })
  } catch (err: any) {
    console.error("GET /api/products error:", err?.message || err)
    return NextResponse.json({ error: "Internal error while listing products." }, { status: 500 })
  }
}
