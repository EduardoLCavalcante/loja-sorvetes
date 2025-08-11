"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Trash2, SaveAll } from "lucide-react"

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

type ProductRecord = AdminProduct

const AVAILABLE_CATEGORIES = [
  "Picolés",
  "Sorvetes",
  "Premium",
  "Tradicional",
  "Frutas",
  "Chocolate",
  "Cremoso",
  "Diet",
  "Zero Açúcar",
  "Vegano",
  "Infantil",
  "Sazonal",
]

export default function AdminInventory() {
  const supabase = getSupabaseBrowserClient()
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [modifiedProducts, setModifiedProducts] = useState<Set<number>>(new Set())
  const [savingAll, setSavingAll] = useState(false)

  // New product form
  const [pName, setPName] = useState("")
  const [pPrice, setPPrice] = useState("")
  const [pOriginal, setPOriginal] = useState("")
  const [pStock, setPStock] = useState(0)
  const [pDesc, setPDesc] = useState("")
  const [pCategories, setPCategories] = useState("") // Keep for backward compatibility
  const [pSelectedCategories, setPSelectedCategories] = useState<string[]>([]) // Added state for selected categories
  const [pNew, setPNew] = useState(false)
  const [pBest, setPBest] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

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

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError("")
      const headers = await authHeader()
      const res = await fetch("/api/admin/products", { cache: "no-store", headers })
      const json = await safeJson(res)
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar produtos.")
      setProducts(Array.isArray(json?.products) ? json.products : [])
      setModifiedProducts(new Set())
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const t = pName.trim().toLowerCase()
    if (!t) return products
    return products.filter((p) => p.nome_produto.toLowerCase().includes(t))
  }, [products, pName])

  const updateLocal = (id: number, patch: Partial<AdminProduct>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    setModifiedProducts((prev) => new Set([...prev, id]))
  }

  const onSelectFile = (file: File | null) => {
    setSelectedFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (file) setPreviewUrl(URL.createObjectURL(file))
    else setPreviewUrl("")
  }

  const addCategoryToNewProduct = (category: string) => {
    if (!pSelectedCategories.includes(category)) {
      setPSelectedCategories([...pSelectedCategories, category])
    }
  }

  const removeCategoryFromNewProduct = (category: string) => {
    setPSelectedCategories(pSelectedCategories.filter((c) => c !== category))
  }

  const createProduct = async () => {
    if (!pName.trim() || !pPrice.trim()) {
      setError("Nome e preço são obrigatórios")
      return
    }
    if (!selectedFile) {
      setError("Imagem é obrigatória")
      return
    }

    setCreating(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("nome_produto", pName.trim())
      formData.append("price", pPrice.trim())
      if (pOriginal.trim()) formData.append("original_price", pOriginal.trim())
      formData.append("stock", pStock.toString())
      if (pDesc.trim()) formData.append("descricao", pDesc.trim())
      formData.append("categoria", JSON.stringify(pSelectedCategories.length > 0 ? pSelectedCategories : ["Geral"]))
      formData.append("is_new", pNew.toString())
      formData.append("is_best_seller", pBest.toString())
      formData.append("image", selectedFile)

      const headers = await authHeader()
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${headers?.Authorization}` },
        body: formData,
      })

      const json = await safeJson(res)
      if (!res.ok) throw new Error(json?.error || "Erro ao criar produto")

      // Reset form
      setPName("")
      setPPrice("")
      setPOriginal("")
      setPStock(0)
      setPDesc("")
      setPCategories("")
      setPSelectedCategories([]) // Reset selected categories
      setPNew(false)
      setPBest(false)
      setSelectedFile(null)
      setPreviewUrl("")

      await loadProducts()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const saveAllModified = async () => {
    if (modifiedProducts.size === 0) return

    setSavingAll(true)
    setError("")

    try {
      const headers = await authHeader()
      const productsToSave = products.filter((product) => modifiedProducts.has(product.id))

      // Salvar todos os produtos modificados em paralelo
      const savePromises = productsToSave.map(async (product) => {
        const res = await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            id: product.id,
            nome_produto: product.nome_produto,
            descricao: product.descricao ?? "",
            price: product.price,
            original_price: product.original_price,
            categoria: product.categoria,
            stock: product.stock,
            is_new: product.is_new,
            is_best_seller: product.is_best_seller,
          }),
        })
        const json = await safeJson(res)
        if (!res.ok) throw new Error(`Erro ao salvar ${product.nome_produto}: ${json?.error || "Falha ao salvar."}`)
        return json?.product
      })

      const updatedProducts = await Promise.all(savePromises)

      // Atualizar os produtos no estado
      setProducts((prev) =>
        prev.map((product) => {
          const updated = updatedProducts.find((up) => up?.id === product.id)
          return updated ? updated : product
        }),
      )

      // Limpar produtos modificados
      setModifiedProducts(new Set())
    } catch (e: any) {
      setError(e?.message || "Erro ao salvar produtos.")
    } finally {
      setSavingAll(false)
    }
  }

  const deleteRow = async (id: number) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    if (!window.confirm(`Remover o produto "${product.nome_produto}"?`)) return
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
      setProducts((prev) => prev.filter((p) => p.id !== id))
      setModifiedProducts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    } catch (e: any) {
      setError(e?.message || "Erro ao remover.")
    } finally {
      setDeletingMap((m) => ({ ...m, [id]: false }))
    }
  }

  const addCategoryToProduct = (productId: number, category: string) => {
    const product = products.find((p) => p.id === productId)
    if (product && !product.categoria.includes(category)) {
      updateLocal(productId, { categoria: [...product.categoria, category] })
    }
  }

  const removeCategoryFromProduct = (productId: number, categoryToRemove: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      updateLocal(productId, { categoria: product.categoria.filter((c) => c !== categoryToRemove) })
    }
  }

  // Opcional: Gere o slug automaticamente ao digitar o nome
  useEffect(() => {
    // Placeholder for slug generation logic
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
              <label className="text-sm">Categorias</label>
              <div className="space-y-2">
                {pSelectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pSelectedCategories.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="flex items-center gap-1 bg-pink-100 text-pink-800"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => removeCategoryFromNewProduct(category)}
                          className="ml-1 text-pink-600 hover:text-pink-800"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Select onValueChange={addCategoryToNewProduct}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Adicionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CATEGORIES.filter((cat) => !pSelectedCategories.includes(cat)).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <Input className="pl-9" placeholder="Buscar..." value={pName} onChange={(e) => setPName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {modifiedProducts.size > 0 && (
              <Button onClick={saveAllModified} disabled={savingAll} className="bg-green-600 hover:bg-green-700">
                <SaveAll className="w-4 h-4" />
                <span className="ml-2">{savingAll ? "Salvando..." : `Salvar Tudo (${modifiedProducts.size})`}</span>
              </Button>
            )}
            <Button variant="outline" onClick={loadProducts}>
              <RefreshCw className="w-4 h-4" />
              <span className="ml-2">Recarregar</span>
            </Button>
          </div>
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
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-t border-orange-100 ${modifiedProducts.has(product.id) ? "bg-yellow-50" : ""}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <Image
                            src={product.image_url || "/placeholder.svg?height=56&width=56&query=miniatura%20produto"}
                            alt={product.nome_produto}
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
                            value={product.nome_produto}
                            onChange={(e) => updateLocal(product.id, { nome_produto: e.target.value })}
                            className="h-9"
                          />
                          <Input
                            value={product.descricao ?? ""}
                            onChange={(e) => updateLocal(product.id, { descricao: e.target.value })}
                            className="h-9 mt-2"
                            placeholder="Descrição"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1">
                          {product.categoria?.map((category, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-red-50"
                              onClick={() => removeCategoryFromProduct(product.id, category)}
                            >
                              {category} ×
                            </Badge>
                          ))}
                        </div>
                        <Select onValueChange={(value) => addCategoryToProduct(product.id, value)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Adicionar categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_CATEGORIES.filter((cat) => !product.categoria.includes(cat)).map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={product.is_new}
                              onChange={(e) => updateLocal(product.id, { is_new: e.target.checked })}
                            />
                            Novo
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={product.is_best_seller}
                              onChange={(e) => updateLocal(product.id, { is_best_seller: e.target.checked })}
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
                          value={String(product.price)}
                          onChange={(e) => updateLocal(product.id, { price: Number(e.target.value) || 0 })}
                        />
                        <Input
                          className="h-9 mt-2"
                          value={String(product.original_price)}
                          onChange={(e) => updateLocal(product.id, { original_price: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </td>
                    <td className="p-3 align-top w-32">
                      <Input
                        type="number"
                        className="h-9 w-28"
                        value={product.stock}
                        min={0}
                        onChange={(e) =>
                          updateLocal(product.id, { stock: Math.max(0, Math.floor(Number(e.target.value))) })
                        }
                      />
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteRow(product.id)}
                          disabled={!!deletingMap[product.id]}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="ml-2">{deletingMap[product.id] ? "Removendo..." : "Remover"}</span>
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
