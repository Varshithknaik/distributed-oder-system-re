import { prisma } from '../lib/prisma.js'
import {
  INVENTORY_EVENTS_TYPE,
  InventoryProductCreatedEnvelopeSchema,
  InventoryBulkCreatedEnvelopeSchema,
  InventoryStockReservedEnvelopeSchema,
  InventoryProductUpdatedEnvelopeSchema,
  InventoryStockReservationCancelledEnvelopeSchema,
} from '@core/events'
import {
  MAX_ATTEMPTS,
  nextRetryAt,
  OutboxEventHandler,
  publishOutboxEvent,
} from '../events/producers/inventory-service-publish.js'

const BATCH_SIZE = 50
const POLL_INTERVAL_MS = 5000

/**
 * Handler map: add a new entry here whenever a new outbox event type is introduced.
 * No new publish function needed — just register the Zod envelope schema.
 */
const OUTBOX_HANDLERS: Partial<
  Record<keyof typeof INVENTORY_EVENTS_TYPE, OutboxEventHandler>
> = {
  PRODUCT_ADDED: { schema: InventoryProductCreatedEnvelopeSchema },
  BULK_ADDED: { schema: InventoryBulkCreatedEnvelopeSchema },
  STOCK_RESERVED: { schema: InventoryStockReservedEnvelopeSchema },
  PRODUCT_UPDATED: { schema: InventoryProductUpdatedEnvelopeSchema },
  RESERVATION_CANCELLED: {
    schema: InventoryStockReservationCancelledEnvelopeSchema,
  },
}

function claimOutboxEvents() {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM outbox_events
      WHERE status In ('PENDING', 'FAILED') 
        AND next_attempt_at <= NOW()
        AND attempt < ${MAX_ATTEMPTS}
      ORDER BY created_at ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `
      const ids = rows.map((row) => row.id)
      if (ids.length === 0) return []

      return await tx.outBoxEvent.updateManyAndReturn({
        where: { id: { in: ids } },
        data: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy: process.pid?.toString(),
        },
      })
    },
    {
      maxWait: 5000,
      timeout: 10000,
    }
  )
}

// TODO: Instead of POLLING use CDC Outbox Tooling
export function startInventoryOutboxPoller() {
  let isRunning = false
  const timer = setInterval(async () => {
    if (isRunning) return
    isRunning = true

    try {
      const events = await claimOutboxEvents()

      for (const event of events) {
        // Find the matching handler by event type value
        const handlerKey = (
          Object.keys(INVENTORY_EVENTS_TYPE) as Array<
            keyof typeof INVENTORY_EVENTS_TYPE
          >
        ).find((key) => INVENTORY_EVENTS_TYPE[key] === event.eventType)

        const handler = handlerKey ? OUTBOX_HANDLERS[handlerKey] : undefined

        if (!handler) {
          console.warn(
            `No outbox handler registered for eventType: ${event.eventType}`
          )
          await prisma.outBoxEvent.update({
            where: { id: event.id },
            data: {
              status: 'FAILED',
              lockedAt: null,
              lockedBy: null,
              attempt: event.attempt + 1,
              nextAttemptAt: nextRetryAt(event.attempt + 1),
              lastError: 'No Handler found for event type ' + event.eventType,
            },
          })
          continue
        }

        await publishOutboxEvent(
          handler,
          event.topic,
          event.id,
          event.attempt,
          event.payload
        )
      }
    } catch (error) {
      console.error(
        '[InventoryOutboxPoller] Error during outbox polling:',
        error
      )
    } finally {
      isRunning = false
    }
  }, POLL_INTERVAL_MS)

  return () => clearInterval(timer)
}
