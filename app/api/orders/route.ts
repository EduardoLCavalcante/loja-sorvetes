import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { adicionais } from "@/lib/data/extra"
import { checkoutOrderSchema } from "@/lib/schemas/checkout"
import {
  cleanCustomerName,
  formatBrazilianPhone,
  isValidBrazilianPhone,
  normalizeBrazilianPhone,
  normalizeCustomerName,
} from "@/lib/orders/normalizers"
import { getSupabaseAdminClient, noStoreHeaders } from "@/lib/supabase/server"
import { parsePrice } from "@/lib/utils/pricing"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders })
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export async function POST(request: Request) {
  try {
    noStore()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) return jsonError("Supabase não está configurado.", 500)

    const supabase = getSupabaseAdminClient(url)
    if (!supabase) return jsonError("A gravação de pedidos não está configurada.", 500)

    const body = await request.json().catch(() => null)
    const parsed = checkoutOrderSchema.safeParse(body)
    if (!parsed.success) return jsonError("Confira os dados do pedido.", 422)

    const { deliveryInfo, items, selectedExtras } = parsed.data
    const phoneNormalized = normalizeBrazilianPhone(deliveryInfo.phone)
    if (!isValidBrazilianPhone(phoneNormalized)) {
      return jsonError("Informe um telefone brasileiro válido com DDD.", 422)
    }

    let deliveryZone: { id: number; name: string; fee: number } | null = null
    if (deliveryInfo.deliveryType === "entrega") {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("id, name, fee")
        .eq("id", deliveryInfo.deliveryZoneId)
        .eq("is_active", true)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) {
        return NextResponse.json(
          { error: "Este bairro não está mais disponível para entrega.", code: "DELIVERY_ZONE_UNAVAILABLE" },
          { status: 409, headers: noStoreHeaders },
        )
      }

      const fee = roundMoney(parsePrice(data.fee) ?? 0)
      if (Math.abs(fee - (deliveryInfo.quotedDeliveryFee ?? -1)) > 0.001) {
        return NextResponse.json(
          {
            error: "A taxa deste bairro foi atualizada. Revise o total e tente novamente.",
            code: "DELIVERY_FEE_CHANGED",
            deliveryZone: { id: Number(data.id), name: String(data.name), fee },
          },
          { status: 409, headers: noStoreHeaders },
        )
      }

      deliveryZone = { id: Number(data.id), name: String(data.name), fee }
    }

    const productIds = Array.from(new Set(items.map((item) => Number(item.id))))
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, nome_produto, price, is_available")
      .in("id", productIds)

    if (productsError) throw new Error(productsError.message)
    if (!products || products.length !== productIds.length) {
      return jsonError("Um ou mais produtos não estão mais disponíveis.", 409)
    }

    const productsById = new Map(products.map((product: any) => [Number(product.id), product]))
    const orderItems = items.map((item) => {
      const product = productsById.get(Number(item.id))
      if (!product || product.is_available === false) {
        throw new Error("Um ou mais produtos não estão mais disponíveis.")
      }

      const unitPrice = parsePrice(product.price) ?? 0
      return {
        source_product_id: String(product.id),
        line_type: "product",
        product_name: String(product.nome_produto),
        unit_price: roundMoney(unitPrice),
        quantity: item.quantity,
        line_total: roundMoney(unitPrice * item.quantity),
      }
    })

    const extrasById = new Map(adicionais.map((extra) => [extra.id, extra]))
    for (const [extraId, quantity] of Object.entries(selectedExtras)) {
      const extra = extrasById.get(extraId)
      if (!extra || quantity <= 0) continue

      orderItems.push({
        source_product_id: extra.id,
        line_type: "extra",
        product_name: extra.nome,
        unit_price: roundMoney(extra.preco),
        quantity,
        line_total: roundMoney(extra.preco * quantity),
      })
    }

    const subtotal = roundMoney(
      orderItems.filter((item) => item.line_type === "product").reduce((total, item) => total + item.line_total, 0),
    )
    const extrasTotal = roundMoney(
      orderItems.filter((item) => item.line_type === "extra").reduce((total, item) => total + item.line_total, 0),
    )
    const deliveryFee = deliveryZone?.fee ?? 0
    const total = roundMoney(subtotal + extrasTotal + deliveryFee)
    const submittedName = cleanCustomerName(deliveryInfo.name)

    const { error: customerInsertError } = await supabase.from("customers").upsert(
      {
        name: submittedName,
        phone_normalized: phoneNormalized,
        phone_display: formatBrazilianPhone(phoneNormalized),
      },
      { onConflict: "phone_normalized", ignoreDuplicates: true },
    )
    if (customerInsertError) throw new Error(customerInsertError.message)

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, is_shared_phone")
      .eq("phone_normalized", phoneNormalized)
      .single()
    if (customerError || !customer) throw new Error(customerError?.message || "Cliente não localizado.")

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customer.id,
        customer_name_snapshot: submittedName,
        customer_phone_snapshot: formatBrazilianPhone(phoneNormalized),
        status: "received",
        delivery_type: deliveryInfo.deliveryType,
        address_snapshot: deliveryInfo.deliveryType === "entrega" ? deliveryInfo.address.trim() : null,
        house_number_snapshot:
          deliveryInfo.deliveryType === "entrega"
            ? deliveryInfo.noHouseNumber
              ? "S/N"
              : deliveryInfo.houseNumber.trim()
            : null,
        has_no_house_number: deliveryInfo.deliveryType === "entrega" && deliveryInfo.noHouseNumber,
        complement_snapshot: deliveryInfo.deliveryType === "entrega" ? deliveryInfo.complement.trim() || null : null,
        neighborhood_snapshot: deliveryZone?.name ?? null,
        delivery_zone_id: deliveryZone?.id ?? null,
        payment_method: deliveryInfo.paymentMethod,
        change_for: deliveryInfo.paymentMethod === "Dinheiro" ? deliveryInfo.changeFor.trim() : null,
        subtotal,
        extras_total: extrasTotal,
        delivery_fee: deliveryFee,
        total,
      })
      .select("id, order_number")
      .single()
    if (orderError || !order) throw new Error(orderError?.message || "Pedido não pôde ser salvo.")

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })))
    if (itemsError) throw new Error(itemsError.message)

    const nameIsDifferent = normalizeCustomerName(customer.name) !== normalizeCustomerName(submittedName)
    if (nameIsDifferent) {
      const { error: conflictError } = await supabase.from("customer_name_conflicts").insert({
        customer_id: customer.id,
        order_id: order.id,
        submitted_name: submittedName,
        normalized_name: normalizeCustomerName(submittedName),
        status: customer.is_shared_phone ? "shared_phone" : "pending",
      })

      if (conflictError) console.error("Falha ao registrar divergência de nome:", conflictError.message)
    }

    return NextResponse.json(
      {
        orderNumber: order.order_number,
        hasNameConflict: nameIsDifferent && !customer.is_shared_phone,
        pricing: { subtotal, extrasTotal, deliveryFee, total },
        delivery: { deliveryZoneId: deliveryZone?.id ?? null, neighborhood: deliveryZone?.name ?? null },
      },
      { status: 201, headers: noStoreHeaders },
    )
  } catch (error: any) {
    console.error("Falha ao registrar pedido:", error)
    const message = error?.message === "Um ou mais produtos não estão mais disponíveis."
      ? error.message
      : "Não foi possível registrar o pedido. Tente novamente."
    return jsonError(message, 500)
  }
}
