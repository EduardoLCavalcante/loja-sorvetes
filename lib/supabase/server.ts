import { createClient } from "@supabase/supabase-js"

export const noStoreHeaders: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Content-Type": "application/json; charset=utf-8",
}

export type AdminAuthResult =
  | { ok: true; url: string; userId: string }
  | { ok: false; status: number; message: string }

export async function requireAdminUser(request: Request): Promise<AdminAuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return { ok: false, status: 500, message: "Supabase não está configurado." }
  }

  const authorization = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorization || !/^Bearer\s+/i.test(authorization)) {
    return { ok: false, status: 401, message: "Sessão administrativa ausente." }
  }

  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim()
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    return { ok: false, status: 401, message: "Sessão administrativa inválida." }
  }

  return { ok: true, url, userId: data.user.id }
}

export function getSupabaseAdminClient(url: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
