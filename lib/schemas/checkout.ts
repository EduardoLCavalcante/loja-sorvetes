import { z } from "zod"

export const checkoutSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  phone: z.string().min(10, "Informe um telefone com DDD"),
  address: z.string(),
  houseNumber: z.string(),
  noHouseNumber: z.boolean(),
  complement: z.string(),
  neighborhood: z.string(),
  paymentMethod: z.enum(["Pix", "Dinheiro", "Cartão(Débito)", "Cartão(Crédito)"], {
    errorMap: () => ({ message: "Selecione uma forma de pagamento" }),
  }),
  deliveryType: z.enum(["entrega", "retirada"]),
  changeFor: z.string(),
}).superRefine((data, ctx) => {
  if (data.deliveryType === "entrega") {
    if (!data.address.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Endereço é obrigatório para entrega", path: ["address"] })
    }
    if (!data.noHouseNumber && !data.houseNumber.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número é obrigatório para entrega", path: ["houseNumber"] })
    }
    if (!data.neighborhood.trim()) {
      ctx.addIssue({   code: z.ZodIssueCode.custom, message: "Bairro é obrigatório para entrega", path: ["neighborhood"] })
    }
  }
  if (data.paymentMethod === "Dinheiro" && !data.changeFor.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o valor para troco", path: ["changeFor"] })
  }
})

export type CheckoutFormData = z.infer<typeof checkoutSchema>

export const checkoutOrderSchema = z.object({
  deliveryInfo: checkoutSchema,
  items: z
    .array(
      z.object({
        id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
        quantity: z.number().int().positive().max(99),
      }),
    )
    .min(1, "Adicione ao menos um item ao carrinho"),
  selectedExtras: z.record(z.number().int().positive().max(99)),
})
