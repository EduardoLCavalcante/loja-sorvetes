/**
 * Parse robusto de preços em formato brasileiro.
 * Aceita "12,90", "R$ 12,90", "12.90", números, etc.
 */
export function parsePrice(input: unknown): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === "number" && Number.isFinite(input)) return input

  let s = String(input).trim()
  if (!s) return null

  // Remove "R$", espaços e caracteres não numéricos (exceto . , -)
  s = s.replace(/[Rr]\$|\s/g, "")

  // Se tiver ponto e vírgula, assume "." como milhar e "," como decimal
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(/,/g, ".")
  } else if (s.includes(",")) {
    // Só vírgula -> decimal pt-BR
    s = s.replace(/,/g, ".")
  }

  // Remover quaisquer caracteres restantes que não sejam dígitos, ponto ou sinal
  s = s.replace(/[^0-9.-]/g, "")

  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : null
}
