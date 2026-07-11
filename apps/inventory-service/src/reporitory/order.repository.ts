import {
  EventEnvelope,
  INVENTORY_EVENTS_TYPE,
  InventoryStockReservationCancelled,
  OrderCancelledPayloadSchema,
  TOPICS,
} from '@core/events'
import { ReservationStatus, Prisma } from '@prisma/client-inventory-service'

interface ProcessOrderCancelledProps {
  payload: unknown
  tx: Prisma.TransactionClient
}

interface CancelledStockRow {
  sku: string
  quantity: number
  version: number
  remainingstock: number
  updatedAt: Date
}

export const processInventoryOrderCancelled = async ({
  payload,
  tx,
}: ProcessOrderCancelledProps) => {
  const parsed = OrderCancelledPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      '[INVENTORY SERVICE - ORDER] invalid order cancelled event payload'
    )
  }

  const { orderId } = parsed.data

  const res = await tx.$queryRaw<CancelledStockRow[]>`
    WITH cancelled AS (
      UPDATE "Reservations"
      SET 
        status = ${ReservationStatus.CANCELLED},
        "updated_at" = NOW()
      WHERE
        "order_id" = ${orderId}
        AND status IN (
          ${ReservationStatus.PENDING},
          ${ReservationStatus.CONFIRMED}
        )
        RETURNING sku, quantity
    ),
    totals AS (
      SELECT sku, SUM(quantity)::int as quantity
      FROM cancelled
      GROUP BY sku
    )

    UPDATE "Products" p
    SET
      stock = p.stock + t.quantity,
      "updated_at" = NOW(),
      version = p.version +   1
    FROM totals t
    WHERE p.sku = t.sku
    RETURNING p.sku, t.quantity, p.version , p.updated_at as "updatedAt", p.stock AS "remainingstock"
  `

  const envelope: EventEnvelope<InventoryStockReservationCancelled> = {
    eventId: crypto.randomUUID(),
    eventType: INVENTORY_EVENTS_TYPE.RESERVATION_CANCELLED,
    occurredAt: new Date().toISOString(),
    version: 1,
    payload: {
      orderId,
      items: res.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        remainingStock: item.remainingstock,
        version: item.version,
      })),
      cancelledAt: new Date().toISOString(),
    },
  }

  await tx.outBoxEvent.create({
    data: {
      id: envelope.eventId,
      aggregateId: orderId,
      aggregateType: 'inventory.events',
      eventType: INVENTORY_EVENTS_TYPE.RESERVATION_CANCELLED,
      topic: TOPICS.INVENTORY_EVENTS,
      payload: envelope,
    },
  })
}
