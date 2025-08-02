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
  categoria: string[]
  nome_produto: string
  descricao: string
  preco: string
  caminho: string
}

interface ProductWithDefaults extends Product {
  id: number
  price: number
  originalPrice: number
  // rating: number
  // reviews: number
  isNew: boolean
  isBestSeller: boolean
}

// Mock de produtos para exibição
const mockProducts: Product[] = [
  {
    nome_arquivo: "baunilha-frutas-vermelhas-2l.webp",
    categoria: ["Pote 2L"],
    nome_produto: "dlice-baunilha-frutas-vermelhas",
    descricao: "Sorvete de baunilha com calda de frutas vermelhas. Cremoso e refrescante.",
    preco: "24.00",
    caminho: "baunilha-frutas-vermelhas-2l.webp",
  },
  {
    nome_arquivo: "bombom-2l.webp",
    categoria: ["Pote 2L"],
    nome_produto: "dlice-bombom",
    descricao: "Sorvete sabor bombom com pedaços de chocolate. Um clássico irresistível.",
    preco: "24.00",
    caminho: "bombom-2l.webp",
  },
  {
    nome_arquivo: "brigadeiro-2l.webp",
    categoria: ["Pote 2L"],
    nome_produto: "dlice-brigadeiro",
    descricao: "Sorvete de brigadeiro com granulado e calda de chocolate.",
    preco: "24.00",
    caminho: "brigadeiro-2l.webp",
  },
  {
    nome_arquivo: "cone-show-brigadeiro-novo.webp",
    categoria: ["ConeShow"],
    nome_produto: "dlice-cone-show-brigadeiro",
    descricao: "Cone crocante recheado com sorvete de brigadeiro e cobertura de chocolate.",
    preco: "07.00",
    caminho: "cone-show-brigadeiro-novo.webp",
  },
  {
    nome_arquivo: "cone-show-crocante-novo.webp",
    categoria: ["ConeShow"],
    nome_produto: "dlice-cone-show-crocante",
    descricao: "Cone crocante com sorvete de creme e cobertura de chocolate crocante.",
    preco: "07.00",
    caminho: "cone-show-crocante-novo.webp",
  },
  {
    nome_arquivo: "copao-chocreme-novo.webp",
    categoria: ["Copao"],
    nome_produto: "dlice-copao-chocreme",
    descricao: "Copão de chocolate com creme e pedaços de chocolate.",
    preco: "07.00",
    caminho: "copao-chocreme-novo.webp",
  },
  {
    nome_arquivo: "copao-napolitano-novo.webp",
    categoria: ["Copao"],
    nome_produto: "dlice-copao-napolitano",
    descricao: "Copão napolitano: chocolate, morango e baunilha juntos.",
    preco: "07.00",
    caminho: "copao-napolitano-novo.webp",
  },
  {
    nome_arquivo: "light-napolitano-zero.webp",
    categoria: ["Light"],
    nome_produto: "dlice-light-napolitano-zero",
    descricao: "Sorvete napolitano zero açúcar, leve e saboroso.",
    preco: "24.00",
    caminho: "light-napolitano-zero.webp",
  },
  {
    nome_arquivo: "flocos-2l.webp",
    categoria: ["Pote 2L"],
    nome_produto: "dlice-flocos",
    descricao: "Sorvete de flocos",
    preco: "24.00",
    caminho: "flocos-2l.webp",
  },
  {
    nome_arquivo: "napolitano-2l.webp",
    categoria: ["Pote 2L"],
    nome_produto: "dlice-napolitano",
    descricao: "Soverte sabor napolitano.",
    preco: "24.00",
    caminho: "napolitano-2l.webp",
  },
  {
    nome_arquivo: "frutas-tropicais-2l.webp",
    categoria: ["Pote 2L"],
    nome_produto: "dlice-frutas-tropicais",
    descricao: "frutas tropicais com cobertura especial.",
    preco: "24.00",
    caminho: "frutas-tropicais-2l.webp",
  },
  {
    nome_arquivo: "creme-com-passas.webp",
    categoria: ["Copinho"],
    nome_produto: "dlice-creme-com-passas",
    descricao: "Sorvete de creme com passas.",
    preco: "4.50",
    caminho: "creme-com-passas.webp",
  },
  {
    nome_arquivo: "bombom-novo.webp",
    categoria: ["Copinho"],
    nome_produto: "dlice-bombom",
    descricao: "Sorvete sabor bombom com pedaços de chocolate.",
    preco: "4.50",
    caminho: "bombom-novo.webp",
  },
  {
    nome_arquivo: "napolitano-classico.webp",
    categoria: ["Copinho"],
    nome_produto: "dlice-napolitano-classico",
    descricao: "Sorvete napolitano clássico com camadas de chocolate, morango e baunilha.",
    preco: "4.50",
    caminho: "napolitano-classico.webp",
  },
  {
    nome_arquivo: "pote-acai.webp",
    categoria: ["Açai"],
    nome_produto: "pote-acai",
    descricao: "Pote de açaí.",
    preco: "28.00",
    caminho: "sorvete-mareni-acai.webp",
  },
  {
    nome_arquivo: "pote-creme-com-passas.webp",
    categoria: ["Pote 2L"],
    nome_produto: "creme-com-passas",
    descricao: "Pote de creme com passas.",
    preco: "24.00",
    caminho: "creme-passas-2l.webp",
  },
  {
    nome_arquivo: "pote-nata-goiaba.webp",
    categoria: ["Pote 2L"],
    nome_produto: "nata-goiaba",
    descricao: "Soverte 2L de sabor nata com goiaba.",
    preco: "24.00",
    caminho: "nata-goiaba-2l.webp",
  },
  {
    nome_arquivo: "pote-pave.webp",
    categoria: ["Pote 2L"],
    nome_produto: "pote-pave",
    descricao: "Soverte 2L de sabor pavê.",
    preco: "24.00",
    caminho: "pave-2l.webp",
  },
  {
    nome_arquivo: "pote-premium-iogurte-morango.webp",
    categoria: ["Premium"],
    nome_produto: "premium-iogurte-morango",
    descricao: "Pote de iogurte com morango.",
    preco: "26.00",
    caminho: "pote-premium-iogurte-morango.webp",
  },
  {
    nome_arquivo: "pote-premium-ninho-trufado.webp",
    categoria: ["Premium"],
    nome_produto: "premium-ninho-trufado",
    descricao: "Pote de ninho trufado.",
    preco: "26.00",
    caminho: "pote-premium-ninho-trufado.webp",
  },
  {
    nome_arquivo: "pote-toffee.webp",
    categoria: ["Pote 2L"],
    nome_produto: "toffee",
    descricao: "soverte de sabor Toffee.",
    preco: "24.00",
    caminho: "toffee-2l.webp",
  },
  {
    nome_arquivo: "sundae-chocolate.webp",
    categoria: ["Sundae"],
    nome_produto: "dlice-sundae-chocolate",
    descricao: "Sundae de chocolate com cobertura de chocolate.",
    preco: "6.00",
    caminho: "sundae-chocolate.webp",
  },
  {
    nome_arquivo: "sundae-morango.webp",
    categoria: ["Sundae"],
    nome_produto: "dlice-sundae-morango",
    descricao: "Sundae de morango com cobertura de morango.",
    preco: "6.00",
    caminho: "sundae-morango.webp",
  },


  // PICOLÉS
  {
    nome_arquivo: "picole-abacaxi.webp",
    categoria: ["Picole"],
    nome_produto: "picole-abacaxi",
    descricao: "Picolé sabor abacaxi, refrescante e natural.",
    preco: "3.00",
    caminho: "picole-abacaxi.webp",
  },
  {
    nome_arquivo: "picole-caja.webp",
    categoria: ["Picole"],
    nome_produto: "picole-caja",
    descricao: "Picolé sabor cajá, perfeito para dias quentes.",
    preco: "3.00",
    caminho: "picole-caja.webp",
  },
  {
    nome_arquivo: "picole-goiaba.webp",
    categoria: ["Picole"],
    nome_produto: "picole-goiaba",
    descricao: "Picolé sabor goiaba, doce na medida certa.",
    preco: "3.00",
    caminho: "picole-goiaba.webp",
  },
  {
    nome_arquivo: "picole-graviola.webp",
    categoria: ["Picole"],
    nome_produto: "picole-graviola",
    descricao: "Picolé sabor graviola, cremoso e tropical.",
    preco: "3.00",
    caminho: "picole-graviola.webp",
  },
  {
    nome_arquivo: "picole-limao.webp",
    categoria: ["Picole"],
    nome_produto: "picole-limao",
    descricao: "Picolé sabor limão, refrescância garantida.",
    preco: "3.00",
    caminho: "picole-limao.webp",
  },
  {
    nome_arquivo: "picole-acai.webp",
    categoria: ["Picole","Açai"],
    nome_produto: "picole-acai",
    descricao: "Picolé sabor açai",
    preco: "4.00",
    caminho: "picole-acai.webp",
  },
  {
    nome_arquivo: "picole-amendoim.webp",
    categoria: ["Picole"],
    nome_produto: "picole-amêndoas",
    descricao: "Picolé sabor amêndoas.",
    preco: "7.00",
    caminho: "picole-amendoim.webp",
  },
  {
    nome_arquivo: "picole-brigadeiro.webp",
    categoria: ["Picole"],
    nome_produto: "picole-brigadeiro",
    descricao: "Picolé sabor brigadeiro.",
    preco: "6.00",
    caminho: "picole-brigadeiro.webp",
  },
  {
    nome_arquivo: "picole-chocolate-branco.webp",
    categoria: ["Picole"],
    nome_produto: "picole-chocolate-branco",
    descricao: "Picolé sabor chocolate branco.",
    preco: "3.00",
    caminho: "picole-chocolate-branco.webp",
  },
  {
    nome_arquivo: "picole-classico.webp",
    categoria: ["Picole"],
    nome_produto: "picole-classico",
    descricao: "Picolé sabor clássico.",
    preco: "7.00",
    caminho: "picole-classico.webp",
  },
  {
    nome_arquivo: "picole-flocante.webp",
    categoria: ["Picole"],
    nome_produto: "picole-flocante",
    descricao: "Picolé sabor flocante.",
    preco: "3.00",
    caminho: "picole-flocante.webp",
  },
  {
    nome_arquivo: "picole-iogurte-grego.webp",
    categoria: ["Picole"],
    nome_produto: "picole-iogurte-grego",
    descricao: "Picolé sabor iogurte grego.",
    preco: "5.00",
    caminho: "picole-iogurte-grego.webp",
  },
  {
    nome_arquivo: "picole-leitinho-trufado.webp",
    categoria: ["Picole"],
    nome_produto: "picole-leitinho-trufado",
    descricao: "Picolé sabor leitinho trufado.",
    preco: "5.00",
    caminho: "picole-leitinho-trufado.webp",
  },
  {
    nome_arquivo: "picole-tablete.webp",
    categoria: ["Picole"],
    nome_produto: "picole-tablete",
    descricao: "Picolé sabor tablete, uma combinação perfeita de chocolate e crocância.",
    preco: "6.00",
    caminho: "picole-tablete.webp",
  },
  {
    nome_arquivo: "picole-trufa-chocolate.webp",
    categoria: ["Picole"],
    nome_produto: "picole-trufa-chocolate",
    descricao: "Picolé sabor trufa de chocolate, uma explosão de sabor.",
    preco: "5.00",
    caminho: "picole-trufa-chocolate.webp",
  },
  {
    nome_arquivo: "picole-trufa-morango.webp",
    categoria: ["Picole"],
    nome_produto: "picole-trufa-morango",
    descricao: "Picolé sabor trufa de morango, uma explosão de sabor.",
    preco: "5.00",
    caminho: "picole-trufa-morango.webp",
  },
  {
    nome_arquivo: "picole-morango.webp",
    categoria: ["Picole"],
    nome_produto: "picole-morango",
    descricao: "Picolé sabor morango, uma explosão de sabor.",
    preco: "3.00",
    caminho: "morango.webp",
  },
  {
    nome_arquivo: "picole-chocolate.webp",
    categoria: ["Picole"],
    nome_produto: "picole-chocolate",
    descricao: "Picolé sabor chocolate.",
    preco: "3.00",
    caminho: "chocolate.webp",
  },
  {
    nome_arquivo: "picole-coco.webp",
    categoria: ["Picole"],
    nome_produto: "picole-coco",
    descricao: "Picolé sabor coco.",
    preco: "3.00",
    caminho: "coco.webp",
  },
  {
    nome_arquivo: "picole-napolitano.webp",
    categoria: ["Picole"],
    nome_produto: "picole-napolitano",
    descricao: "Picolé sabor Napolitano, uma combinação clássica.",
    preco: "3.00",
    caminho: "napolitano.webp",
  },
  {
    nome_arquivo: "picole-tapioca.webp",
    categoria: ["Picole"],
    nome_produto: "picole-tapioca",
    descricao: "Picolé sabor tapioca, uma delícia nordestina.",
    preco: "3.50",
    caminho: "tapioca.webp",
  }
]
// Mock de produtos para exibição - adicionar após os produtos existentes
const newComboProducts: Product[] = [
  {
    nome_arquivo: "combo-coneshow.webp",
    categoria: ["Combos"],
    nome_produto: "dlice-combo-cone-show",
    descricao:
      "Combo especial com 6 unidades de Cone Show. Sorvetes cremosos de chocolate e baunilha em cones crocantes. Perfeito para compartilhar!",
    preco: "39.99",
    caminho: "combo-coneshow.webp",
  },
  {
    nome_arquivo: "combo-familia.webp",
    categoria: ["Combos"],
    nome_produto: "dlice-combo-familia",
    descricao:
      "Combo Família com sorvetes Pavê + cone. Sabores: bombom, brigadeiro, creme com passas, nata goiaba, frutas tropicais, flocos, baunilha com calda de frutas vermelhas, napolitano, pavê e toffee.",
    preco: "30.00",
    caminho: "combo-familia.webp",
  },
  {
    nome_arquivo: "combo-premium.webp",
    categoria: ["Combos"],
    nome_produto: "dlice-combo-premium",
    descricao:
      "Combo Premium com sorvete Ninho Trufado + 10 cones especiais. Uma experiência premium e deliciosa para toda família.",
    preco: "32.00",
    caminho: "combo-premium.webp",
  },
  {
    nome_arquivo: "kit-aniversario.webp",
    categoria: ["Kits"],
    nome_produto: "dlice-kit-aniversario",
    descricao:
      "Kit Aniversário completo! Inclui sorvete Napolitano 10L + cobertura de morango + 40 cones. Combinação perfeita para festas e celebrações especiais.",
    preco: "180.00",
    caminho: "kit-aniversario.webp",
  },
  {
    nome_arquivo: "combo-picole-frutas.webp",
    categoria: ["Combos"],
    nome_produto: "dlice-combo-picole-frutas",
    descricao:
      "Combo Picolé Frutas com 7 unidades. Sabores tropicais: Cajá, Abacaxi, Goiaba, Graviola e Limão. Refrescante e natural!",
    preco: "20.00",
    caminho: "combo-picole-frutas.webp",
  },
  {
    nome_arquivo: "combo-sunday.webp",
    categoria: ["Combos"],
    nome_produto: "dlice-combo-sunday",
    descricao:
      "Combo Sunday especial com 6 unidades. Sabores chocolate e morango com coberturas especiais. Ideal para o fim de semana!",
    preco: "35.00",
    caminho: "combo-sunday.webp",
  },
]

