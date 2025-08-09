import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL
    const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase env not configured (SUPABASE_URL/ANON_KEY)." }, { status: 500 })
    }

    const supabase = createClient(url, anon)

    const { data, error } = await supabase
      .from("images")
      .select("file_name, public_url, categories")
      .order("file_name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const images: Record<string, string> = {}
    const catSet = new Set<string>()

    for (const row of data || []) {
      if (row.file_name && row.public_url) {
        images[row.file_name] = row.public_url
      }
      for (const c of row.categories || []) {
        if (c) catSet.add(c)
      }
    }

    const categories = Array.from(catSet).sort((a, b) => a.localeCompare(b, "pt-BR"))

    return NextResponse.json({ images, categories })
  } catch (err) {
    console.error("GET /api/assets error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
