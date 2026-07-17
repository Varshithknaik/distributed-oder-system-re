import { createEventEnvelopeSchema, EventEnvelope, TOPICS } from '@core/events'
import { createKafkaClient } from '../../lib/kafka.js'
import { logger } from '@core/logger'
import z from 'zod'
import { handlePoisonPill } from '../handlers/poison-pill.handler.js'
import { processOrderService } from '../handlers/order-message.handler.js'

const groupId = 'order-projection-read-group'
const MAX_RETRIES = 3
const RETRY_BACKOFF_MS = 1000

export async function startOrderConsumer() {
  const kafkaClient = createKafkaClient(groupId)
  const consumer = kafkaClient.createConsumer(groupId + '-consumer')

  let connected = false
  while (!connected) {
    try {
      await consumer.connect()
      connected = true
    } catch (error) {
      logger.error('[READ SERVICE - ORDER] Kafka connection failed, retrying in 5s...', error)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
  await consumer.subscribe({
    topic: TOPICS.ORDER_EVENTS,
    fromBeginning: true,
  })

  await consumer.run({
    eachMessage: async ({ message, topic, partition, heartbeat }) => {
      await heartbeat()
      let envelope: EventEnvelope<unknown>
      try {
        const value = JSON.parse(message.value?.toString() ?? '')
        envelope = createEventEnvelopeSchema(z.any()).parse(value)
      } catch (error) {
        logger.info('[READ SERVICE - ORDER ]Error parsing message', error)
        await handlePoisonPill(
          {
            kafka: kafkaClient,
            consumer,
            groupId,
            topic,
            partition,
            offset: message.offset,
            message,
          },
          error as Error,
          '[READ SERVICE - ORDER] Failed to process order event'
        )
        return
      }

      let lastError: Error | null = null
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await heartbeat()
          await processOrderService({
            eventEnvelope: envelope,
            topic,
            partition,
            offset: message.offset,
          })
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
            kafka: kafkaClient,
            consumer,
            groupId,
            topic,
            partition,
            offset: message.offset,
            message,
          },
          lastError as Error,
          '[READ SERVICE - ORDER] Event processing failed after retries, moved to DLQ'
        )
      }
    },
  })

  return {
    shutdown: async () => {
      logger.info(
        '[READ SERVICE - ORDER] Shutting down order consumer gracefully...'
      )
      await consumer.stop()
      await consumer.disconnect()
      logger.info('[READ SERVICE - ORDER] Order consumer shut down gracefully')
    },
  }
}
