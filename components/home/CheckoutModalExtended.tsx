import { type ComponentProps } from "react"
import CheckoutModal from "@/components/CheckoutModal/CheckoutModal"

type CheckoutModalExtendedProps = ComponentProps<typeof CheckoutModal> & {
  selectedExtras: Record<string, number>
  toggleExtra: (extraId: string) => void
  updateExtraQuantity: (extraId: string, quantity: number) => void
  getExtrasTotal: () => number
  adicionais: { id: string; nome: string; preco: number; imagem: string }[]
}

const CheckoutModalExtended = ({
  selectedExtras,
  toggleExtra,
  updateExtraQuantity,
  getExtrasTotal,
  adicionais,
  ...props
}: CheckoutModalExtendedProps) => {
  void selectedExtras
  void toggleExtra
  void updateExtraQuantity
  void getExtrasTotal
  void adicionais

  return <CheckoutModal {...props} />
}

export default CheckoutModalExtended
