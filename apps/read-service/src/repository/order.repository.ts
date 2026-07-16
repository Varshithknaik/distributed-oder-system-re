import {
  OrderCancelledPayloadSchema,
  OrderConfirmedPayloadSchema,
} from '@core/events'
import { OrderView } from '../models/OrderView.js'
import { ClientSession } from 'mongoose'

export const processOrderConfirmed = async ({
  payload,
  session,
  eventId,
}: {
  payload: unknown
  session: ClientSession
  eventId: string
}) => {
  const parsed = OrderConfirmedPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      '[READ SERVICE - ORDER] Invalid order confirmed event payload'
    )
  }

  const {
    id: orderId,
    userId,
    status,
    total,
    items,
    version,
    createdAt,
    updatedAt,
    createdBy,
  } = parsed.data

  await OrderView.create(
    [
      {
        orderId,
        lastEventId: eventId,
        createdBy: createdBy ?? userId,
        status,
        total,
        items: items.map(({ orderId: _, ...item }) => item),
        version,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt),
        projectedAt: new Date(),
      },
    ],
    { session }
  )
}

export const processOrderCancelled = async ({
  payload,
  session,
  eventId,
}: {
  payload: unknown
  session: ClientSession
  eventId: string
}) => {
  const parsed = OrderCancelledPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      '[READ SERVICE - ORDER] Invalid order cancelled event payload'
    )
  }

  await OrderView.updateOne(
    {
      orderId: parsed.data.orderId,
      version: { $lt: parsed.data.version },
    },
    {
      $set: {
        lastEventId: eventId,
        status: parsed.data.status,
        updatedAt: new Date(parsed.data.updatedAt),
        projectedAt: new Date(),
      },
    },
    { session }
  )
}
