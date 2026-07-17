export type DeliveryZone = {
  id: number
  name: string
  fee: number
}

export type AdminDeliveryZone = DeliveryZone & {
  isActive: boolean
  createdAt: string
  updatedAt: string
}
