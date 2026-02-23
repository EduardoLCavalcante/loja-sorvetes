import { z } from "zod"

export const checkoutSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  phone: z
    .string()
    .min(10, "Telefone inválido")
    .regex(/^[\d\s()+-]+$/, "Telefone deve conter apenas números"),
  address: z.string(),
  complement: z.string(),
  neighborhood: z.string(),
  city: z.string(),
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
    if (!data.neighborhood.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bairro é obrigatório para entrega", path: ["neighborhood"] })
    }
    if (!data.city.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cidade é obrigatória para entrega", path: ["city"] })
    }
  }
  if (data.paymentMethod === "Dinheiro" && !data.changeFor.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o valor para troco", path: ["changeFor"] })
  }
})

export type CheckoutFormData = z.infer<typeof checkoutSchema>
