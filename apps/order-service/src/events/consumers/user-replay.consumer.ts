import { TOPICS } from '@core/events'
import { logger } from '@core/logger'
import { Consumer } from 'kafkajs'
import { createOrderKafkaClient } from '../../lib/kafka.js'
import { handleUserMessage } from '../handlers/user-message.handler.js'

export async function replayFromOffset(
  fromOffset: string,
  partition?: number,
  stopAfter = 1
): Promise<{ consumer: Consumer; done: Promise<void> }> {
  if (partition == null) {
    throw new Error('Partition is required for replayFromOffset')
  }

  const groupId = `order-service-replay-${Date.now()}`
  const kafka = createOrderKafkaClient(groupId)
  const consumer = kafka.createConsumer(groupId)

  let processed = 0
  let seekApplied = false

  let resolveDone!: () => void
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })

  await consumer.connect()
  await consumer.subscribe({
    topic: TOPICS.USER_EVENTS,
    fromBeginning: false,
  })

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({
      topic,
      partition: msgPartition,
      message,
      heartbeat,
    }) => {
      if (
        processed >= stopAfter ||
        msgPartition !== partition ||
        !seekApplied
      ) {
        return
      }

      await handleUserMessage({
        kafka,
        consumer,
        groupId,
        topic,
        partition,
        message,
        heartbeat,
      })

      processed++

      if (processed >= stopAfter) {
        setTimeout(async () => {
          await consumer.stop()
          await consumer.disconnect()
          resolveDone()
        }, 0)
      }
    },
  })

  consumer.seek({
    topic: TOPICS.USER_EVENTS,
    partition,
    offset: fromOffset,
  })
  seekApplied = true

  logger.info('[ORDER SERVICE] Replay consumer started', {
    groupId,
    topic: TOPICS.USER_EVENTS,
    partition,
    fromOffset,
    stopAfter,
  })

  return {
    consumer,
    done,
  }
}
