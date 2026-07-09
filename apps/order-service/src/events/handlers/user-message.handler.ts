import {
  createEventEnvelopeSchema,
  DLQ_EVENTS_TYPE,
  EventEnvelope,
} from '@core/events'
import { KafkaClient } from '@core/kafka'
import { logger } from '@core/logger'
import { Consumer } from 'kafkajs'
import { z } from 'zod'
import { processUserEvent } from './user-event.handler.js'

const MAX_RETRIES = 3
const RETRY_BACKOFF_MS = 1000

export interface HandleUserMessageParams {
  kafka: KafkaClient
  consumer: Consumer
  groupId: string
  topic: string
  partition: number
  message: { offset: string; value: Buffer | null; timestamp: string }
  heartbeat: () => Promise<void>
}

export interface HandlerContext {
  kafka: KafkaClient
  consumer: Consumer
  groupId: string
  topic: string
  partition: number
  offset: string
  message: { offset: string; value: Buffer | null; timestamp: string }
}

export async function handleUserMessage({
  kafka,
  consumer,
  groupId,
  topic,
  partition,
  message,
  heartbeat,
}: HandleUserMessageParams) {
  const offset = message.offset
  let envelope: EventEnvelope<unknown>

  await heartbeat()

  try {
    const raw = JSON.parse(message.value!.toString())
    envelope = createEventEnvelopeSchema(z.any()).parse(raw)
  } catch (err) {
    await handlePoisonPill(
      {
        kafka,
        consumer,
        groupId,
        topic,
        partition,
        offset,
        message,
      },
      err as Error,
      'Poison pill encountered'
    )

    return
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await heartbeat()
      await processUserEvent(envelope, topic, partition, offset, attempt + 1)
      lastError = null
      break
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BACKOFF_MS * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  if (lastError) {
    await handlePoisonPill(
      {
        kafka,
        consumer,
        groupId,
        topic,
        partition,
        offset,
        message,
      },
      lastError,
      'Event processing failed after retries, moved to DLQ'
    )
  }
}

export async function handlePoisonPill(
  ctx: HandlerContext,
  err: Error,
  logMessage: string
) {
  const { groupId, topic, partition, message, kafka, offset, consumer } = ctx

  logger.error(
    logMessage,
    {
      topic,
      rawPayload: message.value?.toString() ?? '',
    },
    err
  )

  try {
    await kafka.sendToDLQ({
      eventId: crypto.randomUUID(),
      eventType: DLQ_EVENTS_TYPE.DLQ_MESSAGE,
      occurredAt: new Date().toISOString(),
      version: 1,
      payload: {
        originalTopic: topic,
        originalPartition: partition,
        originalOffset: offset,
        originalTimestamp: message.timestamp,
        rawPayload: message.value?.toString() ?? '',
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? (err.stack ?? '') : '',
        failedAt: new Date().toISOString(),
        consumerGroup: groupId,
        retryCount: 0,
      },
    })
  } catch (dlqError) {
    logger.error('Error while sending to DLQ', { error: dlqError })
  } finally {
    await consumer.commitOffsets([
      { topic, partition, offset: (BigInt(offset) + 1n).toString() },
    ])
  }
}
