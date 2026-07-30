import { EventEnvelope, USER_EVENTS_TYPE } from '@core/events'
import mongoose from 'mongoose'
import { ProcessedEvent } from '../../models/ProcessesEvents.js'
import { logger } from '@core/logger'
import { processUserCreated } from '../../repository/user.repository.js'

export async function processUserMessage({
  eventEnvelope,
  topic,
  offset,
  partition,
}: {
  eventEnvelope: EventEnvelope<unknown>
  topic: string
  partition: number
  offset: string
}) {
  const { eventId, eventType, payload } = eventEnvelope
  const session = await mongoose.startSession()
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
        case USER_EVENTS_TYPE.USER_CREATED:
          await processUserCreated({ ...ctx })
          break
        default:
          logger.error(
            `[READ SERVICE - USER] Unhanled event of ${eventType} type`
          )
          break
      }
    })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      // This error can
      logger.info(
        `[READ SERVICE - USER] Event ${eventId} with type ${eventType} and topic ${topic} already processed`
      )
      return
    }

    logger.error(
      `[READ SERVICE - USER] Event ${eventId} with type ${eventType} and topic ${topic} failed to process`
    )
    throw error
  } finally {
    session.endSession()
  }
}
