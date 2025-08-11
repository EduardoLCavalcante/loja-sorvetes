import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const noStoreHeaders: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Content-Type": "application/json; charset=utf-8",
}

async function requireUser(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { ok: false as const, status: 500, message: "Supabase env not configured." }
  }
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return { ok: false as const, status: 401, message: "Missing bearer token." }
  }
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim()
  const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${accessToken}` } } })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) {
    return { ok: false as const, status: 401, message: "Invalid token." }
  }
  return { ok: true as const, url }
}

function parsePrice(input: unknown): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === "number" && Number.isFinite(input)) return input
  let s = String(input).trim()
  if (!s) return null
  s = s.replace(/[Rr]\$|\s/g, "")
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(/,/g, ".")
  else if (s.includes(",")) s = s.replace(/,/g, ".")
  s = s.replace(/[^0-9.-]/g, "")
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function normalizeRow(url: string, p: any) {
  const publicBase = `${url.replace(/\/$/, "")}/storage/v1/object/public/products/images/`
  let imageUrl: string | null = null
  if (typeof p?.caminho === "string" && p.caminho.length > 0) {
    imageUrl = p.caminho.startsWith("http") ? p.caminho : `${publicBase}${encodeURI(p.caminho)}`
  }
  const price = parsePrice(p?.price) ?? 0
  const original = parsePrice(p?.original_price) ?? price
  return {
    id: p.id,
    nome_produto: p.nome_produto,
    descricao: p.descricao ?? null,
    price: Math.round(price * 100) / 100,
    original_price: Math.round(original * 100) / 100,
    categoria: Array.isArray(p?.categoria) ? p.categoria : [],
    caminho: p.caminho,
    image_url: imageUrl,
    stock: Number.isFinite(Number(p?.stock)) ? Number(p.stock) : 0,
    is_new: !!p?.is_new,
    is_best_seller: !!p?.is_best_seller,
  }
}

export async function GET(req: Request) {
  try {
    noStore()
    const auth = await requireUser(req)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status, headers: noStoreHeaders })
    const url = auth.url!
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!service) return NextResponse.json({ error: "Service key missing." }, { status: 500, headers: noStoreHeaders })
    const supabase = createClient(url, service)

    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })

    return NextResponse.json(
      { products: (data || []).map((p: any) => normalizeRow(url, p)) },
      { headers: noStoreHeaders },
    )
  } catch (e: any) {
    console.error("GET /api/admin/products", e?.message || e)
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: noStoreHeaders })
  }
}

export async function POST(req: Request) {
  try {
    noStore()
    const auth = await requireUser(req)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status, headers: noStoreHeaders })
    const url = auth.url!
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!service) return NextResponse.json({ error: "Service key missing." }, { status: 500, headers: noStoreHeaders })
    const supabase = createClient(url, service)

    const form = await req.formData()
    const nome_produto = String(form.get("nome_produto") || "").trim()
    const descricao = (form.get("descricao") ? String(form.get("descricao")) : "").trim() || null
    const priceRaw = form.get("price")
    const originalRaw = form.get("original_price")
    const stockRaw = form.get("stock")
    const isNewRaw = form.get("is_new")
    const isBestRaw = form.get("is_best_seller")
    const categoriaRaw = form.get("categoria")
    const image = form.get("image") as File | null

    if (!nome_produto)
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400, headers: noStoreHeaders })
    if (!priceRaw) return NextResponse.json({ error: "Preço é obrigatório." }, { status: 400, headers: noStoreHeaders })
    if (!image) return NextResponse.json({ error: "Imagem é obrigatória." }, { status: 400, headers: noStoreHeaders })

    const price = parsePrice(priceRaw) ?? 0
    const original_price = originalRaw != null ? (parsePrice(originalRaw) ?? price) : price
    const stock = stockRaw != null ? Math.max(0, Math.floor(Number(stockRaw))) : 0
    const is_new = String(isNewRaw || "false") === "true"
    const is_best_seller = String(isBestRaw || "false") === "true"

    let categoria: string[] = []
    try {
      if (typeof categoriaRaw === "string") {
        const v = JSON.parse(categoriaRaw)
        if (Array.isArray(v)) categoria = v
      }
    } catch {}

    // Ensure public bucket
    try {
      await supabase.storage.createBucket("products", { public: true })
    } catch {}

    // Always convert to WebP before storing
    const inputBuffer = Buffer.from(await image.arrayBuffer())
    const webp = await sharp(inputBuffer).webp({ quality: 85, alphaQuality: 90, effort: 4 }).toBuffer()
    const baseName = slugify(nome_produto) || "produto"
    const objectPath = `images/${baseName}-${Date.now()}.webp`

    const { error: upErr } = await supabase.storage.from("products").upload(objectPath, webp, {
      contentType: "image/webp",
      upsert: false,
    })
    if (upErr) {
      return NextResponse.json(
        { error: `Falha ao enviar imagem: ${upErr.message}` },
        { status: 500, headers: noStoreHeaders },
      )
    }

    const { data: publicData } = supabase.storage.from("products").getPublicUrl(objectPath)
    const publicUrl =
      publicData?.publicUrl || `${url.replace(/\/$/, "")}/storage/v1/object/public/products/${objectPath}`

    const payload: any = {
      nome_produto,
      descricao,
      price,
      original_price,
      categoria,
      caminho: publicUrl,
      stock,
      is_new,
      is_best_seller,
    }

    const { data: inserted, error: insErr } = await supabase.from("products").insert(payload).select("*").single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500, headers: noStoreHeaders })

    return NextResponse.json({ product: normalizeRow(url, inserted) }, { status: 201, headers: noStoreHeaders })
  } catch (e: any) {
    console.error("POST /api/admin/products", e?.message || e)
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: noStoreHeaders })
  }
}

export async function PATCH(req: Request) {
  try {
    noStore()
    const auth = await requireUser(req)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status, headers: noStoreHeaders })
    const url = auth.url!
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!service) return NextResponse.json({ error: "Service key missing." }, { status: 500, headers: noStoreHeaders })
    const supabase = createClient(url, service)

    const contentType = req.headers.get("content-type") || ""
    let id: number | null = null
    const update: any = {}

    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as any
      if (!body || typeof body.id !== "number") {
        return NextResponse.json({ error: "Payload inválido." }, { status: 400, headers: noStoreHeaders })
      }
      id = body.id
      if (typeof body.nome_produto === "string") update.nome_produto = body.nome_produto.trim()
      if (typeof body.descricao === "string") update.descricao = body.descricao.trim()
      if (body.price != null) update.price = parsePrice(body.price) ?? 0
      if (body.original_price != null) update.original_price = parsePrice(body.original_price) ?? update.price
      if (Array.isArray(body.categoria)) update.categoria = body.categoria
      if (typeof body.stock === "number") update.stock = Math.max(0, Math.floor(body.stock))
      if (typeof body.is_new === "boolean") update.is_new = body.is_new
      if (typeof body.is_best_seller === "boolean") update.is_best_seller = body.is_best_seller
    } else {
      const form = await req.formData()
      const idRaw = form.get("id")
      id = Number(idRaw)
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "ID inválido." }, { status: 400, headers: noStoreHeaders })
      }
      const nome_produto = form.get("nome_produto")
      const descricao = form.get("descricao")
      const priceRaw = form.get("price")
      const originalRaw = form.get("original_price")
      const stockRaw = form.get("stock")
      const isNewRaw = form.get("is_new")
      const isBestRaw = form.get("is_best_seller")
      const categoriaRaw = form.get("categoria")
      const image = form.get("image") as File | null

      if (typeof nome_produto === "string") update.nome_produto = nome_produto.trim()
      if (typeof descricao === "string") update.descricao = descricao.trim()
      if (priceRaw != null) update.price = parsePrice(priceRaw) ?? 0
      if (originalRaw != null) update.original_price = parsePrice(originalRaw) ?? update.price
      if (stockRaw != null) update.stock = Math.max(0, Math.floor(Number(stockRaw)))
      if (typeof isNewRaw === "string") update.is_new = isNewRaw === "true"
      if (typeof isBestRaw === "string") update.is_best_seller = isBestRaw === "true"
      try {
        if (typeof categoriaRaw === "string") {
          const v = JSON.parse(categoriaRaw)
          if (Array.isArray(v)) update.categoria = v
        }
      } catch {}

      if (image) {
        // convert to webp and upload
        const inputBuffer = Buffer.from(await image.arrayBuffer())
        const webp = await sharp(inputBuffer).webp({ quality: 85, alphaQuality: 90, effort: 4 }).toBuffer()
        const baseName =
          slugify(typeof update.nome_produto === "string" ? update.nome_produto : String(id)) || "produto"
        const objectPath = `images/${baseName}-${Date.now()}.webp`

        // ensure bucket
        try {
          await supabase.storage.createBucket("products", { public: true })
        } catch {}

        const { error: upErr } = await supabase.storage.from("products").upload(objectPath, webp, {
          contentType: "image/webp",
          upsert: false,
        })
        if (upErr) {
          return NextResponse.json(
            { error: `Falha ao enviar imagem: ${upErr.message}` },
            { status: 500, headers: noStoreHeaders },
          )
        }
        const { data: publicData } = supabase.storage.from("products").getPublicUrl(objectPath)
        const publicUrl =
          publicData?.publicUrl || `${url.replace(/\/$/, "")}/storage/v1/object/public/products/${objectPath}`
        update.caminho = publicUrl
      }
    }

    if (!Number.isFinite(Number(id))) {
      return NextResponse.json({ error: "ID ausente." }, { status: 400, headers: noStoreHeaders })
    }

    const { data, error } = await supabase.from("products").update(update).eq("id", id!).select("*").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })

    return NextResponse.json({ product: normalizeRow(url, data) }, { headers: noStoreHeaders })
  } catch (e: any) {
    console.error("PATCH /api/admin/products", e?.message || e)
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: noStoreHeaders })
  }
}

export async function DELETE(req: Request) {
  try {
    noStore()
    const auth = await requireUser(req)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status, headers: noStoreHeaders })
    const url = auth.url!
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!service) return NextResponse.json({ error: "Service key missing." }, { status: 500, headers: noStoreHeaders })
    const supabase = createClient(url, service)

    let id: number | null = null
    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as any
      if (body && typeof body.id === "number") id = body.id
    }
    if (id === null) {
      const search = new URL(req.url).searchParams.get("id")
      if (search && Number.isFinite(Number(search))) id = Number(search)
    }
    if (!Number.isFinite(Number(id))) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400, headers: noStoreHeaders })
    }

    // try to remove storage object if from our bucket
    const { data: row } = await supabase.from("products").select("caminho").eq("id", id!).single()
    if (row?.caminho && typeof row.caminho === "string") {
      const m = row.caminho.match(/\/storage\/v1\/object\/public\/products\/(.+)$/)
      const key = m?.[1]
      if (key) {
        await supabase.storage
          .from("products")
          .remove([key])
          .catch(() => undefined)
      }
    }

    const { error } = await supabase.from("products").delete().eq("id", id!)
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders })

    return NextResponse.json({ ok: true, id }, { headers: noStoreHeaders })
  } catch (e: any) {
    console.error("DELETE /api/admin/products", e?.message || e)
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: noStoreHeaders })
  }
}
