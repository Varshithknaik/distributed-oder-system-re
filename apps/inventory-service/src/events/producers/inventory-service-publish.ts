import { EventEnvelope } from '@core/events'
import { KafkaClient } from '@core/kafka'
import { prisma } from '../../lib/prisma.js'
import { z } from 'zod'
import { logger } from '@core/logger'

export const MAX_ATTEMPTS = 3

export function nextRetryAt(attempts: number): Date {
  const delayMs = Math.min(30000, 1000 * 2 ** attempts)
  return new Date(Date.now() + delayMs)
}

const kafka = new KafkaClient('inventory-service', [process.env.KAFKA_BROKERS!])
export const publish = kafka.publish.bind(kafka)

/**
 * Describes how to handle a specific outbox event type.
 * `schema` validates + parses the raw payload from the DB.
 */
export type OutboxEventHandler<T = unknown> = {
  schema: z.ZodType<EventEnvelope<T>>
}

export async function publishOutboxEvent<T = unknown>(
  handler: OutboxEventHandler<T>,
  topic: string,
  id: string,
  attempt: number,
  payload: unknown
): Promise<void> {
  try {
    const envelope = handler.schema.parse(payload)
    await publish(topic, envelope)

    await prisma.outBoxEvent.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    })
    logger.info(`[Inventry Outbox] Published outbox event with id ${id}`)
  } catch (error) {
    const attempts = attempt + 1
    await prisma.outBoxEvent.update({
      where: { id },
      data: {
        status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        attempt: attempts,
        nextAttemptAt: nextRetryAt(attempts),
        lockedAt: null,
        lockedBy: null,
        lastError: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
