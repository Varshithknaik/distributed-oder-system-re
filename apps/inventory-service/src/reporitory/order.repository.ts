import { OrderCancelledPayloadSchema } from '@core/events'
import { ReservationStatus, Prisma } from '@prisma/client-inventory-service'

interface ProcessOrderCancelledProps {
  payload: unknown
  tx: Prisma.TransactionClient
}

export const processOrderCancelled = async ({
  payload,
  tx,
}: ProcessOrderCancelledProps) => {
  console.log(payload)
  const parsed = OrderCancelledPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      '[INVENTORT SERIVE - ORDER] invalid order cancelled event payload'
    )
  }

  const { orderId, version, updatedAt } = parsed.data

  const res = await tx.$queryRaw`
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
  `

  console.log(res, 'resilver')
  throw new Error('Not completed')
}
