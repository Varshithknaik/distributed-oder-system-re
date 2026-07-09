import { EventEnvelope, USER_EVENTS_TYPE } from '@core/events'
import { logger } from '@core/logger'
import { syncUserCreated } from '../../domain/user-sync.service.js'
import { prisma } from '../../lib/prisma.js'
import { recordProcessedEvent } from '../../repository/user.repository.js'

export async function processUserEvent(
  envelope: EventEnvelope<unknown>,
  topic: string,
  partition: number,
  offset: string,
  retry = 0
): Promise<void> {
  const { eventId, eventType, payload } = envelope

  try {
    await prisma.$transaction(async (tx) => {
      await recordProcessedEvent(tx, {
        eventId,
        eventType,
        topic,
        partition,
        offset,
      })

      switch (eventType) {
        case USER_EVENTS_TYPE.USER_CREATED:
          await syncUserCreated(tx, payload)
          break
        default:
          logger.warn(
            '[IDEMPOTENT] Unknown event type received in ORDER SERVICE',
            {
              eventId,
              eventType,
              topic,
              partition,
              offset,
            }
          )
      }
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      logger.info('[IDEMPOTENT] Event already processed in ORDER SERVICE', {
        eventId,
        eventType,
        topic,
        partition,
        offset,
        retry,
      })
      return
    }

    logger.error(
      '[CRITICAL] Event processing failed in ORDER SERVICE',
      {
        eventId,
        eventType,
        topic,
        partition,
        offset,
        retry,
      },
      error
    )
    throw error
  }
}
