import { motion } from "framer-motion"
import { Star } from "lucide-react"

const HeroSection = ({ productsCount }: { productsCount: number }) => {
  return (
    <section className="relative py-16 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 via-rose-600/10 to-orange-600/10" />
      <div className="container mx-auto text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 bg-clip-text text-transparent leading-tight">
            D'Lice Sorvetes
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Sabor de querer mais!. Entregamos gelado na sua casa em até 40 minutos!
          </p>
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <span className="font-semibold">4.9/5</span>
            <span>• {productsCount} produtos disponíveis</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default HeroSection
