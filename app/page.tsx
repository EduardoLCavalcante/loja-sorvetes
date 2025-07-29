"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShoppingCart,
  Plus,
  Minus,
  Phone,
  X,
  Search,
  Menu,
  Star,
  Heart,
  MapPin,
  Clock,
  Award,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "./context/CartContext"
import Image from "next/image"

interface Product {
  nome_arquivo: string
  categoria: string
  nome_produto: string
  descricao: string
  preco: string
  caminho: string
}

interface ProductWithDefaults extends Product {
  id: number
  price: number
  originalPrice: number
  rating: number
  reviews: number
  isNew: boolean
  isBestSeller: boolean
}

// Mock de produtos para exibição
const mockProducts: Product[] = [
  {
    nome_arquivo: "sorvete-chocolate-premium.jpg",
    categoria: "Copo",
    nome_produto: "dlice-chocolate-premium",
    descricao:
      "Sorvete cremoso de chocolate belga com pedaços de chocolate meio amargo. Uma experiência única para os amantes do chocolate.",
    preco: "18.90",
    caminho: "sorvete-chocolate-premium.jpg",
  },
  {
    nome_arquivo: "sorvete-morango-natural.jpg",
    categoria: "Copo",
    nome_produto: "dlice-morango-natural",
    descricao:
      "Feito com morangos frescos selecionados, nosso sorvete de morango traz todo o sabor da fruta em cada colherada.",
    preco: "16.50",
    caminho: "sorvete-morango-natural.jpg",
  },
  {
    nome_arquivo: "sorvete-baunilha-madagascar.jpg",
    categoria: "Copo",
    nome_produto: "dlice-baunilha-madagascar",
    descricao: "Baunilha premium de Madagascar com notas aromáticas intensas. Clássico e sofisticado.",
    preco: "17.90",
    caminho: "sorvete-baunilha-madagascar.jpg",
  },
  {
    nome_arquivo: "cone-show-chocolate-morango.jpg",
    categoria: "ConeShow",
    nome_produto: "dlice-cone-show-chocolate-morango",
    descricao: "Cone crocante recheado com sorvete de chocolate e morango, coberto com calda especial e granulado.",
    preco: "22.90",
    caminho: "cone-show-chocolate-morango.jpg",
  },
  {
    nome_arquivo: "cone-show-cookies-cream.jpg",
    categoria: "ConeShow",
    nome_produto: "dlice-cone-show-cookies-cream",
    descricao: "Delicioso cone com sorvete de cookies & cream, pedaços de biscoito e cobertura de chocolate.",
    preco: "24.50",
    caminho: "cone-show-cookies-cream.jpg",
  },
  {
    nome_arquivo: "copao-frutas-vermelhas.jpg",
    categoria: "Copao",
    nome_produto: "dlice-copao-frutas-vermelhas",
    descricao: "Copão generoso com mix de frutas vermelhas: morango, framboesa e amora. Refrescante e saboroso.",
    preco: "28.90",
    caminho: "copao-frutas-vermelhas.jpg",
  },
  {
    nome_arquivo: "copao-chocolate-nuts.jpg",
    categoria: "Copao",
    nome_produto: "dlice-copao-chocolate-nuts",
    descricao: "Copão com sorvete de chocolate, castanhas, nozes e cobertura de chocolate quente.",
    preco: "32.50",
    caminho: "copao-chocolate-nuts.jpg",
  },
  {
    nome_arquivo: "light-coco-zero.jpg",
    categoria: "Light",
    nome_produto: "dlice-light-coco-zero",
    descricao:
      "Sorvete de coco zero açúcar, cremoso e saboroso. Perfeito para quem cuida da saúde sem abrir mão do prazer.",
    preco: "19.90",
    caminho: "light-coco-zero.jpg",
  },
  {
    nome_arquivo: "light-chocolate-diet.jpg",
    categoria: "Light",
    nome_produto: "dlice-light-chocolate-diet",
    descricao: "Chocolate diet com 70% menos calorias. Sabor intenso sem culpa.",
    preco: "20.50",
    caminho: "light-chocolate-diet.jpg",
  },
  {
    nome_arquivo: "sundae-caramelo-especial.jpg",
    categoria: "Sundae",
    nome_produto: "dlice-sundae-caramelo-especial",
    descricao: "Sundae com sorvete de baunilha, calda de caramelo artesanal, chantilly e cereja.",
    preco: "26.90",
    caminho: "sundae-caramelo-especial.jpg",
  },
  {
    nome_arquivo: "sundae-chocolate-brownie.jpg",
    categoria: "Sundae",
    nome_produto: "dlice-sundae-chocolate-brownie",
    descricao: "Sundae com sorvete de chocolate, pedaços de brownie, calda quente e castanhas.",
    preco: "29.90",
    caminho: "sundae-chocolate-brownie.jpg",
  },
  {
    nome_arquivo: "sorvete-pistache-siciliano.jpg",
    categoria: "Copo",
    nome_produto: "dlice-pistache-siciliano",
    descricao: "Sorvete artesanal de pistache siciliano, cremoso e com sabor marcante. Edição especial.",
    preco: "25.90",
    caminho: "sorvete-pistache-siciliano.jpg",
  },
]

