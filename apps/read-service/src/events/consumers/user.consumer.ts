import { logger } from '@core/logger'
import { createKafkaClient } from '../../lib/kafka.js'
import { createEventEnvelopeSchema, EventEnvelope, TOPICS } from '@core/events'
import z from 'zod'
import { handlePoisonPill } from '../handlers/poison-pill.handler.js'
import { processUserMessage } from '../handlers/user-message.handler.js'

const groupId = 'user-projections-read-group'
const MAX_RETRIES = 3

export function nextRetryDelay(attempts: number): number {
  return Math.min(30000, 1000 * 2 ** (attempts - 1))
}

export async function startUserReadConsumer() {
  const kafkaClient = createKafkaClient(groupId)

  const consumer = kafkaClient.createConsumer(groupId + '-consumer')
  let connected = false

  while (!connected) {
    try {
      await consumer.connect()
      connected = true
    } catch (error) {
      logger.error(
        '[READ SERVICE - USER] Kafka connection failed, retrying in 5s...',
        error
      )
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  await consumer.subscribe({ topic: TOPICS.USER_EVENTS, fromBeginning: true })

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, message, partition, heartbeat }) => {
      await heartbeat()
      let envelope: EventEnvelope<unknown>

      try {
        const rawMessage = JSON.parse(message.value?.toString() ?? '')
        envelope = createEventEnvelopeSchema(z.any()).parse(rawMessage)
      } catch (error) {
        logger.info('[READ SERVICE - USER] Failed to parse message', error)

        handlePoisonPill(
          {
            kafka: kafkaClient,
            consumer,
            groupId,
            partition,
            topic,
            offset: message.offset,
            message,
          },
          error as Error,
          '[READ SERVICE - USER] Failed to process order event Moving yto DLQ'
        )

        return
      }

      let lastError: Error | null = null
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await heartbeat()
          await processUserMessage({
            eventEnvelope: envelope!,
            topic,
            offset: message.offset,
            partition,
          })
          lastError = null
          break
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          if (attempt < MAX_RETRIES - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, nextRetryDelay(attempt + 1))
            )
          }
        }
      }

      if (lastError) {
        handlePoisonPill(
          {
            kafka: kafkaClient,
            consumer,
            groupId,
            partition,
            topic,
            offset: message.offset,
            message,
          },
          lastError as Error,
          '[READ SERVICE - USER] Event processing failed after retries, moved to DLQ'
        )
      }
    },
  })

  return {
    shutdown: async () => {
      logger.info('[READ SERVICE - USER] shutting down consumer gracefully...')
      await consumer.stop()
      await consumer.disconnect()
      logger.info('[READ SERVICE - USER] consumer shut down gracefully')
    },
  }
}
