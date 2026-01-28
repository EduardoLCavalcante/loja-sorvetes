"use client"

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Trash2, SaveAll, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead } from "@/components/ui/table"

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

function useDebouncedInput<T>(
  initialValue: T,
  onUpdate: (value: T) => void,
  delay = 300,
  transform?: (value: string) => T,
) {
  const [localValue, setLocalValue] = useState<string>(String(initialValue))
  const debouncedValue = useDebounce(localValue, delay)
  const isInitialMount = useRef(true)
  const lastCommittedValue = useRef<string>(String(initialValue))

  // Atualiza valor local apenas quando valor inicial muda externamente
  useEffect(() => {
    const newStringValue = String(initialValue)
    if (newStringValue !== lastCommittedValue.current) {
      setLocalValue(newStringValue)
      lastCommittedValue.current = newStringValue
    }
  }, [initialValue])

  // Chama onUpdate apenas quando usuário fez mudanças reais
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (debouncedValue !== lastCommittedValue.current) {
      const transformedValue = transform ? transform(debouncedValue) : (debouncedValue as T)
      onUpdate(transformedValue)
      lastCommittedValue.current = debouncedValue
    }
  }, [debouncedValue, onUpdate, transform])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }, [])

  return {
    value: localValue,
    onChange: handleChange,
  }
}

const DebouncedTextInput = React.memo(
  ({
    value,
    onUpdate,
    className,
    placeholder,
  }: {
    value: string
    onUpdate: (value: string) => void
    className?: string
    placeholder?: string
  }) => {
    const input = useDebouncedInput(value, onUpdate, 200)
    return <Input {...input} className={className} placeholder={placeholder} />
  },
)

const DebouncedNumberInput = React.memo(
  ({
    value,
    onUpdate,
    className,
    min,
    type = "text",
  }: {
    value: number
    onUpdate: (value: number) => void
    className?: string
    min?: number
    type?: string
  }) => {
    const transformNumber = useCallback(
      (val: string) => {
        const num = Number(val) || 0
        return min !== undefined ? Math.max(min, type === "number" ? Math.floor(num) : num) : num
      },
      [min, type],
    )

    const input = useDebouncedInput(value, onUpdate, 300, transformNumber)
    return <Input {...input} type={type} className={className} min={min} />
  },
)

// Função para detectar dispositivo móvel
const isMobile = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  )
}

// Componente memorizado para linha da tabela desktop
const ProductRowDesktop = React.memo(
  ({
    product,
    onUpdateLocal,
    onRemove,
    availableCategories,
    isRemoving,
  }: {
    product: Product
    onUpdateLocal: (id: number, patch: Partial<Product>) => void
    onRemove: (id: number) => void
    availableCategories: Category[]
    isRemoving: boolean
  }) => {
    const updateName = useCallback(
      (value: string) => onUpdateLocal(product.id, { nome_produto: value }),
      [product.id, onUpdateLocal],
    )
    const updateDescription = useCallback(
      (value: string) => onUpdateLocal(product.id, { descricao: value }),
      [product.id, onUpdateLocal],
    )
    const updatePrice = useCallback(
      (value: number) => onUpdateLocal(product.id, { price: value }),
      [product.id, onUpdateLocal],
    )
    const updateOriginalPrice = useCallback(
      (value: number) => onUpdateLocal(product.id, { original_price: value }),
      [product.id, onUpdateLocal],
    )
    const updateStock = useCallback(
      (value: number) => onUpdateLocal(product.id, { stock: value }),
      [product.id, onUpdateLocal],
    )

    return (
      <tr key={product.id} className={product.stock === 0 ? "opacity-60" : ""}>
        <td className="p-3 align-top">
          <div className="flex items-start gap-3">
            {product.caminho ? (
              <img
                src={product.caminho || "/placeholder.svg"}
                alt={product.nome_produto}
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-xl">🍦</span>
              </div>
            )}
            <div className="min-w-0">
              <DebouncedTextInput value={product.nome_produto} onUpdate={updateName} className="h-9" />
              <DebouncedTextInput
                value={product.descricao ?? ""}
                onUpdate={updateDescription}
                className="h-9 mt-2"
                placeholder="Descrição"
              />
            </div>
          </div>
        </td>
        <td className="p-3 align-top">
          <div className="flex flex-wrap gap-1">
            {product.categoria?.map((category, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-red-50"
                onClick={() => console.log(`Remove category ${category} from product ${product.id}`)}
              >
                {category} ×
              </Badge>
            ))}
          </div>
        </td>
        <td className="p-3 align-top">
          <div className="flex flex-col">
            <DebouncedNumberInput value={product.price} onUpdate={updatePrice} className="h-9" />
            <DebouncedNumberInput value={product.original_price} onUpdate={updateOriginalPrice} className="h-9 mt-2" />
          </div>
        </td>
        <td className="p-3 align-top w-32">
          <DebouncedNumberInput
            value={product.stock}
            onUpdate={updateStock}
            className="h-9 w-28"
            min={0}
            type="number"
          />
        </td>
        <td className="p-3 align-top">
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRemove(product.id)}
              disabled={isRemoving}
              className="h-9"
            >
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </td>
      </tr>
    )
  },
)

