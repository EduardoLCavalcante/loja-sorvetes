import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { Button } from '../ui/button'
import { Minus, Phone, Plus, ShoppingCart, X } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import Mapa from '../Mapa/Mapa'
import Image from 'next/image'

type DeliveryInfo = {
  name: string
  phone: string
  city: string
  paymentMethod: string
  changeFor: string
  complement: string
  address: string
  neighborhood: string
  deliveryType: string
}

type Item = {
  id: string | number
  image_url?: string
  nome_produto: string
  price: number
  quantity: number
}

type CheckoutModalProps = {
  isCheckoutOpen: boolean
  setIsCheckoutOpen: React.Dispatch<React.SetStateAction<boolean>>
  isCartOpen: boolean
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>
  getTotalItems: () => number
  cart: Item[]
  imageErrors: Record<string, boolean>
  setImageErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  updateQuantity: (id: string | number, quantity: number) => void
  getTaxaEntrega: (neighborhood: string) => number
  deliveryInfo: DeliveryInfo
  setDeliveryInfo: React.Dispatch<React.SetStateAction<DeliveryInfo>>
  getTotalPrice: () => number
  generateWhatsAppMessage: () => void
  isProcessingOrder: boolean
  selectedExtras: { [key: string]: number }
  toggleExtra: (extraId: string) => void
  updateExtraQuantity: (extraId: string, quantity: number) => void
  getExtrasTotal: () => number
  adicionais: { id: string; nome: string; preco: number; imagem: string }[]
}


