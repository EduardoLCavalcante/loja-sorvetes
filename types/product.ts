export type ProductRecord = {
  id: number
  nome_produto: string
  descricao?: string | null
  price: number
  original_price?: number | null
  categoria: string[]
  caminho: string
  is_new?: boolean
  is_best_seller?: boolean
  image_url?: string | null
  stock: number
}

export type ProductWithDefaults = {
  id: number
  nome_produto: string
  nome_exibicao?: string
  descricao?: string | null
  price: number
  originalPrice: number
  categoria: string[]
  caminho: string
  isNew: boolean
  isBestSeller: boolean
  image_url?: string | null
  stock: number
}
