import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { normalizeDeliveryZoneName, toAdminDeliveryZone } from "@/lib/delivery-zones"
import { getSupabaseAdminClient, noStoreHeaders, requireAdminUser } from "@/lib/supabase/server"
import { parsePrice } from "@/lib/utils/pricing"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders })
}

function parseId(value: unknown) {
  const id = typeof value === "number" ? value : Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function parseName(value: unknown) {
  if (typeof value !== "string") return null
  const name = value.replace(/\s+/g, " ").trim()
  return name.length >= 2 && name.length <= 120 ? name : null
}

function parseFee(value: unknown) {
  const fee = parsePrice(value)
  if (fee === null || !Number.isFinite(fee) || fee < 0 || fee > 99_999_999.99) return null
  return Math.round((fee + Number.EPSILON) * 100) / 100
}

function isDuplicateError(error: any) {
  return error?.code === "23505" || String(error?.message || "").toLowerCase().includes("normalized_name")
}

async function getAdmin(request: Request) {
  const auth = await requireAdminUser(request)
  if (!auth.ok) return { auth, supabase: null }

  const supabase = getSupabaseAdminClient(auth.url)
  if (!supabase) return { auth: { ok: false as const, status: 500, message: "Supabase não está configurado para alterações." }, supabase: null }
  return { auth, supabase }
}

export async function GET(request: Request) {
  try {
    noStore()
    const { auth, supabase } = await getAdmin(request)
    if (!auth.ok) return jsonError(auth.message, auth.status)
    if (!supabase) return jsonError("Supabase não está configurado para alterações.", 500)

    const { data, error } = await supabase
      .from("delivery_zones")
      .select("id, name, fee, is_active, created_at, updated_at")
      .order("name", { ascending: true })
    if (error) throw error

    return NextResponse.json({ deliveryZones: (data || []).map(toAdminDeliveryZone) }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error("GET /api/admin/delivery-zones", error?.message || error)
    return jsonError("Não foi possível carregar os bairros de entrega.", 500)
  }
}

export async function POST(request: Request) {
  try {
    noStore()
    const { auth, supabase } = await getAdmin(request)
    if (!auth.ok) return jsonError(auth.message, auth.status)
    if (!supabase) return jsonError("Supabase não está configurado para alterações.", 500)

    const body = await request.json().catch(() => null)
    const name = parseName(body?.name)
    const fee = parseFee(body?.fee)
    if (!name || fee === null) return jsonError("Informe um bairro e uma taxa válida.", 422)

    const { data, error } = await supabase
      .from("delivery_zones")
      .insert({ name, normalized_name: normalizeDeliveryZoneName(name), fee })
      .select("id, name, fee, is_active, created_at, updated_at")
      .single()
    if (error) {
      if (isDuplicateError(error)) return jsonError("Este bairro já está cadastrado.", 409)
      throw error
    }

    return NextResponse.json({ deliveryZone: toAdminDeliveryZone(data) }, { status: 201, headers: noStoreHeaders })
  } catch (error: any) {
    console.error("POST /api/admin/delivery-zones", error?.message || error)
    return jsonError("Não foi possível cadastrar o bairro.", 500)
  }
}

export async function PATCH(request: Request) {
  try {
    noStore()
    const { auth, supabase } = await getAdmin(request)
    if (!auth.ok) return jsonError(auth.message, auth.status)
    if (!supabase) return jsonError("Supabase não está configurado para alterações.", 500)

    const body = await request.json().catch(() => null)
    const id = parseId(body?.id)
    if (!id) return jsonError("Bairro inválido.", 422)

    const update: Record<string, unknown> = {}
    if (typeof body?.isActive === "boolean") update.is_active = body.isActive

    if (body?.name !== undefined || body?.fee !== undefined) {
      const name = parseName(body?.name)
      const fee = parseFee(body?.fee)
      if (!name || fee === null) return jsonError("Informe um bairro e uma taxa válida.", 422)
      update.name = name
      update.normalized_name = normalizeDeliveryZoneName(name)
      update.fee = fee
    }

    if (Object.keys(update).length === 0) return jsonError("Nenhuma alteração foi informada.", 422)

    const { data, error } = await supabase
      .from("delivery_zones")
      .update(update)
      .eq("id", id)
      .select("id, name, fee, is_active, created_at, updated_at")
      .single()
    if (error) {
      if (isDuplicateError(error)) return jsonError("Este bairro já está cadastrado.", 409)
      if (error.code === "PGRST116") return jsonError("Bairro não encontrado.", 404)
      throw error
    }

    return NextResponse.json({ deliveryZone: toAdminDeliveryZone(data) }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error("PATCH /api/admin/delivery-zones", error?.message || error)
    return jsonError("Não foi possível salvar o bairro.", 500)
  }
}
