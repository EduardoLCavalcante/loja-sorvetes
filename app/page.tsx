"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useCart } from "./context/CartContext"
import ProductModal from "@/components/ProductModal/ProductModal"
import HeaderSection from "@/components/home/HeaderSection"
import HeroSection from "@/components/home/HeroSection"
import ProductsSection from "@/components/home/ProductsSection"
import FloatingCartButton from "@/components/home/FloatingCartButton"
import LoadingState from "@/components/home/LoadingState"
import ErrorState from "@/components/home/ErrorState"
import { type ProductRecord, type ProductWithDefaults } from "@/types/product"
import { adicionais } from "@/lib/data/extra"
import { ALL_CATEGORIES } from "@/lib/constants"
import CheckoutModal from "@/components/CheckoutModal/CheckoutModal"
import { normalizeBrazilianPhone } from "@/lib/orders/normalizers"
import type { DeliveryZone } from "@/types/delivery-zone"

const CHECKOUT_PROFILE_KEY = "dlice.checkout-profile.v1"
const formatProductName = (name: string) =>
  name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Dlice/gi, "")
    .trim()

const formatCategoryName = (category: string | string[]) => {
  const categoryNames: Record<string, string> = {
    ConeShow: "Cone Show",
    Copao: "Copão",
    Copinho: "Copinho",
    Light: "Light",
    Sundae: "Sundae",
    Combos: "Combos",
    Kits: "Kits",
    Picole: "Picolés",
    Picolés: "Picolés",
    Açai: "Açaí",
  }
  if (Array.isArray(category)) {
    return category.map((cat) => categoryNames[cat] || cat).join(", ")
  }
  return categoryNames[category] || category
}

