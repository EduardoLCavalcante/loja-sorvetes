import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { z } from "zod"
import { maskBrazilianPhone } from "@/lib/orders/normalizers"
import { getSupabaseAdminClient, noStoreHeaders, requireAdminUser } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const VALID_ORDER_STATUSES = new Set(["received", "confirmed", "preparing", "out_for_delivery", "delivered"])
const querySchema = z.string().uuid()

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders })
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export async function GET(request: Request) {
  try {
    noStore()
    const auth = await requireAdminUser(request)
    if (!auth.ok) return jsonError(auth.message, auth.status)

    const customerId = new URL(request.url).searchParams.get("id") || ""
    if (!querySchema.safeParse(customerId).success) return jsonError("Cliente inválido.", 422)

    const supabase = getSupabaseAdminClient(auth.url)
    if (!supabase) return jsonError("Service role não configurada.", 500)

    const [customerResult, ordersResult, conflictsResult] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone_display, is_shared_phone, created_at")
        .eq("id", customerId)
        .single(),
      supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, payment_method, order_items(line_type, product_name, quantity)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("customer_name_conflicts")
        .select("id, submitted_name, status, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    if (customerResult.error || !customerResult.data) return jsonError("Cliente não encontrado.", 404)
    if (ordersResult.error) throw new Error(ordersResult.error.message)
    if (conflictsResult.error) throw new Error(conflictsResult.error.message)

    const orders = (ordersResult.data || []) as any[]
    const validOrders = orders.filter((order) => VALID_ORDER_STATUSES.has(order.status))
    const total = roundMoney(validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0))
    const favorites = new Map<string, number>()

    for (const order of validOrders) {
      for (const item of order.order_items || []) {
        if (item.line_type !== "product") continue
        favorites.set(item.product_name, (favorites.get(item.product_name) || 0) + Number(item.quantity || 0))
      }
    }

    return NextResponse.json(
      {
        customer: {
          id: customerResult.data.id,
          name: customerResult.data.name,
          phone: maskBrazilianPhone(customerResult.data.phone_display),
          isSharedPhone: customerResult.data.is_shared_phone,
          totalOrders: validOrders.length,
          total,
          ticket: validOrders.length ? roundMoney(total / validOrders.length) : 0,
          firstOrder: validOrders.length ? dateTimeLabel(validOrders[validOrders.length - 1].created_at) : null,
          lastOrder: validOrders.length ? dateTimeLabel(validOrders[0].created_at) : null,
          favorites: Array.from(favorites.entries())
            .sort(([, firstQuantity], [, secondQuantity]) => secondQuantity - firstQuantity)
            .slice(0, 3)
            .map(([name, quantity]) => ({ name, quantity })),
        },
        orders: orders.map((order) => ({
          id: order.id,
          number: order.order_number,
          status: order.status,
          total: Number(order.total || 0),
          paymentMethod: order.payment_method,
          createdAt: dateTimeLabel(order.created_at),
          items: (order.order_items || []).map((item: any) => `${item.quantity}× ${item.product_name}`).join(", "),
        })),
        conflicts: (conflictsResult.data || []).map((conflict: any) => ({
          id: conflict.id,
          submittedName: conflict.submitted_name,
          status: conflict.status,
          createdAt: dateTimeLabel(conflict.created_at),
        })),
      },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    console.error("Falha ao carregar cliente:", error)
    return jsonError("Não foi possível carregar o cliente.", 500)
  }
}
