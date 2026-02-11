import React from 'react'
import { motion} from "framer-motion"

type NavCategoryType = {
    categories: string[]
    selectedCategory: string
    setSelectedCategory: (category: string) => void
    formatCategoryName: (category: string) => string
}

const NavCategory = ({ categories, selectedCategory, setSelectedCategory, formatCategoryName }:NavCategoryType) => {
  return (
    <div className="pb-4">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
              {categories.map((category:string) => (
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
  )
}

export default NavCategory