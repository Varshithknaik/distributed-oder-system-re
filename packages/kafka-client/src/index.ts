import {
  Kafka,
  Partitioners,
  type Producer,
  type Consumer,
  ConsumerConfig,
} from 'kafkajs'
import fs from 'fs'
import dotenv from 'dotenv'
import { logger } from '@core/logger'
import { DLQMessage, EventEnvelope, TOPICS } from '@core/events'

dotenv.config({ quiet: true })

function resolvePath(p: string) {
  // if running in docker -> path exists like mentioned in env file
  if (fs.existsSync(p)) return p

  return p?.replace('/app', '.')
}

export class KafkaClient {
  private kafka: Kafka
  private producer: Producer | null = null

  constructor(clientId: string, brokers: string[]) {
    const caPath = resolvePath(process.env.KAFKA_CA!)
    const certPath = resolvePath(process.env.KAFKA_CERT!)
    const keyPath = resolvePath(process.env.KAFKA_KEY!)

    this.kafka = new Kafka({
      clientId,
      brokers,
      ssl: {
        ca: fs.readFileSync(caPath, 'utf-8'),
        cert: fs.readFileSync(certPath, 'utf-8'),
        key: fs.readFileSync(keyPath, 'utf-8'),
        rejectUnauthorized: true,
      },
    })
  }
  createProducer(): Producer {
    return this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    })
  }
  createConsumer(
    groupId: string,
    overrides?: Partial<ConsumerConfig>
  ): Consumer {
    return this.kafka.consumer({
      groupId,
      sessionTimeout: 30000, // 30s is default. Increase if your webhook is slow
      heartbeatInterval: 10000, // send heartbeat every 10s (default)
      rebalanceTimeout: 5000, // 5s before giving up on rebalance (default)
      maxWaitTimeInMs: 1000, // max time to wait for new messages (1s default)
      retry: {
        retries: 5, // KafkaJS-level retries (connection/protocol)
        initialRetryTime: 300,
        maxRetryTime: 30000,
      },
      ...overrides,
    })
  }

  async getProducer() {
    if (this.producer) return this.producer
    this.producer = this.createProducer()
    try {
      await this.producer.connect()
    } catch (error) {
      logger.error(error)
    }
    return this.producer
  }

  async publish<T>(
    topic: string,
    envelope: EventEnvelope<T>,
    headers?: Record<string, string>
  ) {
    try {
      const producer = await this.getProducer()
      await producer.send({
        topic,
        messages: [
          {
            key: envelope.eventId,
            value: JSON.stringify(envelope),
            headers,
          },
        ],
      })
    } catch (error) {
      logger.error('Failed to send message to Kafka', error)
      throw new Error('Failed to send message to Kafka')
    }
  }

  async sendToDLQ(envelope: EventEnvelope<DLQMessage>) {
    const headers = {
      'x-original-topic': envelope.payload.originalTopic,
      'x-error-type': envelope.payload.errorMessage.split(':')[0],
      'x-failed-at': envelope.payload.failedAt,
    }
    try {
      await this.publish(TOPICS.DLQ, envelope, headers)
      logger.info(
        `[DLQ] Published to ${TOPICS.DLQ} | ` +
          `Original: ${envelope.payload.originalTopic}[${envelope.payload.originalPartition}]:${envelope.payload.originalOffset}`
      )
    } catch (error) {
      logger.error('[DLQ CRITICAL] Failed to send to DLQ!', error)
      logger.error(
        '[DLQ CRITICAL] Lost message:',
        JSON.stringify(envelope.payload)
      )
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      try {
        await this.producer.disconnect()
      } catch (error) {
        logger.error(error)
      }
    }
  }
}
