"use client"
import { useEffect, useMemo, useState } from "react"
import { useCart } from "./context/CartContext"
import ProductModal from "@/components/ProductModal/ProductModal"
import { getTaxaEntrega } from "@/lib/utils/delivery"
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
  const [showFloatingCart, setShowFloatingCart] = useState(false)
  const [products, setProducts] = useState<ProductWithDefaults[]>([])
  const [categories, setCategories] = useState<string[]>([ALL_CATEGORIES])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: "",
    phone: "",
    address: "",
    complement: "",
    neighborhood: "",
    city: "",
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
        const mapped: ProductWithDefaults[] = apiProducts.map((p) => {
          const priceNum = typeof p.price === "number" ? p.price : Number(p.price)
          const original = p.original_price != null ? Number(p.original_price) : priceNum
          return {
            ...p,
            price: priceNum,
            originalPrice: original,
            isNew: !!p.is_new,
            isBestSeller: !!p.is_best_seller,
            stock: p.stock || 0, // Mapeando campo stock da API
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

  useEffect(() => {
    setShowFloatingCart(getTotalItems() > 0)
  }, [getTotalItems])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
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
    if (product.stock <= 0) return

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
    if (p.stock <= 0) return

    setProductModal(p)
    setModalImageError(false)
  }

  const generateWhatsAppMessage = async () => {
    setIsProcessingOrder(true)

    try {
      // Reduzir estoque dos produtos
      const response = await fetch("/api/reduce-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao processar pedido")
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

      const subtotal = getTotalPrice()
      const extrasTotal = getExtrasTotal()
      const taxaEntrega = deliveryInfo.deliveryType === "retirada" ? 0 : getTaxaEntrega(deliveryInfo.neighborhood)
      const total = subtotal + taxaEntrega + extrasTotal

      const deliveryText =
        deliveryInfo.deliveryType === "retirada"
          ? "RETIRADA NA LOJA\nR. Idelfonso Solon de Freitas, 558 - Popular, Limoeiro do Norte - CE"
          : `ENDERECO DE ENTREGA:\n${deliveryInfo.address}${deliveryInfo.complement ? `, ${deliveryInfo.complement}` : ""}\n${deliveryInfo.neighborhood}, ${deliveryInfo.city}`

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

          // 🔑 força a string para UTF-8 antes de encodar
          const utf8Message = Buffer.from(message, "utf-8").toString()
          const encodedMessage = encodeURIComponent(utf8Message)
          const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5588996867186"
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`

          window.open(whatsappUrl, "_blank")

          // Limpar carrinho e adicionais após sucesso
          cart.forEach((item) => updateQuantity(item.id, 0))
          setSelectedExtras({})
          setIsCheckoutOpen(false)
        } catch (error) {
          console.error("Erro ao processar pedido:", error)
          alert("Erro ao processar pedido. Tente novamente.")
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
        visible={showFloatingCart}
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
        getTaxaEntrega={getTaxaEntrega}
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