// Componente memorizado para card mobile
const ProductCardMobile = React.memo(
  ({
    product,
    onUpdateLocal,
    onRemove,
    availableCategories,
    isRemoving,
  }: {
    product: Product
    onUpdateLocal: (id: number, patch: Partial<Product>) => void
    onRemove: (id: number) => void
    availableCategories: Category[]
    isRemoving: boolean
  }) => {
    const updateName = useCallback(
      (value: string) => onUpdateLocal(product.id, { nome_produto: value }),
      [product.id, onUpdateLocal],
    )
    const updateDescription = useCallback(
      (value: string) => onUpdateLocal(product.id, { descricao: value }),
      [product.id, onUpdateLocal],
    )
    const updatePrice = useCallback(
      (value: number) => onUpdateLocal(product.id, { price: value }),
      [product.id, onUpdateLocal],
    )
    const updateOriginalPrice = useCallback(
      (value: number) => onUpdateLocal(product.id, { original_price: value }),
      [product.id, onUpdateLocal],
    )
    const updateStock = useCallback(
      (value: number) => onUpdateLocal(product.id, { stock: value }),
      [product.id, onUpdateLocal],
    )

    return (
      <Card key={product.id} className={`mb-4 ${product.stock === 0 ? "opacity-60" : ""}`}>
        <CardContent className="p-4">
          {/* Image and basic info */}
          <div className="flex gap-3 mb-4">
            {product.caminho ? (
              <img
                src={product.caminho || "/placeholder.svg"}
                alt={product.nome_produto}
                className="w-20 h-20 object-cover rounded"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-2xl">🍦</span>
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Nome</label>
                <DebouncedTextInput value={product.nome_produto} onUpdate={updateName} className="h-10 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Descrição</label>
                <DebouncedTextInput
                  value={product.descricao ?? ""}
                  onUpdate={updateDescription}
                  className="h-10 mt-1"
                  placeholder="Descrição"
                />
              </div>
            </div>
          </div>

          {/* Price and stock */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Preço</label>
              <DebouncedNumberInput value={product.price} onUpdate={updatePrice} className="h-10 mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Preço Original</label>
              <DebouncedNumberInput
                value={product.original_price}
                onUpdate={updateOriginalPrice}
                className="h-10 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Estoque</label>
              <DebouncedNumberInput
                value={product.stock}
                onUpdate={updateStock}
                className="h-10 mt-1"
                min={0}
                type="number"
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
                      onClick={() => console.log(`Remove category ${category} from product ${product.id}`)}
                    >
                      {category} ×
                    </Badge>
                  ))}
                </div>
              )}
              <Select
                onValueChange={(value) => console.log(`Add category ${value} to product ${product.id}`)}
                disabled={false}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Adicionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={() => onRemove(product.id)} disabled={isRemoving}>
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remover
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  },
)

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
  const [categoryUpdatingMap, setCategoryUpdatingMap] = useState<Record<number, boolean>>({})

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

  const filteredProducts = useMemo(() => {
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
    async (productId: number, category: string) => {
      const product = products.find((p) => p.id === productId)
      if (!product) return
      if (product.categoria.includes(category)) return

      const previousCategories = product.categoria
      const nextCategories = [...previousCategories, category]

      setCategoryUpdatingMap((prev) => ({ ...prev, [productId]: true }))
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, categoria: nextCategories } : p)))

      try {
        const headers = await authHeader()
        if (!headers) {
          setError("Não foi possível obter autorização. Faça login novamente.")
          setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, categoria: previousCategories } : p)))
          return
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const res = await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ id: productId, categoria: nextCategories }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        const json = await safeJson(res)

        if (!res.ok) {
          if (handleAuthError(new Error(json?.error), res)) {
            setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, categoria: previousCategories } : p)))
            return
          }
          throw new Error(json?.error || "Falha ao adicionar categoria.")
        }

        if (json?.product) {
          setProducts((prev) => prev.map((p) => (p.id === productId ? json.product : p)))
        }
      } catch (e: any) {
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, categoria: previousCategories } : p)))
        if (e.name === "AbortError") {
          setError("Timeout: Adicionar categoria demorou muito. Verifique sua conexão e tente novamente.")
        } else if (!handleAuthError(e)) {
          setError(e?.message || "Erro ao adicionar categoria.")
        }
      } finally {
        setCategoryUpdatingMap((prev) => ({ ...prev, [productId]: false }))
      }
    },
    [products, authHeader, handleAuthError],
  )

  const removeCategoryFromProduct = useCallback(
    async (productId: number, categoryToRemove: string) => {
      const product = products.find((p) => p.id === productId)
      if (!product) return

      const previousCategories = product.categoria
      const nextCategories = previousCategories.filter((c) => c !== categoryToRemove)

      setCategoryUpdatingMap((prev) => ({ ...prev, [productId]: true }))
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, categoria: nextCategories } : p)))

      try {
        const headers = await authHeader()
        if (!headers) {
          setError("Não foi possível obter autorização. Faça login novamente.")
          setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, categoria: previousCategories } : p)))
          return
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const res = await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ id: productId, categoria: nextCategories }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        const json = await safeJson(res)

        if (!res.ok) {
          if (handleAuthError(new Error(json?.error), res)) {
            setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, categoria: previousCategories } : p)))
            return
          }
          throw new Error(json?.error || "Falha ao remover categoria.")
        }

        if (json?.product) {
          setProducts((prev) => prev.map((p) => (p.id === productId ? json.product : p)))
        }
      } catch (e: any) {
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, categoria: previousCategories } : p)))
        if (e.name === "AbortError") {
          setError("Timeout: Remover categoria demorou muito. Verifique sua conexão e tente novamente.")
        } else if (!handleAuthError(e)) {
          setError(e?.message || "Erro ao remover categoria.")
        }
      } finally {
        setCategoryUpdatingMap((prev) => ({ ...prev, [productId]: false }))
      }
    },
    [products, authHeader, handleAuthError],
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

        const res = await fetch(`/api/admin/products`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          signal: controller.signal,
          body: JSON.stringify({
            id: product.id,
            nome_produto: product.nome_produto,
            price: product.price,
            original_price: product.original_price,
            stock: product.stock,
            descricao: product.descricao,
            is_new: product.is_new,
            is_best_seller: product.is_best_seller,
            categoria: Array.isArray(product.categoria) ? product.categoria : [],
          }),
        })

        clearTimeout(timeoutId)
        const json = await safeJson(res)
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
        ) : filteredProducts.length === 0 ? (
          <div className="py-10 text-center text-gray-600">Nenhum produto encontrado.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categorias</TableHead>
                    <TableHead>Preços</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <ProductRowDesktop
                      key={product.id}
                      product={product}
                      onUpdateLocal={updateLocal}
                      onRemove={deleteRow}
                      availableCategories={categories}
                      isRemoving={deletingMap[product.id]}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {filteredProducts.map((product) => (
                <ProductCardMobile
                  key={product.id}
                  product={product}
                  onUpdateLocal={updateLocal}
                  onRemove={deleteRow}
                  availableCategories={categories}
                  isRemoving={deletingMap[product.id]}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
