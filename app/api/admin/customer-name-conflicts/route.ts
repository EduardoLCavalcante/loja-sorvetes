import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { z } from "zod"
import { cleanCustomerName } from "@/lib/orders/normalizers"
import { getSupabaseAdminClient, noStoreHeaders, requireAdminUser } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const updateSchema = z.object({
  conflictId: z.string().uuid(),
  action: z.enum(["keep", "rename", "shared"]),
  customerName: z.string().trim().min(2).max(120).optional(),
})

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders })
}

export async function PATCH(request: Request) {
  try {
    noStore()
    const auth = await requireAdminUser(request)
    if (!auth.ok) return jsonError(auth.message, auth.status)

    const parsed = updateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return jsonError("Dados de correção inválidos.", 422)

    const supabase = getSupabaseAdminClient(auth.url)
    if (!supabase) return jsonError("Service role não configurada.", 500)

    const { data: conflict, error: conflictError } = await supabase
      .from("customer_name_conflicts")
      .select("id, customer_id, submitted_name, status")
      .eq("id", parsed.data.conflictId)
      .single()
    if (conflictError || !conflict) return jsonError("Divergência não encontrada.", 404)
    if (conflict.status !== "pending") return jsonError("Essa divergência já foi resolvida.", 409)

    const resolvedAt = new Date().toISOString()
    if (parsed.data.action === "rename") {
      const name = cleanCustomerName(parsed.data.customerName || conflict.submitted_name)
      const { error: customerError } = await supabase
        .from("customers")
        .update({ name, updated_at: resolvedAt })
        .eq("id", conflict.customer_id)
      if (customerError) throw new Error(customerError.message)

      const { error: conflictUpdateError } = await supabase
        .from("customer_name_conflicts")
        .update({
          status: "corrected",
          resolution: `Nome principal alterado para ${name}.`,
          resolved_by: auth.userId,
          resolved_at: resolvedAt,
        })
        .eq("id", conflict.id)
      if (conflictUpdateError) throw new Error(conflictUpdateError.message)
    }

    if (parsed.data.action === "keep") {
      const { error } = await supabase
        .from("customer_name_conflicts")
        .update({
          status: "ignored",
          resolution: "Nome principal mantido pelo administrador.",
          resolved_by: auth.userId,
          resolved_at: resolvedAt,
        })
        .eq("id", conflict.id)
      if (error) throw new Error(error.message)
    }

    if (parsed.data.action === "shared") {
      const { error: customerError } = await supabase
        .from("customers")
        .update({ is_shared_phone: true, updated_at: resolvedAt })
        .eq("id", conflict.customer_id)
      if (customerError) throw new Error(customerError.message)

      const { error: conflictsError } = await supabase
        .from("customer_name_conflicts")
        .update({
          status: "shared_phone",
          resolution: "Telefone marcado como compartilhado.",
          resolved_by: auth.userId,
          resolved_at: resolvedAt,
        })
        .eq("customer_id", conflict.customer_id)
        .eq("status", "pending")
      if (conflictsError) throw new Error(conflictsError.message)
    }

    return NextResponse.json({ ok: true }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error("Falha ao resolver divergência:", error)
    return jsonError("Não foi possível salvar a correção.", 500)
  }
}
