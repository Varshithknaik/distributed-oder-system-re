import { KafkaClient } from '@core/kafka'
import { EventEnvelope } from '@core/events'
import z from 'zod'
import { prisma } from '../lib/prisma.js'
import { logger } from '@core/logger'

export const MAX_ATTEMPTS = 3

export function nextRetryAt(attempts: number): Date {
  const delayMS = Math.min(30000, 1000 * 2 ** (attempts - 1))
  return new Date(Date.now() + delayMS)
}

const kafka = new KafkaClient('user-service', [process.env.KAFKA_BROKERS!])
export const publish = kafka.publish.bind(kafka)

export type OutboxEventHandler<T = unknown> = {
  schema: z.ZodType<EventEnvelope<T>>
}

interface publishOutboxEvent {
  handler: OutboxEventHandler<unknown>
  topic: string
  id: string
  payload: unknown
  attempt: number
  aggregateId: string
  aggregateType: string
}

export async function publishOutboxEvent({
  handler,
  payload,
  topic,
  id,
  attempt,
  aggregateId,
  aggregateType,
}: publishOutboxEvent) {
  try {
    const eventData = handler.schema.parse(payload)
    await publish(topic, eventData, {
      key: `${aggregateType}:${aggregateId}`,
    })

    await prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    })

    logger.info(`[User Outbox] Published outbox event with id ${id}`)
  } catch (error) {
    const nextAttempt = attempt + 1
    await prisma.outboxEvent.update({
      where: {
        id,
      },
      data: {
        status: nextAttempt >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        attempt: nextAttempt,
        nextAttemptAt: nextRetryAt(nextAttempt),
        lastError: error instanceof Error ? error.message : String(error),
        lockedAt: null,
        lockedBy: null,
      },
    })
  }
}
