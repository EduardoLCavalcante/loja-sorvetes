import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"
import { parsePrice } from "@/lib/utils/pricing"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const PRODUCTS_BUCKET = "products"
const DEFAULT_CATEGORY = "Geral"

const noStoreHeaders: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Content-Type": "application/json; charset=utf-8",
}

type AuthResult =
  | { ok: true; url: string }
  | { ok: false; status: number; message: string }

type ProductUpdate = {
  nome_produto?: string
  descricao?: string | null
  price?: number
  original_price?: number
  caminho?: string
  is_new?: boolean
  is_best_seller?: boolean
  is_available?: boolean
}

type MoneyParseResult = { ok: true; value?: number } | { ok: false; error: string }
type CategoriesParseResult = { ok: true; categories: string[] } | { ok: false; error: string }
type UpdateBuildResult = { ok: true; update: ProductUpdate; categorias: string[] | null } | { ok: false; error: string }

async function requireUser(req: Request): Promise<AuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    return { ok: false, status: 500, message: "Supabase env not configured." }
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return { ok: false, status: 401, message: "Missing bearer token." }
  }

  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim()
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data, error } = await userClient.auth.getUser()

  if (error || !data?.user) {
    return { ok: false, status: 401, message: "Invalid token." }
  }

  return { ok: true, url }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders })
}

function getAdminClient(url: string) {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!service) return null

  return createClient(url, service)
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function normalizeStoragePath(value: unknown) {
  if (typeof value !== "string") return null
  const path = value.trim()
  if (!path) return null

  const marker = `/storage/v1/object/public/${PRODUCTS_BUCKET}/`
  const markerIndex = path.indexOf(marker)
  if (markerIndex >= 0) {
    return decodeURIComponent(path.slice(markerIndex + marker.length))
  }

  return path.replace(/^\/+/, "")
}

