import { logger } from '@core/logger'
import { createKafkaClient } from '../../lib/kafka.js'
import { TOPICS } from '@core/events'

const groupId = 'user-projections-read-group'

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
    eachMessage: async ({ topic }) => {
      console.log(topic)
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