// Função para gerar dados padrão para produtos
const generateProductDefaults = (product: Product, index: number): ProductWithDefaults => {
  const basePrice = 15 + Math.random() * 20 // Preço entre 15 e 35
  const discount = Math.random() > 0.6 ? 1.2 : 1 // 40% chance de desconto

  return {
    ...product,
    id: index + 1,
    price: Math.round(basePrice * 100) / 100,
    originalPrice: Math.round(basePrice * discount * 100) / 100,
    rating: 4.5 + Math.random() * 0.5, // Rating entre 4.5 e 5.0
    reviews: Math.floor(Math.random() * 200) + 50, // Reviews entre 50 e 250
    isNew: Math.random() > 0.7, // 30% chance de ser novo
    isBestSeller: Math.random() > 0.8, // 20% chance de ser mais vendido
    descricao:
      product.descricao ||
      `Delicioso sorvete ${product.nome_produto.toLowerCase().replace(/-/g, " ")} feito com ingredientes premium selecionados.`,
  }
}

// Função para formatar nome do produto
const formatProductName = (name: string) => {
  return name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Dlice/gi, "")
    .trim()
}

// Função para formatar nome da categoria
const formatCategoryName = (category: string) => {
  const categoryNames: { [key: string]: string } = {
    ConeShow: "Cone Show",
    Copao: "Copão",
    Copo: "Copo",
    Light: "Light",
    Sundae: "Sundae",
  }
  return categoryNames[category] || category
}