// Função para gerar dados padrão para produtos
const generateProductDefaults = (product: Product, index: number): ProductWithDefaults => {
  const price = parseFloat(product.preco.replace(",", "."))
  const originalPrice = price // Não padroniza, usa o preço do mock

  return {
    ...product,
    id: index + 1,
    price,
    originalPrice,
    // rating: 4.8, // Valor fixo para todos
     // Valor fixo para todos
    isNew: false,
    isBestSeller: false,
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
const formatCategoryName = (category: string | string[]) => {
  const categoryNames: { [key: string]: string } = {
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

  // Carregar produtos do mock (remover chamada ao JSON)
  useEffect(() => {
    // Junta os mocks principais e os combos/kits
    const allProducts = [...mockProducts, ...newComboProducts]
    const productsWithDefaults = allProducts.map((product, index) => generateProductDefaults(product, index))
    setProducts(productsWithDefaults)

    // Coleta todas as categorias únicas de todos os produtos (agora array)
    const uniqueCategories = [
      "Todos",
      ...Array.from(
        new Set(
          allProducts.flatMap((p) => p.categoria)
        )
      ),
    ]
    setCategories(uniqueCategories)

    setLoading(false)
  }, [])

  useEffect(() => {
    setShowFloatingCart(getTotalItems() > 0)
  }, [getTotalItems])

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "" ||
      product.categoria.includes(selectedCategory)
    const matchesSearch = formatProductName(product.nome_produto).toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Agrupar produtos por categoria, mostrando só categorias com produtos que batem com a busca
  const groupedProducts = categories
    .filter((cat) => cat !== "Todos")
    .reduce((acc, category) => {
      const filtered = products
        .filter((product) => product.categoria.includes(category))
        .filter((product) =>
          formatProductName(product.nome_produto).toLowerCase().includes(searchTerm.toLowerCase())
        )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    }, {} as { [key: string]: ProductWithDefaults[] })

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
    const whatsappUrl = `https://wa.me/5588996867186?text=${encodedMessage}`
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
              <div className="hidden md:flex items-center space-x-1">
                <Clock className="w-4 h-4 text-pink-500" />
                <span>Entrega em até 40 min</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-pink-500" />
                <span>Limoeiro do Norte - CE</span>
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
                  src="/images/dlice-logo.webp"
                  alt="D'lice Sorvetes"
                  width={120}
                  height={60}
                  className="h-12 w-auto object-contain"
                />
              </div>
            </motion.div>

            {/* Search Bar - Desktop */}
            <div className="text-[8px] md:flex flex-1 max-w-md mx-8">
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
              D'Lice Sorvetes
              <br />
              <span className="text-4xl md:text-5xl">de Outro Mundo</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Sabor que você nunca esquece. Entregamos gelado
              na sua casa em até 40 minutos!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-semibold">4.9/5</span>
                <span>• {products.length} produtos disponíveis</span>
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
                            Combinar com Vendedor
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-2xl font-bold border-t border-orange-100 pt-4">
                        <span>Total:</span>
                        <span className="text-pink-600">
                          R$ {(getTotalPrice()).toFixed(2)}
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
                            Combinar com Vendedor
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex justify-between text-xl font-bold text-gray-800">
                            <span>Total:</span>
                            <span className="text-pink-600">
                              R$ {(getTotalPrice()).toFixed(2)}
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
              {/* <span className="text-sm font-medium text-gray-600">{product.rating.toFixed(1)}</span> */}
              {/* <span className="text-xs text-gray-400">({product.reviews})</span> */}
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
             
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-product-id={product.id}
              onClick={() => onAddToCart(product)}
              className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:via-rose-600 hover:to-pink-700 text-white px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 font-semibold"
            >
              <Plus className="w-4 h-4 max-sm:hidden" />
              <ShoppingCart className="w-4 h-4 sm:hidden" />
              <span className="max-sm:hidden">Adicionar</span>
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
