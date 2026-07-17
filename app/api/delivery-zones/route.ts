import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { toDeliveryZone } from "@/lib/delivery-zones"
import { noStoreHeaders } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export async function GET() {
  try {
    noStore()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Supabase não está configurado." }, { status: 500, headers: noStoreHeaders })
    }

    const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("id, name, fee")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) throw error
    return NextResponse.json({ deliveryZones: (data || []).map(toDeliveryZone) }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error("GET /api/delivery-zones", error?.message || error)
    return NextResponse.json({ error: "Não foi possível carregar os bairros de entrega." }, { status: 500, headers: noStoreHeaders })
  }
}
