import z from 'zod'
import { createEventEnvelopeSchema } from '../envelope.js'

export const orderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  offerPrice: z.number().positive().optional(),
  effectiveUnitPrice: z.number().positive(),
  lineTotal: z.number().positive(),
  productName: z.string(),
})

export const OrderEventSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  createdBy: z.string(),
  items: z.array(orderItemSchema),
  status: z.string(),
  total: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
})

export const OrderConfirmedPayloadSchema = OrderEventSchema.extend({
  status: z.literal('CONFIRMED'),
})

export const OrderCancelledPayloadSchema = z.object({
  orderId: z.string(),
  status: z.literal('CANCELLED'),
  version: z.number(),
  updatedAt: z.string(),
})

export const OrderConfirmedEnvelopeSchema =
  createEventEnvelopeSchema(OrderEventSchema)
export const OrderCancelledEnvelopeSchema = createEventEnvelopeSchema(
  OrderCancelledPayloadSchema
)

export type OrderConfirmed = z.infer<typeof OrderEventSchema>
export type OrderCancelled = z.infer<typeof OrderCancelledPayloadSchema>
