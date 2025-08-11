"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Save, Trash2 } from "lucide-react"

type AdminProduct = {
  id: number
  nome_produto: string
  descricao: string | null
  price: number
  original_price: number
  categoria: string[]
  caminho: string | null
  image_url: string | null
  stock: number
  is_new: boolean
  is_best_seller: boolean
}

export default function AdminInventory() {
  const supabase = getSupabaseBrowserClient()
  const [rows, setRows] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  // New product form
  const [pName, setPName] = useState("")
  const [pDesc, setPDesc] = useState("")
  const [pPrice, setPPrice] = useState("")
  const [pOriginal, setPOriginal] = useState("")
  const [pCategories, setPCategories] = useState("")
  const [pStock, setPStock] = useState(0)
  const [pNew, setPNew] = useState(false)
  const [pBest, setPBest] = useState(false)
  const [pImage, setPImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pSlug, setPSlug] = useState("") // Adicionei o estado para o slug

  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({})
  const [deletingMap, setDeletingMap] = useState<Record<number, boolean>>({})

  const authHeader = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return undefined
  }

  const safeJson = async (res: Response) => {
    const text = await res.text()
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return {}
    }
  }

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await authHeader()
      const res = await fetch("/api/admin/products", { cache: "no-store", headers })
      const json = await safeJson(res)
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar produtos.")
      setRows(Array.isArray(json?.products) ? json.products : [])
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) => r.nome_produto.toLowerCase().includes(t))
  }, [rows, search])

  const updateLocal = (id: number, patch: Partial<AdminProduct>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const onSelectFile = (file: File | null) => {
    setPImage(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (file) setPreviewUrl(URL.createObjectURL(file))
    else setPreviewUrl(null)
  }

  const createProduct = async () => {
    if (!pName.trim()) return setError("Informe o nome do produto.")
    if (!pPrice.trim()) return setError("Informe o preço.")
    if (!pImage) return setError("Selecione a imagem do produto.")
    setError(null)
    setCreating(true)
    try {
      const headers = await authHeader()
      const fd = new FormData()
      fd.append("nome_produto", pName.trim())
      if (pDesc.trim()) fd.append("descricao", pDesc.trim())
      fd.append("price", pPrice.trim())
      if (pOriginal.trim()) fd.append("original_price", pOriginal.trim())
      fd.append("stock", String(Math.max(0, Math.floor(pStock))))
      fd.append("is_new", String(!!pNew))
      fd.append("is_best_seller", String(!!pBest))
      fd.append(
        "categoria",
        JSON.stringify(
          pCategories
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        ),
      )
      fd.append("image", pImage)
      fd.append("slug", pSlug.trim()) // Enviando o slug
      const res = await fetch("/api/admin/products", { method: "POST", headers, body: fd })
      const json = await safeJson(res)
      if (!res.ok) throw new Error(json?.error || "Falha ao adicionar produto.")
      const created: AdminProduct | null = json?.product ?? null
      if (created) setRows((prev) => [created, ...prev])

      // reset form
      setPName("")
      setPDesc("")
      setPPrice("")
      setPOriginal("")
      setPCategories("")
      setPStock(0)
      setPNew(false)
      setPBest(false)
      onSelectFile(null)
    } catch (e: any) {
      setError(e?.message || "Erro ao adicionar.")
    } finally {
      setCreating(false)
    }
  }

  const saveRow = async (row: AdminProduct) => {
    setSavingMap((m) => ({ ...m, [row.id]: true }))
    try {
      const headers = await authHeader()
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          id: row.id,
          nome_produto: row.nome_produto,
          descricao: row.descricao ?? "",
          price: row.price,
          original_price: row.original_price,
          categoria: row.categoria,
          stock: row.stock,
          is_new: row.is_new,
          is_best_seller: row.is_best_seller,
        }),
      })
      const json = await safeJson(res)
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar.")
      const updated: AdminProduct | null = json?.product ?? null
      if (updated) {
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao salvar.")
    } finally {
      setSavingMap((m) => ({ ...m, [row.id]: false }))
    }
  }

  const deleteRow = async (id: number) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    if (!window.confirm(`Remover o produto "${row.nome_produto}"?`)) return
    setDeletingMap((m) => ({ ...m, [id]: true }))
    try {
      const headers = await authHeader()
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ id }),
      })
      const json = await safeJson(res)
      if (!res.ok) throw new Error(json?.error || "Falha ao remover.")
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (e: any) {
      setError(e?.message || "Erro ao remover.")
    } finally {
      setDeletingMap((m) => ({ ...m, [id]: false }))
    }
  }

  // Opcional: Gere o slug automaticamente ao digitar o nome
  useEffect(() => {
    setPSlug(
      pName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    )
  }, [pName])

  return (
    <section className="space-y-6">
      {/* New product */}
      <div className="bg-white/90 rounded-2xl border border-orange-100 shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Adicionar produto</h2>
        {error ? (
          <div className="mb-4 text-sm rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2">{error}</div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Nome</label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Nome do produto" />
            </div>
            <div>
              <label className="text-sm">Preço</label>
              <Input value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="12,90" />
            </div>
            <div>
              <label className="text-sm">Preço original (opcional)</label>
              <Input value={pOriginal} onChange={(e) => setPOriginal(e.target.value)} placeholder="15,90" />
            </div>
            <div>
              <label className="text-sm">Estoque</label>
              <Input
                type="number"
                value={pStock}
                onChange={(e) => setPStock(Math.max(0, Math.floor(Number(e.target.value))))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Descrição</label>
              <Input value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Descrição do produto" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Categorias (separe por vírgulas)</label>
              <Input
                value={pCategories}
                onChange={(e) => setPCategories(e.target.value)}
                placeholder="Picolés, Premium"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pNew} onChange={(e) => setPNew(e.target.checked)} /> Novo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pBest} onChange={(e) => setPBest(e.target.checked)} /> Mais vendido
              </label>
            </div>
          </div>
          <div>
            <label className="text-sm">Imagem</label>
            <div className="mt-2 flex flex-col gap-3">
              {previewUrl ? (
                <Image
                  src={previewUrl || "/placeholder.svg?height=240&width=240&query=preview%20produto"}
                  alt="Pré-visualização"
                  width={240}
                  height={240}
                  unoptimized
                  className="w-full aspect-square object-cover rounded-xl border border-orange-100"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl border border-dashed border-orange-200 flex items-center justify-center text-gray-500">
                  Prévia da imagem
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
              />
              <Button onClick={createProduct} disabled={creating}>
                {creating ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white/90 rounded-2xl border border-orange-100 shadow p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              className="pl-9"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4" />
            <span className="ml-2">Recarregar</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-600">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-600">Nenhum produto encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left bg-orange-50/70">
                  <th className="p-3 font-semibold">Produto</th>
                  <th className="p-3 font-semibold">Categorias</th>
                  <th className="p-3 font-semibold">Preço</th>
                  <th className="p-3 font-semibold">Estoque</th>
                  <th className="p-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-orange-100">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {r.image_url ? (
                          <Image
                            src={r.image_url || "/placeholder.svg?height=56&width=56&query=miniatura%20produto"}
                            alt={r.nome_produto}
                            width={56}
                            height={56}
                            unoptimized
                            className="w-14 h-14 rounded-lg object-cover bg-orange-50"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
                            <span className="text-xl">🍦</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <Input
                            value={r.nome_produto}
                            onChange={(e) => updateLocal(r.id, { nome_produto: e.target.value })}
                            className="h-9"
                          />
                          <Input
                            value={r.descricao ?? ""}
                            onChange={(e) => updateLocal(r.id, { descricao: e.target.value })}
                            className="h-9 mt-2"
                            placeholder="Descrição"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1">
                          {r.categoria?.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                        <Input
                          className="h-9 mt-2"
                          value={(r.categoria || []).join(", ")}
                          onChange={(e) =>
                            updateLocal(r.id, {
                              categoria: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Categorias"
                        />
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={r.is_new}
                              onChange={(e) => updateLocal(r.id, { is_new: e.target.checked })}
                            />
                            Novo
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={r.is_best_seller}
                              onChange={(e) => updateLocal(r.id, { is_best_seller: e.target.checked })}
                            />
                            Mais vendido
                          </label>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col">
                        <Input
                          className="h-9"
                          value={String(r.price)}
                          onChange={(e) => updateLocal(r.id, { price: Number(e.target.value) || 0 })}
                        />
                        <Input
                          className="h-9 mt-2"
                          value={String(r.original_price)}
                          onChange={(e) => updateLocal(r.id, { original_price: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </td>
                    <td className="p-3 align-top w-32">
                      <Input
                        type="number"
                        className="h-9 w-28"
                        value={r.stock}
                        min={0}
                        onChange={(e) => updateLocal(r.id, { stock: Math.max(0, Math.floor(Number(e.target.value))) })}
                      />
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => saveRow(r)} disabled={!!savingMap[r.id]}>
                          <Save className="w-4 h-4" />
                          <span className="ml-2">{savingMap[r.id] ? "Salvando..." : "Salvar"}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteRow(r.id)}
                          disabled={!!deletingMap[r.id]}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="ml-2">{deletingMap[r.id] ? "Removendo..." : "Remover"}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
