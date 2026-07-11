import z from 'zod'

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        sku: z.string().nonempty(),
        quantity: z.number().positive(),
      })
    )
    .nonempty(),
})

export const cancelOrderParamsSchema = z.object({
  orderId: z.string().min(1),
})
