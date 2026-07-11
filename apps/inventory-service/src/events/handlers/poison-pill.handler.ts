import { KafkaClient } from '@core/kafka'
import { logger } from '@core/logger'
import { Consumer, KafkaMessage } from 'kafkajs'
import { DLQ_EVENTS_TYPE } from '@core/events'
import crypto from 'node:crypto'

interface HandlerContext {
  kafka: KafkaClient
  consumer: Consumer
  topic: string
  partition: number
  message: KafkaMessage
}

export const handlePoisonPill = async (
  ctx: HandlerContext,
  err: Error,
  logMessage: string
) => {
  const { kafka, consumer, topic, partition, message } = ctx
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
        originalOffset: message.offset,
        originalTimestamp: message.timestamp,
        rawPayload: message.value?.toString() ?? '',
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? (err.stack ?? '') : 'No stack trace',
        failedAt: new Date().toISOString(),
        consumerGroup: 'order-projection-inventory-group',
        retryCount: 0,
      },
    })
  } catch (error) {
    logger.error('[INVENTORY SERVICE] Failed to send to DLQ', { error })
  } finally {
    await consumer.commitOffsets([
      { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
    ])
  }
}
