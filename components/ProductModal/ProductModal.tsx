import React, { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import Image from "next/image"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { ShoppingCart } from "lucide-react"
import { type ProductWithDefaults } from "@/types/product"

type ProductModalProps = {
  product: ProductWithDefaults | null
  onClose: () => void
  formatProductName: (name: string) => string
  formatCategoryName: (categories: string[]) => string
  handleAddToCart: (product: ProductWithDefaults) => void
}

const ProductModal = (props: ProductModalProps) => {
  const { product, onClose, formatProductName, formatCategoryName, handleAddToCart } = props
  const [modalImageError, setModalImageError] = useState(false)
  const mobileModalView =
    "max-sm:max-h-[70%] max-sm:max-w-[90vw] max-sm:my-auto max-sm:mx-auto max-sm:px-4 max-sm:rounded-2xl"

  useEffect(() => {
    // Reset fallback state whenever a new product is opened in the modal.
    setModalImageError(false)
  }, [product?.id])

  return (
    <Dialog
      open={!!product}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className={`max-w-3xl p-0 overflow-auto ${mobileModalView}`}>
        {product && (
          <>
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-2xl md:text-3xl">
                {product.nome_exibicao || formatProductName(product.nome_produto)}
              </DialogTitle>
              <DialogDescription className="sr-only">{"Detalhes do produto selecionado"}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-100 via-pink-100 to-amber-100">
                {!modalImageError ? (
                  <Image
                    src={
                      product.image_url ||
                      "/placeholder.svg?height=600&width=600&query=imagem%20de%20produto%20sorvete" ||
                      "/placeholder.svg"
                    }
                    alt={product.nome_exibicao || formatProductName(product.nome_produto)}
                    width={800}
                    height={800}
                    className="w-full h-auto object-cover"
                    onError={() => setModalImageError(true)}
                  />
                ) : (
                  <div className="aspect-square w-full flex items-center justify-center">
                    <span className="text-6xl">🍦</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <div className="mb-3">
                  <Badge variant="outline" className="text-pink-600 border-pink-200">
                    {formatCategoryName(product.categoria)}
                  </Badge>
                </div>

                <p className="text-gray-700 leading-relaxed mb-6">
                  {product.descricao ||
                    `Delicioso ${product.nome_exibicao || formatProductName(product.nome_produto)} feito com ingredientes premium selecionados.`}
                </p>

                <div className="mt-auto">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl font-extrabold text-pink-600">R$ {product.price.toFixed(2)}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-base text-gray-400 line-through">R$ {product.originalPrice.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        handleAddToCart(product)
                        onClose()
                      }}
                      className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Adicionar ao carrinho</span>
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ProductModal