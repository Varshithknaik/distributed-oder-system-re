import { TOPICS } from '@core/events'
import { logger } from '@core/logger'
import { createOrderKafkaClient } from '../../lib/kafka.js'
import { handleUserMessage } from '../handlers/user-message.handler.js'

export async function startUserConsumer(
  replay = false
): Promise<{ shutdown: () => Promise<void> }> {
  const groupId = replay
    ? `order-service-users-replay-${Date.now()}`
    : 'order-service-users'

  const kafka = createOrderKafkaClient(groupId)
  const consumer = kafka.createConsumer(groupId)

  await consumer.connect()
  await consumer.subscribe({
    topic: TOPICS.USER_EVENTS,
    fromBeginning: true,
  })

  await consumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat }) => {
      await handleUserMessage({
        kafka,
        consumer,
        groupId,
        topic,
        partition,
        message,
        heartbeat,
      })
    },
  })

  return {
    shutdown: async () => {
      logger.info('[ORDER SERVICE USER CONSUMER] Shutting down gracefully...')
      await consumer.stop()
      await consumer.disconnect()
    },
  }
}