const CheckoutModal = (props: CheckoutModalProps) => {
  const formatProductName = (name: string) =>
  name
  .replace(/-/g, " ")
  .replace(/\b\w/g, (l) => l.toUpperCase())
  .replace(/Dlice/gi, "")
  .trim()
  return (
    <>
        <AnimatePresence>
        {props.isCheckoutOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => props.setIsCheckoutOpen(false)}
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
                    <Button variant="ghost" size="icon" onClick={() => props.setIsCheckoutOpen(false)}>
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  <div className="">
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
                            value={props.deliveryInfo.name}
                            onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, name: e.target.value })}
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
                            value={props.deliveryInfo.phone}
                            onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, phone: e.target.value })}
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
                          value={props.deliveryInfo.address}
                          onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, address: e.target.value })}
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
                            value={props.deliveryInfo.complement}
                            onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, complement: e.target.value })}
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
                            value={props.deliveryInfo.neighborhood}
                            onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, neighborhood: e.target.value })}
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
                          value={props.deliveryInfo.city}
                          onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, city: e.target.value })}
                          placeholder="Sua cidade"
                          className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300"
                        />
                      </div>

                      <div>
                        <Label htmlFor="paymentMethod" className="text-sm font-semibold text-gray-700">
                          Forma de Pagamento
                        </Label>
                        <select
                          id="paymentMethod"
                          value={props.deliveryInfo.paymentMethod}
                          onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, paymentMethod: e.target.value })}
                          className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300 w-full bg-white"
                          required
                        >
                          <option value="">Selecione</option>
                          <option value="Pix">Pix</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Cartão(Débito)">Cartão (Débito)</option>
                          <option value="Cartão(Crédito)">Cartão (Crédito)</option>
                        </select>
                      </div>
                      {props.deliveryInfo.paymentMethod === "Dinheiro" && (
                        <div>
                          <Label htmlFor="changeFor" className="text-sm font-semibold text-gray-700">
                            Troco Para:
                          </Label>
                          <Input
                            id="changeFor"
                            value={props.deliveryInfo.changeFor}
                            onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, changeFor: e.target.value })}
                            placeholder="R$ 50,00"
                            className="mt-2 p-3 rounded-xl border-2 border-orange-100 focus:border-pink-300"
                          />
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-semibold text-gray-700">Tipo de Entrega</Label>
                        <div className="mt-2 space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="deliveryType"
                              value="entrega"
                              checked={props.deliveryInfo.deliveryType !== "retirada"}
                              onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, deliveryType: "entrega" })}
                              className="text-pink-500"
                            />
                            <span>Entrega no endereço</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="deliveryType"
                              value="retirada"
                              checked={props.deliveryInfo.deliveryType === "retirada"}
                              onChange={(e) => props.setDeliveryInfo({ ...props.deliveryInfo, deliveryType: "retirada" })}
                              className="text-pink-500"
                            />
                            <span>Retirada na loja</span>
                          </label>
                        </div>

                        {props.deliveryInfo.deliveryType === "retirada" && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-xl border  border-blue-200">
                            <h4 className="font-semibold text-blue-800 mb-2">Localização da Loja</h4>
                            <p className="text-sm text-blue-700 mb-3">
                              R. Idelfonso Solon de Freitas, 558 - Popular, Limoeiro do Norte - CE, 62930-000
                            </p>
                            <Mapa />
                          </div>
                        )}
                      </div>

                      {/* Seção de Adicionais */}
                      <div className="border-t border-orange-100 pt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Adicionais (Opcional)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {props.adicionais.map((adicional) => {
                            const isSelected = props.selectedExtras[adicional.id] > 0
                            const quantity = props.selectedExtras[adicional.id] || 0
                            return (
                              <div
                                key={adicional.id}
                                className={`relative rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                                  isSelected
                                    ? "border-pink-500 bg-pink-50"
                                    : "border-orange-100 bg-white hover:border-pink-200"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => props.toggleExtra(adicional.id)}
                                  className="w-full text-left"
                                >
                                  <div className="relative h-20 md:h-24">
                                    <Image
                                      src={adicional.imagem || "/placeholder.svg"}
                                      alt={adicional.nome}
                                      fill
                                      className="object-cover"
                                    />
                                    {isSelected && (
                                      <div className="absolute top-1 right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">✓</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2 text-center">
                                    <p className="text-xs md:text-sm font-semibold text-gray-800">{adicional.nome}</p>
                                    <p className="text-xs md:text-sm text-pink-600 font-bold">R$ {adicional.preco.toFixed(2)}</p>
                                  </div>
                                </button>
                                {isSelected && (
                                  <div className="flex items-center justify-center gap-2 pb-2 px-2">
                                    <button
                                      type="button"
                                      onClick={() => props.updateExtraQuantity(adicional.id, quantity - 1)}
                                      className="w-6 h-6 rounded-full bg-pink-200 text-pink-700 flex items-center justify-center text-sm font-bold hover:bg-pink-300"
                                    >
                                      -
                                    </button>
                                    <span className="text-sm font-semibold w-4 text-center">{quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => props.updateExtraQuantity(adicional.id, quantity + 1)}
                                      className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-sm font-bold hover:bg-pink-600"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Resumo do Pedido */}
                      <div className="border-t border-orange-100 pt-4 space-y-2">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal produtos:</span>
                          <span>R$ {props.getTotalPrice().toFixed(2)}</span>
                        </div>
                        {props.getExtrasTotal() > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Adicionais:</span>
                            <span>R$ {props.getExtrasTotal().toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-gray-600">
                          <span>Entrega:</span>
                          {(() => {
                            if (props.deliveryInfo.deliveryType === "retirada") {
                              return <span className="text-green-600 font-semibold">Gratuita (Retirada)</span>
                            }
                            const taxaEntrega = props.getTaxaEntrega(props.deliveryInfo.neighborhood)
                            return (
                              <span className={taxaEntrega > 0 ? "text-green-600 font-semibold" : ""}>
                                {taxaEntrega > 0 ? `R$ ${taxaEntrega.toFixed(2)}` : "Combinar com Vendedor"}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      {(() => {
                        const taxaEntrega =
                          props.deliveryInfo.deliveryType === "retirada" ? 0 : props.getTaxaEntrega(props.deliveryInfo.neighborhood)
                        const totalComFrete = props.getTotalPrice() + taxaEntrega + props.getExtrasTotal()
                        return (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex justify-between text-xl font-bold text-gray-800">
                              <span>Total:</span>
                              <span className="text-pink-600">R$ {totalComFrete.toFixed(2)}</span>
                            </div>
                          </div>
                        )
                      })()}

                      <Button
                        onClick={props.generateWhatsAppMessage}
                        disabled={
                          props.isProcessingOrder ||
                          !props.deliveryInfo.name ||
                          !props.deliveryInfo.phone ||
                          (props.deliveryInfo.deliveryType !== "retirada" &&
                            (!props.deliveryInfo.address || !props.deliveryInfo.neighborhood || !props.deliveryInfo.city)) ||
                          (props.deliveryInfo.paymentMethod === "Dinheiro" && !props.deliveryInfo.changeFor)
                        }
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl text-lg font-semibold flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {props.isProcessingOrder ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Processando Pedido...</span>
                          </>
                        ) : (
                          <>
                            <Phone className="w-6 h-6" />
                            <span>Enviar Pedido via WhatsApp</span>
                          </>
                        )}
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
          <AnimatePresence>
        {props.isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => props.setIsCartOpen(false)}
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
                      {props.getTotalItems()} {props.getTotalItems() === 1 ? "item" : "itens"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => props.setIsCartOpen(false)}>
                    <X className="w-6 h-6" />
                  </Button>
                </div>

                {props.cart.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-pink-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Carrinho vazio</h3>
                    <p className="text-gray-500 mb-6">Adicione alguns sorvetes deliciosos!</p>
                    <Button
                      onClick={() => props.setIsCartOpen(false)}
                      className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-full"
                    >
                      Continuar Comprando
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {props.cart.map((item: Item) => (
                        <motion.div
                          key={item.id}
                          layout
                          className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl border border-orange-100"
                        >
                          {!props.imageErrors[item.id] ? (
                            <Image
                              src={item.image_url || "/placeholder.svg?height=80&width=80&query=miniatura%20sorvete"}
                              alt={formatProductName(item.nome_produto)}
                              width={80}
                              height={80}
                              unoptimized
                              className="w-20 h-20 object-cover rounded-xl"
                              onError={() => props.setImageErrors((prev) => ({ ...prev, [item.id]: true }))}
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
                              onClick={() => props.updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-semibold text-lg">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-8 h-8 rounded-full border-orange-200 hover:bg-orange-50 bg-transparent"
                              onClick={() => props.updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {(() => {
                      const taxaEntrega = props.getTaxaEntrega(props.deliveryInfo.neighborhood)
                      const totalComFrete = props.getTotalPrice() + taxaEntrega
                      return (
                        <div className="border-t border-orange-100 pt-6 mb-6">
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-gray-600">
                              <span>Subtotal:</span>
                              <span>R$ {props.getTotalPrice().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span>Entrega:</span>
                              <span className={taxaEntrega > 0 ? "text-green-600 font-semibold" : ""}>
                                {taxaEntrega > 0 ? `R$ ${taxaEntrega.toFixed(2)}` : "Combinar com Vendedor"}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-2xl font-bold border-t border-orange-100 pt-4">
                            <span>Total:</span>
                            <span className="text-pink-600">R$ {totalComFrete.toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })()}

                    <Button
                      onClick={() => {
                        props.setIsCartOpen(false)
                        props.setIsCheckoutOpen(true)
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
      </>
  )
}

export default CheckoutModal