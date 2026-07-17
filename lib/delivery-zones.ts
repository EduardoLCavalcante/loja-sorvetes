import { parsePrice } from "@/lib/utils/pricing"
import type { AdminDeliveryZone, DeliveryZone } from "@/types/delivery-zone"

export function normalizeDeliveryZoneName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

export function toDeliveryZone(row: any): DeliveryZone {
  return {
    id: Number(row.id),
    name: String(row.name),
    fee: Math.round((parsePrice(row.fee) ?? 0) * 100) / 100,
  }
}

export function toAdminDeliveryZone(row: any): AdminDeliveryZone {
  return {
    ...toDeliveryZone(row),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
