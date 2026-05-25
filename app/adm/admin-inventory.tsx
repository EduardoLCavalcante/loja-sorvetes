"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Search, RefreshCw, Trash2, SaveAll, Loader2, Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead } from "@/components/ui/table"
import { parsePrice } from "@/lib/utils/pricing"

interface Product {
  id: number
  nome_produto: string
  descricao: string | null
  price: number
  original_price: number
  categoria: string[]
  caminho: string | null
  image_url: string | null
  is_new: boolean
  is_best_seller: boolean
  is_available: boolean
}

type AlertState = {
  type: "error" | "success" | "info"
  message: string
} | null

type AlertType = NonNullable<AlertState>["type"]

type ImageDraft = {
  file: File
  previewUrl: string
}

type StatusFilter = "all" | "modified" | "new" | "best" | "no-image" | "available" | "unavailable"
type SortOption = "name-asc" | "price-asc" | "price-desc" | "recent"

const DEFAULT_CATEGORY = "Geral"
const ALL_CATEGORIES_VALUE = "__all__"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

function normalizeCategoryName(category: string) {
  return category.trim()
}

function mergeCategories(...groups: Array<Array<string | null | undefined>>) {
  return Array.from(
    new Set(
      groups
        .flat()
        .map((category) => normalizeCategoryName(String(category || "")))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"))
}

function parseEditableNumber(value: string, fallback = 0) {
  const parsed = parsePrice(value)
  return parsed === null || parsed < 0 ? fallback : Math.round(parsed * 100) / 100
}

function productImageSrc(product: Product, imageDraft?: ImageDraft) {
  return imageDraft?.previewUrl || product.image_url || product.caminho || ""
}

function hasProductImage(product: Product, imageDraft?: ImageDraft) {
  return Boolean(productImageSrc(product, imageDraft))
}

function isMobile() {
  if (typeof window === "undefined") return false
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent) ||
    window.innerWidth <= 768
  )
}

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function useDebouncedInput<T>(
  initialValue: T,
  onUpdate: (value: T) => void,
  delay = 300,
  transform?: (value: string) => T,
) {
  const [localValue, setLocalValue] = useState<string>(String(initialValue ?? ""))
  const debouncedValue = useDebounce(localValue, delay)
  const isInitialMount = useRef(true)
  const lastCommittedValue = useRef<string>(String(initialValue ?? ""))
  const onUpdateRef = useRef(onUpdate)
  const transformRef = useRef(transform)

  onUpdateRef.current = onUpdate
  transformRef.current = transform

  useEffect(() => {
    const nextValue = String(initialValue ?? "")
    if (nextValue !== lastCommittedValue.current) {
      setLocalValue(nextValue)
      lastCommittedValue.current = nextValue
    }
  }, [initialValue])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (debouncedValue !== lastCommittedValue.current) {
      const fn = onUpdateRef.current
      const tx = transformRef.current
      fn(tx ? tx(debouncedValue) : (debouncedValue as T))
      lastCommittedValue.current = debouncedValue
    }
  }, [debouncedValue])

  return {
    value: localValue,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setLocalValue(event.target.value),
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
    integer = false,
  }: {
    value: number
    onUpdate: (value: number) => void
    className?: string
    min?: number
    integer?: boolean
  }) => {
    const transformNumber = useCallback(
      (nextValue: string) => {
        const parsed = integer ? Math.floor(Number(nextValue)) : parseEditableNumber(nextValue)
        const normalized = Number.isFinite(parsed) ? parsed : 0
        return min !== undefined ? Math.max(min, normalized) : normalized
      },
      [integer, min],
    )

    const input = useDebouncedInput(value, onUpdate, 300, transformNumber)
    return <Input {...input} type={integer ? "number" : "text"} className={className} min={min} />
  },
)

const CategoryEditor = React.memo(
  ({
    selected,
    options,
    disabled,
    onAdd,
    onRemove,
    compact = false,
  }: {
    selected: string[]
    options: string[]
    disabled?: boolean
    onAdd: (category: string) => void
    onRemove: (category: string) => void
    compact?: boolean
  }) => {
    const [customCategory, setCustomCategory] = useState("")
    const availableOptions = options.filter((category) => !selected.includes(category))

    const addCustomCategory = () => {
      const category = normalizeCategoryName(customCategory)
      if (!category) return

      onAdd(category)
      setCustomCategory("")
    }

    return (
      <div className="space-y-2">
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((category) => (
              <Badge
                key={category}
                variant="outline"
                className={`text-xs ${disabled ? "opacity-60" : "cursor-pointer hover:bg-red-50"}`}
                onClick={() => {
                  if (!disabled) onRemove(category)
                }}
              >
                {category} ×
              </Badge>
            ))}
          </div>
        ) : null}

        <div className={compact ? "space-y-2" : "grid grid-cols-1 gap-2"}>
          <Select
            value=""
            onChange={(event) => {
              if (event.target.value) onAdd(event.target.value)
            }}
            disabled={disabled || availableOptions.length === 0}
            className={compact ? "h-9" : "h-10"}
            aria-label="Adicionar categoria"
          >
            <option value="" disabled>
              {availableOptions.length > 0 ? "Adicionar categoria" : "Sem categorias"}
            </option>
            {availableOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <Input
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addCustomCategory()
                }
              }}
              disabled={disabled}
              placeholder="Nova categoria"
              className={compact ? "h-9" : "h-10"}
            />
            <Button type="button" variant="outline" onClick={addCustomCategory} disabled={disabled || !customCategory.trim()}>
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    )
  },
)

