import { EventEnvelope, INVENTORY_EVENTS_TYPE } from '@core/events'
import mongoose from 'mongoose'
import { ProcessedEvent } from '../../models/ProcessesEvents.js'
import { logger } from '@core/logger'
import {
  processBulkAdded,
  processProductAdded,
  processProductUpdated,
  processStockCancelled,
  processStockReserved,
} from '../../repository/inventory.repository.js'

export async function processInventoryEvent(
  eventEnvelop: EventEnvelope<unknown>,
  topic: string,
  partition: number,
  offset: string,
  retry = 0
): Promise<void> {
  const session = await mongoose.startSession()
  const { eventId, eventType, occurredAt, payload } = eventEnvelop
  const logCtx = { eventId, eventType, topic, partition, offset, retry }

  try {
    await session.withTransaction(async () => {
      await ProcessedEvent.create(
        [
          {
            eventId,
            eventType,
            topic,
            partition,
            offset,
          },
        ],
        { session }
      )

      const ctx = {
        payload,
        eventId,
        occurredAt,
        session,
      }

      switch (eventType) {
        case INVENTORY_EVENTS_TYPE.PRODUCT_ADDED:
          await processProductAdded(ctx)
          break
        case INVENTORY_EVENTS_TYPE.PRODUCT_UPDATED:
          await processProductUpdated(ctx)
          break
        case INVENTORY_EVENTS_TYPE.BULK_ADDED:
          await processBulkAdded(ctx)
          break
        case INVENTORY_EVENTS_TYPE.STOCK_RESERVED:
          await processStockReserved(ctx)
          break
        case INVENTORY_EVENTS_TYPE.RESERVATION_CANCELLED:
          await processStockCancelled(ctx)
        default:
          logger.error('[CRITICAL] Unknown event type in READ SERVICE', logCtx)
      }
    })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      // Duplicate key error
      logger.info(
        '[IDEMPOTENT] Event already processed in READ SERVICE',
        logCtx
      )
      return
    }

    logger.error(
      '[CRITICAL] Event processing failed in READ SERVICE',
      logCtx,
      error
    )
    throw error
  } finally {
    session.endSession()
  }
}
