import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    throw new Error(
      "Supabase client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
  }

  client = createClient(url, anon, {
    auth: {
      autoRefreshToken: true,  // 🔹 Renova o token automaticamente
      persistSession: true,    // 🔹 Salva a sessão no localStorage
      detectSessionInUrl: true // 🔹 Suporte a login via URL
    }
  })

  return client
}