const ProductRowDesktop = React.memo(
  ({
    product,
    categoryOptions,
    imageDraft,
    isModified,
    isRemoving,
    isSaving,
    onUpdateLocal,
    onRemove,
    onAddCategory,
    onRemoveCategory,
    onSelectImage,
  }: {
    product: Product
    categoryOptions: string[]
    imageDraft?: ImageDraft
    isModified: boolean
    isRemoving: boolean
    isSaving: boolean
    onUpdateLocal: (id: number, patch: Partial<Product>) => void
    onRemove: (id: number) => void
    onAddCategory: (productId: number, category: string) => void
    onRemoveCategory: (productId: number, category: string) => void
    onSelectImage: (productId: number, file: File | null) => void
  }) => {
    const imageSrc = productImageSrc(product, imageDraft)
    const missingImage = !hasProductImage(product, imageDraft)

    return (
      <tr className={isModified ? "bg-amber-50/50" : ""}>
        <td className="min-w-[340px] p-2.5 align-top">
          <div className="flex items-start gap-3">
            {imageSrc ? (
              <img src={imageSrc} alt={product.nome_produto} className="h-14 w-14 rounded object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">
                Sem imagem
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[11px]">
                  #{product.id}
                </Badge>
                {isModified ? <Badge className="bg-amber-100 text-amber-800 text-[11px]">Pendente</Badge> : null}
                {missingImage ? <Badge className="bg-gray-100 text-gray-700 text-[11px]">Sem imagem</Badge> : null}
                {!product.is_available ? (
                  <Badge className="bg-red-100 text-red-800 text-[11px]">Indisponível</Badge>
                ) : null}
              </div>
              <DebouncedTextInput
                value={product.nome_produto}
                onUpdate={(value) => onUpdateLocal(product.id, { nome_produto: value })}
                className="h-9"
              />
              <DebouncedTextInput
                value={product.descricao ?? ""}
                onUpdate={(value) => onUpdateLocal(product.id, { descricao: value })}
                className="h-9"
                placeholder="Descrição"
              />
              <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-orange-100 bg-white px-3 text-xs text-gray-700 hover:bg-orange-50">
                <Upload className="h-3.5 w-3.5" />
                {imageDraft ? "Imagem alterada" : "Trocar imagem"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => onSelectImage(product.id, event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
        </td>
        <td className="min-w-[220px] p-2.5 align-top">
          <CategoryEditor
            selected={product.categoria}
            options={categoryOptions}
            onAdd={(category) => onAddCategory(product.id, category)}
            onRemove={(category) => onRemoveCategory(product.id, category)}
            compact
          />
        </td>
        <td className="p-2.5 align-top">
          <div className="mb-1 text-[11px] text-gray-500">{currencyFormatter.format(product.price)}</div>
          <div className="w-32 space-y-2">
            <DebouncedNumberInput
              value={product.price}
              onUpdate={(value) => onUpdateLocal(product.id, { price: value })}
              className="h-9"
            />
            <DebouncedNumberInput
              value={product.original_price}
              onUpdate={(value) => onUpdateLocal(product.id, { original_price: value })}
              className="h-9"
            />
          </div>
        </td>
        <td className="min-w-[130px] p-2.5 align-top">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={product.is_new}
                onChange={(event) => onUpdateLocal(product.id, { is_new: event.target.checked })}
              />
              Novo
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={product.is_best_seller}
                onChange={(event) => onUpdateLocal(product.id, { is_best_seller: event.target.checked })}
              />
              Mais vendido
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={product.is_available}
                onChange={(event) => onUpdateLocal(product.id, { is_available: event.target.checked })}
              />
              Disponível
            </label>
          </div>
        </td>
        <td className="p-2.5 align-top">
          <Button variant="destructive" size="sm" onClick={() => onRemove(product.id)} disabled={isRemoving || isSaving}>
            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </td>
      </tr>
    )
  },
)

const ProductCardMobile = React.memo(
  ({
    product,
    categoryOptions,
    imageDraft,
    isModified,
    isRemoving,
    isSaving,
    onUpdateLocal,
    onRemove,
    onAddCategory,
    onRemoveCategory,
    onSelectImage,
  }: {
    product: Product
    categoryOptions: string[]
    imageDraft?: ImageDraft
    isModified: boolean
    isRemoving: boolean
    isSaving: boolean
    onUpdateLocal: (id: number, patch: Partial<Product>) => void
    onRemove: (id: number) => void
    onAddCategory: (productId: number, category: string) => void
    onRemoveCategory: (productId: number, category: string) => void
    onSelectImage: (productId: number, file: File | null) => void
  }) => {
    const imageSrc = productImageSrc(product, imageDraft)
    const missingImage = !hasProductImage(product, imageDraft)

    return (
      <Card className={isModified ? "border-amber-200 bg-amber-50/40" : ""}>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[11px]">
              #{product.id}
            </Badge>
            {isModified ? <Badge className="bg-amber-100 text-amber-800 text-[11px]">Pendente</Badge> : null}
            {missingImage ? <Badge className="bg-gray-100 text-gray-700 text-[11px]">Sem imagem</Badge> : null}
            {!product.is_available ? <Badge className="bg-red-100 text-red-800 text-[11px]">Indisponível</Badge> : null}
          </div>
          <div className="flex gap-3">
            {imageSrc ? (
              <img src={imageSrc} alt={product.nome_produto} className="h-20 w-20 rounded object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">
                Sem imagem
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <label className="text-xs font-medium text-gray-600">Nome</label>
              <DebouncedTextInput
                value={product.nome_produto}
                onUpdate={(value) => onUpdateLocal(product.id, { nome_produto: value })}
                className="h-10"
              />
              <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-orange-100 bg-white px-3 text-xs text-gray-700 hover:bg-orange-50">
                <Upload className="h-3.5 w-3.5" />
                {imageDraft ? "Imagem alterada" : "Trocar imagem"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => onSelectImage(product.id, event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Descrição</label>
            <DebouncedTextInput
              value={product.descricao ?? ""}
              onUpdate={(value) => onUpdateLocal(product.id, { descricao: value })}
              className="mt-1 h-10"
              placeholder="Descrição"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Preço</label>
              <DebouncedNumberInput
                value={product.price}
                onUpdate={(value) => onUpdateLocal(product.id, { price: value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Preço original</label>
              <DebouncedNumberInput
                value={product.original_price}
                onUpdate={(value) => onUpdateLocal(product.id, { original_price: value })}
                className="mt-1 h-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={product.is_new}
                onChange={(event) => onUpdateLocal(product.id, { is_new: event.target.checked })}
              />
              Novo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={product.is_best_seller}
                onChange={(event) => onUpdateLocal(product.id, { is_best_seller: event.target.checked })}
              />
              Mais vendido
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={product.is_available}
                onChange={(event) => onUpdateLocal(product.id, { is_available: event.target.checked })}
              />
              Disponível
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Categorias</label>
            <div className="mt-1">
              <CategoryEditor
                selected={product.categoria}
                options={categoryOptions}
                onAdd={(category) => onAddCategory(product.id, category)}
                onRemove={(category) => onRemoveCategory(product.id, category)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={() => onRemove(product.id)} disabled={isRemoving || isSaving}>
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span className="ml-2">Remover</span>
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
  const [alert, setAlert] = useState<AlertState>(null)
  const [modifiedProducts, setModifiedProducts] = useState<Set<number>>(new Set())
  const [savingAll, setSavingAll] = useState(false)
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortOption, setSortOption] = useState<SortOption>("name-asc")
  const [creating, setCreating] = useState(false)
  const [pName, setPName] = useState("")
  const [pPrice, setPPrice] = useState("")
  const [pOriginal, setPOriginal] = useState("")
  const [pDesc, setPDesc] = useState("")
  const [pSelectedCategories, setPSelectedCategories] = useState<string[]>([])
  const [pNew, setPNew] = useState(false)
  const [pBest, setPBest] = useState(false)
  const [pAvailable, setPAvailable] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [imageDrafts, setImageDrafts] = useState<Record<number, ImageDraft>>({})
  const [deletingMap, setDeletingMap] = useState<Record<number, boolean>>({})

  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const previewUrlRef = useRef(previewUrl)
  const imageDraftsRef = useRef(imageDrafts)
  const modifiedProductsRef = useRef(modifiedProducts)

  useEffect(() => {
    previewUrlRef.current = previewUrl
  }, [previewUrl])

  useEffect(() => {
    imageDraftsRef.current = imageDrafts
  }, [imageDrafts])

  useEffect(() => {
    modifiedProductsRef.current = modifiedProducts
  }, [modifiedProducts])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      Object.values(imageDraftsRef.current).forEach((draft) => URL.revokeObjectURL(draft.previewUrl))
    }
  }, [])

  const showAlert = useCallback((type: AlertType, message: string) => {
    setAlert({ type, message })
  }, [])

  const clearProductImageDraft = useCallback((productId: number) => {
    setImageDrafts((prev) => {
      const draft = prev[productId]
      if (draft) URL.revokeObjectURL(draft.previewUrl)
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }, [])

  const clearAllImageDrafts = useCallback(() => {
    setImageDrafts((prev) => {
      Object.values(prev).forEach((draft) => URL.revokeObjectURL(draft.previewUrl))
      return {}
    })
  }, [])

  const handleAuthError = useCallback(
    (error: any, response?: Response) => {
      if (
        response?.status === 401 ||
        error?.message?.toLowerCase?.().includes("unauthorized") ||
        error?.message?.toLowerCase?.().includes("invalid token")
      ) {
        onAuthError?.()
        return true
      }
      return false
    },
    [onAuthError],
  )

  const authHeader = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        handleAuthError(error)
        return undefined
      }

      const token = data.session?.access_token
      if (!token) {
        handleAuthError(new Error("Token não encontrado"))
        return undefined
      }

      return { Authorization: `Bearer ${token}` }
    } catch (error) {
      handleAuthError(error)
      return undefined
    }
  }, [handleAuthError, supabase])

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true)
      const res = await fetchWithTimeout("/api/categories", { cache: "no-store" }, 15000)
      const json = await safeJson(res)

      if (!res.ok) throw new Error(json?.error || "Falha ao carregar categorias.")

      if (Array.isArray(json)) {
        setCategories(mergeCategories(json.map((category: any) => category.name), [DEFAULT_CATEGORY]))
      }
    } catch (e: any) {
      console.warn("Erro ao carregar categorias:", e)
      setCategories((prev) => mergeCategories(prev, [DEFAULT_CATEGORY]))
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  const fetchProducts = useCallback(
    async (discardUnsaved = true) => {
      if (!discardUnsaved && (modifiedProductsRef.current.size > 0 || Object.keys(imageDraftsRef.current).length > 0)) {
        const confirmed = window.confirm("Recarregar descarta alterações não salvas. Continuar?")
        if (!confirmed) return
      }

      try {
        setLoading(true)
        setAlert(null)
        const headers = await authHeader()
        if (!headers) {
          showAlert("error", "Não foi possível obter autorização. Faça login novamente.")
          return
        }

        const res = await fetchWithTimeout("/api/admin/products", { cache: "no-store", headers }, 30000)
        const json = await safeJson(res)

        if (!res.ok) {
          if (handleAuthError(new Error(json?.error), res)) return
          throw new Error(json?.error || "Falha ao carregar produtos.")
        }

        const nextProducts = Array.isArray(json?.products) ? json.products : []
        setProducts(nextProducts)
        setModifiedProducts(new Set())
        clearAllImageDrafts()
        setCategories((prev) => mergeCategories(prev, [DEFAULT_CATEGORY], nextProducts.flatMap((product: Product) => product.categoria)))
      } catch (e: any) {
        if (e.name === "AbortError") {
          showAlert("error", "Timeout: carregamento demorou muito. Verifique sua conexão e tente novamente.")
        } else if (!handleAuthError(e)) {
          showAlert("error", e?.message || "Erro ao carregar.")
        }
      } finally {
        setLoading(false)
      }
    },
    [authHeader, clearAllImageDrafts, handleAuthError, showAlert],
  )

  useEffect(() => {
    fetchProducts(true)
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  const categoryOptions = useMemo(
    () => mergeCategories(categories, products.flatMap((product) => product.categoria), pSelectedCategories),
    [categories, products, pSelectedCategories],
  )

  const productStats = useMemo(() => {
    return products.reduce(
      (stats, product) => {
        const imageDraft = imageDrafts[product.id]
        const modified = modifiedProducts.has(product.id) || Boolean(imageDraft)

        stats.total += 1
        if (modified) stats.modified += 1
        if (product.is_new) stats.newProducts += 1
        if (product.is_best_seller) stats.bestSellers += 1
        if (!hasProductImage(product, imageDraft)) stats.noImage += 1
        if (product.is_available) stats.available += 1
        else stats.unavailable += 1

        return stats
      },
      {
        total: 0,
        modified: 0,
        newProducts: 0,
        bestSellers: 0,
        noImage: 0,
        available: 0,
        unavailable: 0,
      },
    )
  }, [imageDrafts, modifiedProducts, products])

  const visibleProducts = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase()

    const filtered = products.filter((product) => {
      const imageDraft = imageDrafts[product.id]
      const modified = modifiedProducts.has(product.id) || Boolean(imageDraft)
      const hasImage = hasProductImage(product, imageDraft)
      const matchesSearch =
        !term ||
        product.nome_produto.toLowerCase().includes(term) ||
        product.descricao?.toLowerCase().includes(term) ||
        product.categoria.some((category) => category.toLowerCase().includes(term))
      const matchesCategory = categoryFilter === ALL_CATEGORIES_VALUE || product.categoria.includes(categoryFilter)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "modified" && modified) ||
        (statusFilter === "new" && product.is_new) ||
        (statusFilter === "best" && product.is_best_seller) ||
        (statusFilter === "no-image" && !hasImage) ||
        (statusFilter === "available" && product.is_available) ||
        (statusFilter === "unavailable" && !product.is_available)

      return matchesSearch && matchesCategory && matchesStatus
    })

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "price-asc":
          return a.price - b.price || a.nome_produto.localeCompare(b.nome_produto, "pt-BR")
        case "price-desc":
          return b.price - a.price || a.nome_produto.localeCompare(b.nome_produto, "pt-BR")
        case "recent":
          return b.id - a.id
        case "name-asc":
        default:
          return a.nome_produto.localeCompare(b.nome_produto, "pt-BR")
      }
    })
  }, [categoryFilter, debouncedSearchTerm, imageDrafts, modifiedProducts, products, sortOption, statusFilter])

  const activeFilterCount = [
    searchTerm.trim(),
    categoryFilter !== ALL_CATEGORIES_VALUE,
    statusFilter !== "all",
  ].filter(Boolean).length

  const clearListingFilters = useCallback(() => {
    setSearchTerm("")
    setCategoryFilter(ALL_CATEGORIES_VALUE)
    setStatusFilter("all")
    setSortOption("name-asc")
  }, [])

  const updateLocal = useCallback((id: number, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((product) => (product.id === id ? { ...product, ...patch } : product)))
    setModifiedProducts((prev) => new Set(prev).add(id))
  }, [])

  const compressImage = useCallback((file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new window.Image()
      const sourceUrl = URL.createObjectURL(file)

      img.onload = () => {
        const mobile = isMobile()
        const targetWidth = mobile ? 600 : maxWidth
        const targetQuality = mobile ? 0.6 : quality
        const ratio = Math.min(targetWidth / img.width, targetWidth / img.height, 1)

        canvas.width = Math.max(1, Math.round(img.width * ratio))
        canvas.height = Math.max(1, Math.round(img.height * ratio))
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(sourceUrl)
            if (!blob) {
              resolve(file)
              return
            }

            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                type: "image/webp",
                lastModified: Date.now(),
              }),
            )
          },
          "image/webp",
          targetQuality,
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(sourceUrl)
        resolve(file)
      }

      img.src = sourceUrl
    })
  }, [])

  const prepareImageFile = useCallback(
    async (file: File | null) => {
      if (!file) return null

      const mobile = isMobile()
      const maxSize = mobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`Arquivo muito grande. Máximo ${mobile ? "5MB" : "10MB"}.`)
      }

      const compressedFile = await compressImage(file)
      if (compressedFile.size > maxSize) {
        throw new Error("Imagem ainda muito grande após compressão. Tente uma imagem menor.")
      }

      return compressedFile
    },
    [compressImage],
  )

  const onSelectFile = useCallback(
    async (file: File | null) => {
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl("")
      setAlert(null)

      if (!file) return

      try {
        showAlert("info", "Comprimindo imagem...")
        const compressedFile = await prepareImageFile(file)
        if (!compressedFile) return

        setSelectedFile(compressedFile)
        setPreviewUrl(URL.createObjectURL(compressedFile))
        setAlert(null)
      } catch (e: any) {
        showAlert("error", e?.message || "Erro ao processar imagem.")
      }
    },
    [prepareImageFile, previewUrl, showAlert],
  )

  const onSelectProductImage = useCallback(
    async (productId: number, file: File | null) => {
      if (!file) return

      try {
        showAlert("info", "Comprimindo imagem...")
        const compressedFile = await prepareImageFile(file)
        if (!compressedFile) return

        setImageDrafts((prev) => {
          const previousDraft = prev[productId]
          if (previousDraft) URL.revokeObjectURL(previousDraft.previewUrl)
          return {
            ...prev,
            [productId]: {
              file: compressedFile,
              previewUrl: URL.createObjectURL(compressedFile),
            },
          }
        })
        setModifiedProducts((prev) => new Set(prev).add(productId))
        setAlert(null)
      } catch (e: any) {
        showAlert("error", e?.message || "Erro ao processar imagem.")
      }
    },
    [prepareImageFile, showAlert],
  )

  const addCategoryToKnownOptions = useCallback((category: string) => {
    setCategories((prev) => mergeCategories(prev, [category]))
  }, [])

  const addCategoryToNewProduct = useCallback(
    (category: string) => {
      const normalized = normalizeCategoryName(category)
      if (!normalized) return
      setPSelectedCategories((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]))
      addCategoryToKnownOptions(normalized)
    },
    [addCategoryToKnownOptions],
  )

  const removeCategoryFromNewProduct = useCallback((category: string) => {
    setPSelectedCategories((prev) => prev.filter((item) => item !== category))
  }, [])

  const addCategoryToProduct = useCallback(
    (productId: number, category: string) => {
      const normalized = normalizeCategoryName(category)
      if (!normalized) return

      setProducts((prev) =>
        prev.map((product) => {
          if (product.id !== productId || product.categoria.includes(normalized)) return product
          return { ...product, categoria: [...product.categoria, normalized] }
        }),
      )
      setModifiedProducts((prev) => new Set(prev).add(productId))
      addCategoryToKnownOptions(normalized)
    },
    [addCategoryToKnownOptions],
  )

  const removeCategoryFromProduct = useCallback(
    (productId: number, categoryToRemove: string) => {
      const product = products.find((item) => item.id === productId)
      if (!product) return
      if (product.categoria.length <= 1) {
        showAlert("error", "O produto precisa manter ao menos uma categoria.")
        return
      }

      updateLocal(productId, { categoria: product.categoria.filter((category) => category !== categoryToRemove) })
    },
    [products, showAlert, updateLocal],
  )

  const buildProductPayload = useCallback((product: Product) => {
    return {
      id: product.id,
      nome_produto: product.nome_produto.trim(),
      descricao: product.descricao?.trim() || null,
      price: product.price,
      original_price: product.original_price,
      is_new: product.is_new,
      is_best_seller: product.is_best_seller,
      is_available: product.is_available,
      categoria: product.categoria.length > 0 ? product.categoria : [DEFAULT_CATEGORY],
    }
  }, [])

  const saveProduct = useCallback(
    async (product: Product, headers: Record<string, string>) => {
      const payload = buildProductPayload(product)
      if (!payload.nome_produto) throw new Error(`Produto ${product.id}: nome é obrigatório.`)

      const imageDraft = imageDrafts[product.id]
      const timeout = imageDraft ? (isMobile() ? 120000 : 60000) : 30000
      let res: Response

      if (imageDraft) {
        const formData = new FormData()
        formData.append("id", String(payload.id))
        formData.append("nome_produto", payload.nome_produto)
        if (payload.descricao) formData.append("descricao", payload.descricao)
        formData.append("price", String(payload.price))
        formData.append("original_price", String(payload.original_price))
        formData.append("is_new", String(payload.is_new))
        formData.append("is_best_seller", String(payload.is_best_seller))
        formData.append("is_available", String(payload.is_available))
        formData.append("categoria", JSON.stringify(payload.categoria))
        formData.append("image", imageDraft.file)

        res = await fetchWithTimeout("/api/admin/products", { method: "PATCH", headers, body: formData }, timeout)
      } else {
        res = await fetchWithTimeout(
          "/api/admin/products",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(payload),
          },
          timeout,
        )
      }

      const json = await safeJson(res)
      if (!res.ok) {
        if (handleAuthError(new Error(json?.error), res)) throw new Error("Sessão expirada")
        throw new Error(`${product.nome_produto}: ${json?.error || "Falha ao salvar."}`)
      }

      return json?.product as Product
    },
    [buildProductPayload, handleAuthError, imageDrafts],
  )

  const createProduct = useCallback(async () => {
    if (!pName.trim() || !pPrice.trim()) {
      showAlert("error", "Nome e preço são obrigatórios.")
      return
    }
    if (!selectedFile) {
      showAlert("error", "Imagem é obrigatória.")
      return
    }

    setCreating(true)
    showAlert("info", `Enviando produto... ${isMobile() ? "(pode demorar mais em mobile)" : ""}`)

    try {
      const headers = await authHeader()
      if (!headers) {
        showAlert("error", "Não foi possível obter autorização. Faça login novamente.")
        return
      }

      const formData = new FormData()
      formData.append("nome_produto", pName.trim())
      formData.append("price", pPrice.trim())
      if (pOriginal.trim()) formData.append("original_price", pOriginal.trim())
      if (pDesc.trim()) formData.append("descricao", pDesc.trim())
      formData.append("categoria", JSON.stringify(pSelectedCategories.length > 0 ? pSelectedCategories : [DEFAULT_CATEGORY]))
      formData.append("is_new", String(pNew))
      formData.append("is_best_seller", String(pBest))
      formData.append("is_available", String(pAvailable))
      formData.append("image", selectedFile)

      const res = await fetchWithTimeout(
        "/api/admin/products",
        { method: "POST", headers, body: formData },
        isMobile() ? 120000 : 60000,
      )
      const json = await safeJson(res)

      if (!res.ok) {
        if (handleAuthError(new Error(json?.error), res)) return
        throw new Error(json?.error || "Erro ao criar produto.")
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPName("")
      setPPrice("")
      setPOriginal("")
      setPDesc("")
      setPSelectedCategories([])
      setPNew(false)
      setPBest(false)
      setPAvailable(true)
      setSelectedFile(null)
      setPreviewUrl("")

      if (json?.product) {
        setProducts((prev) =>
          [...prev.filter((product) => product.id !== json.product.id), json.product].sort((a, b) => a.id - b.id),
        )
        setCategories((prev) => mergeCategories(prev, json.product.categoria, [DEFAULT_CATEGORY]))
      } else {
        await fetchProducts(true)
      }
      await fetchCategories()
      showAlert("success", "Produto criado com sucesso.")
    } catch (e: any) {
      if (e.name === "AbortError") {
        showAlert("error", "Timeout: upload demorou muito. Verifique sua conexão e tente novamente.")
      } else if (!handleAuthError(e)) {
        showAlert("error", e?.message || "Erro desconhecido ao criar produto.")
      }
    } finally {
      setCreating(false)
    }
  }, [
    authHeader,
    fetchCategories,
    fetchProducts,
    handleAuthError,
    pAvailable,
    pBest,
    pDesc,
    pName,
    pNew,
    pOriginal,
    pPrice,
    pSelectedCategories,
    previewUrl,
    selectedFile,
    showAlert,
  ])

  const saveAllModified = useCallback(async () => {
    if (modifiedProducts.size === 0) return

    setSavingAll(true)
    setAlert(null)

    try {
      const headers = await authHeader()
      if (!headers) {
        showAlert("error", "Não foi possível obter autorização. Faça login novamente.")
        return
      }

      const modifiedList = products.filter((product) => modifiedProducts.has(product.id))
      setSavingMap(Object.fromEntries(modifiedList.map((product) => [product.id, true])))

      const results = await Promise.allSettled(modifiedList.map((product) => saveProduct(product, headers)))
      const successfulProducts: Product[] = []
      const failedIds = new Set<number>()
      const errorMessages: string[] = []

      results.forEach((result, index) => {
        const product = modifiedList[index]
        if (result.status === "fulfilled" && result.value) {
          successfulProducts.push(result.value)
          clearProductImageDraft(product.id)
        } else {
          failedIds.add(product.id)
          const reason = result.status === "rejected" ? result.reason : null
          errorMessages.push(reason?.message || `${product.nome_produto}: falha ao salvar.`)
        }
      })

      setProducts((prev) =>
        prev.map((product) => successfulProducts.find((updated) => updated.id === product.id) || product),
      )
      setModifiedProducts(failedIds)

      if (failedIds.size > 0) {
        showAlert("error", `${successfulProducts.length} salvo(s), ${failedIds.size} com erro. ${errorMessages[0]}`)
      } else {
        showAlert("success", `${successfulProducts.length} produto(s) salvo(s) com sucesso.`)
        await fetchCategories()
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        showAlert("error", "Timeout: salvamento demorou muito. Verifique sua conexão e tente novamente.")
      } else if (!handleAuthError(e)) {
        showAlert("error", e?.message || "Erro ao salvar produtos.")
      }
    } finally {
      setSavingAll(false)
      setSavingMap({})
    }
  }, [
    authHeader,
    clearProductImageDraft,
    fetchCategories,
    handleAuthError,
    modifiedProducts,
    products,
    saveProduct,
    showAlert,
  ])

  const deleteRow = useCallback(
    async (id: number) => {
      if (!window.confirm("Tem certeza que deseja remover este produto?")) return

      setDeletingMap((prev) => ({ ...prev, [id]: true }))
      setAlert(null)

      try {
        const headers = await authHeader()
        if (!headers) {
          showAlert("error", "Não foi possível obter autorização. Faça login novamente.")
          return
        }

        const res = await fetchWithTimeout(
          `/api/admin/products?id=${id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ id }),
          },
          30000,
        )
        const json = await safeJson(res)

        if (!res.ok) {
          if (handleAuthError(new Error(json?.error), res)) return
          throw new Error(json?.error || "Falha ao remover.")
        }

        clearProductImageDraft(id)
        setProducts((prev) => prev.filter((product) => product.id !== id))
        setModifiedProducts((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        showAlert("success", "Produto removido.")
      } catch (e: any) {
        if (e.name === "AbortError") {
          showAlert("error", "Timeout: remoção demorou muito. Verifique sua conexão e tente novamente.")
        } else if (!handleAuthError(e)) {
          showAlert("error", e?.message || "Erro ao remover.")
        }
      } finally {
        setDeletingMap((prev) => ({ ...prev, [id]: false }))
      }
    },
    [authHeader, clearProductImageDraft, handleAuthError, showAlert],
  )

  const alertClassName =
    alert?.type === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : alert?.type === "info"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-red-200 bg-red-50 text-red-700"

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow md:p-6">
        <h2 className="mb-4 text-lg font-semibold">Adicionar produto</h2>
        {alert ? <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${alertClassName}`}>{alert.message}</div> : null}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={pName}
                onChange={(event) => setPName(event.target.value)}
                placeholder="Nome do produto"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Preço</label>
              <Input
                value={pPrice}
                onChange={(event) => setPPrice(event.target.value)}
                placeholder="12,90"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Preço original (opcional)</label>
              <Input
                value={pOriginal}
                onChange={(event) => setPOriginal(event.target.value)}
                placeholder="15,90"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={pDesc}
                onChange={(event) => setPDesc(event.target.value)}
                placeholder="Descrição do produto"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Categorias</label>
              <div className="mt-1">
                <CategoryEditor
                  selected={pSelectedCategories}
                  options={categoryOptions}
                  disabled={categoriesLoading}
                  onAdd={addCategoryToNewProduct}
                  onRemove={removeCategoryFromNewProduct}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pNew} onChange={(event) => setPNew(event.target.checked)} /> Novo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pBest} onChange={(event) => setPBest(event.target.checked)} /> Mais vendido
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pAvailable} onChange={(event) => setPAvailable(event.target.checked)} /> Disponível
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Imagem</label>
            <div className="mt-2 flex flex-col gap-3">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Pré-visualização"
                  width={240}
                  height={240}
                  unoptimized
                  className="aspect-square w-full rounded-xl border border-orange-100 object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-orange-200 text-gray-500">
                  Prévia da imagem
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-pink-50 file:px-4 file:py-2 file:text-pink-700 hover:file:bg-pink-100"
              />
              <p className="text-xs text-gray-500">Imagens são comprimidas para WebP. Máximo 5MB no mobile e 10MB no desktop.</p>
              <Button onClick={createProduct} disabled={creating} className="w-full">
                {creating ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white/90 p-4 shadow md:p-6">
        <div className="mb-4 space-y-4">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Produtos</h2>
              <p className="text-sm text-gray-500">
                Exibindo {visibleProducts.length} de {productStats.total} produto(s)
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              {modifiedProducts.size > 0 ? (
                <Button
                  onClick={saveAllModified}
                  disabled={savingAll}
                  className="flex-1 bg-green-600 hover:bg-green-700 sm:flex-none"
                >
                  {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveAll className="h-4 w-4" />}
                  <span className="ml-2">{savingAll ? "Salvando..." : `Salvar Tudo (${modifiedProducts.size})`}</span>
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => fetchProducts(false)} disabled={loading} className="flex-1 bg-transparent sm:flex-none">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Recarregar</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {[
              ["Exibindo", visibleProducts.length],
              ["Total", productStats.total],
              ["Pendentes", productStats.modified],
              ["Disponíveis", productStats.available],
              ["Indisponíveis", productStats.unavailable],
              ["Novos", productStats.newProducts],
              ["Mais vendidos", productStats.bestSellers],
              ["Sem imagem", productStats.noImage],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-orange-100 bg-orange-50/40 px-3 py-2">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-lg font-semibold text-gray-800">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_repeat(3,minmax(150px,1fr))_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="h-10 pl-9"
                placeholder="Buscar por nome, descrição ou categoria..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filtrar por categoria"
            >
              <option value={ALL_CATEGORIES_VALUE}>Todas categorias</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Filtrar por status"
            >
              <option value="all">Todos status</option>
              <option value="modified">Com alterações</option>
              <option value="new">Novo</option>
              <option value="best">Mais vendido</option>
              <option value="available">Disponíveis</option>
              <option value="unavailable">Indisponíveis</option>
              <option value="no-image">Sem imagem</option>
            </Select>

            <Select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              aria-label="Ordenar produtos"
            >
              <option value="name-asc">Nome A-Z</option>
              <option value="price-asc">Preço menor</option>
              <option value="price-desc">Preço maior</option>
              <option value="recent">Mais recentes</option>
            </Select>

            <Button variant="outline" onClick={clearListingFilters} disabled={activeFilterCount === 0 && sortOption === "name-asc"}>
              Limpar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-600">Carregando...</div>
        ) : visibleProducts.length === 0 ? (
          <div className="py-10 text-center text-gray-600">Nenhum produto encontrado.</div>
        ) : (
          <>
            <div className="hidden max-h-[70vh] overflow-y-auto lg:block">
              <Table className="min-w-[1040px]">
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow>
                    <TableHead className="h-10">Produto</TableHead>
                    <TableHead className="h-10">Categorias</TableHead>
                    <TableHead className="h-10">Preços</TableHead>
                    <TableHead className="h-10">Destaques</TableHead>
                    <TableHead className="h-10">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProducts.map((product) => (
                    <ProductRowDesktop
                      key={product.id}
                      product={product}
                      categoryOptions={categoryOptions}
                      imageDraft={imageDrafts[product.id]}
                      isModified={modifiedProducts.has(product.id) || Boolean(imageDrafts[product.id])}
                      isRemoving={!!deletingMap[product.id]}
                      isSaving={!!savingMap[product.id]}
                      onUpdateLocal={updateLocal}
                      onRemove={deleteRow}
                      onAddCategory={addCategoryToProduct}
                      onRemoveCategory={removeCategoryFromProduct}
                      onSelectImage={onSelectProductImage}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-4 lg:hidden">
              {visibleProducts.map((product) => (
                <ProductCardMobile
                  key={product.id}
                  product={product}
                  categoryOptions={categoryOptions}
                  imageDraft={imageDrafts[product.id]}
                  isModified={modifiedProducts.has(product.id) || Boolean(imageDrafts[product.id])}
                  isRemoving={!!deletingMap[product.id]}
                  isSaving={!!savingMap[product.id]}
                  onUpdateLocal={updateLocal}
                  onRemove={deleteRow}
                  onAddCategory={addCategoryToProduct}
                  onRemoveCategory={removeCategoryFromProduct}
                  onSelectImage={onSelectProductImage}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
