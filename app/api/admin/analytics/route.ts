import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { maskBrazilianPhone } from "@/lib/orders/normalizers"
import { getSupabaseAdminClient, noStoreHeaders, requireAdminUser } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const VALID_ORDER_STATUSES = new Set(["received", "confirmed", "preparing", "out_for_delivery", "delivered"])
type Range = "today" | "7d" | "30d" | "month"

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders })
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getPeriod(input: string | null) {
  const range: Range = input === "today" || input === "7d" || input === "30d" || input === "month" ? input : "month"
  const now = new Date()
  const end = now
  const start = new Date(now)

  if (range === "today") start.setHours(0, 0, 0, 0)
  if (range === "7d") start.setDate(start.getDate() - 6)
  if (range === "30d") start.setDate(start.getDate() - 29)
  if (range === "month") {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }

  return { range, start, end }
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date(value))
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00-03:00`)).replace(".", "")
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function unwrapRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null
}

export async function GET(request: Request) {
  try {
    noStore()
    const auth = await requireAdminUser(request)
    if (!auth.ok) return jsonError(auth.message, auth.status)

    const supabase = getSupabaseAdminClient(auth.url)
    if (!supabase) return jsonError("Service role não configurada.", 500)

    const { range, start, end } = getPeriod(new URL(request.url).searchParams.get("range"))
    const startIso = start.toISOString()
    const endIso = end.toISOString()

    const [periodOrdersResult, conflictsResult, conflictsCountResult] = await Promise.all([
      supabase
        .from("orders")
        .select(`
          id, order_number, customer_id, customer_name_snapshot, status, payment_method, total, created_at,
          customers(id, name, phone_display, is_shared_phone),
          order_items(id, line_type, product_name, quantity, line_total)
        `)
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .order("created_at", { ascending: false }),
      supabase
        .from("customer_name_conflicts")
        .select(`
          id, customer_id, submitted_name, status, created_at,
          customers(id, name, phone_display, is_shared_phone)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("customer_name_conflicts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ])

    if (periodOrdersResult.error) throw new Error(periodOrdersResult.error.message)
    if (conflictsResult.error) throw new Error(conflictsResult.error.message)
    if (conflictsCountResult.error) throw new Error(conflictsCountResult.error.message)

    const orders = (periodOrdersResult.data || []) as any[]
    const validOrders = orders.filter((order) => VALID_ORDER_STATUSES.has(order.status))
    const customerTotals = new Map<string, { id: string; name: string; phone: string; orders: number; total: number }>()
    const productTotals = new Map<string, { name: string; quantity: number; revenue: number }>()
    const salesByDay = new Map<string, { revenue: number; orders: number }>()

    let itemsSold = 0
    for (const order of validOrders) {
      const customer = unwrapRelation<any>(order.customers)
      if (customer) {
        const current = customerTotals.get(customer.id) || {
          id: customer.id,
          name: customer.name,
          phone: maskBrazilianPhone(customer.phone_display),
          orders: 0,
          total: 0,
        }
        current.orders += 1
        current.total += Number(order.total || 0)
        customerTotals.set(customer.id, current)
      }

      const key = dateKey(order.created_at)
      const daily = salesByDay.get(key) || { revenue: 0, orders: 0 }
      daily.revenue += Number(order.total || 0)
      daily.orders += 1
      salesByDay.set(key, daily)

      for (const item of order.order_items || []) {
        if (item.line_type !== "product") continue
        itemsSold += Number(item.quantity || 0)
        const current = productTotals.get(item.product_name) || { name: item.product_name, quantity: 0, revenue: 0 }
        current.quantity += Number(item.quantity || 0)
        current.revenue += Number(item.line_total || 0)
        productTotals.set(item.product_name, current)
      }
    }

    const activeCustomerIds = Array.from(customerTotals.keys())
    const firstOrderByCustomer = new Map<string, string>()

    if (activeCustomerIds.length) {
      const { data: firstOrders, error: firstOrdersError } = await supabase.rpc("get_first_valid_orders", {
        p_customer_ids: activeCustomerIds,
        p_end: endIso,
      })
      if (firstOrdersError) throw new Error(firstOrdersError.message)

      for (const order of firstOrders || []) {
        if (order.customer_id && order.first_order_at) {
          firstOrderByCustomer.set(order.customer_id, order.first_order_at)
        }
      }
    }

    const newCustomers = activeCustomerIds.filter((customerId) => {
      const firstOrder = firstOrderByCustomer.get(customerId)
      return firstOrder ? new Date(firstOrder) >= start && new Date(firstOrder) < end : false
    }).length
    const revenue = roundMoney(validOrders.reduce((total, order) => total + Number(order.total || 0), 0))

    const topProducts = Array.from(productTotals.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5)
      .map((product) => ({ ...product, revenue: roundMoney(product.revenue) }))
    const topCustomers = Array.from(customerTotals.values())
      .sort((a, b) => b.orders - a.orders || b.total - a.total)
      .slice(0, 5)
      .map((customer) => ({ ...customer, total: roundMoney(customer.total), ticket: roundMoney(customer.total / customer.orders) }))
    const salesSeries = Array.from(salesByDay.entries())
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([date, totals]) => ({ date, label: dayLabel(date), revenue: roundMoney(totals.revenue), orders: totals.orders }))
    const conflicts = (conflictsResult.data || []).map((conflict: any) => {
      const customer = unwrapRelation<any>(conflict.customers)
      return {
        id: conflict.id,
        customerId: conflict.customer_id,
        registeredName: customer?.name || "Cliente",
        submittedName: conflict.submitted_name,
        phone: customer ? maskBrazilianPhone(customer.phone_display) : "Telefone indisponível",
        createdAt: conflict.created_at,
        createdAtLabel: dateTimeLabel(conflict.created_at),
      }
    })

    return NextResponse.json(
      {
        period: { range, start: startIso, end: endIso },
        summary: {
          orders: validOrders.length,
          revenue,
          customers: activeCustomerIds.length,
          newCustomers,
          recurringCustomers: Math.max(0, activeCustomerIds.length - newCustomers),
          averageTicket: validOrders.length ? roundMoney(revenue / validOrders.length) : 0,
          itemsSold,
        },
        salesSeries,
        topProducts,
        topCustomers,
        recentOrders: orders.slice(0, 6).map((order) => ({
          id: order.id,
          number: order.order_number,
          customerName: order.customer_name_snapshot,
          status: order.status,
          paymentMethod: order.payment_method,
          total: Number(order.total || 0),
          createdAt: dateTimeLabel(order.created_at),
          items: (order.order_items || [])
            .map((item: any) => `${item.quantity}× ${item.product_name}`)
            .join(", "),
        })),
        conflicts,
        conflictsCount: conflictsCountResult.count || 0,
      },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    console.error("Falha ao carregar analytics:", error)
    return jsonError("Não foi possível carregar os indicadores.", 500)
  }
}
