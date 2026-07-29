import z from 'zod'
import { OrderStatusSchema } from './order.schema.js'

export const ReadOrderDetailsResponseSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      sku: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
      offerPrice: z.number().positive().optional(),
      effectiveUnitPrice: z.number().positive(),
      lineTotal: z.number().positive(),
    })
  ),
  total: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: OrderStatusSchema,
})

export type ReadOrderDetailsResponse = z.infer<
  typeof ReadOrderDetailsResponseSchema
>
