import { KafkaClient } from '@core/kafka'
import { logger } from '@core/logger'
import { Consumer } from 'kafkajs'
import { DLQ_EVENTS_TYPE } from '@core/events'

export interface HandlerContext {
  kafka: KafkaClient
  consumer: Consumer
  groupId: string
  topic: string
  partition: number
  offset: string
  message: { offset: string; value: Buffer | null; timestamp: string }
}

export async function handlePoisonPill(
  ctx: HandlerContext,
  err: Error,
  logMessage: string
) {
  const { kafka, consumer, topic, partition, offset, message, groupId } = ctx
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
        errorStack: err instanceof Error ? (err.stack ?? '') : 'No stack trace',
        failedAt: new Date().toISOString(),
        consumerGroup: groupId,
        retryCount: 0,
      },
    })
  } catch (error) {
    logger.error('Failed to send to DLQ', {
      error,
    })
  } finally {
    await consumer.commitOffsets([
      { topic, partition, offset: (BigInt(offset) + 1n).toString() },
    ])
  }
}
