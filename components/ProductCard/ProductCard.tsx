import Image from "next/image"
import { motion } from "framer-motion"
import { ShoppingCart, Plus, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Dispatch, type SetStateAction } from "react"
import { type ProductWithDefaults } from "@/types/product"

type ProductCardProps = {
  product: ProductWithDefaults
  onAddToCart: (product: ProductWithDefaults) => void
  onOpen: (product: ProductWithDefaults) => void
  imageErrors: Record<number, boolean>
  setImageErrors: Dispatch<SetStateAction<Record<number, boolean>>>
  formatCategoryName: (category: string | string[]) => string
  formatProductName: (name: string) => string
}

const ProductCard = ({
  product,
  onAddToCart,
  onOpen,
  imageErrors,
  setImageErrors,
  formatCategoryName,
  formatProductName,
}: ProductCardProps) => {
  const displayName = product.nome_exibicao || formatProductName(product.nome_produto)
  const isOutOfStock = product.stock <= 0

  return (
    <motion.div whileHover={{ y: -8, scale: 1.02 }} className="group">
      <Card
        className={`overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white/90 backdrop-blur-sm group-hover:bg-white h-full ${isOutOfStock ? "opacity-60 grayscale" : ""}`}
      >
        <div
          className={`relative ${!isOutOfStock ? "cursor-pointer" : "cursor-not-allowed"}`}
          onClick={() => !isOutOfStock && onOpen(product)}
        >
          {!imageErrors[product.id] ? (
            <Image
              src={product.image_url || "/placeholder.svg?height=400&width=400&query=produto%20sorvete"}
              alt={displayName}
              width={400}
              height={400}
              unoptimized
              className={`w-full h-64 object-cover transition-transform duration-500 ${!isOutOfStock ? "group-hover:scale-110" : ""}`}
              onError={() => setImageErrors({ ...imageErrors, [product.id]: true })}
            />
          ) : (
            <div
              className={`w-full h-64 bg-gradient-to-br from-orange-100 via-pink-100 to-amber-100 flex items-center justify-center transition-transform duration-500 ${!isOutOfStock ? "group-hover:scale-110" : ""}`}
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-pink-300 to-orange-300 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🍦</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">{displayName}</p>
              </div>
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-col space-y-2">
            {isOutOfStock ? (
              <Badge className="bg-gray-500 text-white font-semibold">FORA DE ESTOQUE</Badge>
            ) : (
              <>
                {product.isNew && <Badge className="bg-green-500 text-white font-semibold">NOVO</Badge>}
                {product.isBestSeller && <Badge className="bg-orange-500 text-white font-semibold">MAIS VENDIDO</Badge>}
              </>
            )}
          </div>

          {!isOutOfStock && product.originalPrice > product.price && (
            <Badge className="absolute top-3 right-3 bg-red-500 text-white font-bold">
              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </Badge>
          )}
        </div>

        <CardContent className="p-6 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs font-medium border-orange-200 text-pink-600">
              {formatCategoryName(product.categoria)}
            </Badge>
            {!isOutOfStock && (
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
              </div>
            )}
          </div>

          <div
            className={`${!isOutOfStock ? "cursor-pointer" : "cursor-not-allowed"}`}
            onClick={() => !isOutOfStock && onOpen(product)}
          >
            <h3
              className={`text-lg font-bold mb-2 text-gray-800 transition-colors ${!isOutOfStock ? "group-hover:text-pink-600" : ""}`}
            >
              {displayName}
            </h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed line-clamp-2 flex-grow">
              {product.descricao || `Delicioso ${displayName} feito com ingredientes premium selecionados.`}
            </p>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-pink-600">R$ {product.price.toFixed(2)}</span>
                {!isOutOfStock && product.originalPrice > product.price && (
                  <span className="text-sm text-gray-400 line-through">R$ {product.originalPrice.toFixed(2)}</span>
                )}
              </div>
            </div>

            <motion.button
              whileHover={!isOutOfStock ? { scale: 1.05 } : {}}
              whileTap={!isOutOfStock ? { scale: 0.95 } : {}}
              data-product-id={product.id}
              onClick={(event) => {
                event.stopPropagation()
                if (!isOutOfStock) onAddToCart(product)
              }}
              disabled={isOutOfStock}
              className={`px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg flex items-center space-x-2 font-semibold ${
                isOutOfStock
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:via-rose-600 hover:to-pink-700 text-white hover:shadow-xl"
              }`}
            >
              <Plus className="w-4 h-4 max-sm:hidden" />
              <ShoppingCart className="w-4 h-4 sm:hidden" />
              <span className="max-sm:hidden">{isOutOfStock ? "Indisponível" : "Adicionar"}</span>
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ProductCard
