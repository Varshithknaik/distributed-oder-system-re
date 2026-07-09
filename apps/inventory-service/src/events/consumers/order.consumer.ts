import { logger } from '@core/logger'
import { createKafkaClient } from '../../lib/kafka.js'
import { createEventEnvelopeSchema, EventEnvelope, TOPICS } from '@core/events'
import { z } from 'zod'
import { handlePoisonPill } from '../handlers/poison-pill.handler.js'
import { processInventoryOrderService } from '../handlers/order-message-handler.js'

const clientId = 'order-projection-inventory-service'
const MAX_RETRIES = 3
const RETRY_BACKOFF_MS = 1000

export async function startOrderConsumer() {
  const kafkaClient = createKafkaClient(clientId)

  const consumer = kafkaClient.createConsumer(clientId + '-consumer')
  await consumer.connect()
  await consumer.subscribe({
    topic: TOPICS.ORDER_EVENTS,
    fromBeginning: true,
  })

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ heartbeat, message, topic, partition }) => {
      await heartbeat()
      let envelope: EventEnvelope<unknown>
      try {
        const value = JSON.parse(message.value?.toString() ?? '{}')
        envelope = createEventEnvelopeSchema(z.any()).parse(value)
      } catch (error) {
        console.error(
          '[INVENTORY SERVICE - ORDER] Error parsing order event:',
          error
        )
        await handlePoisonPill(
          {
            kafka: kafkaClient,
            consumer,
            topic,
            partition,
            message,
          },
          error as Error,
          '[INVENTORY SERVICE - ORDER] Failed to process order'
        )
        return
      }

      let lastError: Error | null = null
      let attempt = 0

      for (; attempt < MAX_RETRIES; attempt++) {
        try {
          await heartbeat()
          await processInventoryOrderService({
            eventEventEnvelop: envelope,
            partition,
            offset: message.offset,
            topic,
            retry: attempt + 1,
          })

          lastError = null
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          if (attempt < MAX_RETRIES - 1) {
            const nextDetail = Math.pow(2, attempt) * RETRY_BACKOFF_MS
            await new Promise((resolve) => setTimeout(resolve, nextDetail))
          }
        }
      }

      if (lastError) {
        await handlePoisonPill(
          {
            kafka: kafkaClient,
            consumer,
            topic,
            partition,
            message,
          },
          lastError,
          '[INVENTORY SERVICE - ORDER] Event processing failed after retries, moved to DLQ'
        )
      }
    },
  })

  return {
    shutdown: async () => {
      logger.info(
        '[INVENTORY SERVICE - ORDER] Shutting down order consumer gracefully...'
      )
      await consumer.stop()
      await consumer.disconnect()
      logger.info(
        '[INVENTORY SERVICE - ORDER] Order consumer shut down gracefully'
      )
    },
  }
}
