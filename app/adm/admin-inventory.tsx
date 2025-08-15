"use client"

import { useEffect, useMemo, useState, useCallback, memo } from "react"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Trash2, SaveAll } from "lucide-react"

interface Product {
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

interface Category {
  id: number
  name: string
  slug: string
}

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Função para detectar dispositivo móvel
const isMobile = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  )
}

// Componente memorizado para linha da tabela desktop
const ProductTableRow = memo(
  ({
    product,
    modifiedProducts,
    deletingMap,
    categories,
    categoriesLoading,
    onUpdateLocal,
    onAddCategory,
    onRemoveCategory,
    onDelete,
  }: {
    product: Product
    modifiedProducts: Set<number>
    deletingMap: Record<number, boolean>
    categories: Category[]
    categoriesLoading: boolean
    onUpdateLocal: (id: number, patch: Partial<Product>) => void
    onAddCategory: (productId: number, category: string) => void
    onRemoveCategory: (productId: number, category: string) => void
    onDelete: (id: number) => void
  }) => {
    return (
      <tr className={`border-t border-orange-100 ${modifiedProducts.has(product.id) ? "bg-yellow-50" : ""}`}>
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
                onChange={(e) => onUpdateLocal(product.id, { nome_produto: e.target.value })}
                className="h-9"
              />
              <Input
                value={product.descricao ?? ""}
                onChange={(e) => onUpdateLocal(product.id, { descricao: e.target.value })}
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
                  onClick={() => onRemoveCategory(product.id, category)}
                >
                  {category} ×
                </Badge>
              ))}
            </div>
            <Select onValueChange={(value) => onAddCategory(product.id, value)} disabled={categoriesLoading}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={categoriesLoading ? "Carregando..." : "Adicionar categoria"} />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((cat) => !product.categoria.includes(cat.name))
                  .map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={product.is_new}
                  onChange={(e) => onUpdateLocal(product.id, { is_new: e.target.checked })}
                />
                Novo
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={product.is_best_seller}
                  onChange={(e) => onUpdateLocal(product.id, { is_best_seller: e.target.checked })}
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
              onChange={(e) => onUpdateLocal(product.id, { price: Number(e.target.value) || 0 })}
            />
            <Input
              className="h-9 mt-2"
              value={String(product.original_price)}
              onChange={(e) => onUpdateLocal(product.id, { original_price: Number(e.target.value) || 0 })}
            />
          </div>
        </td>
        <td className="p-3 align-top w-32">
          <Input
            type="number"
            className="h-9 w-28"
            value={product.stock}
            min={0}
            onChange={(e) => onUpdateLocal(product.id, { stock: Math.max(0, Math.floor(Number(e.target.value))) })}
          />
        </td>
        <td className="p-3 align-top">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(product.id)}
              disabled={!!deletingMap[product.id]}
            >
              <Trash2 className="w-4 h-4" />
              <span className="ml-2">{deletingMap[product.id] ? "Removendo..." : "Remover"}</span>
            </Button>
          </div>
        </td>
      </tr>
    )
  },
)

ProductTableRow.displayName = "ProductTableRow"