function buildPublicUrl(url: string, objectPath: string) {
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${PRODUCTS_BUCKET}/${objectPath}`
}

function normalizeRow(url: string, p: any) {
  const publicBase = `${url.replace(/\/$/, "")}/storage/v1/object/public/${PRODUCTS_BUCKET}/`
  let imageUrl: string | null = null
  if (typeof p?.caminho === "string" && p.caminho.length > 0) {
    imageUrl = p.caminho.startsWith("http") ? p.caminho : `${publicBase}${encodeURI(p.caminho)}`
  }

  const price = parsePrice(p?.price) ?? 0
  const original = parsePrice(p?.original_price) ?? price
  const categorias = (p.product_categories || []).map((pc: any) => pc.categories?.name).filter(Boolean)

  return {
    id: p.id,
    nome_produto: p.nome_produto,
    descricao: p.descricao ?? null,
    price: Math.round(price * 100) / 100,
    original_price: Math.round(original * 100) / 100,
    categoria: categorias,
    caminho: p.caminho,
    image_url: imageUrl,
    is_new: !!p?.is_new,
    is_best_seller: !!p?.is_best_seller,
    is_available: p?.is_available !== false,
  }
}

function parseId(input: unknown) {
  const id = typeof input === "number" ? input : Number(input)
  return Number.isInteger(id) && id > 0 ? id : null
}

function parseMoneyField(input: unknown, fieldName: string, required = false): MoneyParseResult {
  if (input === null || input === undefined || input === "") {
    return required ? { ok: false, error: `${fieldName} é obrigatório.` } : { ok: true, value: undefined }
  }

  const value = parsePrice(input)
  if (value === null || !Number.isFinite(value) || value < 0) {
    return { ok: false, error: `${fieldName} inválido.` }
  }

  return { ok: true, value: Math.round(value * 100) / 100 }
}

function parseBooleanField(input: unknown) {
  if (typeof input === "boolean") return input
  if (typeof input === "string") return input === "true"
  return false
}

function parseCategories(input: unknown, fallbackToDefault = false): CategoriesParseResult {
  let raw: unknown = input
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input)
    } catch {
      return { ok: false, error: "Categorias inválidas." }
    }
  }

  const values = Array.isArray(raw) ? raw : []
  const categories = Array.from(
    new Set(
      values
        .map((category) => String(category || "").trim())
        .filter(Boolean),
    ),
  )

  if (categories.length === 0 && fallbackToDefault) return { ok: true, categories: [DEFAULT_CATEGORY] }
  if (categories.length === 0) return { ok: false, error: "Informe ao menos uma categoria." }

  return { ok: true, categories }
}

function getFormFile(form: FormData, field: string) {
  const value = form.get(field)
  return value instanceof File && value.size > 0 ? value : null
}

async function ensureProductsBucket(supabase: any) {
  await supabase.storage.createBucket(PRODUCTS_BUCKET, { public: true }).catch(() => undefined)
}

async function uploadProductImage(supabase: any, url: string, image: File, productName: string) {
  await ensureProductsBucket(supabase)

  const inputBuffer = Buffer.from(await image.arrayBuffer())
  const webp = await sharp(inputBuffer).webp({ quality: 85, alphaQuality: 90, effort: 4 }).toBuffer()
  const baseName = slugify(productName) || "produto"
  const objectPath = `images/${baseName}-${Date.now()}.webp`

  const { error } = await supabase.storage.from(PRODUCTS_BUCKET).upload(objectPath, webp, {
    contentType: "image/webp",
    upsert: false,
  })

  if (error) throw new Error(`Falha ao enviar imagem: ${error.message}`)

  const { data } = supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(objectPath)
  return {
    publicUrl: data?.publicUrl || buildPublicUrl(url, objectPath),
    objectPath,
  }
}

async function removeStorageObject(supabase: any, caminho: unknown) {
  const objectPath = normalizeStoragePath(caminho)
  if (!objectPath) return

  await supabase.storage.from(PRODUCTS_BUCKET).remove([objectPath]).catch(() => undefined)
}

async function setProductCategories(supabase: any, productId: number, categorias: string[]) {
  for (const name of categorias) {
    const { error } = await supabase.from("categories").upsert(
      { name, slug: slugify(name) },
      { onConflict: "name", ignoreDuplicates: false },
    )
    if (error) throw new Error(`Falha ao salvar categoria "${name}": ${error.message}`)
  }

  const { data: categories, error: selectError } = await supabase
    .from("categories")
    .select("id, name")
    .in("name", categorias)

  if (selectError) throw new Error(selectError.message)
  if (!categories || categories.length !== categorias.length) {
    throw new Error("Falha ao localizar todas as categorias.")
  }

  const relations = categories.map((category: any) => ({
    product_id: productId,
    category_id: category.id,
  }))

  const { error: deleteError } = await supabase.from("product_categories").delete().eq("product_id", productId)
  if (deleteError) throw new Error(deleteError.message)

  const { error: insertError } = await supabase.from("product_categories").insert(relations)
  if (insertError) throw new Error(insertError.message)
}

async function fetchProductWithCategories(supabase: any, id: number) {
  return supabase
    .from("products")
    .select(
      `
        *,
        product_categories(
          categories(
            id,
            name,
            slug
          )
        )
      `,
    )
    .eq("id", id)
    .single()
}

function applyJsonUpdate(body: any): UpdateBuildResult {
  const update: ProductUpdate = {}
  let categorias: string[] | null = null

  if (typeof body.nome_produto === "string") {
    const nome = body.nome_produto.trim()
    if (!nome) return { ok: false, error: "Nome é obrigatório." }
    update.nome_produto = nome
  }

  if ("descricao" in body) {
    update.descricao = typeof body.descricao === "string" ? body.descricao.trim() || null : null
  }

  if ("price" in body) {
    const parsed = parseMoneyField(body.price, "Preço", true)
    if (!parsed.ok) return parsed
    update.price = parsed.value ?? 0
  }

  if ("original_price" in body) {
    const parsed = parseMoneyField(body.original_price, "Preço original")
    if (!parsed.ok) return parsed
    update.original_price = parsed.value ?? update.price
  }

  if ("is_new" in body) update.is_new = parseBooleanField(body.is_new)
  if ("is_best_seller" in body) update.is_best_seller = parseBooleanField(body.is_best_seller)
  if ("is_available" in body) update.is_available = parseBooleanField(body.is_available)

  if ("categoria" in body) {
    const parsed = parseCategories(body.categoria)
    if (!parsed.ok) return parsed
    categorias = parsed.categories
  }

  return { ok: true, update, categorias }
}

function applyFormUpdate(form: FormData): UpdateBuildResult {
  const update: ProductUpdate = {}
  let categorias: string[] | null = null

  const nome = form.get("nome_produto")
  if (typeof nome === "string") {
    const trimmed = nome.trim()
    if (!trimmed) return { ok: false, error: "Nome é obrigatório." }
    update.nome_produto = trimmed
  }

  const descricao = form.get("descricao")
  if (typeof descricao === "string") update.descricao = descricao.trim() || null

  if (form.has("price")) {
    const parsed = parseMoneyField(form.get("price"), "Preço", true)
    if (!parsed.ok) return parsed
    update.price = parsed.value ?? 0
  }

  if (form.has("original_price")) {
    const parsed = parseMoneyField(form.get("original_price"), "Preço original")
    if (!parsed.ok) return parsed
    update.original_price = parsed.value ?? update.price
  }

  if (form.has("is_new")) update.is_new = parseBooleanField(form.get("is_new"))
  if (form.has("is_best_seller")) update.is_best_seller = parseBooleanField(form.get("is_best_seller"))
  if (form.has("is_available")) update.is_available = parseBooleanField(form.get("is_available"))

  if (form.has("categoria")) {
    const parsed = parseCategories(form.get("categoria"))
    if (!parsed.ok) return parsed
    categorias = parsed.categories
  }

  return { ok: true, update, categorias }
}

export async function GET(req: Request) {
  try {
    noStore()
    const auth = await requireUser(req)
    if (!auth.ok) return jsonError(auth.message, auth.status)

    const supabase = getAdminClient(auth.url)
    if (!supabase) return jsonError("Service key missing.", 500)

    const { data, error } = await supabase
      .from("products")
      .select(
        `
          *,
          product_categories(
            categories(
              id,
              name,
              slug
            )
          )
        `,
      )
      .order("id", { ascending: true })

    if (error) return jsonError(error.message, 500)

    return NextResponse.json(
      { products: (data || []).map((product: any) => normalizeRow(auth.url, product)) },
      { headers: noStoreHeaders },
    )
  } catch (e: any) {
    console.error("GET /api/admin/products", e?.message || e)
    return jsonError("Internal error", 500)
  }
}

export async function POST(req: Request) {
  let uploadedPath: string | null = null
  let insertedId: number | null = null

  try {
    noStore()
    const auth = await requireUser(req)
    if (!auth.ok) return jsonError(auth.message, auth.status)

    const supabase = getAdminClient(auth.url)
    if (!supabase) return jsonError("Service key missing.", 500)

    const form = await req.formData()
    const nome_produto = String(form.get("nome_produto") || "").trim()
    const descricao = String(form.get("descricao") || "").trim() || null
    const image = getFormFile(form, "image")

    if (!nome_produto) return jsonError("Nome é obrigatório.", 400)
    if (!image) return jsonError("Imagem é obrigatória.", 400)

    const parsedPrice = parseMoneyField(form.get("price"), "Preço", true)
    if (!parsedPrice.ok) return jsonError(parsedPrice.error, 400)

    const parsedOriginal = parseMoneyField(form.get("original_price"), "Preço original")
    if (!parsedOriginal.ok) return jsonError(parsedOriginal.error, 400)

    const parsedCategories = parseCategories(form.get("categoria"), true)
    if (!parsedCategories.ok) return jsonError(parsedCategories.error, 400)

    const uploaded = await uploadProductImage(supabase, auth.url, image, nome_produto)
    uploadedPath = uploaded.objectPath

    const payload = {
      nome_produto,
      descricao,
      price: parsedPrice.value ?? 0,
      original_price: parsedOriginal.value ?? parsedPrice.value ?? 0,
      caminho: uploaded.publicUrl,
      is_new: parseBooleanField(form.get("is_new")),
      is_best_seller: parseBooleanField(form.get("is_best_seller")),
      is_available: form.has("is_available") ? parseBooleanField(form.get("is_available")) : true,
    }

    const { data: inserted, error: insertError } = await supabase.from("products").insert(payload).select("*").single()
    if (insertError) throw new Error(insertError.message)
    insertedId = inserted.id

    await setProductCategories(supabase, inserted.id, parsedCategories.categories)

    const { data: productWithCategories, error: selectError } = await fetchProductWithCategories(supabase, inserted.id)
    if (selectError) throw new Error(selectError.message)

    return NextResponse.json(
      { product: normalizeRow(auth.url, productWithCategories || inserted) },
      { status: 201, headers: noStoreHeaders },
    )
  } catch (e: any) {
    console.error("POST /api/admin/products", e?.message || e)

    if (uploadedPath) {
      const auth = await requireUser(req).catch(() => null)
      if (auth?.ok) {
        const supabase = getAdminClient(auth.url)
        if (supabase) {
          if (insertedId) {
            try {
              await supabase.from("product_categories").delete().eq("product_id", insertedId)
              await supabase.from("products").delete().eq("id", insertedId)
            } catch {}
          }
          await removeStorageObject(supabase, uploadedPath)
        }
      }
    }

    return jsonError(e?.message || "Internal error", 500)
  }
}

export async function PATCH(req: Request) {
  let uploadedPath: string | null = null
  let previousImage: string | null = null

  try {
    noStore()
    const auth = await requireUser(req)
    if (!auth.ok) return jsonError(auth.message, auth.status)

    const supabase = getAdminClient(auth.url)
    if (!supabase) return jsonError("Service key missing.", 500)

    const contentType = req.headers.get("content-type") || ""
    let id: number | null = null
    let updateResult: UpdateBuildResult
    let image: File | null = null

    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as any
      id = parseId(body?.id)
      if (!id) return jsonError("ID inválido.", 400)
      updateResult = applyJsonUpdate(body)
    } else {
      const form = await req.formData()
      id = parseId(form.get("id"))
      if (!id) return jsonError("ID inválido.", 400)
      updateResult = applyFormUpdate(form)
      image = getFormFile(form, "image")
    }

    if (!updateResult.ok) return jsonError(updateResult.error, 400)

    const { data: current, error: currentError } = await supabase.from("products").select("*").eq("id", id).single()
    if (currentError) return jsonError(currentError.message, 500)
    previousImage = current?.caminho ?? null

    const update = updateResult.update
    if (image) {
      const imageName = update.nome_produto || current?.nome_produto || String(id)
      const uploaded = await uploadProductImage(supabase, auth.url, image, imageName)
      update.caminho = uploaded.publicUrl
      uploadedPath = uploaded.objectPath
    }

    if (updateResult.categorias !== null) {
      await setProductCategories(supabase, id, updateResult.categorias)
    }

    let productRow = current
    if (Object.keys(update).length > 0) {
      const { data, error } = await supabase.from("products").update(update).eq("id", id).select("*").single()
      if (error) throw new Error(error.message)
      productRow = data
    }

    if (uploadedPath && previousImage) {
      await removeStorageObject(supabase, previousImage)
    }

    const { data: productWithCategories, error: selectError } = await fetchProductWithCategories(supabase, id)
    if (selectError) throw new Error(selectError.message)

    return NextResponse.json(
      { product: normalizeRow(auth.url, productWithCategories || productRow) },
      { headers: noStoreHeaders },
    )
  } catch (e: any) {
    console.error("PATCH /api/admin/products", e?.message || e)

    if (uploadedPath) {
      const auth = await requireUser(req).catch(() => null)
      if (auth?.ok) {
        const supabase = getAdminClient(auth.url)
        if (supabase) await removeStorageObject(supabase, uploadedPath)
      }
    }

    return jsonError(e?.message || "Internal error", 500)
  }
}

export async function DELETE(req: Request) {
  try {
    noStore()
    const auth = await requireUser(req)
    if (!auth.ok) return jsonError(auth.message, auth.status)

    const supabase = getAdminClient(auth.url)
    if (!supabase) return jsonError("Service key missing.", 500)

    let id: number | null = null
    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as any
      id = parseId(body?.id)
    }

    if (!id) id = parseId(new URL(req.url).searchParams.get("id"))
    if (!id) return jsonError("ID inválido.", 400)

    const { data: row, error: selectError } = await supabase.from("products").select("caminho").eq("id", id).single()
    if (selectError) return jsonError(selectError.message, 500)

    const { error: relationError } = await supabase.from("product_categories").delete().eq("product_id", id)
    if (relationError) return jsonError(relationError.message, 500)

    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) return jsonError(error.message, 500)

    await removeStorageObject(supabase, row?.caminho)

    return NextResponse.json({ ok: true, id }, { headers: noStoreHeaders })
  } catch (e: any) {
    console.error("DELETE /api/admin/products", e?.message || e)
    return jsonError("Internal error", 500)
  }
}
