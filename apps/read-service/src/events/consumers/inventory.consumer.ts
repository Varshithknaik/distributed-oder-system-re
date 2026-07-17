import { createEventEnvelopeSchema, EventEnvelope, TOPICS } from '@core/events'
import { createKafkaClient } from '../../lib/kafka.js'
import { logger } from '@core/logger'
import { handlePoisonPill } from '../handlers/poison-pill.handler.js'
import { z } from 'zod'
import { processInventoryEvent } from '../handlers/inventory-message.handler.js'

const MAX_RETRIES = 3
const RETRY_BACKOFF_MS = 1000

export async function startInventoryConsumer() {
  const groupId = 'inventory-projections-read-group'

  const kafkaClient = createKafkaClient(groupId)
  const consumer = kafkaClient.createConsumer(groupId + '-consumer')

  let connected = false
  while (!connected) {
    try {
      await consumer.connect()
      connected = true
    } catch (error) {
      logger.error('[READ SERVICE - INVENTORY] Kafka connection failed, retrying in 5s...', error)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
  await consumer.subscribe({
    topic: TOPICS.INVENTORY_EVENTS,
    fromBeginning: true,
  })

  await consumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat }) => {
      await heartbeat()
      let envelope: EventEnvelope<unknown>
      try {
        const row = JSON.parse(message.value?.toString() ?? '')
        envelope = createEventEnvelopeSchema(z.any()).parse(row)
      } catch (error) {
        logger.error('Failed to process inventory event', {
          error,
        })
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
          'Failed to process inventory event -> Invalid Envelop'
        )
        return
      }

      let lastError: Error | null = null

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await heartbeat()
          await processInventoryEvent(
            envelope,
            topic,
            partition,
            message.offset
          )
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
          lastError,
          'Event processing failed after retries, moved to DLQ'
        )
      }
    },
  })

  return {
    shutdown: async () => {
      logger.info(
        '[READ SERVICE - INVENTORY] Shutting down inventory consumer gracefully...'
      )
      await consumer.stop()
      await consumer.disconnect()
      logger.info(
        '[READ SERVICE - INVENTORY] Inventory consumer shut down gracefully'
      )
    },
  }
}
