const NON_DIGITS = /\D/g

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(NON_DIGITS, "")

  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits

  return digits
}

export function isValidBrazilianPhone(phone: string) {
  return /^55[1-9][0-9](9[0-9]{8}|[2-9][0-9]{7})$/.test(phone)
}

export function formatBrazilianPhone(value: string) {
  const normalized = normalizeBrazilianPhone(value)
  const local = normalized.startsWith("55") ? normalized.slice(2) : normalized
  const ddd = local.slice(0, 2)
  const number = local.slice(2)

  if (ddd.length !== 2 || (number.length !== 8 && number.length !== 9)) return value.trim()

  const splitAt = number.length === 9 ? 5 : 4
  return `(${ddd}) ${number.slice(0, splitAt)}-${number.slice(splitAt)}`
}

export function maskBrazilianPhone(value: string) {
  const normalized = normalizeBrazilianPhone(value)
  const local = normalized.startsWith("55") ? normalized.slice(2) : normalized
  const ddd = local.slice(0, 2)
  const number = local.slice(2)

  if (ddd.length !== 2 || number.length < 4) return "Telefone indisponível"

  return `(${ddd}) ${"•".repeat(Math.max(0, number.length - 4))}-${number.slice(-4)}`
}

export function normalizeCustomerName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function cleanCustomerName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}
