import { USER_EVENTS_TYPE, UserCreatedEventEnvelopeSchema } from '@core/events'
import { prisma } from '../lib/prisma.js'
import { logger } from '@core/logger'
import {
  nextRetryAt,
  OutboxEventHandler,
  publishOutboxEvent,
} from '../events/user-servive-producer.js'

const BATCH_SIZE = 50
const POLL_INTERVAL_MS = 5000
const MAX_ATTEMPTS = 3

const OUTBOX_HANDLER: Partial<
  Record<keyof typeof USER_EVENTS_TYPE, OutboxEventHandler>
> = {
  USER_CREATED: {
    schema: UserCreatedEventEnvelopeSchema,
  },
}

function claimOutboxEvent() {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM outbox_events
        WHERE status IN ('PENDING' , 'FAILED')
          AND next_attempt_at <= NOW()
          AND attempt < ${MAX_ATTEMPTS}
        ORDER BY created_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `
      const ids = rows.map((r) => r.id)
      if (ids.length === 0) return []

      return await tx.outboxEvent.updateManyAndReturn({
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

export function startUserOutboxPoller() {
  let isRunning = false
  console.log(';started poller')
  const timer = setInterval(async () => {
    if (isRunning) return
    isRunning = true

    try {
      const events = await claimOutboxEvent()
      console.log(events)
      console.log(';started poller')
      for (const event of events) {
        const handler =
          OUTBOX_HANDLER[event.eventType as keyof typeof USER_EVENTS_TYPE]

        if (!handler) {
          logger.warn(
            `[USER Outbox] No handler found for event type: ${event.eventType} with id: ${event.id}`
          )

          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: 'FAILED',
              lockedAt: null,
              lockedBy: null,
              attempt: event.attempt + 1,
              nextAttemptAt: nextRetryAt(event.attempt + 1),
              lastError:
                'No handler found for the event type ' + event.eventType,
            },
          })
          continue
        }

        await publishOutboxEvent({
          handler,
          topic: event.topic,
          id: event.id,
          payload: event.payload,
          attempt: event.attempt,
        })
      }
    } catch (error) {
      console.log(error)
    } finally {
      isRunning = false
    }
  }, POLL_INTERVAL_MS)

  return () => clearInterval(timer)
}
