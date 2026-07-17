"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminDashboard from "./admin-dashboard"

export default function AdminPage() {
  const supabase = getSupabaseBrowserClient()
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const hasLoadedSession = useRef(false)

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) setError(error.message)
        setSession(data.session ?? null)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e?.message || "Falha ao carregar sessão.")
      })
      .finally(() => {
        if (!mounted) return
        hasLoadedSession.current = true
        setReady(true)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return

      setSession(nextSession)

      if (nextSession) {
        setError(null)
      } else if (hasLoadedSession.current && event !== "SIGNED_OUT") {
        setError("Sessão expirada. Faça login novamente.")
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.")
      return
    }

    try {
      setError(null)
      setLoading(true)

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error
    } catch (e: any) {
      setError(e?.message || "Falha ao entrar.")
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)
      await supabase.auth.signOut()
      setEmail("")
      setPassword("")
      setSession(null)
    } catch (e: any) {
      setError(e?.message || "Falha ao sair.")
    } finally {
      setLoading(false)
    }
  }

  const forceSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    setError("Sessão inválida. Faça login novamente.")
  }, [supabase])

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
          <form className="space-y-4" onSubmit={signIn}>
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
                autoComplete="email"
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
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-xs text-gray-500 text-center">Autenticação via Supabase</p>
          </form>
        </div>
      </main>
    )
  }

  return (
    <AdminDashboard
      accessToken={session.access_token}
      userEmail={session.user.email}
      onAuthError={forceSignOut}
      onSignOut={signOut}
      signingOut={loading}
    />
  )
}