export default function DliceEcommerce() {
  const { cart, addToCart, removeFromCart, updateQuantity, getTotalPrice, getTotalItems } = useCart()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [showFloatingCart, setShowFloatingCart] = useState(false)
  const [products, setProducts] = useState<ProductWithDefaults[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: "",
    phone: "",
    address: "",
    complement: "",
    neighborhood: "",
    city: "",
  })

  // Adicionar estado para controlar erros de imagem no início do componente principal
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({})

  // Função para lidar com erros de imagem
  const handleImageError = (productId: number) => {
    setImageErrors((prev) => ({ ...prev, [productId]: true }))
  }

  // Carregar produtos do JSON
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch("/data/catalogo_sorvetes_mareni.json")
        let data: Product[] = []

        if (response.ok) {
          data = await response.json()
        } else {
          console.warn("JSON não encontrado, usando produtos mock")
          data = mockProducts
        }

        const productsWithDefaults = data.map((product, index) => generateProductDefaults(product, index))
        setProducts(productsWithDefaults)

        const uniqueCategories = ["Todos", ...Array.from(new Set(data.map((p) => p.categoria)))]
        setCategories(uniqueCategories)

        setLoading(false)
      } catch (error) {
        console.error("Erro ao carregar produtos, usando mock:", error)
        // Em caso de erro, usar produtos mock
        const productsWithDefaults = mockProducts.map((product, index) => generateProductDefaults(product, index))
        setProducts(productsWithDefaults)

        const uniqueCategories = ["Todos", ...Array.from(new Set(mockProducts.map((p) => p.categoria)))]
        setCategories(uniqueCategories)

        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  useEffect(() => {
    setShowFloatingCart(getTotalItems() > 0)
  }, [getTotalItems])

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "Todos" || product.categoria === selectedCategory
    const matchesSearch = formatProductName(product.nome_produto).toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Agrupar produtos por categoria
  const groupedProducts = products.reduce(
    (acc, product) => {
      if (!acc[product.categoria]) {
        acc[product.categoria] = []
      }
      acc[product.categoria].push(product)
      return acc
    },
    {} as { [key: string]: ProductWithDefaults[] },
  )

  const handleAddToCart = (product: ProductWithDefaults) => {
    addToCart(product)
    const button = document.querySelector(`[data-product-id="${product.id}"]`)
    if (button) {
      button.classList.add("animate-bounce")
      setTimeout(() => button.classList.remove("animate-bounce"), 500)
    }
  }

  const generateWhatsAppMessage = () => {
    const items = cart
      .map(
        (item) =>
          `• ${formatProductName(item.nome_produto)} (${item.quantity}x) - R$ ${(item.price * item.quantity).toFixed(2)}`,
      )
      .join("\n")

    const message = `🍦 *Pedido D'lice Sorvetes* 🍦

*Produtos Selecionados:*
${items}

*Valor Total: R$ ${getTotalPrice().toFixed(2)}*

*Dados para Entrega:*
👤 Nome: ${deliveryInfo.name}
📞 Telefone: ${deliveryInfo.phone}
🏠 Endereço: ${deliveryInfo.address}
${deliveryInfo.complement ? `📍 Complemento: ${deliveryInfo.complement}` : ""}
🏘️ Bairro: ${deliveryInfo.neighborhood}
🏙️ Cidade: ${deliveryInfo.city}

Gostaria de confirmar este pedido! 😋`

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodedMessage}`
    window.open(whatsappUrl, "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando produtos deliciosos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-orange-100 shadow-lg">
        <div className="container mx-auto px-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-2 text-sm text-gray-600 border-b border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Truck className="w-4 h-4 text-pink-500" />
                <span>Entrega grátis acima de R$ 50</span>
              </div>
              <div className="hidden md:flex items-center space-x-1">
                <Clock className="w-4 h-4 text-pink-500" />
                <span>Entrega em até 2h</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-pink-500" />
                <span>São Paulo - SP</span>
              </div>
            </div>
          </div>

          {/* Main Header */}
          <div className="flex items-center justify-between py-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="relative">
                <Image
                  src="/images/dlice-logo.png"
                  alt="D'lice Sorvetes"
                  width={120}
                  height={60}
                  className="h-12 w-auto object-contain"
                />
              </div>
            </motion.div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Buscar sabores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 rounded-full border-2 border-orange-100 focus:border-pink-300 bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6" />
              </Button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCartOpen(true)}
                className="relative p-3 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <ShoppingCart className="w-6 h-6" />
                {getTotalItems() > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg"
                  >
                    {getTotalItems()}
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>

          {/* Categories Navigation */}
          <div className="pb-4">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <motion.button
                  key={category}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                      : "bg-white/80 text-gray-600 hover:bg-orange-50 border border-orange-100"
                  }`}
                >
                  {category === "Todos" ? category : formatCategoryName(category)}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 via-rose-600/10 to-orange-600/10" />
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 bg-clip-text text-transparent leading-tight">
              Sorvetes Artesanais
              <br />
              <span className="text-4xl md:text-5xl">de Outro Mundo</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Ingredientes premium selecionados, receitas exclusivas e o sabor que você nunca esquece. Entregamos gelado
              na sua casa em até 2 horas!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-semibold">4.9/5</span>
                <span>• {products.length} produtos disponíveis</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Award className="w-5 h-5 text-pink-500" />
                <span>Prêmio Melhor Sorvete 2024</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Products by Category */}
      {selectedCategory === "Todos" ? (
        // Mostrar produtos agrupados por categoria
        <section className="py-12 px-4">
          <div className="container mx-auto">
            {Object.entries(groupedProducts).map(([categoryName, categoryProducts], categoryIndex) => (
              <motion.div
                key={categoryName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="mb-16"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-3xl font-bold text-gray-800 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    {formatCategoryName(categoryName)}
                  </h3>
                  <Badge variant="outline" className="text-pink-600 border-pink-200">
                    {categoryProducts.length} {categoryProducts.length === 1 ? "produto" : "produtos"}
                  </Badge>
                </div>

                {/* Mobile: Scroll horizontal */}
                <div className="md:hidden">
                  <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                    {categoryProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-shrink-0 w-72"
                      >
                        <ProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          imageErrors={imageErrors}
                          setImageErrors={setImageErrors}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Desktop: Grid */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {categoryProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        imageErrors={imageErrors}
                        setImageErrors={setImageErrors}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ) : (
        // Mostrar produtos filtrados
        <section className="py-12 px-4">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    imageErrors={imageErrors}
                    setImageErrors={setImageErrors}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Floating Cart Button */}
      <AnimatePresence>
        {showFloatingCart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-30"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsCartOpen(true)}
              className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center space-x-3"
            >
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                >
                  {getTotalItems()}
                </motion.span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold">Ver Carrinho</div>
                <div className="text-xs opacity-90">R$ {getTotalPrice().toFixed(2)}</div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Seu Carrinho</h2>
                    <p className="text-sm text-gray-500">
                      {getTotalItems()} {getTotalItems() === 1 ? "item" : "itens"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
                    <X className="w-6 h-6" />
                  </Button>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-pink-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Carrinho vazio</h3>
                    <p className="text-gray-500 mb-6">Adicione alguns sorvetes deliciosos!</p>
                    <Button
                      onClick={() => setIsCartOpen(false)}
                      className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-full"
                    >
                      Continuar Comprando
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl border border-orange-100"
                        >
                          {!imageErrors[item.id] ? (
                            <Image
                              src={`/images/${item.caminho}`}
                              alt={formatProductName(item.nome_produto)}
                              width={80}
                              height={80}
                              className="w-20 h-20 object-cover rounded-xl"
                              onError={() => handleImageError(item.id)}
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gradient-to-br from-orange-200 to-pink-200 rounded-xl flex items-center justify-center">
                              <span className="text-2xl">🍦</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">{formatProductName(item.nome_produto)}</h3>
                            <p className="text-pink-600 font-bold text-lg">R$ {item.price.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">
                              Subtotal: R$ {(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-8 h-8 rounded-full border-orange-200 hover:bg-orange-50 bg-transparent"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-semibold text-lg">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-8 h-8 rounded-full border-orange-200 hover:bg-orange-50 bg-transparent"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="border-t border-orange-100 pt-6 mb-6">
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal:</span>
                          <span>R$ {getTotalPrice().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Entrega:</span>
                          <span className="text-green-600 font-semibold">
                            {getTotalPrice() >= 50 ? "Grátis" : "R$ 8,90"}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-2xl font-bold border-t border-orange-100 pt-4">
                        <span>Total:</span>
                        <span className="text-pink-600">
                          R$ {(getTotalPrice() + (getTotalPrice() >= 50 ? 0 : 8.9)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setIsCartOpen(false)
                        setIsCheckoutOpen(true)
                      }}
                      className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:via-rose-600 hover:to-pink-700 text-white py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Finalizar Pedido
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsCheckoutOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Finalizar Pedido</h2>
                      <p className="text-gray-500">Preencha seus dados para entrega</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsCheckoutOpen(false)}>
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Formulário de dados */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-800 border-b border-orange-100 pb-2">
                        Dados para Entrega
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                            Nome Completo
                          </Label>
                          <Input
                            id="name"
                            value={deliveryInfo.name}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, name: e.target.value })}
                            placeholder="Seu nome completo"
                            className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300"
                          />
                        </div>

                        <div>
                          <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                            Telefone
                          </Label>
                          <Input
                            id="phone"
                            value={deliveryInfo.phone}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
                            placeholder="(11) 99999-9999"
                            className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="address" className="text-sm font-semibold text-gray-700">
                          Endereço Completo
                        </Label>
                        <Input
                          id="address"
                          value={deliveryInfo.address}
                          onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                          placeholder="Rua, número"
                          className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="complement" className="text-sm font-semibold text-gray-700">
                            Complemento
                          </Label>
                          <Input
                            id="complement"
                            value={deliveryInfo.complement}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, complement: e.target.value })}
                            placeholder="Apartamento, bloco, etc."
                            className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300"
                          />
                        </div>

                        <div>
                          <Label htmlFor="neighborhood" className="text-sm font-semibold text-gray-700">
                            Bairro
                          </Label>
                          <Input
                            id="neighborhood"
                            value={deliveryInfo.neighborhood}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, neighborhood: e.target.value })}
                            placeholder="Seu bairro"
                            className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="city" className="text-sm font-semibold text-gray-700">
                          Cidade
                        </Label>
                        <Input
                          id="city"
                          value={deliveryInfo.city}
                          onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })}
                          placeholder="Sua cidade"
                          className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300"
                        />
                      </div>
                    </div>

                    {/* Resumo do pedido */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-800 border-b border-orange-100 pb-2">
                        Resumo do Pedido
                      </h3>

                      <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 md:p-6 rounded-2xl border border-orange-100 max-h-80 overflow-y-auto">
                        <div className="space-y-3">
                          {cart.map((item) => (
                            <div key={item.id} className="flex justify-between items-center py-2">
                              <div className="flex items-center space-x-3">
                                {!imageErrors[item.id] ? (
                                  <Image
                                    src={`/images/${item.caminho}`}
                                    alt={formatProductName(item.nome_produto)}
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                                    onError={() => handleImageError(item.id)}
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gradient-to-br from-orange-200 to-pink-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm">🍦</span>
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-800 text-sm truncate">
                                    {formatProductName(item.nome_produto)}
                                  </p>
                                  <p className="text-gray-500 text-xs">Qtd: {item.quantity}</p>
                                </div>
                              </div>
                              <span className="font-semibold text-gray-800 text-sm flex-shrink-0">
                                R$ {(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal:</span>
                          <span>R$ {getTotalPrice().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Entrega:</span>
                          <span className={getTotalPrice() >= 50 ? "text-green-600 font-semibold" : ""}>
                            {getTotalPrice() >= 50 ? "Grátis" : "R$ 8,90"}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex justify-between text-xl font-bold text-gray-800">
                            <span>Total:</span>
                            <span className="text-pink-600">
                              R$ {(getTotalPrice() + (getTotalPrice() >= 50 ? 0 : 8.9)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={generateWhatsAppMessage}
                        disabled={
                          !deliveryInfo.name ||
                          !deliveryInfo.phone ||
                          !deliveryInfo.address ||
                          !deliveryInfo.neighborhood ||
                          !deliveryInfo.city
                        }
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl text-lg font-semibold flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Phone className="w-6 h-6" />
                        <span>Enviar Pedido via WhatsApp</span>
                      </Button>

                      <p className="text-center text-sm text-gray-500">
                        Você será redirecionado para o WhatsApp para confirmar seu pedido
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Componente do Card do Produto
function ProductCard({
  product,
  onAddToCart,
  imageErrors,
  setImageErrors,
}: {
  product: ProductWithDefaults
  onAddToCart: (product: ProductWithDefaults) => void
  imageErrors: { [key: number]: boolean }
  setImageErrors: (errors: { [key: number]: boolean }) => void
}) {
  return (
    <motion.div whileHover={{ y: -8, scale: 1.02 }} className="group">
      <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/90 backdrop-blur-sm group-hover:bg-white h-full">
        <div className="relative">
          {!imageErrors[product.id] ? (
            <Image
              src={`/images/${product.caminho}`}
              alt={formatProductName(product.nome_produto)}
              width={400}
              height={400}
              className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
              onError={() => setImageErrors({ ...imageErrors, [product.id]: true })}
            />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-orange-100 via-pink-100 to-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-pink-300 to-orange-300 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🍦</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">{formatProductName(product.nome_produto)}</p>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col space-y-2">
            {product.isNew && <Badge className="bg-green-500 text-white font-semibold">NOVO</Badge>}
            {product.isBestSeller && <Badge className="bg-orange-500 text-white font-semibold">MAIS VENDIDO</Badge>}
          </div>

          {/* Discount Badge */}
          {product.originalPrice > product.price && (
            <Badge className="absolute top-3 right-3 bg-red-500 text-white font-bold">
              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </Badge>
          )}

          {/* Favorite Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Heart className="w-5 h-5 text-pink-500" />
          </motion.button>
        </div>

        <CardContent className="p-6 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs font-medium border-orange-200 text-pink-600">
              {formatCategoryName(product.categoria)}
            </Badge>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-gray-600">{product.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({product.reviews})</span>
            </div>
          </div>

          <h3 className="text-lg font-bold mb-2 text-gray-800 group-hover:text-pink-600 transition-colors">
            {formatProductName(product.nome_produto)}
          </h3>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed line-clamp-2 flex-grow">{product.descricao}</p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-pink-600">R$ {product.price.toFixed(2)}</span>
                {product.originalPrice > product.price && (
                  <span className="text-sm text-gray-400 line-through">R$ {product.originalPrice.toFixed(2)}</span>
                )}
              </div>
              <span className="text-xs text-gray-500">ou 3x sem juros</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-product-id={product.id}
              onClick={() => onAddToCart(product)}
              className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:via-rose-600 hover:to-pink-700 text-white px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
