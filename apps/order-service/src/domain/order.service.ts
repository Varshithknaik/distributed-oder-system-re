import { CreateOrderRequest, CreateOrderResponse } from '@core/proto'
import { reserveStock } from '../grpc/clients.js'
import { prisma } from '../lib/prisma.js'
import {
  EventEnvelope,
  TOPICS,
  OrderConfirmed,
  ORDER_EVENTS_TYPE,
  OrderCancelled,
} from '@core/events'
import { CancelOrderInput } from '../schema/order.schema.js'

export async function createOrder(
  request: CreateOrderRequest
): Promise<CreateOrderResponse> {
  const orderId = crypto.randomUUID()
  const paylaod = {
    orderId,
    items: request.items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
    })),
  }

  const reservation = await reserveStock(paylaod)

  if (!reservation.success) {
    throw new Error(reservation.reason)
  }

  const total = reservation.items.reduce(
    (acc, item) => acc + item.quantity * (item.offerPrice ?? item.unitPrice),
    0
  )

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        id: orderId,
        createdBy: request.userId,
        total,
        status: 'CONFIRMED',
      },
    })

    const items = await tx.orderItem.createManyAndReturn({
      data: reservation.items.map((item) => ({
        orderId: order.id,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        offerPrice: item.offerPrice,
        effectiveUnitPrice: item.offerPrice ?? item.unitPrice,
        lineTotal: item.quantity * (item.offerPrice ?? item.unitPrice),
        productName: item.productName,
      })),
    })

    const envelope: EventEnvelope<OrderConfirmed> = {
      eventId: crypto.randomUUID(),
      eventType: ORDER_EVENTS_TYPE.ORDER_CONFIRMED,
      occurredAt: new Date().toISOString(),
      version: 1,
      payload: {
        id: order.id,
        items: items.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          offerPrice: item.offerPrice ?? undefined,
          effectiveUnitPrice: item.effectiveUnitPrice,
          lineTotal: item.lineTotal,
          productName: item.productName,
        })),
        version: order.version,
        status: order.status,
        total: order.total,
        updatedAt: order.updatedAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
        createdBy: order.createdBy,
      },
    }

    await tx.outBoxEvent.create({
      data: {
        id: envelope.eventId,
        aggregateType: 'order.events',
        aggregateId: order.id,
        topic: TOPICS.ORDER_EVENTS,
        eventType: ORDER_EVENTS_TYPE.ORDER_CONFIRMED,
        payload: envelope,
      },
    })

    return {
      orderId: order.id,
      status: order.status,
      total: order.total,
      items: items.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        price: item.unitPrice,
        offerPrice: item.offerPrice ?? undefined,
        effectiveUnitPrice: item.effectiveUnitPrice,
        lineTotal: item.lineTotal,
        productName: item.productName,
      })),
      createdAt: order.createdAt.toISOString(),
    }
  })
}

export const cancelOrder = async (data: CancelOrderInput) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: data.orderId, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', version: { increment: 1 } },
      select: {
        id: true,
        version: true,
        updatedAt: true,
      },
    })

    const evenvelope: EventEnvelope<OrderCancelled> = {
      eventId: crypto.randomUUID(),
      eventType: ORDER_EVENTS_TYPE.ORDER_CANCELLED,
      occurredAt: new Date().toISOString(),
      version: 1,
      payload: {
        orderId: order.id,
        status: 'CANCELLED',
        version: order.version,
        updatedAt: order.updatedAt.toISOString(),
      },
    }

    await tx.outBoxEvent.create({
      data: {
        id: evenvelope.eventId,
        aggregateType: 'order.events',
        aggregateId: order.id,
        topic: TOPICS.ORDER_EVENTS,
        eventType: ORDER_EVENTS_TYPE.ORDER_CANCELLED,
        payload: evenvelope,
      },
    })
    return {
      orderId: order.id,
      status: 'CANCELLED',
    }
  })
}