export default function DliceEcommerce() {
  const { cart, addToCart, updateQuantity, getTotalPrice, getTotalItems } = useCart()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES)
  const [searchTerm, setSearchTerm] = useState("")
  const [products, setProducts] = useState<ProductWithDefaults[]>([])
  const [categories, setCategories] = useState<string[]>([ALL_CATEGORIES])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: "",
    phone: "",
    address: "",
    houseNumber: "",
    noHouseNumber: false,
    complement: "",
    deliveryZoneId: null as number | null,
    quotedDeliveryFee: null as number | null,
    paymentMethod: "",
    deliveryType: "entrega", // Adicionado campo para tipo de entrega
    changeFor: "",
  })

  // Adicionais disponíveis


  const [selectedExtras, setSelectedExtras] = useState<{ [key: string]: number }>({})

  const toggleExtra = (extraId: string) => {
    setSelectedExtras((prev) => {
      if (prev[extraId]) {
        const { [extraId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [extraId]: 1 }
    })
  }

  const updateExtraQuantity = (extraId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedExtras((prev) => {
        const { [extraId]: _, ...rest } = prev
        return rest
      })
    } else {
      setSelectedExtras((prev) => ({ ...prev, [extraId]: quantity }))
    }
  }

  // Normaliza o id (string ou número) para número antes de atualizar a quantidade no carrinho
  const handleUpdateQuantity = (id: string | number, quantity: number) => {
    updateQuantity(Number(id), quantity)
  }

  const getExtrasTotal = () => {
    return Object.entries(selectedExtras).reduce((total, [extraId, qty]) => {
      const extra = adicionais.find((a) => a.id === extraId)
      return total + (extra ? extra.preco * qty : 0)
    }, 0)
  }

  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({})
  const [productModal, setProductModal] = useState<ProductWithDefaults | null>(null)
  const [modalImageError, setModalImageError] = useState(false)
  const [isProcessingOrder, setIsProcessingOrder] = useState(false)
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([])
  const [deliveryZonesLoading, setDeliveryZonesLoading] = useState(true)
  const [deliveryZonesError, setDeliveryZonesError] = useState<string | null>(null)

  const loadDeliveryZones = useCallback(async () => {
    try {
      setDeliveryZonesLoading(true)
      setDeliveryZonesError(null)
      const response = await fetch("/api/delivery-zones", { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Não foi possível carregar os bairros de entrega.")
      setDeliveryZones(Array.isArray(payload?.deliveryZones) ? payload.deliveryZones : [])
    } catch (requestError: any) {
      setDeliveryZonesError(requestError?.message || "Não foi possível carregar os bairros de entrega.")
    } finally {
      setDeliveryZonesLoading(false)
    }
  }, [])

  useEffect(() => { void loadDeliveryZones() }, [loadDeliveryZones])
  // Load products from Supabase API route
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch("/api/products", { cache: "no-store" })
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json?.error || "Falha ao carregar produtos.")
        }

        const apiProducts: ProductRecord[] = Array.isArray(json?.products) ? json.products : []
        const availableProducts = apiProducts.filter((p) => p.is_available !== false)
        const mapped: ProductWithDefaults[] = availableProducts.map((p) => {
          const priceNum = typeof p.price === "number" ? p.price : Number(p.price)
          const original = p.original_price != null ? Number(p.original_price) : priceNum
          return {
            ...p,
            price: priceNum,
            originalPrice: original,
            isNew: !!p.is_new,
            isBestSeller: !!p.is_best_seller,
          }
        })

        setProducts(mapped)

        const catsFromApi = Array.isArray(json?.categories) ? (json.categories as string[]) : []
        const catSet = new Set<string>()
        for (const p of mapped) {
          for (const c of p.categoria || []) catSet.add(c)
        }
        for (const c of catsFromApi) catSet.add(c)

        setCategories([ALL_CATEGORIES, ...Array.from(catSet)])
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "Erro ao carregar produtos.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if ((product as ProductRecord).is_available === false) return false
      const matchesCategory = selectedCategory === ALL_CATEGORIES || product.categoria.includes(selectedCategory)
      const matchesSearch = (product.nome_exibicao ? product.nome_exibicao : formatProductName(product.nome_produto))
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchTerm])

  const groupedProducts = useMemo(() => {
    return categories
      .filter((cat) => cat !== ALL_CATEGORIES)
      .reduce(
        (acc, category) => {
          const filtered = products
            .filter((product) => (product as ProductRecord).is_available !== false)
            .filter((product) => product.categoria.includes(category))
            .filter((product) =>
              (product.nome_exibicao ? product.nome_exibicao : formatProductName(product.nome_produto))
                .toLowerCase()
                .includes(searchTerm.toLowerCase()),
            )
          if (filtered.length > 0) {
            acc[category] = filtered
          }
          return acc
        },
        {} as { [key: string]: ProductWithDefaults[] },
      )
  }, [categories, products, searchTerm])

  const handleAddToCart = (product: ProductWithDefaults) => {
    const safeProduct = {
      id: product.id,
      nome_produto: product.nome_produto,
      price: product.price,
      caminho: product.caminho,
      categoria: product.categoria,
      image_url: product.image_url ?? undefined,
      quantity: 1,
    }
    addToCart(safeProduct)
    const button = document.querySelector(`[data-product-id="${product.id}"]`)
    if (button) {
      button.classList.add("animate-bounce")
      setTimeout(() => button.classList.remove("animate-bounce"), 500)
    }
  }

  const openProductModal = (p: ProductWithDefaults) => {
    setProductModal(p)
    setModalImageError(false)
  }

  const generateWhatsAppMessage = async (shouldSaveCheckoutData: boolean) => {
    setIsProcessingOrder(true)
    const whatsappWindow = window.open("", "_blank")

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryInfo,
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
          selectedExtras,
        }),
      })
      const orderPayload = await orderResponse.json().catch(() => ({}))
      if (!orderResponse.ok) {
        if (orderPayload?.code === "DELIVERY_FEE_CHANGED" && orderPayload?.deliveryZone) {
          const zone = orderPayload.deliveryZone as DeliveryZone
          setDeliveryInfo((current) => ({ ...current, deliveryZoneId: zone.id, quotedDeliveryFee: zone.fee }))
          void loadDeliveryZones()
        }
        if (orderPayload?.code === "DELIVERY_ZONE_UNAVAILABLE") {
          setDeliveryInfo((current) => ({ ...current, deliveryZoneId: null, quotedDeliveryFee: null }))
          void loadDeliveryZones()
        }
        throw new Error(orderPayload?.error || "Não foi possível registrar o pedido.")
      }

      const pricing = orderPayload?.pricing
      const serverDelivery = orderPayload?.delivery
      if (!pricing || !Number.isFinite(pricing.subtotal) || !Number.isFinite(pricing.extrasTotal) || !Number.isFinite(pricing.deliveryFee) || !Number.isFinite(pricing.total)) {
        throw new Error("Não foi possível confirmar os valores do pedido.")
      }

      if (shouldSaveCheckoutData) {
        const phoneNormalized = normalizeBrazilianPhone(deliveryInfo.phone)
        let savedProfile: any = null
        try {
          savedProfile = JSON.parse(window.localStorage.getItem(CHECKOUT_PROFILE_KEY) || "null")
        } catch {
          savedProfile = null
        }

        window.localStorage.setItem(
          CHECKOUT_PROFILE_KEY,
          JSON.stringify({
            version: 3,
            phoneNormalized,
            // O nome salvo é preservado quando o telefone já era conhecido neste dispositivo.
            name:
              (savedProfile?.version === 1 || savedProfile?.version === 2 || savedProfile?.version === 3) && savedProfile?.phoneNormalized === phoneNormalized
                ? savedProfile.name
                : deliveryInfo.name.trim(),
            address: deliveryInfo.address.trim(),
            houseNumber: deliveryInfo.noHouseNumber ? "S/N" : deliveryInfo.houseNumber.trim(),
            noHouseNumber: deliveryInfo.noHouseNumber,
            complement: deliveryInfo.complement.trim(),
            deliveryZoneId: serverDelivery?.deliveryZoneId ?? null,
            quotedDeliveryFee: pricing.deliveryFee,
            neighborhood: serverDelivery?.neighborhood ?? "",
            paymentMethod: deliveryInfo.paymentMethod,
            deliveryType: deliveryInfo.deliveryType,
          }),
        )
      }

      // Gerar mensagem do WhatsApp
      const items = cart
        .map(
          (item) =>
            `• ${formatProductName(item.nome_produto)} (${item.quantity}x) - R$ ${(item.price * item.quantity).toFixed(2)}`,
        )
        .join("\n")

      // Gerar lista de adicionais selecionados
      const extrasItems = Object.entries(selectedExtras)
        .filter(([_, qty]) => qty > 0)
        .map(([extraId, qty]) => {
          const extra = adicionais.find((a) => a.id === extraId)
          if (!extra) return ""
          return `• ${extra.nome} (${qty}x) - R$ ${(extra.preco * qty).toFixed(2)}`
        })
        .filter(Boolean)
        .join("\n")

      const subtotal = pricing.subtotal
      const extrasTotal = pricing.extrasTotal
      const taxaEntrega = pricing.deliveryFee
      const total = pricing.total

      const deliveryText =
        deliveryInfo.deliveryType === "retirada"
          ? "RETIRADA NA LOJA\nR. Idelfonso Solon de Freitas, 558 - Popular, Limoeiro do Norte - CE"
          : `ENDERECO DE ENTREGA:\n${deliveryInfo.address}, ${deliveryInfo.noHouseNumber ? "S/N" : deliveryInfo.houseNumber}${deliveryInfo.complement ? `, ${deliveryInfo.complement}` : ""}\n${serverDelivery?.neighborhood || "Bairro não informado"}`

      const extrasSection = extrasItems ? `\n\nADICIONAIS:\n${extrasItems}` : ""

      const message = `*PEDIDO DLICE SORVETES*

*CLIENTE:* ${deliveryInfo.name}
*TELEFONE:* ${deliveryInfo.phone}

${deliveryText}

*ITENS DO PEDIDO:*
${items}${extrasSection}

*RESUMO FINANCEIRO:*
Subtotal Produtos: R$ ${subtotal.toFixed(2)}${extrasTotal > 0 ? `\nAdicionais: R$ ${extrasTotal.toFixed(2)}` : ""}
${deliveryInfo.deliveryType === "retirada" ? "Entrega: Gratuita (Retirada)" : `Entrega: R$ ${taxaEntrega.toFixed(2)}`}
*TOTAL: R$ ${total.toFixed(2)}*

*FORMA DE PAGAMENTO:* ${deliveryInfo.paymentMethod}
${deliveryInfo.paymentMethod === "Dinheiro" ? `*TROCO PARA:* R$ ${deliveryInfo.changeFor}` : ""}

Obrigado pela preferencia!`

          const encodedMessage = encodeURIComponent(message)
          const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5588996867186"
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`

          if (whatsappWindow) {
            whatsappWindow.location.href = whatsappUrl
          } else {
            window.open(whatsappUrl, "_blank")
          }

          // Limpar carrinho e adicionais após sucesso
          cart.forEach((item) => updateQuantity(item.id, 0))
          setSelectedExtras({})
          setIsCheckoutOpen(false)
        } catch (error) {
          console.error("Erro ao processar pedido:", error)
          whatsappWindow?.close()
          throw error
        } finally {
          setIsProcessingOrder(false)
        }
      }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => location.reload()} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50">
      <HeaderSection
        searchTerm={searchTerm}
        onSearchChange={(value) => setSearchTerm(value)}
        totalItems={getTotalItems()}
        onCartOpen={() => setIsCartOpen(true)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(category) => setSelectedCategory(category)}
        formatCategoryName={formatCategoryName}
      />

      <HeroSection productsCount={products.length} />

      <ProductsSection
        selectedCategory={selectedCategory}
        groupedProducts={groupedProducts}
        filteredProducts={filteredProducts}
        formatCategoryName={formatCategoryName}
        formatProductName={formatProductName}
        handleAddToCart={handleAddToCart}
        openProductModal={openProductModal}
        imageErrors={imageErrors}
        setImageErrors={setImageErrors}
      />

      <FloatingCartButton
        visible={getTotalItems() > 0}
        totalItems={getTotalItems()}
        totalPrice={getTotalPrice()}
        onCartOpen={() => setIsCartOpen(true)}
      />

      <CheckoutModal
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        isCheckoutOpen={isCheckoutOpen}
        setIsCheckoutOpen={setIsCheckoutOpen}
        cart={cart}
        updateQuantity={handleUpdateQuantity}
        imageErrors={imageErrors}
        setImageErrors={setImageErrors}
        getTotalItems={getTotalItems}
        getTotalPrice={getTotalPrice}
        deliveryInfo={deliveryInfo}
        setDeliveryInfo={setDeliveryInfo}
        selectedExtras={selectedExtras}
        toggleExtra={toggleExtra}
        updateExtraQuantity={updateExtraQuantity}
        getExtrasTotal={getExtrasTotal}
        adicionais={adicionais}
        deliveryZones={deliveryZones}
        deliveryZonesLoading={deliveryZonesLoading}
        deliveryZonesError={deliveryZonesError}
        onRetryDeliveryZones={() => void loadDeliveryZones()}
        generateWhatsAppMessage={generateWhatsAppMessage}
        isProcessingOrder={isProcessingOrder}
      />

      <ProductModal
        product={productModal}
        onClose={() => setProductModal(null)}
        formatProductName={formatProductName}
        formatCategoryName={formatCategoryName}
        handleAddToCart={handleAddToCart}
      />
    </div>
  )
}
