import { AnimatePresence, motion } from "framer-motion"
import { ShoppingCart } from "lucide-react"

type FloatingCartButtonProps = {
  visible: boolean
  totalItems: number
  totalPrice: number
  onCartOpen: () => void
}

const FloatingCartButton = ({ visible, totalItems, totalPrice, onCartOpen }: FloatingCartButtonProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-6 right-6 z-30"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCartOpen}
            className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center space-x-3"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
              >
                {totalItems}
              </motion.span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold">Ver Carrinho</div>
              <div className="text-xs opacity-90">R$ {totalPrice.toFixed(2)}</div>
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FloatingCartButton
