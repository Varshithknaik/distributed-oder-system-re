import mongoose from 'mongoose'
import { ProcessedEvent } from '../../models/ProcessesEvents.js'
import { EventEnvelope, ORDER_EVENTS_TYPE } from '@core/events'
import { logger } from '@core/logger'
import { processOrderConfirmed } from '../../repository/order.repository.js'

interface ProcessOrderServiceProps {
  eventEnvelope: EventEnvelope<unknown>
  topic: string
  partition: number
  offset: string
}

export async function processOrderService({
  eventEnvelope,
  topic,
  partition,
  offset,
}: ProcessOrderServiceProps): Promise<void> {
  const session = await mongoose.startSession()
  const { eventId, eventType, payload } = eventEnvelope
  const logCtx = { eventId, eventType, topic, partition, offset }
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

      const ctx = { payload, session }

      switch (eventType) {
        case ORDER_EVENTS_TYPE.ORDER_CONFIRMED:
          await processOrderConfirmed({ ...ctx, eventId })
          break
        default:
          logger.error(
            `[READ SERVICE - ORDER] unhanled event of ${eventType} type`,
            logCtx
          )
      }
    })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      // Duplicate key error
      logger.info(
        '[IDEMPOTENT] Event already processed in READ SERVICE - ORDER',
        logCtx
      )
      return
    }

    logger.error(
      '[CRITICAL] Event processing failed in READ SERVICE - ORDER',
      logCtx,
      error
    )
    throw error
  } finally {
    session.endSession()
  }
}