// Componente memorizado para card mobile
const ProductMobileCard = memo(
  ({
    product,
    modifiedProducts,
    deletingMap,
    categories,
    categoriesLoading,
    onUpdateLocal,
    onAddCategory,
    onRemoveCategory,
    onDelete,
  }: {
    product: Product
    modifiedProducts: Set<number>
    deletingMap: Record<number, boolean>
    categories: Category[]
    categoriesLoading: boolean
    onUpdateLocal: (id: number, patch: Partial<Product>) => void
    onAddCategory: (productId: number, category: string) => void
    onRemoveCategory: (productId: number, category: string) => void
    onDelete: (id: number) => void
  }) => {
    return (
      <div
        className={`border border-orange-100 rounded-xl p-4 ${modifiedProducts.has(product.id) ? "bg-yellow-50 border-yellow-200" : "bg-white"}`}
      >
        {/* Product header with image and basic info */}
        <div className="flex items-start gap-3 mb-4">
          {product.image_url ? (
            <Image
              src={product.image_url || "/placeholder.svg?height=80&width=80&query=miniatura%20produto"}
              alt={product.nome_produto}
              width={80}
              height={80}
              unoptimized
              className="w-20 h-20 rounded-lg object-cover bg-orange-50 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🍦</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Nome</label>
                <Input
                  value={product.nome_produto}
                  onChange={(e) => onUpdateLocal(product.id, { nome_produto: e.target.value })}
                  className="h-10 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Descrição</label>
                <Input
                  value={product.descricao ?? ""}
                  onChange={(e) => onUpdateLocal(product.id, { descricao: e.target.value })}
                  className="h-10 mt-1"
                  placeholder="Descrição"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Price and stock */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Preço</label>
            <Input
              className="h-10 mt-1"
              value={String(product.price)}
              onChange={(e) => onUpdateLocal(product.id, { price: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Preço Original</label>
            <Input
              className="h-10 mt-1"
              value={String(product.original_price)}
              onChange={(e) => onUpdateLocal(product.id, { original_price: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Estoque</label>
            <Input
              type="number"
              className="h-10 mt-1"
              value={product.stock}
              min={0}
              onChange={(e) => onUpdateLocal(product.id, { stock: Math.max(0, Math.floor(Number(e.target.value))) })}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600">Categorias</label>
          <div className="space-y-2 mt-1">
            {product.categoria?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.categoria.map((category, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-red-50"
                    onClick={() => onRemoveCategory(product.id, category)}
                  >
                    {category} ×
                  </Badge>
                ))}
              </div>
            )}
            <Select onValueChange={(value) => onAddCategory(product.id, value)} disabled={categoriesLoading}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={categoriesLoading ? "Carregando..." : "Adicionar categoria"} />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((cat) => !product.categoria.includes(cat.name))
                  .map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Checkboxes and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={product.is_new}
                onChange={(e) => onUpdateLocal(product.id, { is_new: e.target.checked })}
              />
              Novo
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={product.is_best_seller}
                onChange={(e) => onUpdateLocal(product.id, { is_best_seller: e.target.checked })}
              />
              Mais vendido
            </label>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(product.id)}
            disabled={!!deletingMap[product.id]}
          >
            <Trash2 className="w-4 h-4" />
            <span className="ml-2">{deletingMap[product.id] ? "Removendo..." : "Remover"}</span>
          </Button>
        </div>
      </div>
    )
  },
)

ProductMobileCard.displayName = "ProductMobileCard"

export default function AdminInventory({ onAuthError }: { onAuthError?: () => void }) {
  const supabase = getSupabaseBrowserClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modifiedProducts, setModifiedProducts] = useState<Set<number>>(new Set())
  const [savingAll, setSavingAll] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [creating, setCreating] = useState(false)
  const [pName, setPName] = useState("")
  const [pPrice, setPPrice] = useState("")
  const [pOriginal, setPOriginal] = useState("")
  const [pStock, setPStock] = useState(0)
  const [pDesc, setPDesc] = useState("")
  const [pSelectedCategories, setPSelectedCategories] = useState<string[]>([])
  const [pNew, setPNew] = useState(false)
  const [pBest, setPBest] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [deletingMap, setDeletingMap] = useState<Record<number, boolean>>({})

  // Debounce da busca para melhor performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const handleAuthError = useCallback(
    (error: any, response?: Response) => {
      if (
        response?.status === 401 ||
        error?.message?.includes("não autorizado") ||
        error?.message?.includes("unauthorized")
      ) {
        console.warn("Erro de autenticação detectado, fazendo logout...")
        onAuthError?.()
        return true
      }
      return false
    },
    [onAuthError],
  )

  const authHeader = async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.warn("Erro ao obter sessão:", error)
        handleAuthError(error)
        return undefined
      }
      const token = data.session?.access_token
      if (!token) {
        console.warn("Token não encontrado")
        handleAuthError(new Error("Token não encontrado"))
        return undefined
      }
      return { Authorization: `Bearer ${token}` }
    } catch (error) {
      console.warn("Erro ao obter header de auth:", error)
      handleAuthError(error)
      return undefined
    }
  }

  const safeJson = async (res: Response) => {
    const text = await res.text()
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return {}
    }
  }

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await authHeader()
      if (!headers) {
        setError("Não foi possível obter autorização. Faça login novamente.")
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const res = await fetch("/api/admin/products", {
        cache: "no-store",
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const json = await safeJson(res)

      if (!res.ok) {
        if (handleAuthError(new Error(json?.error), res)) return
        throw new Error(json?.error || "Falha ao carregar produtos.")
      }

      setProducts(Array.isArray(json?.products) ? json.products : [])
      setModifiedProducts(new Set())
    } catch (e: any) {
      if (e.name === "AbortError") {
        setError("Timeout: Carregamento demorou muito. Verifique sua conexão e tente novamente.")
      } else if (!handleAuthError(e)) {
        setError(e?.message || "Erro ao carregar.")
      }
    } finally {
      setLoading(false)
    }
  }, [handleAuthError])

  const fetchCategories = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const res = await fetch("/api/categories", {
        cache: "no-store",
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      const json = await safeJson(res)
      
      if (res.ok && Array.isArray(json)) {
        setCategories(json)
        setCategoriesLoading(false)
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.warn("Timeout ao carregar categorias")
      } else {
        console.warn("Erro ao carregar categorias:", e)
      }
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  const filtered = useMemo(() => {
    const t = debouncedSearchTerm.trim().toLowerCase()
    if (!t) return products
    return products.filter((p) => p.nome_produto.toLowerCase().includes(t))
  }, [products, debouncedSearchTerm])

  const updateLocal = useCallback((id: number, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    setModifiedProducts((prev) => new Set([...prev, id]))
  }, [])

  const compressImage = useCallback(
    (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
      return new Promise((resolve) => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const img = new window.Image()

        img.onload = () => {
          const mobile = isMobile()
          const targetWidth = mobile ? 600 : maxWidth
          const targetQuality = mobile ? 0.6 : quality

          // Calcular dimensões mantendo proporção
          const ratio = Math.min(targetWidth / img.width, targetWidth / img.height)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio

          // Desenhar imagem redimensionada
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

          // Converter para blob e depois para file
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                  type: "image/webp",
                  lastModified: Date.now(),
                })
                console.log(
                  `Imagem comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
                )
                resolve(compressedFile)
              } else {
                console.warn("Falha na compressão, usando arquivo original")
                resolve(file)
              }
            },
            "image/webp",
            targetQuality,
          )
        }

        img.onerror = () => {
          console.warn("Erro ao carregar imagem para compressão, usando arquivo original")
          resolve(file)
        }

        img.src = URL.createObjectURL(file)
      })
    },
    [isMobile],
  )

  const onSelectFile = useCallback(
    async (file: File | null) => {
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl("")
      setError(null)

      if (!file) return

      const mobile = isMobile()
      const maxSize = mobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024 // 5MB para mobile, 10MB para desktop

      if (file.size > maxSize) {
        setError(`Arquivo muito grande. Máximo ${mobile ? "5MB" : "10MB"} para ${mobile ? "mobile" : "desktop"}.`)
        return
      }

      try {
        setError("Comprimindo imagem...")
        const compressedFile = await compressImage(file)

        if (compressedFile.size > maxSize) {
          setError(`Imagem ainda muito grande após compressão. Tente uma imagem menor.`)
          return
        }

        setSelectedFile(compressedFile)
        setPreviewUrl(URL.createObjectURL(compressedFile))
        setError(null)
      } catch (error) {
        console.error("Erro ao comprimir imagem:", error)
        setError("Erro ao processar imagem. Tente outra imagem.")
      }
    },
    [previewUrl, compressImage, isMobile],
  )

  const addCategoryToNewProduct = useCallback((category: string) => {
    setPSelectedCategories((prev) => (prev.includes(category) ? prev : [...prev, category]))
  }, [])

  const removeCategoryFromNewProduct = useCallback((category: string) => {
    setPSelectedCategories((prev) => prev.filter((c) => c !== category))
  }, [])

  const addCategoryToProduct = useCallback(
    (productId: number, category: string) => {
      const product = products.find((p) => p.id === productId)
      if (product && !product.categoria.includes(category)) {
        updateLocal(productId, { categoria: [...product.categoria, category] })
      }
    },
    [products, updateLocal],
  )

  const removeCategoryFromProduct = useCallback(
    (productId: number, categoryToRemove: string) => {
      const product = products.find((p) => p.id === productId)
      if (product) {
        updateLocal(productId, { categoria: product.categoria.filter((c) => c !== categoryToRemove) })
      }
    },
    [products, updateLocal],
  )

  const createProduct = useCallback(async () => {
    if (!pName.trim() || !pPrice.trim()) {
      setError("Nome e preço são obrigatórios")
      return
    }
    if (!selectedFile) {
      setError("Imagem é obrigatória")
      return
    }

    setCreating(true)
    setError(null)

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
      if (!headers) {
        setError("Não foi possível obter autorização. Faça login novamente.")
        return
      }

      const controller = new AbortController()
      const mobile = isMobile()
      const timeout = mobile ? 120000 : 60000
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      setError(`Enviando produto... ${mobile ? "(pode demorar mais em mobile)" : ""}`)

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = "Erro ao criar produto"

        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson?.error || errorMessage
        } catch {
          if (res.status === 401) errorMessage = "Não autorizado. Faça login novamente."
          else if (res.status === 413) errorMessage = "Arquivo muito grande para o servidor"
          else if (res.status === 408) errorMessage = "Timeout: Upload demorou muito"
          else if (res.status >= 500) errorMessage = "Erro no servidor. Tente novamente."
          else errorMessage = `Erro ${res.status}: ${errorText || "Erro desconhecido"}`
        }

        if (handleAuthError(new Error(errorMessage), res)) return

        throw new Error(errorMessage)
      }

      const json = await safeJson(res)

      // Reset form
      setPName("")
      setPPrice("")
      setPOriginal("")
      setPStock(0)
      setPDesc("")
      setPSelectedCategories([])
      setPNew(false)
      setPBest(false)
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl("")

      setError("Produto criado com sucesso!")
      setTimeout(() => setError(null), 3000)

      await fetchProducts()
    } catch (e: any) {
      if (e.name === "AbortError") {
        setError("Timeout: Upload demorou muito. Verifique sua conexão e tente novamente.")
      } else if (!handleAuthError(e)) {
        setError(e.message || "Erro desconhecido ao criar produto")
      }
    } finally {
      setCreating(false)
    }
  }, [
    pName,
    pPrice,
    pOriginal,
    pStock,
    pDesc,
    pSelectedCategories,
    pNew,
    pBest,
    selectedFile,
    previewUrl,
    fetchProducts,
    handleAuthError,
  ])

  const saveAllModified = useCallback(async () => {
    if (modifiedProducts.size === 0) return

    setSavingAll(true)
    try {
      const headers = await authHeader()
      if (!headers) {
        setError("Não foi possível obter autorização. Faça login novamente.")
        return
      }

      const modifiedList = products.filter((p) => modifiedProducts.has(p.id))

      const savePromises = modifiedList.map(async (product) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const res = await fetch(`/api/admin/products?id=${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          signal: controller.signal,
          body: JSON.stringify({
            nome_produto: product.nome_produto,
            price: product.price,
            original_price: product.original_price,
            stock: product.stock,
            descricao: product.descricao,            
            is_new: product.is_new,
            is_best_seller: product.is_best_seller,
          }),
        })
        console.log(res)

        clearTimeout(timeoutId)
        const json = await safeJson(res)
        console.log(json)
        if (!res.ok) {
          if (handleAuthError(new Error(json?.error), res)) {
            throw new Error("Sessão expirada")
          }
          throw new Error(`Erro ao salvar ${product.nome_produto}: ${json?.error || "Falha ao salvar."}`)
        }
        return json?.product
      })

      const updatedProducts = await Promise.all(savePromises)

      setProducts((prev) =>
        prev.map((product) => {
          const updated = updatedProducts.find((up) => up?.id === product.id)
          return updated ? updated : product
        }),
      )

      setModifiedProducts(new Set())
    } catch (e: any) {
      if (e.name === "AbortError") {
        setError("Timeout: Salvamento demorou muito. Verifique sua conexão e tente novamente.")
      } else if (!handleAuthError(e)) {
        setError(e?.message || "Erro ao salvar produtos.")
      }
    } finally {
      setSavingAll(false)
    }
  }, [modifiedProducts, products, handleAuthError])

  const deleteRow = useCallback(
    async (id: number) => {
      if (!confirm("Tem certeza que deseja remover este produto?")) return
      setDeletingMap((m) => ({ ...m, [id]: true }))
      try {
        const headers = await authHeader()
        if (!headers) {
          setError("Não foi possível obter autorização. Faça login novamente.")
          return
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const res = await fetch(`/api/admin/products?id=${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ id }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        const json = await safeJson(res)

        if (!res.ok) {
          if (handleAuthError(new Error(json?.error), res)) return
          throw new Error(json?.error || "Falha ao remover.")
        }

        setProducts((prev) => prev.filter((p) => p.id !== id))
        setModifiedProducts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      } catch (e: any) {
        if (e.name === "AbortError") {
          setError("Timeout: Remoção demorou muito. Verifique sua conexão e tente novamente.")
        } else if (!handleAuthError(e)) {
          setError(e?.message || "Erro ao remover.")
        }
      } finally {
        setDeletingMap((m) => ({ ...m, [id]: false }))
      }
    },
    [products, handleAuthError],
  )

  return (
    <section className="space-y-6">
      {/* New product */}
      <div className="bg-white/90 rounded-2xl border border-orange-100 shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Adicionar produto</h2>
        {error ? (
          <div className="mb-4 text-sm rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2">{error}</div>
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Nome do produto"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Preço</label>
              <Input value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="12,90" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Preço original (opcional)</label>
              <Input
                value={pOriginal}
                onChange={(e) => setPOriginal(e.target.value)}
                placeholder="15,90"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estoque</label>
              <Input
                type="number"
                value={pStock}
                onChange={(e) => setPStock(Math.max(0, Math.floor(Number(e.target.value))))}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                placeholder="Descrição do produto"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Categorias</label>
              <div className="space-y-2 mt-1">
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
                <Select onValueChange={addCategoryToNewProduct} disabled={categoriesLoading}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={categoriesLoading ? "Carregando..." : "Adicionar categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((cat) => !pSelectedCategories.includes(cat.name))
                      .map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
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
            <label className="text-sm font-medium">Imagem</label>
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
              <p className="text-xs text-gray-500 mt-1">
                Imagens são automaticamente comprimidas para WebP. Máximo {isMobile() ? "5MB" : "10MB"}{" "}
                {isMobile() ? "(mobile)" : "(desktop)"}.
                {isMobile() && <span className="block text-orange-600">Mobile: compressão extra aplicada</span>}
              </p>
              <Button onClick={createProduct} disabled={creating} className="w-full">
                {creating ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white/90 rounded-2xl border border-orange-100 shadow p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              className="pl-9"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {modifiedProducts.size > 0 && (
              <Button
                onClick={saveAllModified}
                disabled={savingAll}
                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              >
                <SaveAll className="w-4 h-4" />
                <span className="ml-2">{savingAll ? "Salvando..." : `Salvar Tudo (${modifiedProducts.size})`}</span>
              </Button>
            )}
            <Button variant="outline" onClick={fetchProducts} className="flex-1 sm:flex-none bg-transparent">
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
          <>
            <div className="hidden lg:block overflow-x-auto">
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
                    <ProductTableRow
                      key={product.id}
                      product={product}
                      modifiedProducts={modifiedProducts}
                      deletingMap={deletingMap}
                      categories={categories}
                      categoriesLoading={categoriesLoading}
                      onUpdateLocal={updateLocal}
                      onAddCategory={addCategoryToProduct}
                      onRemoveCategory={removeCategoryFromProduct}
                      onDelete={deleteRow}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-4">
              {filtered.map((product) => (
                <ProductMobileCard
                  key={product.id}
                  product={product}
                  modifiedProducts={modifiedProducts}
                  deletingMap={deletingMap}
                  categories={categories}
                  categoriesLoading={categoriesLoading}
                  onUpdateLocal={updateLocal}
                  onAddCategory={addCategoryToProduct}
                  onRemoveCategory={removeCategoryFromProduct}
                  onDelete={deleteRow}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
