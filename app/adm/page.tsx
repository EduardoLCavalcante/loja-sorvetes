"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminInventory from "./admin-inventory"

export default function AdminPage() {
  const supabase = getSupabaseBrowserClient()
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

 useEffect(() => {
  let mounted = true;

  // Pega a sessão inicial
  supabase.auth.getSession().then(({ data }) => {
    if (!mounted) return;
    setSession(data.session ?? null);
    setReady(true);
  });

  // Escuta mudanças na sessão (login, logout, refresh)
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!mounted) return;

    setSession(session);

    // Só mostra erro se realmente for um logout e não um refresh
    if (!session && ready) {
      setError("Sessão expirada. Faça login novamente.");
    }
  });

  return () => {
    mounted = false;
    sub.subscription.unsubscribe();
  };
  // Sem 'ready' nas dependências, para não recriar listener
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const signIn = async () => {
    try {
      setError(null)
      setLoading(true)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      clearTimeout(timeoutId)

      if (error) throw error
    } catch (e: any) {
      if (e.name === "AbortError") {
        setError("Timeout: Login demorou muito. Verifique sua conexão e tente novamente.")
      } else {
        setError(e?.message || "Falha ao entrar.")
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    setError("Saindo...")
    await supabase.auth.signOut()
    setError(null)
    setEmail("")
    setPassword("")
    setLoading(false)
    setSession(null)
  }

  const forceSignOut = async () => {
    await supabase.auth.signOut()
    setError("Sessão inválida. Faça login novamente.")
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }
  
  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white/90 rounded-2xl shadow border border-orange-100 p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Entrar | Área Administrativa</h1>
          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          ) : null}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                onKeyDown={(e) => e.key === "Enter" && signIn()}
              />
            </div>
            <Button onClick={signIn} disabled={loading} className="w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-xs text-gray-500 text-center">Autenticação via Supabase</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50">
      <header className="sticky top-0 z-20 bg-white/90 border-b border-orange-100 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Admin • Controle de Estoque</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:inline">{session.user.email}</span>
            <Button variant="outline" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <AdminInventory onAuthError={forceSignOut} />
      </div>
    </main>
  )
}
