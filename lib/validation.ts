import { z } from "zod"

export const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const invoiceSchema = z.object({
  clientId: z.string(),
  status: z.enum(["PAID", "UNPAID", "OVERDUE"]).optional(),

  items: z.array(
    z.object({
      name: z.string(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
    })
  ),
})
