import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import ProductCard from "@/components/ProductCard/ProductCard"
import { type ProductWithDefaults } from "@/types/product"
import { type Dispatch, type SetStateAction } from "react"
import { ALL_CATEGORIES } from "@/lib/constants"

type ProductsSectionProps = {
  selectedCategory: string
  groupedProducts: Record<string, ProductWithDefaults[]>
  filteredProducts: ProductWithDefaults[]
  formatCategoryName: (category: string | string[]) => string
  formatProductName: (name: string) => string
  handleAddToCart: (product: ProductWithDefaults) => void
  openProductModal: (product: ProductWithDefaults) => void
  imageErrors: Record<number, boolean>
  setImageErrors: Dispatch<SetStateAction<Record<number, boolean>>>
}

const ProductsSection = ({
  selectedCategory,
  groupedProducts,
  filteredProducts,
  formatCategoryName,
  formatProductName,
  handleAddToCart,
  openProductModal,
  imageErrors,
  setImageErrors,
}: ProductsSectionProps) => {
  if (selectedCategory === ALL_CATEGORIES) {
    return (
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

              <div className="md:hidden">
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                  {categoryProducts.map((product, productIndex) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: productIndex * 0.1 }}
                      className="flex-shrink-0 w-72"
                    >
                      <ProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        onOpen={openProductModal}
                        imageErrors={imageErrors}
                        setImageErrors={setImageErrors}
                        formatCategoryName={formatCategoryName}
                        formatProductName={formatProductName}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {categoryProducts.map((product, productIndex) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: productIndex * 0.1 }}
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      onOpen={openProductModal}
                      imageErrors={imageErrors}
                      setImageErrors={setImageErrors}
                      formatCategoryName={formatCategoryName}
                      formatProductName={formatProductName}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {filteredProducts.map((product, productIndex) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: productIndex * 0.1 }}
            >
              <ProductCard
                product={product}
                onAddToCart={handleAddToCart}
                onOpen={openProductModal}
                imageErrors={imageErrors}
                setImageErrors={setImageErrors}
                formatCategoryName={formatCategoryName}
                formatProductName={formatProductName}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default ProductsSection
