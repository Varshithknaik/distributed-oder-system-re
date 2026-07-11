import { EventEnvelope, USER_EVENTS_TYPE } from '@core/events'
import { logger } from '@core/logger'
import { syncUserCreated } from '../../domain/user-sync.service.js'
import { prisma } from '../../lib/prisma.js'
import { recordProcessedEvent } from '../../repository/user.repository.js'
import { Prisma } from '@prisma/client-api-gateway'
export async function processUserEvent(
  envelope: EventEnvelope<unknown>,
  topic: string,
  partition: number,
  offset: string,
  retry = 1
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      logger.info('[IDEMPOTENT] Event already processed in ORDER SERVICE')
      return
    }

    logger.error(
      `[CRITICAL] Event processing failed in ORDER SERVICE at ATTEMPT number ${retry}`
    )
    throw error
  }
}
