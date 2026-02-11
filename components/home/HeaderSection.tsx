import Image from "next/image"
import { motion } from "framer-motion"
import { Clock, MapPin, Search, ShoppingCart } from "lucide-react"
import NavCategory from "@/components/NavCategory/NavCategory"
import { Input } from "@/components/ui/input"
type HeaderSectionProps = {
  searchTerm: string
  onSearchChange: (value: string) => void
  totalItems: number
  onCartOpen: () => void
  categories: string[]
  selectedCategory: string
  onSelectCategory: (category: string) => void
  formatCategoryName: (category: string | string[]) => string
}

const HeaderSection = ({
  searchTerm,
  onSearchChange,
  totalItems,
  onCartOpen,
  categories,
  selectedCategory,
  onSelectCategory,
  formatCategoryName,
}: HeaderSectionProps) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-orange-100 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2 text-sm text-gray-600 border-b border-gray-100">
          <div className="hidden md:flex items-center space-x-1">
            <Clock className="w-4 h-4 text-pink-500" />
            <span>Entrega em até 40 min</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4 text-pink-500" />
            <span>Limoeiro do Norte - CE</span>
          </div>
        </div>

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

          <div className="text-[8px] md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar sabores..."
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                className="pl-10 pr-4 py-3 rounded-full border-2 border-orange-100 focus:border-pink-300 bg-white/80 backdrop-blur-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCartOpen}
              className="relative p-3 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg"
                >
                  {totalItems}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>

        <NavCategory
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={onSelectCategory}
          formatCategoryName={formatCategoryName}
        />
      </div>
    </header>
  )
}

export default HeaderSection
