import { EventEnvelope } from '@core/events'
import { KafkaClient } from '@core/kafka'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { logger } from '@core/logger'

export const MAX_ATTEMPTS = 3

export function nextRetryAt(attempts: number): Date {
  const delayMS = Math.min(30000, 1000 * 2 ** (attempts - 1))
  return new Date(Date.now() + delayMS)
}

const kafka = new KafkaClient('order-service', [process.env.KAFKA_BROKERS!])
export const publish = kafka.publish.bind(kafka)

export type OutboxEventHandler<T = unknown> = {
  schema: z.ZodType<EventEnvelope<T>>
}

export async function publishOutboxEvent<T = unknown>(
  handler: OutboxEventHandler<T>,
  topic: string,
  id: string,
  attempt: number,
  payload: unknown
) {
  try {
    const event = handler.schema.parse(payload)
    await publish(topic, event)

    await prisma.outBoxEvent.update({
      where: {
        id,
      },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    })

    logger.info(`[Order Outbox] Published outbox event with id ${id}`)
  } catch (error) {
    const attempts = attempt + 1
    await prisma.outBoxEvent.update({
      where: {
        id,
      },
      data: {
        status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        attempt: attempts,
        nextAttemptAt: nextRetryAt(attempts),
        lastError: error instanceof Error ? error.message : String(error),
        lockedAt: null,
        lockedBy: null,
      },
    })
  }
}
