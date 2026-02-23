import { bairrosTaxas } from "@/lib/data/deliveryZones"

/**
 * Calcula taxa de entrega com base no bairro informado.
 * Normaliza acentos e casing antes de comparar.
 */
export function getTaxaEntrega(bairro: string): number {
  if (!bairro) return 0
  const normalize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim()
  const bairroNormalizado = normalize(bairro)
  for (const nome in bairrosTaxas) {
    if (normalize(nome) === bairroNormalizado) {
      return bairrosTaxas[nome]
    }
  }
  return 0
}
